import { generateAiLessonNotesHeuristic } from '../utils/aiNotesGenerator.js';

const cleanText = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const timestampToSeconds = (value = '') => {
  const parts = String(value).split(':').map(Number);
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return Number(parts[0]) || 0;
};

const splitSentences = (value = '') => cleanText(value)
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.trim())
  .filter((sentence) => sentence.length > 24);

const summarizeSentence = (sentence = '', max = 220) => {
  const text = cleanText(sentence);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const topKeywords = (value = '', limit = 12) => {
  const stopwords = new Set([
    'the', 'and', 'that', 'this', 'with', 'from', 'have', 'will', 'your', 'about', 'there',
    'their', 'they', 'them', 'were', 'what', 'when', 'where', 'which', 'then', 'than',
    'thank', 'thanks', 'okay', 'yeah', 'lecture', 'lesson', 'video', 'explains', 'explain',
    'trainer', 'topic', 'covers', 'next',
  ]);
  const counts = new Map();
  cleanText(value).toLowerCase().split(/[^a-z0-9]+/g).forEach((token) => {
    if (token.length < 4 || token.length > 24 || stopwords.has(token)) return;
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
};

export const parseTimestampedTranscript = (transcript = '') => {
  const raw = String(transcript || '').trim();
  if (!raw) return [];

  const matches = [...raw.matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)-(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([\s\S]*?)(?=\n\s*\[\d{1,2}:\d{2}(?::\d{2})?-\d{1,2}:\d{2}(?::\d{2})?\]|\s*$)/g)];
  if (!matches.length) {
    return [{
      start: 0,
      end: 0,
      label: 'Lecture transcript',
      summary: cleanText(raw),
    }];
  }

  return matches
    .map((match, idx) => ({
      start: timestampToSeconds(match[1]),
      end: timestampToSeconds(match[2]),
      label: `Segment ${idx + 1}`,
      summary: cleanText(match[3]),
    }))
    .filter((segment) => segment.summary.length > 0);
};

export const buildVideoSummaryExtras = ({ transcript = '', generated = {}, lessonTitle = 'Lecture', globalContext = '' }) => {
  const segments = parseTimestampedTranscript(transcript);
  const transcriptText = segments.map((segment) => segment.summary).join(' ');
  const keywords = topKeywords(transcriptText, 14);
  const sentences = splitSentences(transcriptText);
  const fallbackTakeaways = sentences
    .slice(0, 8)
    .map((sentence) => summarizeSentence(sentence, 180));

  const normalizedTakeaways = Array.isArray(generated.keyTakeaways) && generated.keyTakeaways.length
    ? generated.keyTakeaways.map((item) => summarizeSentence(item, 190)).filter(Boolean)
    : fallbackTakeaways;

  const timestampSummaries = segments.slice(0, 12).map((segment, idx) => {
    const segmentKeywords = topKeywords(segment.summary, 3);
    const label = segmentKeywords.length ? segmentKeywords.map((word) => word[0].toUpperCase() + word.slice(1)).join(', ') : `Topic ${idx + 1}`;
    const firstSentence = splitSentences(segment.summary)[0] || segment.summary;
    return {
      start: segment.start,
      end: segment.end,
      label,
      summary: firstSentence.length > 220 ? `${firstSentence.slice(0, 217)}...` : firstSentence,
    };
  });

  const flashcards = (keywords.length ? keywords : [lessonTitle])
    .slice(0, 8)
    .map((keyword, idx) => {
      const supporting = sentences.find((sentence) => sentence.toLowerCase().includes(keyword.toLowerCase())) || generated.summary || '';
      return {
        question: `What should you remember about ${keyword}?`,
        answer: supporting ? supporting.slice(0, 260) : `${keyword} is an important concept from ${lessonTitle}.`,
        difficulty: idx < 3 ? 'easy' : idx < 6 ? 'medium' : 'hard',
        tags: [keyword],
      };
    });

  const quizQuestions = flashcards.slice(0, 5).map((card, idx) => ({
    question: idx === 0
      ? `Which point best summarizes ${lessonTitle}?`
      : card.question,
    options: [
      card.answer,
      `It is not connected to ${lessonTitle}.`,
      'It is only course metadata.',
      'It should be skipped during revision.',
    ],
    answer: card.answer,
    explanation: `This answer is based on the lecture transcript segment and helps revise ${card.tags[0] || lessonTitle}.`,
  }));

  return {
    summary: generated.summary || summarizeSentence(sentences.slice(0, 3).join(' '), 700) || `${lessonTitle} introduces the main lecture concepts and examples students should revise.`,
    detailedSummary: generated.detailedSummary || [
      globalContext ? `Global Context\n${globalContext}` : '',
      '',
      'Detailed Lecture Summary',
      generated.summary || summarizeSentence(sentences.slice(0, 4).join(' '), 900),
      '',
      'Execution Flow',
      ...normalizedTakeaways.map((item) => `- ${item}`),
    ].filter(Boolean).join('\n'),
    keyTakeaways: normalizedTakeaways,
    importantConcepts: keywords,
    topicWisePoints: timestampSummaries,
    timestamps: timestampSummaries,
    transcriptSegments: segments,
    flashcards,
    quizQuestions,
    revisionNotes: generated.revisionMaterial || [
      'Revision Notes',
      ...normalizedTakeaways.slice(0, 6).map((item, idx) => `${idx + 1}. ${item}`),
      '',
      'Practice: review the flashcards, then answer the quiz questions without checking the answers first.',
    ].filter(Boolean).join('\n'),
  };
};

export const buildGlobalLessonContext = ({ course = {}, section = {}, lesson = {} }) => {
  const parts = [];
  const objectives = Array.isArray(course.objectives)
    ? course.objectives.map(cleanText).filter(Boolean).slice(0, 6)
    : [];
  const requirements = Array.isArray(course.requirements)
    ? course.requirements.map(cleanText).filter(Boolean).slice(0, 5)
    : [];
  const tags = Array.isArray(course.tags)
    ? course.tags.map(cleanText).filter(Boolean).slice(0, 10)
    : [];

  if (course.title) parts.push(`Course: ${cleanText(course.title)}`);
  if (course.subtitle) parts.push(`Course subtitle: ${cleanText(course.subtitle)}`);
  if (course.description) parts.push(`Course description: ${cleanText(course.description)}`);
  if (section.title) parts.push(`Section: ${cleanText(section.title)}`);
  if (section.description) parts.push(`Section description: ${cleanText(section.description)}`);
  if (lesson.title) parts.push(`Lesson: ${cleanText(lesson.title)}`);
  if (lesson.type) parts.push(`Lesson type: ${cleanText(lesson.type)}`);
  if (lesson.videoDuration) parts.push(`Duration: ${cleanText(lesson.videoDuration)}`);
  if (objectives.length) parts.push(`Course objectives: ${objectives.join('; ')}`);
  if (requirements.length) parts.push(`Course requirements: ${requirements.join('; ')}`);
  if (course.targetAudience) parts.push(`Target audience: ${cleanText(course.targetAudience)}`);
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);

  return parts.join('\n').trim();
};

const PLACEHOLDER_VALUES = new Set([
  'test',
  'new lesson',
  'lesson',
  'description',
  'sample',
  'demo',
  'n/a',
  'na',
  'none',
]);

const isMeaningfulLectureText = (value) => {
  const text = cleanText(value);
  if (text.length < 80) return false;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const unique = new Set(words.filter((word) => word.length > 2));
  if (unique.size < 15) return false;
  const placeholderHits = words.filter((word) => PLACEHOLDER_VALUES.has(word)).length;
  return placeholderHits / Math.max(words.length, 1) < 0.25;
};

export const normalizeManualTranscript = (value = '') => {
  const text = cleanText(value);
  return isMeaningfulLectureText(text) ? text : '';
};

const extractYouTubeVideoId = (url = '') => {
  const raw = String(url || '').trim();
  if (!raw) return '';

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?[^#]*v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }

  try {
    const parsed = new URL(raw);
    return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
};

const decodeEntities = (value = '') => String(value)
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

const parseTranscriptTracks = (xml = '') => {
  const tracks = [];
  const regex = /<track\b([^>]*)\/?>/g;
  let match;
  while ((match = regex.exec(xml))) {
    const attrs = match[1] || '';
    const langCode = attrs.match(/lang_code="([^"]+)"/)?.[1] || '';
    const name = attrs.match(/name="([^"]*)"/)?.[1] || '';
    if (langCode) tracks.push({ langCode, name: decodeEntities(name) });
  }
  return tracks;
};

const parseTranscriptText = (xml = '') => {
  const lines = [];
  const regex = /<text\b[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml))) {
    const text = decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines.join(' ');
};

export const fetchYouTubeTranscript = async (url = '') => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId || typeof fetch !== 'function') return '';

  const listUrl = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listResponse = await fetch(listUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 CEAS-LMS/1.0' },
  });
  if (!listResponse.ok) return '';

  const tracks = parseTranscriptTracks(await listResponse.text());
  if (!tracks.length) return '';

  const preferred = tracks.find((t) => t.langCode === 'en')
    || tracks.find((t) => t.langCode?.startsWith('en'))
    || tracks[0];

  const params = new URLSearchParams({ v: videoId, lang: preferred.langCode });
  if (preferred.name) params.set('name', preferred.name);

  const transcriptResponse = await fetch(`https://video.google.com/timedtext?${params.toString()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 CEAS-LMS/1.0' },
  });
  if (!transcriptResponse.ok) return '';

  const transcript = parseTranscriptText(await transcriptResponse.text());
  return isMeaningfulLectureText(transcript) ? transcript : '';
};

export const resolveLessonLectureText = async ({ lesson = {}, transcriptOverride = '' }) => {
  const manualTranscript = normalizeManualTranscript(transcriptOverride);
  if (manualTranscript) return { text: manualTranscript, source: 'manual-transcript' };

  const existing = getLessonLectureText({ lesson });
  if (existing.text) return existing;

  // Try to transcribe DB-stored video if it exists (NEW: Check GridFS/FileAsset videos)
  if (lesson.videoAsset?.storageProvider === 'gridfs' || lesson.videoAsset?.fileAssetId) {
    try {
      console.log(`[AI] Attempting to transcribe DB video for lesson: ${lesson._id || lesson.title}`);
      const { transcribeLessonVideo } = await import('../services/videoTranscription.service.js');
      const videoTranscript = await transcribeLessonVideo({ lesson });
      if (videoTranscript) {
        console.log(`[AI] Successfully transcribed DB video (source: video-asr)`);
        return { text: videoTranscript, source: 'video-asr' };
      }
    } catch (error) {
      console.warn(`[AI] Failed to transcribe DB video: ${error.message}`);
      // Fall through to YouTube attempt
    }
  }

  const videoUrl = lesson.videoUrl || lesson.lessonVideo || '';
  try {
    const transcript = await fetchYouTubeTranscript(videoUrl);
    if (transcript) return { text: transcript, source: 'youtube-captions' };
  } catch {
    // Caption extraction is best-effort; the caller will handle missing text.
  }

  return existing;
};

export const getLessonLectureText = ({ lesson = {} }) => {
  if (isMeaningfulLectureText(lesson.transcript)) {
    return { text: cleanText(lesson.transcript), source: 'transcript' };
  }

  if (isMeaningfulLectureText(lesson.content)) {
    return {
      text: cleanText(lesson.content),
      source: lesson.type === 'article' ? 'article-content' : 'lesson-content',
    };
  }

  return { text: '', source: '' };
};

export const buildInsufficientLectureNotes = ({ lessonTitle = 'this lesson', mode = 'short' }) => {
  const detail = mode === 'detailed'
    ? 'The system could not extract enough spoken text from this lecture video. Re-upload clearer audio/video and regenerate AI Notes.'
    : 'Automatic transcription did not capture enough lecture content. Regenerate after checking the video audio quality.';

  return {
    summary: `I could not generate a real video lecture summary because no lecture transcript or meaningful lesson content is available for "${lessonTitle}". ${detail}`,
    keyTakeaways: [
      'AI Notes need enough spoken lecture content from the video transcript to summarize accurately.',
      'The current lesson video did not produce enough usable transcript text.',
      'Check video audio clarity and regenerate to unlock summary, key concepts, examples, and revision material.',
    ],
    mindMap: {
      root: lessonTitle || 'Video lecture',
      branches: [
        {
          label: 'Missing Source',
          items: ['clear lecture audio', 'auto transcript', 'spoken explanations', 'video speech content'],
        },
      ],
    },
    interviewQuestions: [
      {
        question: 'Why did AI Notes skip this video?',
        answer: 'The automatic transcript did not contain enough meaningful spoken lecture content, so the system avoided generating inaccurate notes.',
        difficulty: 'easy',
      },
    ],
    examples: [
      'Example fix: upload a clearer lecture recording with audible speech, then regenerate.',
    ],
    revisionMaterial: [
      'To generate lecture-specific revision material:',
      '1. Open the video lesson and verify the audio track plays clearly.',
      '2. Re-upload the lecture video if audio is noisy or silent.',
      '3. Save the course.',
      '4. Regenerate AI Notes.',
    ].join('\n'),
  };
};

export const buildLessonTextForAi = ({ course = {}, section = {}, lesson = {} }) => {
  const parts = [];
  const lecture = getLessonLectureText({ lesson });
  const globalContext = buildGlobalLessonContext({ course, section, lesson });

  if (globalContext) parts.push(`Global context:\n${globalContext}`);
  if (lecture.text) {
    const sourceLabel = ['transcript', 'youtube-captions', 'manual-transcript', 'video-asr'].includes(lecture.source) ? 'Video transcript' : 'Lecture content';
    parts.push(`${sourceLabel}:\n${lecture.text}`);
  }

  if (lecture.text && Array.isArray(lesson.questions) && lesson.questions.length > 0) {
    const qs = lesson.questions
      .slice(0, 20)
      .map((q, idx) => {
        const opts = Array.isArray(q.options) ? q.options.map((o) => cleanText(o.text)).filter(Boolean).slice(0, 6).join(', ') : '';
        return `Q${idx + 1}: ${cleanText(q.question)}${opts ? ` (Options: ${opts})` : ''}\nAnswer: ${cleanText(q.correctAnswer)}\nExplanation: ${cleanText(q.explanation)}`;
      })
      .join('\n\n');
    parts.push(`Topic Questions:\n${qs}`);
  }

  if (lecture.text && Array.isArray(lesson.resources) && lesson.resources.length > 0) {
    const res = lesson.resources
      .slice(0, 10)
      .map((r) => `${cleanText(r.title || r.type || 'resource')} (${r.type || 'link'}): ${cleanText(r.url || '')}`)
      .join('\n');
    parts.push(`Resources:\n${res}`);
  }

  return parts.filter(Boolean).join('\n\n').trim();
};

export const generateAiLessonNotesHeuristicFromLesson = async ({ lessonTitle, courseTitle, course, section, lesson, mode }) => {
  const lecture = getLessonLectureText({ lesson });
  if (!lecture.text) {
    return buildInsufficientLectureNotes({ lessonTitle: lessonTitle || courseTitle || 'this lesson', mode });
  }

  const contentText = buildLessonTextForAi({
    course: course || { title: courseTitle },
    section,
    lesson,
  });

  return generateAiLessonNotesHeuristic({
    lessonTitle: lessonTitle || courseTitle || 'Lesson',
    contentText,
    mode,
  });
};

