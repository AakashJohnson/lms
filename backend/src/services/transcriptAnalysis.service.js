import { callAiService } from './aiGateway.service.js';
import { logger } from '../config/logger.js';

const FALLBACK_ANALYSIS_PROVIDER = 'nvidia';
const FALLBACK_ANALYSIS_MODEL = process.env.NVIDIA_MODEL || process.env.AI_MODEL || 'meta/llama-3.1-70b-instruct';
const MAX_CHARS_PER_CHUNK = Number(process.env.TRANSCRIPT_ANALYSIS_CHUNK_CHARS || 12000);
const ALLOW_AI_SUMMARY_FALLBACK = String(process.env.ALLOW_AI_SUMMARY_FALLBACK || 'true').toLowerCase() === 'true';

export const getTranscriptAnalysisConfig = () => ({
  provider: process.env.TRANSCRIPT_ANALYSIS_PROVIDER || process.env.TRANSCRIPT_CLEANER_PROVIDER || FALLBACK_ANALYSIS_PROVIDER,
  model: process.env.TRANSCRIPT_ANALYSIS_MODEL || process.env.TRANSCRIPT_CLEANER_MODEL || FALLBACK_ANALYSIS_MODEL,
});

const cleanText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const wordCount = (value = '') => cleanText(value).split(/\s+/).filter(Boolean).length;

const estimateLectureSize = (count = 0) => {
  if (count < 900) return 'small';
  if (count < 3200) return 'medium';
  return 'long';
};

const chunkTranscript = (text = '', maxChars = MAX_CHARS_PER_CHUNK) => {
  const normalized = String(text || '').trim();
  if (!normalized || normalized.length <= maxChars) return [normalized].filter(Boolean);

  const chunks = [];
  for (let cursor = 0; cursor < normalized.length; cursor += maxChars) {
    chunks.push(normalized.slice(cursor, cursor + maxChars));
  }
  return chunks;
};

const fallbackAnalysis = (rawTranscript = '') => {
  const count = wordCount(rawTranscript);
  const words = cleanText(rawTranscript).toLowerCase().split(/[^a-z0-9]+/g);
  const stopwords = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'lecture', 'lesson', 'video', 'about', 'there', 'their', 'student', 'teacher']);
  const counts = new Map();
  words.forEach((word) => {
    if (word.length < 4 || stopwords.has(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  const mainTopics = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  return {
    cleanedTranscript: cleanText(rawTranscript),
    analysis: {
      wordCount: count,
      estimatedLectureSize: estimateLectureSize(count),
      detectedLanguageStyle: 'mixed',
      mainTopics,
      recommendedSummaryLength: estimateLectureSize(count),
    },
  };
};

const ANALYSIS_SYSTEM_PROMPT = `
You are an expert educational transcript analyst for an LMS platform.

Analyze and clean a raw course video transcript.
The cleaned transcript must be in English only. If the transcript is Hindi, Hinglish, or any Indian language, translate only the educational content into clear English.

Rules:
1. Keep only educational content.
2. Remove greetings, attendance discussion, jokes, unrelated classroom talk, repeated words, filler words, background noise, and incomplete noise text.
3. Keep definitions, concepts, formulas, examples, explanations, steps, comparisons, teacher instructions related to the topic, and important Q&A.
4. Fix broken sentences and grammar.
5. Do not summarize at this step.
6. Do not invent new information.
7. Preserve the lecture sequence.
8. Output cleaned educational transcript in English.

Return strict JSON only:
{
  "cleanedTranscript": "...",
  "analysis": {
    "wordCount": 0,
    "estimatedLectureSize": "small | medium | long",
    "detectedLanguageStyle": "english | hinglish | hindi | indian_language | mixed",
    "mainTopics": [],
    "recommendedSummaryLength": "short | medium | long"
  }
}
`;

const normalizeAnalysisResult = (result = {}, fallback = {}) => {
  const cleanedTranscript = cleanText(result.cleanedTranscript || fallback.cleanedTranscript || '');
  const count = Number(result.analysis?.wordCount || wordCount(cleanedTranscript));
  const estimatedLectureSize = ['small', 'medium', 'long'].includes(result.analysis?.estimatedLectureSize)
    ? result.analysis.estimatedLectureSize
    : estimateLectureSize(count);

  return {
    cleanedTranscript,
    analysis: {
      wordCount: count,
      estimatedLectureSize,
      detectedLanguageStyle: result.analysis?.detectedLanguageStyle || 'mixed',
      mainTopics: Array.isArray(result.analysis?.mainTopics) ? result.analysis.mainTopics.slice(0, 12) : [],
      recommendedSummaryLength: result.analysis?.recommendedSummaryLength || estimatedLectureSize,
    },
  };
};

const analyzeChunk = async ({ rawTranscript, model, provider, detectedLanguage, languageHint, finalOutputLanguage, mainTopicHint, courseTitle }) => {
  const result = await callAiService({
    endpoint: '/v1/transcript/analyze-clean',
    payload: {
      rawTranscript,
      provider,
      model,
      systemPrompt: ANALYSIS_SYSTEM_PROMPT,
      detectedLanguage,
      languageHint,
      finalOutputLanguage,
      mainTopicHint,
      courseTitle
    },
    retries: 0,
    timeout: 300000 // 5 minutes timeout for transcript cleaning LLM call
  });
  return normalizeAnalysisResult(result?.data || result, fallbackAnalysis(rawTranscript));
};

export const analyzeAndCleanTranscript = async ({
  rawTranscript = '',
  provider,
  model,
  detectedLanguage,
  languageHint,
  finalOutputLanguage,
  mainTopicHint,
  courseTitle
} = {}) => {
  const config = {
    provider: provider || getTranscriptAnalysisConfig().provider,
    model: model || getTranscriptAnalysisConfig().model,
  };

  if (!cleanText(rawTranscript)) {
    throw new Error('Raw transcript is empty');
  }
  if (config.provider !== 'nvidia') {
    logger.warn(`Unsupported transcript analysis provider "${config.provider}", using NVIDIA-compatible gateway`);
  }

  const chunks = chunkTranscript(rawTranscript);
  try {
    const analyzedChunks = [];
    for (const chunk of chunks) {
      analyzedChunks.push(await analyzeChunk({
        rawTranscript: chunk,
        model: config.model,
        provider: config.provider,
        detectedLanguage,
        languageHint,
        finalOutputLanguage,
        mainTopicHint,
        courseTitle
      }));
    }

    const cleanedTranscript = analyzedChunks.map((chunk) => chunk.cleanedTranscript).filter(Boolean).join('\n\n');
    const count = wordCount(cleanedTranscript);
    const topics = [...new Set(analyzedChunks.flatMap((chunk) => chunk.analysis.mainTopics || []))].slice(0, 12);

    return {
      cleanedTranscript,
      analysis: {
        wordCount: count,
        estimatedLectureSize: estimateLectureSize(count),
        detectedLanguageStyle: [...new Set(analyzedChunks.map((chunk) => chunk.analysis.detectedLanguageStyle).filter(Boolean))].join(', ') || 'mixed',
        mainTopics: topics,
        recommendedSummaryLength: estimateLectureSize(count),
      },
      provider: config.provider,
      model: config.model,
    };
  } catch (error) {
    logger.warn(`Transcript analysis AI failed${ALLOW_AI_SUMMARY_FALLBACK ? ', using safe transcript fallback' : ''}: ${error.message}`);
    if (!ALLOW_AI_SUMMARY_FALLBACK) {
      logger.error(`Transcript analysis AI failed: ${error.message}`);
      throw new Error(`Transcript analysis AI gateway failed (${config.model}). Check AI_SERVICE_URL/ai-service status and ai-service NVIDIA model access.`);
    }
    const fallback = fallbackAnalysis(rawTranscript);
    return {
      ...fallback,
      provider: config.provider,
      model: config.model,
    };
  }
};
