import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const errorResponse = (next, statusCode, message) => {
  return next(new ErrorResponse(message, statusCode));
};
import MicroLesson from '../models/MicroLesson.model.js';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import LearningProgress from '../models/LearningProgress.model.js';
import UserLearningStats from '../models/UserLearningStats.model.js';
import AITutorConversation from '../models/AITutorConversation.model.js';
import Achievement from '../models/Achievement.model.js';
import aiContentAnalyzer from '../services/aiContentAnalyzer.service.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '../..');
const TUTOR_UPLOAD_DIR = path.join(BACKEND_ROOT, 'uploads', 'ai-tutor');

const ALLOWED_TUTOR_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'application/octet-stream',
]);

const ALLOWED_TUTOR_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md']);

const getFileExt = (filename = '') => path.extname(String(filename || '')).toLowerCase();

const cleanText = (value = '') => String(value || '')
  .replace(/\r/g, ' ')
  .replace(/\t/g, ' ')
  .replace(/[ ]{2,}/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const tokenize = (value = '') => cleanText(value)
  .toLowerCase()
  .split(/[^a-z0-9\u0900-\u097F]+/g)
  .filter((token) => token.length > 2);

const hashToken = (token = '') => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const buildEmbedding = (value = '', dimensions = 64) => {
  const vector = Array(dimensions).fill(0);
  tokenize(value).forEach((token) => {
    const hash = hashToken(token);
    const index = hash % dimensions;
    vector[index] += (hash & 1) ? 1 : -1;
  });
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => Number((item / magnitude).toFixed(4)));
};

const cosineSimilarity = (a = [], b = []) => {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;
  let dot = 0;
  for (let i = 0; i < length; i += 1) dot += Number(a[i] || 0) * Number(b[i] || 0);
  return dot;
};

const topKeywords = (value = '', limit = 8) => {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were', 'have',
    'has', 'will', 'can', 'you', 'your', 'about', 'into', 'between', 'their', 'there',
    'hai', 'hain', 'kya', 'kaise', 'liye', 'aur', 'mein', 'nahi', 'batao', 'samjhao',
  ]);
  const counts = new Map();
  tokenize(value).forEach((token) => {
    if (stopWords.has(token)) return;
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
};

const detectChapters = (value = '') => {
  const lines = cleanText(value).split('\n').map((line) => line.trim()).filter(Boolean);
  const chapters = [];
  let charCursor = 0;
  lines.forEach((line, lineIndex) => {
    const compact = line.replace(/\s+/g, ' ');
    const looksNumbered = /^(chapter|unit|module|lesson|section|slide)\s+\d+|^\d+(\.\d+)*[\).:-]\s+/i.test(compact);
    const looksHeading = compact.length >= 4 && compact.length <= 90 && /^[A-Z0-9][A-Za-z0-9\s:,-]+$/.test(compact);
    if ((looksNumbered || looksHeading) && chapters.length < 24) {
      chapters.push({ title: compact, index: lineIndex, charIndex: charCursor });
    }
    charCursor += line.length + 1;
  });
  return chapters;
};

const detectTables = (value = '') => cleanText(value)
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /\|/.test(line) || (line.match(/\s{2,}/g) || []).length >= 2)
  .slice(0, 10)
  .map((line, index) => ({ index, preview: line.slice(0, 260) }));

const buildDocumentStructure = (value = '') => {
  const keywords = topKeywords(value, 18);
  const sentences = splitSentences(value);
  const concepts = keywords.slice(0, 12).map((term, index) => ({ term, score: 12 - index }));
  const flashcards = concepts.slice(0, 8).map(({ term }) => {
    const sentence = sentences.find((line) => line.toLowerCase().includes(term)) || summarizeExtractedText(value);
    return {
      question: `What is ${term}?`,
      answer: sentence.slice(0, 280),
    };
  });
  const quizQuestions = concepts.slice(0, 5).map(({ term }, index) => ({
    question: `Which concept is important for understanding "${term}"?`,
    options: [term, concepts[(index + 1) % concepts.length]?.term || 'revision', 'unrelated topic', 'none of these'],
    answer: term,
    explanation: `The uploaded material repeatedly highlights "${term}" as an important concept.`,
  }));
  const conceptMap = concepts.slice(0, 8).map(({ term }, index) => ({
    concept: term,
    related: concepts
      .filter((_, relatedIndex) => relatedIndex !== index)
      .slice(0, 3)
      .map((item) => item.term),
  }));

  return {
    chapters: detectChapters(value),
    tables: detectTables(value),
    importantConcepts: concepts,
    flashcards,
    quizQuestions,
    conceptMap,
  };
};

const chunkText = (value = '', chunkSize = 1200, overlap = 180) => {
  const text = cleanText(value);
  if (!text) return [];
  const chunks = [];
  const chapters = detectChapters(text);
  let index = 0;
  let cursor = 0;
  while (cursor < text.length && index < 80) {
    const end = Math.min(text.length, cursor + chunkSize);
    const chunkBody = text.slice(cursor, end).trim();
    const chapter = chapters
      .filter((item) => item.charIndex <= cursor)
      .at(-1);
    chunks.push({
      index,
      text: chunkBody,
      chapterTitle: chapter?.title || '',
      keywords: topKeywords(chunkBody, 8),
      embedding: buildEmbedding(chunkBody),
    });
    cursor = end >= text.length ? end : Math.max(0, end - overlap);
    index += 1;
    if (end >= text.length) break;
  }
  return chunks.filter((item) => item.text.length > 0);
};

const summarizeExtractedText = (value = '') => {
  const sentences = cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 24)
    .slice(0, 6);
  return sentences.join(' ');
};

const stripPdfAccessDisclaimer = (value = '') => String(value || '')
  .replace(/please note that a more detailed summary is not possible without access to the full pdf content\.?/gi, '')
  .replace(/not possible without access to the full pdf content\.?/gi, '')
  .replace(/without access to the full (pdf|document|file) content\.?/gi, '')
  .replace(/i (can('|’)t|cannot) access the full (pdf|document|file)\.?/gi, '')
  .replace(/more detailed summary .* not possible .* full (pdf|document|file)/gi, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const hasPdfAccessDisclaimer = (value = '') => /without access to the full (pdf|document|file) content|i (can('|’)t|cannot) access the full (pdf|document|file)|more detailed summary .* not possible/i.test(String(value || ''));

const splitSentences = (value = '') => cleanText(value)
  .split(/(?<=[.!?])\s+/)
  .map((line) => line.trim())
  .filter((line) => line.length > 28);

const buildLocalNotesFromExtractedText = ({ text = '', detailed = false }) => {
  const sentences = splitSentences(text);
  const summaryCount = detailed ? 10 : 4;
  const summary = sentences.slice(0, summaryCount).join(' ');
  const keyTakeaways = sentences
    .slice(summaryCount, summaryCount + (detailed ? 14 : 7))
    .map((line) => line.length > 220 ? `${line.slice(0, 217)}...` : line);

  return {
    summary: summary || summarizeExtractedText(text),
    keyTakeaways: keyTakeaways.length ? keyTakeaways : [summarizeExtractedText(text)],
    revisionMaterial: [
      'Revision Notes',
      ...(keyTakeaways.length ? keyTakeaways : sentences.slice(0, 8)).map((line, idx) => `${idx + 1}. ${line}`),
    ].join('\n'),
    examples: [],
    interviewQuestions: [],
  };
};

const looksLikeSummaryRequest = (message = '') => {
  const text = String(message || '').toLowerCase();
  return [
    'summar',
    'summary',
    'summarize',
    'explain this file',
    'key points',
    'notes',
    'detailed',
    'detail',
    'describe',
    'full details',
    'complete details',
    'poora',
    'details me',
    'pdf ka summary',
    'document summary',
  ].some((token) => text.includes(token));
};

const detectDocumentMode = (message = '') => {
  const text = String(message || '').toLowerCase();
  if (/mcq|quiz|test|practice question|question banao|प्रश्न|क्विज/.test(text)) return 'quiz';
  if (/flashcard|flash card|cards/.test(text)) return 'flashcards';
  if (/interview|viva|oral|interview questions|साक्षात्कार/.test(text)) return 'interview';
  if (/revision|revise|short notes|notes|key points|important points|takeaways|महत्वपूर्ण/.test(text)) return 'revision';
  if (/chapter|unit|module|section|slide-wise|slide wise|chapter-wise|chapter wise/.test(text)) return 'chapter-wise';
  if (/simple|beginner|easy|basic|samjhao|samjha|hindi|hinglish|आसान/.test(text)) return 'beginner';
  if (/technical|deep|detailed|detail|architecture|algorithm|code|math|formula/.test(text)) return 'technical';
  if (/summar|summary|explain this|document|pdf|ppt|file/.test(text)) return wantsDetailedSummary(message) ? 'detailed-summary' : 'short-summary';
  return 'qa';
};

const isCasualTutorMessage = (message = '') => {
  const text = cleanText(message).toLowerCase();
  return /^(hi|hello|hey|hii+|namaste|good morning|good afternoon|good evening|kaise ho|kaise ho\?|kya haal|kya haal\?|sab badiya|sab badhiya|sab bdhiya|sab thik|sab theek|all good|how are you|how are you\?)$/i.test(text);
};

const buildCasualTutorReply = (message = '') => {
  const text = cleanText(message).toLowerCase();
  if (/kaise|kya haal|sab|bdhiya|badiya|badhiya|thik|theek/.test(text)) {
    return 'Haan, sab badhiya! Aap batao, kis topic ya course me help chahiye?';
  }
  return 'Hi! Main ready hoon. Aap course, lesson, PDF, quiz ya topic ke baare me pooch sakte ho.';
};

const formatDocumentStructureForPrompt = (structure = {}) => {
  const chapters = (structure.chapters || []).slice(0, 10).map((item, idx) => `${idx + 1}. ${item.title}`).join('\n');
  const tables = (structure.tables || []).slice(0, 5).map((item, idx) => `${idx + 1}. ${item.preview}`).join('\n');
  const concepts = (structure.importantConcepts || []).slice(0, 12).map((item) => item.term).join(', ');
  const flashcards = (structure.flashcards || []).slice(0, 5).map((item, idx) => `${idx + 1}. Q: ${item.question} A: ${item.answer}`).join('\n');
  const quiz = (structure.quizQuestions || []).slice(0, 5).map((item, idx) => `${idx + 1}. ${item.question} Answer: ${item.answer}`).join('\n');
  return [
    chapters ? `Detected chapters/slides:\n${chapters}` : '',
    concepts ? `Important concepts: ${concepts}` : '',
    tables ? `Detected table-like content:\n${tables}` : '',
    flashcards ? `Auto flashcards:\n${flashcards}` : '',
    quiz ? `Auto quiz seeds:\n${quiz}` : '',
  ].filter(Boolean).join('\n\n');
};

const wantsDetailedSummary = (message = '') => /detailed|detail|deep|full|complete|long/i.test(String(message || ''));
const wantsShortSummary = (message = '') => /short|brief|quick|concise/i.test(String(message || ''));

const formatAttachmentSummaryResponse = ({ notes = {}, attachmentName = 'uploaded file', detailed = false }) => {
  const summary = stripPdfAccessDisclaimer(cleanText(notes.summary || ''));
  const keyTakeaways = Array.isArray(notes.keyTakeaways) ? notes.keyTakeaways.filter(Boolean).slice(0, 8) : [];
  const revisionMaterial = stripPdfAccessDisclaimer(cleanText(notes.revisionMaterial || ''));
  const examples = Array.isArray(notes.examples) ? notes.examples.filter(Boolean).slice(0, 5) : [];
  const interviewQuestions = Array.isArray(notes.interviewQuestions) ? notes.interviewQuestions.filter(Boolean).slice(0, 4) : [];

  const parts = [];
  parts.push(`${detailed ? 'Detailed Summary' : 'Short Summary'} for "${attachmentName}":`);
  parts.push(summary || 'No summary generated.');
  if (keyTakeaways.length) {
    parts.push('');
    parts.push('Key points:');
    keyTakeaways.forEach((point, idx) => parts.push(`${idx + 1}. ${point}`));
  }
  if (detailed && revisionMaterial) {
    parts.push('');
    parts.push('Revision notes:');
    parts.push(revisionMaterial.slice(0, 2200));
  }
  if (detailed && examples.length) {
    parts.push('');
    parts.push('Examples:');
    examples.forEach((item, idx) => parts.push(`${idx + 1}. ${item}`));
  }
  if (detailed && interviewQuestions.length) {
    parts.push('');
    parts.push('Practice questions:');
    interviewQuestions.forEach((item, idx) => {
      const question = cleanText(item.question || '');
      const answer = cleanText(item.answer || '');
      parts.push(`${idx + 1}. ${question}`);
      if (answer) parts.push(`   Answer: ${answer}`);
    });
  }
  return parts.join('\n');
};

const extractAttachmentSummaryFromContext = (contextContent = '') => {
  const text = String(contextContent || '');
  const marker = 'Attachment summary:';
  const idx = text.indexOf(marker);
  if (idx === -1) return '';
  const sliced = text.slice(idx + marker.length).trim();
  return stripPdfAccessDisclaimer(sliced.split('\n').slice(0, 8).join('\n').trim());
};

const buildAttachmentOnlyFallback = ({ message = '', contextContent = '' }) => {
  const attachmentSummary = extractAttachmentSummaryFromContext(contextContent);
  if (!attachmentSummary) return null;

  if (looksLikeSummaryRequest(message)) {
    return {
      content: [
        'Here is the summary from your uploaded file:',
        '',
        attachmentSummary,
        '',
        'Ask follow-up questions like: "give key points", "make quiz questions", "explain point 2".',
      ].join('\n'),
      sources: [],
    };
  }

  return {
    content: [
      'AI service is temporarily unavailable, but I can still use your uploaded file context.',
      '',
      `Attachment summary:\n${attachmentSummary}`,
      '',
      'Ask a specific question from this file and I will answer from the extracted content.',
    ].join('\n'),
    sources: [],
  };
};

const extractPdfText = async (filePath) => {
  const pdfModule = await import('pdf-parse');
  const buffer = await fs.readFile(filePath);

  if (typeof pdfModule?.PDFParse === 'function') {
    const parser = new pdfModule.PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return cleanText(result?.text || '');
    } finally {
      await parser.destroy().catch(() => {});
    }
  }

  const legacyParser = pdfModule?.default || pdfModule;
  if (typeof legacyParser === 'function') {
    const result = await legacyParser(buffer);
    return cleanText(result?.text || '');
  }

  throw new Error('Unable to parse PDF in current server runtime. Please contact admin to enable PDF parser.');
};

const stripXmlText = (value = '') => String(value || '')
  .replace(/<a:br\s*\/>/g, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/\s{2,}/g, ' ')
  .trim();

const extractPptxText = async (filePath) => {
  const jszipModule = await import('jszip');
  const JSZip = jszipModule.default || jszipModule;
  const zip = await JSZip.loadAsync(await fs.readFile(filePath));
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const noteFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/notesSlide(\d+)/i)?.[1] || 0) - Number(b.match(/notesSlide(\d+)/i)?.[1] || 0));

  const parts = [];
  for (const [idx, name] of slideFiles.entries()) {
    const xml = await zip.files[name].async('text');
    const text = stripXmlText(xml);
    if (text) parts.push(`Slide ${idx + 1}: ${text}`);
  }
  for (const [idx, name] of noteFiles.entries()) {
    const xml = await zip.files[name].async('text');
    const text = stripXmlText(xml);
    if (text) parts.push(`Speaker notes ${idx + 1}: ${text}`);
  }
  return cleanText(parts.join('\n\n'));
};

const pickRelevantAttachmentChunks = ({ question = '', chunks = [] }) => {
  const tokens = new Set(tokenize(question));
  const questionEmbedding = buildEmbedding(question);
  if (!tokens.size) return chunks.slice(0, 4);

  const scored = chunks
    .map((chunk) => {
      const chunkTokens = tokenize(chunk.text);
      const keywordScore = chunkTokens.reduce((sum, token) => sum + (tokens.has(token) ? 1 : 0), 0);
      const semanticScore = cosineSimilarity(questionEmbedding, chunk.embedding || buildEmbedding(chunk.text));
      const score = keywordScore + semanticScore;
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0.05)
    .sort((a, b) => b.score - a.score);

  return (scored.length ? scored : chunks).slice(0, 6);
};

const wantsCourseWideContext = (message = '') => {
  const text = String(message || '').toLowerCase();
  return [
    'course',
    'syllabus',
    'curriculum',
    'module',
    'lecture wise',
    'lesson wise',
    'chapter wise',
    'roadmap',
    'what should i study',
    'pura',
    'poora',
    'sab',
    'overview',
    'summary',
    'revision',
    'important',
  ].some((token) => text.includes(token));
};

const getLessonProgressLabel = (enrollment, lessonId) => {
  const progress = (enrollment?.lessonProgress || [])
    .find((item) => String(item.lessonId) === String(lessonId));
  if (!progress) return 'not started';
  if (progress.completed) return 'completed';
  if (Number(progress.watchedSeconds || progress.timeSpent || progress.lastPosition || 0) > 0) return 'in progress';
  return 'not started';
};

const buildCourseLessonText = ({ course, section, lesson, sectionIndex, lessonIndex, progressLabel }) => {
  const generated = lesson.videoSummary?.generated || {};
  const questions = (lesson.questions || [])
    .slice(0, 8)
    .map((question, index) => {
      const options = (question.options || []).map((option) => option.text).filter(Boolean).join(', ');
      return [
        `Question ${index + 1}: ${question.question || ''}`,
        options ? `Options: ${options}` : '',
        question.correctAnswer ? `Answer: ${question.correctAnswer}` : '',
        question.explanation ? `Explanation: ${question.explanation}` : '',
      ].filter(Boolean).join(' ');
    })
    .join('\n');
  const resources = (lesson.resources || [])
    .slice(0, 8)
    .map((resource) => `${resource.title || 'Resource'} (${resource.type || 'link'})`)
    .join(', ');
  const timestampPoints = (generated.topicWisePoints || generated.timestamps || [])
    .slice(0, 12)
    .map((item) => `${item.label || `${item.start || 0}s`}: ${item.summary || ''}`)
    .filter(Boolean)
    .join('\n');

  return [
    `Course: ${course.title}`,
    course.subtitle ? `Course subtitle: ${course.subtitle}` : '',
    `Section ${sectionIndex + 1}: ${section.title}`,
    section.description ? `Section description: ${section.description}` : '',
    `Lesson ${lessonIndex + 1}: ${lesson.title}`,
    `Lesson id: ${lesson._id}`,
    `Lesson type: ${lesson.type || 'lesson'}`,
    `Student progress for this lesson: ${progressLabel}`,
    lesson.content ? `Lesson content:\n${lesson.content}` : '',
    lesson.transcript ? `Saved transcript:\n${lesson.transcript}` : '',
    lesson.videoSummary?.transcript ? `Generated transcript:\n${lesson.videoSummary.transcript}` : '',
    generated.summary ? `AI lecture summary:\n${generated.summary}` : '',
    generated.detailedSummary ? `Detailed lecture notes:\n${generated.detailedSummary}` : '',
    generated.keyTakeaways?.length ? `Key takeaways:\n${generated.keyTakeaways.join('\n')}` : '',
    generated.importantConcepts?.length ? `Important concepts:\n${generated.importantConcepts.join(', ')}` : '',
    generated.revisionNotes ? `Revision notes:\n${generated.revisionNotes}` : '',
    timestampPoints ? `Topic wise lecture points:\n${timestampPoints}` : '',
    questions ? `Embedded quiz/questions:\n${questions}` : '',
    resources ? `Lesson resources: ${resources}` : '',
  ].filter(Boolean).join('\n\n');
};

const buildCourseRagChunks = ({ course, enrollment }) => {
  const chunks = [];
  (course.sections || []).forEach((section, sectionIndex) => {
    (section.lessons || []).forEach((lesson, lessonIndex) => {
      const progressLabel = getLessonProgressLabel(enrollment, lesson._id);
      const lessonText = cleanText(buildCourseLessonText({
        course,
        section,
        lesson,
        sectionIndex,
        lessonIndex,
        progressLabel,
      }));
      if (!lessonText) return;

      chunkText(lessonText, 1600, 220).forEach((chunk) => {
        chunks.push({
          ...chunk,
          sectionTitle: section.title,
          lessonTitle: lesson.title,
          lessonId: lesson._id,
          progressLabel,
          text: chunk.text,
          embedding: chunk.embedding || buildEmbedding(chunk.text),
        });
      });
    });
  });
  return chunks;
};

const pickRelevantCourseChunks = ({ question = '', chunks = [], forceOverview = false }) => {
  if (!chunks.length) return [];
  if (forceOverview) return chunks.slice(0, 14);

  const tokens = new Set(tokenize(question));
  const questionEmbedding = buildEmbedding(question);
  const scored = chunks
    .map((chunk) => {
      const haystack = `${chunk.sectionTitle || ''} ${chunk.lessonTitle || ''} ${chunk.text || ''}`;
      const chunkTokens = tokenize(haystack);
      const keywordScore = chunkTokens.reduce((sum, token) => sum + (tokens.has(token) ? 1 : 0), 0);
      const semanticScore = cosineSimilarity(questionEmbedding, chunk.embedding || buildEmbedding(haystack));
      const titleBoost = [...tokens].some((token) => tokenize(chunk.lessonTitle || '').includes(token)) ? 2 : 0;
      return { ...chunk, score: keywordScore + semanticScore + titleBoost };
    })
    .filter((chunk) => chunk.score > 0.05)
    .sort((a, b) => b.score - a.score);

  return (scored.length ? scored : chunks).slice(0, 10);
};

const buildCourseLearningMap = ({ course, enrollment }) => {
  const lines = [
    `Selected course: ${course.title}`,
    course.subtitle ? `Subtitle: ${course.subtitle}` : '',
    course.description ? `Description: ${cleanText(course.description).slice(0, 1200)}` : '',
    course.objectives?.length ? `Learning objectives: ${course.objectives.join('; ')}` : '',
    course.requirements?.length ? `Requirements: ${course.requirements.join('; ')}` : '',
    enrollment ? `Student course progress: ${enrollment.progressPercent || 0}% (${enrollment.status || 'enrolled'})` : 'Student course progress: no enrollment record found',
  ].filter(Boolean);

  (course.sections || []).forEach((section, sectionIndex) => {
    lines.push(`Section ${sectionIndex + 1}: ${section.title}`);
    (section.lessons || []).forEach((lesson, lessonIndex) => {
      lines.push(`- Lesson ${sectionIndex + 1}.${lessonIndex + 1}: ${lesson.title} [${lesson.type || 'lesson'}] - ${getLessonProgressLabel(enrollment, lesson._id)}`);
    });
  });

  return lines.join('\n');
};

const buildSelectedCourseContext = async ({ userId, courseId, message }) => {
  if (!courseId) return { context: '', sources: [] };

  const course = await Course.findById(courseId)
    .select([
      'title subtitle description objectives requirements sections.title sections.description',
      'sections.lessons._id sections.lessons.title sections.lessons.type sections.lessons.content',
      'sections.lessons.transcript sections.lessons.videoSummary sections.lessons.resources sections.lessons.questions',
    ].join(' '))
    .lean();

  if (!course) return { context: '', sources: [] };

  const enrollment = await Enrollment.findOne({ user: userId, course: courseId }).lean();
  const courseChunks = buildCourseRagChunks({ course, enrollment });
  const relevantChunks = pickRelevantCourseChunks({
    question: message,
    chunks: courseChunks,
    forceOverview: wantsCourseWideContext(message),
  });

  const retrievedContext = relevantChunks.map((chunk, index) => [
    `(${index + 1}) Section: ${chunk.sectionTitle}`,
    `Lesson: ${chunk.lessonTitle}`,
    `Progress: ${chunk.progressLabel}`,
    `Excerpt:\n${chunk.text}`,
  ].join('\n')).join('\n\n');

  return {
    context: [
      'SELECTED COURSE RAG CONTEXT:',
      'Use this course context as the primary source for answering. If the student selected this course, do not ask for course details again.',
      buildCourseLearningMap({ course, enrollment }),
      retrievedContext ? `RAG retrieved lecture-wise course excerpts:\n${retrievedContext}` : '',
    ].filter(Boolean).join('\n\n').slice(0, 50000),
    sources: relevantChunks.map((chunk) => ({
      lessonTitle: chunk.lessonTitle,
      lessonId: chunk.lessonId,
      excerpt: cleanText(chunk.text).slice(0, 500),
    })),
  };
};

const normalizeCourseMatchText = (value = '') => cleanText(value)
  .toLowerCase()
  .replace(/\+\+/g, ' plus plus ')
  .replace(/[^a-z0-9\u0900-\u097F]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const inferCourseIdFromQuestion = async ({ userId, message, courseId, conversationCourseId }) => {
  if (courseId) return courseId;
  if (conversationCourseId) return conversationCourseId;

  const enrollments = await Enrollment.find({ user: userId })
    .populate({
      path: 'course',
      select: 'title subtitle description sections.title sections.lessons.title sections.lessons.content sections.lessons.transcript',
    })
    .limit(20)
    .lean();

  const enrolledCourses = enrollments.map((item) => item.course).filter(Boolean);
  if (enrolledCourses.length === 1) return enrolledCourses[0]._id;
  if (!enrolledCourses.length) return null;

  const question = normalizeCourseMatchText(message);
  const questionTokens = new Set(question.split(' ').filter((token) => token.length > 1));

  const scored = enrolledCourses.map((course) => {
    const lessonText = (course.sections || [])
      .flatMap((section) => (section.lessons || []).map((lesson) => `${section.title || ''} ${lesson.title || ''}`))
      .join(' ');
    const haystack = normalizeCourseMatchText([
      course.title,
      course.subtitle,
      course.description,
      lessonText,
    ].filter(Boolean).join(' '));
    const courseTokens = new Set(haystack.split(' ').filter((token) => token.length > 1));
    let score = 0;

    questionTokens.forEach((token) => {
      if (courseTokens.has(token)) score += 3;
      else if (haystack.includes(token)) score += 1;
    });

    if (question && haystack.includes(question)) score += 10;
    if (course.title && question.includes(normalizeCourseMatchText(course.title))) score += 12;

    return { course, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].course._id : null;
};

const getLearningPaceLabel = (stats, progress = []) => {
  const completed = Number(stats?.totalLessonsCompleted || 0);
  const avgPerDay = Number(stats?.averageLessonsPerDay || 0);
  const avgQuiz = Number(stats?.averageQuizScore || 0);
  const inProgressCount = progress.filter((item) => !item.isCompleted && Number(item.completionPercentage || 0) > 0).length;

  if (avgQuiz < 50 && Number(stats?.totalQuizzesTaken || 0) > 0) return 'needs guided revision and easier practice';
  if (inProgressCount >= 4) return 'exploring many lessons; needs focused next action';
  if (avgPerDay >= 2 || completed >= 10) return 'fast learner; can handle deeper challenges';
  if (completed <= 2) return 'early-stage learner; explain gently from basics';
  return 'steady learner; balance explanation with practice';
};

const buildNextBestActions = ({ stats, progress = [], selectedCourseId }) => {
  const actions = [];
  const weakAreas = (stats?.weakAreas || []).slice(0, 3);
  const recentLowQuiz = progress
    .filter((item) => item.quizAttempted && Number(item.quizBestScore || item.quizScore || 0) < 60)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))[0];
  const pausedLesson = progress
    .filter((item) => !item.isCompleted && Number(item.completionPercentage || 0) >= 20)
    .sort((a, b) => new Date(b.lastAccessedAt || b.updatedAt || 0) - new Date(a.lastAccessedAt || a.updatedAt || 0))[0];

  if (weakAreas.length) {
    actions.push(`Revise weak topic: ${weakAreas[0].topic}`);
    actions.push(`Practice 5 questions on ${weakAreas[0].topic}`);
  }
  if (recentLowQuiz?.microLesson?.title) {
    actions.push(`Review quiz mistakes in "${recentLowQuiz.microLesson.title}"`);
  }
  if (pausedLesson?.microLesson?.title) {
    actions.push(`Continue "${pausedLesson.microLesson.title}" from ${Math.round(pausedLesson.completionPercentage || 0)}%`);
  }
  if (Number(stats?.currentStreak || 0) > 0) {
    actions.push(`Keep your ${stats.currentStreak}-day streak alive today`);
  } else {
    actions.push('Start today with one 5-minute Learning Byte');
  }
  if (selectedCourseId && actions.length < 4) {
    actions.push('Ask for a quick revision quiz from the selected course');
  }

  return [...new Set(actions)].slice(0, 5);
};

const buildLearnerProfileContext = async ({ userId, courseId }) => {
  const [stats, progress, enrollments] = await Promise.all([
    UserLearningStats.findOne({ user: userId }).lean(),
    LearningProgress.find({
      user: userId,
      ...(courseId ? { course: courseId } : {}),
    })
      .populate('microLesson', 'title topics difficulty duration')
      .sort({ lastAccessedAt: -1 })
      .limit(25)
      .lean(),
    Enrollment.find({ user: userId })
      .populate('course', 'title category level')
      .sort({ updatedAt: -1 })
      .limit(12)
      .lean(),
  ]);

  const completed = progress.filter((item) => item.isCompleted);
  const active = progress.filter((item) => !item.isCompleted && Number(item.completionPercentage || 0) > 0);
  const quizzes = progress.filter((item) => item.quizAttempted);
  const avgQuiz = quizzes.length
    ? Math.round(quizzes.reduce((sum, item) => sum + Number(item.quizBestScore || item.quizScore || 0), 0) / quizzes.length)
    : Math.round(Number(stats?.averageQuizScore || 0));
  const weakAreas = (stats?.weakAreas || []).slice(0, 5).map((item) => item.topic).filter(Boolean);
  const strongAreas = (stats?.strongAreas || []).slice(0, 5).map((item) => item.topic).filter(Boolean);
  const repeatedTopics = {};
  progress.forEach((item) => {
    (item.microLesson?.topics || []).forEach((topic) => {
      repeatedTopics[topic] = (repeatedTopics[topic] || 0) + 1;
    });
  });
  const behaviorPatterns = [
    getLearningPaceLabel(stats, progress),
    active.length ? `${active.length} lesson(s) currently in progress` : 'no active paused lesson detected',
    quizzes.length ? `quiz average around ${avgQuiz}% from ${quizzes.length} attempted quiz record(s)` : 'no quiz attempt pattern yet',
    Number(stats?.currentStreak || 0) >= 3 ? `consistent learner with ${stats.currentStreak}-day streak` : 'streak needs encouragement',
  ];
  const nextBestActions = buildNextBestActions({ stats, progress, selectedCourseId: courseId });

  const recentLessonLines = progress.slice(0, 8).map((item, index) => {
    const lesson = item.microLesson || {};
    return `${index + 1}. ${lesson.title || 'Lesson'} - ${Math.round(item.completionPercentage || 0)}% complete, quiz ${item.quizAttempted ? `${item.quizBestScore || item.quizScore || 0}%` : 'not attempted'}, topics: ${(lesson.topics || []).join(', ') || 'not tagged'}`;
  });

  return [
    'LEARNER PROFILE AND ADAPTIVE COACHING CONTEXT:',
    `Level: ${stats?.level || 1} (${stats?.levelTitle || 'Newcomer'}), XP: ${stats?.totalXP || 0}`,
    `Streak: current ${stats?.currentStreak || 0} day(s), best ${stats?.longestStreak || 0} day(s)`,
    `Completed lessons: ${stats?.totalLessonsCompleted || completed.length}, total watch time: ${Math.round(Number(stats?.totalWatchTime || 0) / 60)} minute(s)`,
    `Quiz performance: ${avgQuiz || 0}% average, quizzes taken: ${stats?.totalQuizzesTaken || quizzes.length}`,
    weakAreas.length ? `Weak topics: ${weakAreas.join(', ')}` : 'Weak topics: none detected yet',
    strongAreas.length ? `Strong topics: ${strongAreas.join(', ')}` : 'Strong topics: still being learned',
    `Behavior patterns: ${behaviorPatterns.join('; ')}`,
    enrollments.length ? `Enrolled courses: ${enrollments.map((item) => item.course?.title).filter(Boolean).join('; ')}` : 'Enrolled courses: none found',
    recentLessonLines.length ? `Recent lesson progress:\n${recentLessonLines.join('\n')}` : '',
    nextBestActions.length ? `Next best learning actions:\n${nextBestActions.map((item) => `- ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
};

const extractAttachmentText = async (file) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const filePath = file.path;
  const ext = getFileExt(file.originalname || file.fileName || file.path);

  if (ext === '.txt' || ext === '.md') {
    return cleanText(await fs.readFile(filePath, 'utf-8'));
  }

  if (ext === '.pdf') {
    return extractPdfText(filePath);
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth');
    const parsed = await mammoth.extractRawText({ path: filePath });
    return cleanText(parsed?.value || '');
  }

  if (ext === '.pptx') {
    return extractPptxText(filePath);
  }

  if (ext === '.doc') {
    throw new Error('Legacy .doc extraction is limited. Please upload PDF or DOCX for accurate AI answers.');
  }

  if (ext === '.ppt') {
    throw new Error('Legacy .ppt extraction is limited. Please upload PPTX for accurate AI answers.');
  }

  if (mime === 'text/plain' || mime === 'text/markdown') {
    return cleanText(await fs.readFile(filePath, 'utf-8'));
  }

  if (mime === 'application/pdf') {
    return extractPdfText(filePath);
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const parsed = await mammoth.extractRawText({ path: filePath });
    return cleanText(parsed?.value || '');
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return extractPptxText(filePath);
  }

  if (mime === 'application/msword') {
    throw new Error('Legacy .doc extraction is limited. Please upload PDF or DOCX for accurate AI answers.');
  }

  throw new Error('Unsupported file type for AI Tutor attachment');
};

const tutorAttachmentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(TUTOR_UPLOAD_DIR, { recursive: true });
      cb(null, TUTOR_UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const tutorAttachmentFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = getFileExt(file.originalname);
  const allowedByMime = ALLOWED_TUTOR_MIME_TYPES.has(mime);
  const allowedByExt = ALLOWED_TUTOR_EXTENSIONS.has(ext);

  if (!allowedByMime && !allowedByExt) {
    cb(new Error(`Unsupported file type: ${mime || 'unknown'} (${ext || 'no-ext'})`), false);
    return;
  }
  cb(null, true);
};

export const tutorAttachmentUpload = multer({
  storage: tutorAttachmentStorage,
  fileFilter: tutorAttachmentFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const buildTutorCacheKey = ({ userId, courseId, lessonId, message, attachmentId = '' }) => {
  const normalized = String(message || '').trim().toLowerCase();
  const digest = crypto.createHash('sha1').update(normalized).digest('hex');
  return `ai:tutor:v5:${userId}:${courseId || 'global'}:${lessonId || 'global'}:${attachmentId || 'none'}:${digest}`;
};

// @desc    Analyze content and generate micro-lessons
// @route   POST /api/byte-size/analyze
// @access  Private (Trainer/Admin)
export const analyzeContent = asyncHandler(async (req, res, next) => {
  const { courseId, content, options } = req.body;

  if (!courseId || !content) {
    return errorResponse(next, 400, 'Course ID and content are required');
  }

  const teacherId = req.user?._id;
  console.log(`[ByteLearning] Analyze requested { courseId: "${courseId}", teacherId: "${teacherId}" }`);

  const result = await aiContentAnalyzer.analyzeContent(courseId, content, options);

  if (!result.success) {
    return errorResponse(next, 500, result.error);
  }

  const rawLessons = result.data?.microLessons || [];
  if (rawLessons.length === 0) {
    return errorResponse(next, 500, 'AI generation succeeded but no byte array found in AI response.');
  }

  // Map fields on saved bytes
  const microLessonsToSave = rawLessons.map(lesson => ({
    ...lesson,
    course: courseId,
    courseId: courseId,
    sectionId: options?.sectionId || null,
    lessonId: options?.lessonId || null,
    contentType: options?.sourceVideoUrl ? 'video' : (lesson.contentType || 'text'),
    contentUrl: options?.sourceVideoUrl || lesson.contentUrl || '',
    videoStartTime: Number(lesson.videoStartTime || 0),
    videoEndTime: Number(lesson.videoEndTime || 0),
    teacherId: teacherId,
    createdBy: teacherId,
    status: 'draft',
    isPublished: false
  }));

  console.log(`[ByteLearning] Saving bytes { courseId: "${courseId}", count: ${microLessonsToSave.length} }`);

  // Save generated micro-lessons to database
  const savedLessons = await MicroLesson.insertMany(microLessonsToSave);

  if (!savedLessons || savedLessons.length === 0) {
    return errorResponse(next, 500, 'Failed to save generated bytes to database.');
  }

  const savedIds = savedLessons.map(l => l._id);
  console.log(`[ByteLearning] Bytes saved { courseId: "${courseId}", savedCount: ${savedLessons.length}, ids: ${JSON.stringify(savedIds)} }`);

  res.status(201).json({
    success: true,
    message: "AI bytes generated successfully",
    data: {
      courseId,
      generatedCount: microLessonsToSave.length,
      savedCount: savedLessons.length,
      byteIds: savedIds,
      bytes: savedLessons,
      source: result.data.source || "ai"
    }
  });
});

// @desc    Get all micro-lessons for a course
// @route   GET /api/byte-size/course/:courseId
// @access  Private
export const getCourseMicroLessons = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user._id;

  const isStudent = req.user.role === 'student' || req.user.role === 'participant';
  const query = {
    $and: [
      {
        $or: [
          { course: courseId },
          { courseId: courseId }
        ]
      },
      ...(isStudent ? [{
        $or: [
          { isPublished: true },
          { status: 'published' }
        ]
      }, {
        status: { $ne: 'archived' }
      }] : [])
    ]
  };

  let dbQuery = MicroLesson.find(query).sort({ order: 1 });
  if (isStudent) {
    dbQuery = dbQuery.select('-quiz.questions.correctAnswer');
  }

  const microLessons = await dbQuery;

  // Get progress for each lesson
  const progress = await LearningProgress.find({
    user: userId,
    $or: [
      { course: courseId },
      { courseId: courseId }
    ]
  });

  const progressMap = {};
  progress.forEach(p => {
    if (p.microLesson) {
      progressMap[p.microLesson.toString()] = p;
    }
  });

  // Add progress to lessons
  const lessonsWithProgress = microLessons.map(lesson => ({
    ...lesson.toObject(),
    userProgress: progressMap[lesson._id.toString()] || null
  }));

  res.json({
    success: true,
    data: lessonsWithProgress
  });
});

// @desc    Get all teacher-visible bytes/micro-lessons for a course
// @route   GET /api/byte-size/teacher/courses/:courseId/bytes
// @access  Private (Trainer/Admin)
export const getTeacherCourseBytes = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  res.set('Cache-Control', 'no-store');

  const query = {
    $or: [
      { course: courseId },
      { courseId: courseId }
    ]
  };

  const bytes = await MicroLesson.find(query).sort({ order: 1 });

  // Compute stats
  const stats = {
    total: bytes.length,
    draft: bytes.filter(b => b.status === 'draft' || (!b.isPublished && b.status !== 'review_required')).length,
    reviewRequired: bytes.filter(b => b.status === 'review_required').length,
    published: bytes.filter(b => b.isPublished || b.status === 'published').length,
    archived: bytes.filter(b => b.status === 'archived').length
  };

  console.log(`[ByteLearning] Fetch teacher bytes { courseId: "${courseId}", count: ${bytes.length}, stats: ${JSON.stringify(stats)} }`);

  res.json({
    success: true,
    data: {
      bytes,
      stats
    }
  });
});

// @desc    Get single micro-lesson details
// @route   GET /api/byte-size/lesson/:lessonId
// @access  Private
export const getMicroLesson = asyncHandler(async (req, res, next) => {
  const { lessonId } = req.params;
  const userId = req.user._id;

  const lesson = await MicroLesson.findById(lessonId);

  if (!lesson) {
    return errorResponse(next, 404, 'Micro-lesson not found');
  }

  // Get user progress for this lesson
  let progress = await LearningProgress.findOne({
    user: userId,
    microLesson: lessonId
  });

  // Create progress entry if doesn't exist
  if (!progress) {
    progress = await LearningProgress.create({
      user: userId,
      course: lesson.course,
      microLesson: lessonId,
      totalDuration: lesson.duration * 60
    });
  }

  res.json({
    success: true,
    data: {
      ...lesson.toObject(),
      userProgress: progress
    }
  });
});

// @desc    Update lesson progress
// @route   POST /api/byte-size/progress
// @access  Private
export const updateProgress = asyncHandler(async (req, res, next) => {
  const { lessonId, watchedTime, completionPercentage, lastPosition } = req.body;
  const userId = req.user._id;

  const lesson = await MicroLesson.findById(lessonId);
  if (!lesson) {
    return errorResponse(next, 404, 'Lesson not found');
  }

  let progress = await LearningProgress.findOne({
    user: userId,
    microLesson: lessonId
  });

  if (!progress) {
    progress = new LearningProgress({
      user: userId,
      course: lesson.course,
      microLesson: lessonId,
      totalDuration: lesson.duration * 60
    });
  }

  // Update progress
  if (watchedTime !== undefined) progress.watchedTime = watchedTime;
  if (completionPercentage !== undefined) progress.completionPercentage = completionPercentage;
  if (lastPosition !== undefined) progress.lastPosition = lastPosition;

  // Check if completed
  if (completionPercentage >= 100 && !progress.isCompleted) {
    progress.isCompleted = true;
    progress.completedAt = new Date();

    // Award XP and update stats
    await awardXP(userId, lesson.xpReward, lesson._id, lesson.course);
  }

  progress.lastAccessedAt = new Date();
  await progress.save();

  // Update streak
  await updateStreak(userId);

  res.json({
    success: true,
    data: progress
  });
});

// @desc    Submit quiz for a lesson
// @route   POST /api/byte-size/quiz
// @access  Private
export const submitQuiz = asyncHandler(async (req, res, next) => {
  const { lessonId, answers } = req.body;
  const userId = req.user._id;

  const lesson = await MicroLesson.findById(lessonId);
  if (!lesson) {
    return errorResponse(next, 404, 'Lesson not found');
  }

  // Calculate score
  let correct = 0;
  const results = lesson.quiz.questions.map((q, i) => {
    const isCorrect = answers[i] === q.correctAnswer;
    if (isCorrect) correct++;
    return {
      question: q.question,
      userAnswer: answers[i],
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation
    };
  });

  const score = Math.round((correct / lesson.quiz.questions.length) * 100);
  const passed = score >= lesson.quiz.passingScore;

  // Update progress
  let progress = await LearningProgress.findOne({
    user: userId,
    microLesson: lessonId
  });

  if (!progress) {
    progress = new LearningProgress({
      user: userId,
      course: lesson.course,
      microLesson: lessonId
    });
  }

  progress.quizAttempted = true;
  progress.quizAttempts += 1;
  progress.quizScore = score;
  if (score > progress.quizBestScore) {
    progress.quizBestScore = score;
  }

  await progress.save();

  // Award XP for passing
  if (passed) {
    await awardXP(userId, 15, lesson._id, lesson.course);
  }

  res.json({
    success: true,
    data: {
      score,
      passed,
      results,
      xpEarned: passed ? 15 : 0
    }
  });
});

// @desc    Get user learning stats
// @route   GET /api/byte-size/stats
// @access  Private
export const getUserStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  let stats = await UserLearningStats.findOne({ user: userId });
  if (!stats) {
    stats = await UserLearningStats.create({ user: userId });
  }

  // Get recent achievements
  const achievements = await Achievement.find({ isActive: true }).limit(20);

  res.json({
    success: true,
    data: {
      totalXP: stats.totalXP,
      level: stats.level,
      levelTitle: stats.levelTitle,
      xpToNextLevel: stats.xpToNextLevel,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalLessonsCompleted: stats.totalLessonsCompleted,
      totalCoursesCompleted: stats.totalCoursesCompleted,
      totalWatchTime: stats.totalWatchTime,
      weakAreas: stats.weakAreas,
      achievements: stats.achievements,
      weeklyStats: stats.weeklyStats,
      dailyGoalMinutes: stats.dailyGoalMinutes,
      dailyStreakMet: stats.dailyStreakMet,
      availableAchievements: achievements
    }
  });
});

// @desc    Get leaderboard
// @route   GET /api/byte-size/leaderboard
// @access  Private
export const getLeaderboard = asyncHandler(async (req, res, next) => {
  const { period = 'all' } = req.query;
  let query = {};

  // Filter by period
  if (period === 'weekly') {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    query['weeklyStats.startDate'] = { $gte: weekStart };
  }

  const leaders = await UserLearningStats.find(query)
    .populate('user', 'firstName lastName email avatar profilePicture')
    .sort({ totalXP: -1 })
    .limit(20)
    .select('totalXP level levelTitle currentStreak weeklyStats');

  const formattedLeaders = leaders.map((l, i) => {
    let name = 'Anonymous';
    if (l.user) {
      if (l.user.fullName && l.user.fullName !== 'undefined undefined') {
        name = l.user.fullName;
      } else {
        name = `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() || l.user.email?.split('@')[0] || 'Anonymous';
      }
    }
    return {
      rank: i + 1,
      userId: l.user?._id,
      name,
      avatar: l.user?.avatar || l.user?.profilePicture || '',
      xp: l.totalXP,
      level: l.level,
      levelTitle: l.levelTitle,
      streak: l.currentStreak,
      weeklyXP: l.weeklyStats?.xpEarned || 0
    };
  });

  // Add current user rank
  const currentUserRank = formattedLeaders.findIndex(
    l => l.userId?.toString() === req.user._id.toString()
  );

  res.json({
    success: true,
    data: {
      leaders: formattedLeaders,
      currentUserRank: currentUserRank + 1 || null,
      period
    }
  });
});

// @desc    Upload an attachment for AI tutor (PDF/DOCX/TXT) and summarize it
// @route   POST /api/byte-size/tutor/attachment
// @access  Private
export const uploadTutorAttachment = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId, conversationId } = req.body || {};
  const userId = req.user._id;

  if (!req.file) {
    return errorResponse(next, 400, 'Attachment file is required');
  }

  let conversation = null;
  if (conversationId) {
    conversation = await AITutorConversation.findOne({ _id: conversationId, user: userId });
  }

  if (!conversation) {
    conversation = new AITutorConversation({
      user: userId,
      course: courseId,
      lesson: lessonId,
      messages: [],
      attachments: [],
    });
  }

  let extractedText = '';
  try {
    extractedText = await extractAttachmentText(req.file);
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return errorResponse(next, 400, error.message || 'Failed to extract text from attachment');
  }

  if (!extractedText || extractedText.length < 80) {
    await fs.unlink(req.file.path).catch(() => {});
    return errorResponse(next, 400, 'The uploaded file does not contain enough readable text for AI analysis');
  }

  const chunks = chunkText(extractedText, 1200, 180);
  const documentStructure = buildDocumentStructure(extractedText);
  const shortExtract = extractedText.slice(0, 15000);
  let generatedSummary = summarizeExtractedText(shortExtract);

  try {
    const aiSummary = await callAiService({
      endpoint: '/v1/notes/generate',
      payload: {
        mode: 'short',
        lessonTitle: req.file.originalname,
        courseTitle: 'Uploaded Attachment',
        lessonContent: `Video transcript:\n${shortExtract}`,
        sourceType: 'manual-transcript',
        lessonQuestions: [],
        lessonResources: [],
      },
      retries: 0,
    });
    generatedSummary = aiSummary?.data?.summary || aiSummary?.summary || generatedSummary;
  } catch {
    // fallback summary already prepared locally
  }

  const relativePath = `/${path.relative(BACKEND_ROOT, req.file.path).replace(/\\/g, '/')}`;
  const attachment = {
    originalName: req.file.originalname,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    fileUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}${relativePath}`,
    extractedText,
    summary: generatedSummary,
    documentStructure,
    chunks,
    uploadedAt: new Date(),
  };

  conversation.attachments = conversation.attachments || [];
  conversation.attachments.push(attachment);
  const latestAttachment = conversation.attachments[conversation.attachments.length - 1];
  conversation.activeAttachmentId = latestAttachment?._id || null;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.status(201).json({
    success: true,
    data: {
      conversationId: conversation._id,
      attachment: {
        _id: latestAttachment?._id,
        originalName: latestAttachment?.originalName,
        mimeType: latestAttachment?.mimeType,
        size: latestAttachment?.size,
        fileUrl: latestAttachment?.fileUrl,
        summary: latestAttachment?.summary,
        documentStructure: latestAttachment?.documentStructure,
        uploadedAt: latestAttachment?.uploadedAt,
        extractedText: latestAttachment?.extractedText,
      },
      summary: latestAttachment?.summary || '',
    },
  });
});

// @desc    Ask AI tutor a question
// @route   POST /api/byte-size/tutor
// @access  Private
export const askAITutor = asyncHandler(async (req, res, next) => {
  const { message, courseId, lessonId, conversationId, attachmentId, tutorMode } = req.body;
  const userId = req.user._id;
  if (!message || !String(message).trim()) {
    return errorResponse(next, 400, 'Message is required');
  }

  let conversation;

  if (conversationId) {
    conversation = await AITutorConversation.findOne({ _id: conversationId, user: userId });
  }

  if (!conversation && attachmentId) {
    conversation = await AITutorConversation.findOne({
      user: userId,
      'attachments._id': attachmentId,
      isActive: true,
    }).sort({ lastMessageAt: -1 });
  }

  if (!conversation) {
    const inferredCourseId = await inferCourseIdFromQuestion({
      userId,
      message,
      courseId,
      conversationCourseId: null,
    });
    conversation = new AITutorConversation({
      user: userId,
      course: inferredCourseId || courseId,
      lesson: lessonId
    });
  }
  const effectiveCourseId = await inferCourseIdFromQuestion({
    userId,
    message,
    courseId,
    conversationCourseId: conversation.course,
  });
  if (attachmentId) {
    conversation.activeAttachmentId = attachmentId;
  }
  if (effectiveCourseId) {
    conversation.course = effectiveCourseId;
  }
  if (lessonId) {
    conversation.lesson = lessonId;
  }

  // Add user message
  conversation.messages.push({
    role: 'user',
    content: message
  });

  if (!attachmentId && isCasualTutorMessage(message)) {
    const casualReply = buildCasualTutorReply(message);
    conversation.messages.push({
      role: 'assistant',
      content: casualReply,
      sources: [],
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        message: casualReply,
        sources: [],
        cached: true,
      },
    });
  }

  // Get lesson context if available. For full course videos, prefer the
  // auto-generated transcript/summary so the tutor answers from the lecture.
  let contextContent = '';
  if (lessonId) {
    const lesson = await MicroLesson.findById(lessonId);
    if (lesson) {
      contextContent = lesson.aiContent?.simpleExplanation || lesson.content;
    } else if (effectiveCourseId) {
      const course = await Course.findById(effectiveCourseId)
        .select('title sections.title sections.lessons.title sections.lessons.content sections.lessons.transcript sections.lessons.videoSummary')
        .lean();
      const courseLesson = (course?.sections || [])
        .flatMap((section) => (section.lessons || []).map((item) => ({ section, lesson: item })))
        .find((item) => String(item.lesson._id) === String(lessonId));

      if (courseLesson) {
        const summary = courseLesson.lesson.videoSummary?.generated || {};
        contextContent = [
          `Course: ${course.title}`,
          `Section: ${courseLesson.section.title}`,
          `Lesson: ${courseLesson.lesson.title}`,
          summary.summary ? `Video summary: ${summary.summary}` : '',
          summary.detailedSummary ? `Detailed notes: ${summary.detailedSummary}` : '',
          summary.keyTakeaways?.length ? `Key takeaways: ${summary.keyTakeaways.join('; ')}` : '',
          summary.revisionNotes ? `Revision notes: ${summary.revisionNotes}` : '',
          courseLesson.lesson.videoSummary?.transcript ? `Transcript: ${courseLesson.lesson.videoSummary.transcript}` : '',
          courseLesson.lesson.transcript ? `Saved transcript: ${courseLesson.lesson.transcript}` : '',
          courseLesson.lesson.content ? `Lesson content: ${courseLesson.lesson.content}` : '',
        ].filter(Boolean).join('\n\n');
      }
    }
  }
  const courseRag = await buildSelectedCourseContext({ userId, courseId: effectiveCourseId, message });
  const learnerProfileContext = await buildLearnerProfileContext({ userId, courseId: effectiveCourseId });
  contextContent = [learnerProfileContext, courseRag.context, contextContent].filter(Boolean).join('\n\n');

  const attachments = conversation.attachments || [];
  const activeAttachment = attachments.find((item) => String(item._id) === String(attachmentId || conversation.activeAttachmentId))
    || attachments[attachments.length - 1]
    || null;
  const isSummaryQuery = looksLikeSummaryRequest(message);
  const documentMode = detectDocumentMode(message);
  const attachmentFullText = cleanText(activeAttachment?.extractedText || '');
  const attachmentFullExcerpt = attachmentFullText.slice(0, 45000);
  const relevantAttachmentChunks = activeAttachment
    ? pickRelevantAttachmentChunks({
        question: message,
        chunks: activeAttachment.chunks || [],
      })
    : [];
  const attachmentContext = activeAttachment
    ? [
        `Attachment: ${activeAttachment.originalName}`,
        `Requested document mode: ${documentMode}`,
        activeAttachment.summary ? `Attachment summary: ${activeAttachment.summary}` : '',
        activeAttachment.documentStructure ? `Document learning map:\n${formatDocumentStructureForPrompt(activeAttachment.documentStructure)}` : '',
        isSummaryQuery && attachmentFullExcerpt
          ? `Full extracted content:\n${attachmentFullExcerpt}`
          : '',
        relevantAttachmentChunks.length
          ? `RAG retrieved excerpts from uploaded material:\n${relevantAttachmentChunks.map((chunk, idx) => {
              const chapter = chunk.chapterTitle ? ` [${chunk.chapterTitle}]` : '';
              return `(${idx + 1})${chapter} ${chunk.text}`;
            }).join('\n\n')}`
          : '',
      ].filter(Boolean).join('\n\n')
    : '';

  const recentMessages = (conversation.messages || []).slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const cacheKey = buildTutorCacheKey({
    userId,
    courseId: effectiveCourseId,
    lessonId,
    message,
    attachmentId: activeAttachment?._id ? String(activeAttachment._id) : '',
  });
  const shouldUseCache = !activeAttachment;
  const shouldUseCacheForThisRequest = shouldUseCache && !effectiveCourseId;
  const cachedResponse = shouldUseCacheForThisRequest ? await cacheGet(cacheKey) : null;

  if (cachedResponse?.message) {
    conversation.messages.push({
      role: 'assistant',
      content: cachedResponse.message,
      sources: cachedResponse.sources || [],
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        message: cachedResponse.message,
        sources: cachedResponse.sources || [],
        cached: true,
      }
    });
  }

  let response;
  const start = Date.now();
  try {
    if (activeAttachment && isSummaryQuery && attachmentFullExcerpt) {
      const mode = wantsDetailedSummary(message) ? 'detailed' : wantsShortSummary(message) ? 'short' : 'short';
      const aiSummary = await callAiService({
        endpoint: '/v1/notes/generate',
        retries: 0,
        payload: {
          mode,
          lessonTitle: activeAttachment.originalName || 'Uploaded attachment',
          courseTitle: 'Uploaded Attachment',
          lessonContent: `Video transcript:\n${attachmentFullExcerpt}`,
          sourceType: 'manual-transcript',
          lessonQuestions: [],
          lessonResources: [],
        },
      });
      const notesDataRaw = aiSummary?.data || aiSummary || {};
      const hasBadDisclaimer = hasPdfAccessDisclaimer(
        `${notesDataRaw?.summary || ''} ${notesDataRaw?.revisionMaterial || ''}`,
      );
      const notesData = hasBadDisclaimer
        ? buildLocalNotesFromExtractedText({
            text: attachmentFullExcerpt,
            detailed: mode === 'detailed',
          })
        : notesDataRaw;
      response = {
        content: formatAttachmentSummaryResponse({
          notes: notesData,
          attachmentName: activeAttachment.originalName || 'uploaded file',
          detailed: mode === 'detailed',
        }),
        sources: [],
      };
      await logAiUsage({
        userId,
        feature: 'ai_tutor_attachment_summary',
        status: 'success',
        latencyMs: Date.now() - start,
        tokens: aiSummary?.meta?.tokens || {},
        requestMeta: { courseId: effectiveCourseId, lessonId, attachmentId: String(activeAttachment._id || '') },
        model: aiSummary?.meta?.model,
      });
    } else {
      const aiResponse = await callAiService({
        endpoint: '/v1/tutor/chat',
        retries: 0,
        payload: {
          message,
          courseId: effectiveCourseId,
          lessonId,
          userRole: req.user?.role,
          context: {
            lessonContent: contextContent,
            attachmentContent: attachmentContext,
            attachmentName: activeAttachment?.originalName || '',
            recentMessages,
            tutorMode: tutorMode || '',
          },
        },
      });
      const cleanedAiMessage = stripPdfAccessDisclaimer(aiResponse?.data?.message || aiResponse?.message || '');
      const shouldForceLocalSummary = activeAttachment && isSummaryQuery && attachmentFullExcerpt && hasPdfAccessDisclaimer(cleanedAiMessage);
      if (shouldForceLocalSummary) {
        const detailed = wantsDetailedSummary(message);
        const localNotes = buildLocalNotesFromExtractedText({ text: attachmentFullExcerpt, detailed });
        response = {
          content: formatAttachmentSummaryResponse({
            notes: localNotes,
            attachmentName: activeAttachment.originalName || 'uploaded file',
            detailed,
          }),
          sources: [],
        };
      } else {
        response = {
          content: cleanedAiMessage,
          sources: [
            ...(courseRag.sources || []),
            ...(aiResponse?.data?.sources || []),
          ],
        };
      }
      await logAiUsage({
        userId,
        feature: 'ai_tutor_chat',
        status: 'success',
        latencyMs: Date.now() - start,
        tokens: aiResponse?.meta?.tokens || {},
        requestMeta: { courseId: effectiveCourseId, lessonId },
        model: aiResponse?.meta?.model,
      });
    }
  } catch (error) {
    const mergedContext = [attachmentContext, contextContent].filter(Boolean).join('\n\n');
    if (activeAttachment && isSummaryQuery && attachmentFullExcerpt) {
      const detailed = wantsDetailedSummary(message);
      const localNotes = buildLocalNotesFromExtractedText({ text: attachmentFullExcerpt, detailed });
      response = {
        content: formatAttachmentSummaryResponse({
          notes: localNotes,
          attachmentName: activeAttachment.originalName || 'uploaded file',
          detailed,
        }),
        sources: [],
      };
    } else {
      response = buildAttachmentOnlyFallback({ message, contextContent: mergedContext }) || generateAIResponse(message, mergedContext);
      response.sources = [
        ...(courseRag.sources || []),
        ...(response.sources || []),
      ];
    }
    await logAiUsage({
      userId,
      feature: 'ai_tutor_chat',
      status: 'fallback',
      latencyMs: Date.now() - start,
      requestMeta: { courseId: effectiveCourseId, lessonId },
      errorMessage: error.message,
    });
  }

  conversation.messages.push({
    role: 'assistant',
    content: response.content,
    sources: response.sources
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();
  if (shouldUseCacheForThisRequest) {
    await cacheSet(cacheKey, {
      message: response.content,
      sources: response.sources || [],
    }, 300);
  }

  res.json({
    success: true,
    data: {
      conversationId: conversation._id,
      message: response.content,
      sources: response.sources
    }
  });
});

// @desc    Get or create tutor conversation
// @route   GET /api/byte-size/tutor/conversation
// @access  Private
export const getTutorConversation = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId } = req.query;
  const userId = req.user._id;

  let conversation = await AITutorConversation.findOne({
    user: userId,
    course: courseId || { $exists: true },
    isActive: true
  }).sort({ lastMessageAt: -1 });

  if (!conversation) {
    conversation = new AITutorConversation({
      user: userId,
      course: courseId,
      lesson: lessonId
    });
    await conversation.save();
  }

  res.json({
    success: true,
    data: conversation
  });
});

// @desc    Clear active tutor conversation
// @route   DELETE /api/byte-size/tutor/conversation
// @access  Private
export const clearTutorConversation = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.body || {};
  const userId = req.user._id;

  const query = conversationId
    ? { _id: conversationId, user: userId }
    : { user: userId, isActive: true };

  const conversation = await AITutorConversation.findOne(query).sort({ lastMessageAt: -1 });
  if (conversation) {
    conversation.isActive = false;
    conversation.lastMessageAt = new Date();
    await conversation.save();
  }

  res.json({
    success: true,
    message: 'AI Tutor conversation cleared',
  });
});

// @desc    Bookmark a lesson
// @route   POST /api/byte-size/bookmark
// @access  Private
export const toggleBookmark = asyncHandler(async (req, res, next) => {
  const { lessonId } = req.body;
  const userId = req.user._id;

  const lesson = await MicroLesson.findById(lessonId);
  if (!lesson) {
    return errorResponse(next, 404, 'Lesson not found');
  }

  let progress = await LearningProgress.findOne({
    user: userId,
    microLesson: lessonId
  });

  if (!progress) {
    progress = new LearningProgress({
      user: userId,
      course: lesson.course,
      microLesson: lessonId
    });
  }

  progress.isBookmarked = !progress.isBookmarked;
  if (progress.isBookmarked) {
    progress.bookmarkedAt = new Date();
  }

  await progress.save();

  res.json({
    success: true,
    data: {
      isBookmarked: progress.isBookmarked
    }
  });
});

// @desc    Get recommendations
// @route   GET /api/byte-size/recommendations
// @access  Private
export const getRecommendations = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const stats = await UserLearningStats.findOne({ user: userId });
  const progress = await LearningProgress.find({ user: userId })
    .populate('microLesson')
    .sort({ lastAccessedAt: -1 });

  // Get weak areas
  const weakAreas = stats?.weakAreas || [];

  // Get in-progress courses
  const inProgressCourses = [...new Set(progress.filter(p => !p.isCompleted).map(p => p.course.toString()))];

  // Get next lessons for in-progress courses
  const nextLessons = [];
  for (const courseId of inProgressCourses.slice(0, 3)) {
    const completedLessons = progress.filter(
      p => p.course.toString() === courseId && p.isCompleted
    ).map(p => p.microLesson.toString());

    const nextLesson = await MicroLesson.findOne({
      course: courseId,
      order: { $gt: 0 }
    }).where('_id').nin(completedLessons).sort({ order: 1 }).limit(1);

    if (nextLesson) {
      nextLessons.push(nextLesson);
    }
  }

  // Get revision recommendations for weak areas
  const revisionLessons = [];
  if (weakAreas.length > 0) {
    const revision = await MicroLesson.find({
      topics: { $in: weakAreas.map(w => w.topic) }
    }).limit(5);
    revisionLessons.push(...revision);
  }

  res.json({
    success: true,
    data: {
      nextLessons,
      revisionLessons,
      weakAreas,
      dailyGoal: stats?.dailyGoalMinutes || 30
    }
  });
});

// @desc    Update a micro-lesson (Trainer/Admin)
// @route   PUT /api/byte-size/lesson/:lessonId
// @access  Private (Trainer/Admin)
export const updateMicroLesson = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'trainer' && req.user.role !== 'administrator') {
    return errorResponse(next, 403, 'Access denied: Trainer or Admin role required');
  }

  const { lessonId } = req.params;
  const updateData = { ...req.body };
  if (updateData.isPublished !== undefined) {
    updateData.status = updateData.isPublished ? 'published' : 'draft';
  }

  const lesson = await MicroLesson.findByIdAndUpdate(lessonId, updateData, {
    new: true,
    runValidators: true
  });

  if (!lesson) {
    return errorResponse(next, 404, 'Micro-lesson not found');
  }

  res.json({
    success: true,
    data: lesson
  });
});

// @desc    Delete a micro-lesson (Trainer/Admin)
// @route   DELETE /api/byte-size/lesson/:lessonId
// @access  Private (Trainer/Admin)
export const deleteMicroLesson = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'trainer' && req.user.role !== 'administrator') {
    return errorResponse(next, 403, 'Access denied: Trainer or Admin role required');
  }

  const { lessonId } = req.params;

  const lesson = await MicroLesson.findByIdAndDelete(lessonId);

  if (!lesson) {
    return errorResponse(next, 404, 'Micro-lesson not found');
  }

  // Also clean up any progress related to this lesson
  await LearningProgress.deleteMany({ microLesson: lessonId });

  res.json({
    success: true,
    message: 'Micro-lesson deleted successfully'
  });
});

// Helper methods
async function awardXP(userId, xp, lessonId, courseId) {
  let stats = await UserLearningStats.findOne({ user: userId });
  if (!stats) {
    stats = new UserLearningStats({ user: userId });
  }

  stats.totalXP += xp;

  // Update weekly stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  if (!stats.weeklyStats || stats.weeklyStats.startDate < weekStart) {
    stats.weeklyStats = {
      startDate: weekStart,
      lessonsCompleted: 0,
      xpEarned: 0,
      minutesLearned: 0,
      quizzesPassed: 0
    };
  }

  stats.weeklyStats.xpEarned += xp;
  await stats.save();

  // Check achievements
  await checkAchievements(userId);
}

async function updateStreak(userId) {
  const stats = await UserLearningStats.findOne({ user: userId });
  if (!stats) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;
  lastActive?.setHours(0, 0, 0, 0);

  if (lastActive && lastActive.getTime() === today.getTime()) {
    // Already active today
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActive && lastActive.getTime() === yesterday.getTime()) {
    // Continue streak
    stats.currentStreak += 1;
  } else if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
    // Start new streak
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  stats.lastActiveDate = new Date();
  await stats.save();
}

async function checkAchievements(userId) {
  const stats = await UserLearningStats.findOne({ user: userId });
  const achievements = await Achievement.find({ isActive: true });

  for (const achievement of achievements) {
    // Check if already unlocked
    const existing = stats.achievements.find(a => a.achievementId === achievement.achievementId);
    if (existing) continue;

    // Check criteria
    let earned = false;
    switch (achievement.criteria.type) {
      case 'lessons_completed':
        earned = stats.totalLessonsCompleted >= achievement.criteria.value;
        break;
      case 'streak_days':
        earned = stats.currentStreak >= achievement.criteria.value;
        break;
      case 'xp_earned':
        earned = stats.totalXP >= achievement.criteria.value;
        break;
      case 'courses_completed':
        earned = stats.totalCoursesCompleted >= achievement.criteria.value;
        break;
      case 'quiz_score':
        // This needs more complex logic
        break;
      case 'flashcards_mastered':
        earned = stats.flashcardsMastered >= achievement.criteria.value;
        break;
    }

    if (earned) {
      stats.achievements.push({
        achievementId: achievement.achievementId,
        unlockedAt: new Date(),
        progress: achievement.criteria.value
      });
      stats.totalXP += achievement.xpReward;
    }
  }

  await stats.save();
}

function generateAIResponse(message, contextContent = '') {
  const cleaned = String(message || '').trim();
  if (/^(hi|hello|hey|hii+|hola|good (morning|afternoon|evening))$/i.test(cleaned)) {
    return {
      content:
        'Hi! I can help with lessons, quizzes, assignments, revision plans, progress tracking, and certificates. Tell me what topic or course you are working on.',
      sources: [],
    };
  }

  const courseTitle = contextContent.match(/Selected course:\s*(.+)/i)?.[1]?.trim();
  const progressMatch = contextContent.match(/Student course progress:\s*([0-9]+)%\s*\(([^)]+)\)/i);
  const progressQuestion = /(complete|completion|progress|kitna| कितना|course.*hua|कितना)/i.test(cleaned);

  if (progressQuestion && progressMatch) {
    const percent = progressMatch[1];
    const status = progressMatch[2] || 'enrolled';
    return {
      content: [
        courseTitle
          ? `Aapka "${courseTitle}" course abhi ${percent}% complete hai.`
          : `Aapka selected course abhi ${percent}% complete hai.`,
        `Status: ${status}`,
        Number(percent) >= 100
          ? 'Great job, course complete ho chuka hai.'
          : 'Next step: course ke remaining lessons continue karein. Agar chaho to main next lesson ka quick revision plan bhi bana sakta hoon.',
      ].join('\n\n'),
      sources: [],
    };
  }

  return {
    content: `I could not reach the live AI service right now, but I can still help.\n\nPlease ask your question again in one clear line, or select a course and ask about a specific lesson/topic. I will answer from your course content where available.`,
    sources: []
  };
}
