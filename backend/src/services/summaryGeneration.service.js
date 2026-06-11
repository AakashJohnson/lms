import { callAiService } from './aiGateway.service.js';
import { logger } from '../config/logger.js';

const FALLBACK_SUMMARY_PROVIDER = 'nvidia';
const FALLBACK_SUMMARY_MODEL = process.env.NVIDIA_MODEL || process.env.AI_MODEL || 'meta/llama-3.1-70b-instruct';
const FALLBACK_LANGUAGE = 'en';
const FALLBACK_SUMMARY_TYPE = 'short';
const MAX_CHARS_FOR_FINAL_SUMMARY = Number(process.env.SUMMARY_MAX_TRANSCRIPT_CHARS || 22000);
const ALLOW_AI_SUMMARY_FALLBACK = String(process.env.ALLOW_AI_SUMMARY_FALLBACK || 'true').toLowerCase() === 'true';

export const allowedSummaryTypes = ['short', 'detailed'];

export const normalizeSummaryType = (value) => {
  const candidate = String(value || process.env.DEFAULT_SUMMARY_TYPE || FALLBACK_SUMMARY_TYPE).toLowerCase();
  return allowedSummaryTypes.includes(candidate) ? candidate : FALLBACK_SUMMARY_TYPE;
};

export const getSummaryGenerationConfig = () => ({
  provider: process.env.SUMMARY_PROVIDER || FALLBACK_SUMMARY_PROVIDER,
  model: process.env.SUMMARY_MODEL || FALLBACK_SUMMARY_MODEL,
  outputLanguage: process.env.SUMMARY_OUTPUT_LANGUAGE || FALLBACK_LANGUAGE,
});

const cleanText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const truncateForPrompt = (value = '', maxChars = MAX_CHARS_FOR_FINAL_SUMMARY) => {
  const text = String(value || '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.floor(maxChars * 0.7))}\n\n[Middle transcript omitted for token safety]\n\n${text.slice(-Math.floor(maxChars * 0.3))}`;
};

const fallbackSummary = ({ cleanedTranscript = '', transcriptAnalysis = {}, summaryType = 'short' }) => {
  const text = cleanText(cleanedTranscript);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 30);
  const topics = (transcriptAnalysis.mainTopics || []).slice(0, 8);
  const overview = sentences.slice(0, summaryType === 'detailed' ? 8 : 4).join(' ');
  const points = (sentences.length ? sentences : [text]).slice(0, summaryType === 'detailed' ? 12 : 7);

  if (summaryType === 'detailed') {
    return [
      '# Detailed Overview',
      overview || 'The lecture explains the core educational content from the transcript.',
      '',
      '# Global Context',
      'This topic is useful for academic understanding, practical application, and exam preparation when connected with the related course concepts.',
      '',
      '# Key Concepts',
      ...points.map((point) => `- ${point}`),
      '',
      '# Important Definitions',
      topics.length ? topics.map((topic) => `- ${topic}: Important term from the lecture context.`).join('\n') : 'No explicit definitions were detected in the lecture.',
      '',
      '# Step-by-Step Explanation',
      ...points.slice(0, 8).map((point, index) => `${index + 1}. ${point}`),
      '',
      '# Examples Covered',
      'No specific examples were covered in the lecture.',
      '',
      '# Related Context',
      'Review this lecture together with prerequisite concepts and related course modules for stronger understanding.',
      '',
      '# Important Points to Remember',
      ...points.slice(0, 8).map((point) => `- ${point}`),
      '',
      '# Possible Exam Questions',
      ...topics.slice(0, 5).map((topic) => `- Explain ${topic} based on the lecture.`),
      '',
      '# Quick Revision Notes',
      ...points.slice(0, 5).map((point) => `- ${point}`),
    ].join('\n');
  }

  return [
    '# Short Overview',
    overview || 'The lecture covers the main educational ideas from the transcript.',
    '',
    '# Key Points',
    ...points.slice(0, 8).map((point) => `- ${point}`),
    '',
    '# Important Definitions',
    topics.length ? topics.slice(0, 5).map((topic) => `- ${topic}`).join('\n') : 'No explicit definitions were detected in the lecture.',
    '',
    '# Global Context',
    'This topic is useful for understanding the course subject and connecting lecture concepts with academic or real-world applications.',
    '',
    '# Quick Revision',
    ...points.slice(0, 5).map((point) => `- ${point}`),
  ].join('\n');
};

const buildSummaryPrompt = ({ summaryType, transcriptAnalysis, cleanedTranscript }) => `
You are an expert academic summarizer for an LMS platform.

Create a student-facing English summary from the cleaned lecture transcript.

Inputs:
Summary Type: ${summaryType}
Transcript Analysis:
${JSON.stringify(transcriptAnalysis || {}, null, 2)}

Cleaned Transcript:
${truncateForPrompt(cleanedTranscript)}

Very important:
- Output must be in English only.
- Do not use Hindi or Hinglish.
- Use the selected summary type strictly.
- If summary type is "short", create a concise but useful summary.
- If summary type is "detailed", create a detailed educational summary.
- Use transcript size to decide output depth.
- Add relevant global context and definitions.
- Do not include greetings, jokes, attendance, or unrelated classroom talk.
- Do not invent unsupported lecture-specific information.
- Global context is allowed only if it is directly related to the topic.
- Make the output useful for students.

If Summary Type = short, use this structure:

# Short Overview
# Key Points
# Important Definitions
# Global Context
# Quick Revision

If Summary Type = detailed, use this structure:

# Detailed Overview
# Global Context
# Key Concepts
# Important Definitions
# Step-by-Step Explanation
# Examples Covered
# Related Context
# Important Points to Remember
# Possible Exam Questions
# Quick Revision Notes

Length rules:
For short summary:
- small transcript: 250-400 words
- medium transcript: 400-700 words
- long transcript: 700-1000 words

For detailed summary:
- small transcript: 800-1200 words
- medium transcript: 1200-2000 words
- long transcript: 2000-3500 words

Return only the final formatted summary in markdown.
`;

export const generateStudentSummary = async ({
  cleanedTranscript = '',
  transcriptAnalysis = {},
  summaryType,
  provider,
  model,
  outputLanguage,
} = {}) => {
  const type = normalizeSummaryType(summaryType);
  const config = {
    provider: provider || getSummaryGenerationConfig().provider,
    model: model || getSummaryGenerationConfig().model,
    outputLanguage: outputLanguage || getSummaryGenerationConfig().outputLanguage,
  };

  if (!cleanText(cleanedTranscript)) {
    throw new Error('Cleaned transcript is empty');
  }
  if (config.provider !== 'nvidia') {
    logger.warn(`Unsupported summary provider "${config.provider}", using NVIDIA-compatible gateway`);
  }

  try {
    const response = await callAiService({
      endpoint: '/v1/summary/generate',
      payload: {
        cleanedTranscript,
        transcriptAnalysis,
        summaryType: type,
        provider: config.provider,
        model: config.model,
        outputLanguage: config.outputLanguage,
        prompt: buildSummaryPrompt({ summaryType: type, transcriptAnalysis, cleanedTranscript }),
      },
      retries: 0,
      timeout: 300000 // 5 minutes timeout for summary generation LLM call
    });
    const data = response?.data || response;
    const summary = data?.summary || '';

    return {
      summary: String(summary || '').trim(),
      summaryType: type,
      provider: config.provider,
      model: data?.model || config.model,
      outputLanguage: config.outputLanguage,
    };
  } catch (error) {
    logger.warn(`Summary generation AI failed${ALLOW_AI_SUMMARY_FALLBACK ? ', using safe summary fallback' : ''}: ${error.message}`);
    if (!ALLOW_AI_SUMMARY_FALLBACK) {
      logger.error(`Summary generation AI failed: ${error.message}`);
      throw new Error(`Summary AI gateway failed (${config.model}). Check AI_SERVICE_URL/ai-service status and ai-service NVIDIA model access.`);
    }
    return {
      summary: fallbackSummary({ cleanedTranscript, transcriptAnalysis, summaryType: type }),
      summaryType: type,
      provider: config.provider,
      model: config.model,
      outputLanguage: config.outputLanguage,
      fallback: true,
    };
  }
};
