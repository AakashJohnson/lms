import mongoose from 'mongoose';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import AiLessonNote from '../models/AiLessonNote.model.js';
import AiFlashcardDeck from '../models/AiFlashcardDeck.model.js';
import LessonNote from '../models/LessonNote.model.js';
import FileAsset from '../models/FileAsset.model.js';

const MAX_TEXT = 18000;

export const cleanText = (value = '') => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const limitText = (value = '', max = MAX_TEXT) => cleanText(value).slice(0, max);

const objectId = (value) => (mongoose.Types.ObjectId.isValid(String(value || '')) ? value : null);

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const extractWords = (value = '') => cleanText(value)
  .toLowerCase()
  .split(/[^a-z0-9]+/g)
  .filter((word) => word.length >= 4);

const scoreText = (text = '', questionTerms = new Set()) => {
  if (!questionTerms.size) return 0;
  return extractWords(text).reduce((total, term) => total + (questionTerms.has(term) ? 1 : 0), 0);
};

const normalizeTranscriptValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return cleanText(value);
  return cleanText(value.text || value.cleanedTranscript || value.transcript || '');
};

const findCourseLesson = async ({ courseId, sectionId, lessonId }) => {
  const course = await Course.findById(courseId)
    .select('title subtitle description fullDescription overview createdBy trainer sections')
    .lean();
  if (!course) return { course: null, section: null, lesson: null };

  let section = null;
  let lesson = null;

  for (const candidateSection of course.sections || []) {
    if (sectionId && String(candidateSection._id) !== String(sectionId)) continue;
    const candidateLesson = (candidateSection.lessons || []).find((item) => String(item._id) === String(lessonId));
    if (candidateLesson) {
      section = candidateSection;
      lesson = candidateLesson;
      break;
    }
  }

  return { course, section, lesson };
};

export const userCanAccessLessonContext = async ({ user, course }) => {
  const userId = user?._id || user?.id;
  const role = String(user?.role || '').toLowerCase();
  if (!userId || !course) return false;
  if (['administrator', 'admin'].includes(role)) return true;
  if (['trainer', 'teacher'].includes(role)) {
    return String(course.createdBy || '') === String(userId) || String(course.trainer || '') === String(userId);
  }

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: course._id,
    status: { $ne: 'dropped' },
  }).select('_id').lean();
  return Boolean(enrollment);
};

const getSummaryVersions = (videoSummary = {}) => {
  const versions = videoSummary.summaryVersions || {};
  const shortVersion = versions.short || {};
  const detailedVersion = versions.detailed || {};
  const generated = videoSummary.generated || {};

  return {
    short: limitText(
      shortVersion.generated?.summary ||
      generated.summary ||
      videoSummary.summary ||
      '',
      5000,
    ),
    detailed: limitText(
      detailedVersion.generated?.detailedSummary ||
      detailedVersion.generated?.summary ||
      generated.detailedSummary ||
      '',
      8000,
    ),
    keyPoints: [
      ...normalizeArray(shortVersion.generated?.keyTakeaways),
      ...normalizeArray(detailedVersion.generated?.keyTakeaways),
      ...normalizeArray(generated.keyTakeaways),
      ...normalizeArray(generated.importantConcepts),
    ].map(cleanText).filter(Boolean).slice(0, 20),
  };
};

const getTranscript = (lesson = {}) => {
  const videoSummary = lesson.videoSummary || {};
  const text = limitText(
    videoSummary.finalTranscript ||
    videoSummary.cleanedTranscript ||
    videoSummary.transcript ||
    videoSummary.rawTranscript ||
    lesson.transcriptEnglish?.text ||
    lesson.transcriptCleaned?.text ||
    normalizeTranscriptValue(lesson.transcript) ||
    lesson.transcriptRaw?.text ||
    '',
  );

  const segments = [
    ...normalizeArray(videoSummary.transcriptSegments),
    ...normalizeArray(videoSummary.generated?.transcriptSegments),
    ...normalizeArray(videoSummary.generated?.timestamps),
    ...normalizeArray(lesson.transcriptRaw?.segments),
  ].map((segment, index) => ({
    label: segment.label || `Transcript segment ${index + 1}`,
    start: Number(segment.start || 0),
    end: Number(segment.end || 0),
    text: cleanText(segment.text || segment.summary || ''),
  })).filter((segment) => segment.text);

  return { text, segments };
};

const chunkTranscript = (transcript = '', maxWords = 140) => {
  const words = cleanText(transcript).split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let index = 0; index < words.length; index += maxWords) {
    const text = words.slice(index, index + maxWords).join(' ');
    if (text) {
      chunks.push({
        label: `Transcript chunk ${chunks.length + 1}`,
        start: 0,
        end: 0,
        text,
      });
    }
  }
  return chunks;
};

const selectRelevantTranscriptChunks = ({ question = '', transcript = {}, maxChunks = 6 }) => {
  const candidates = transcript.segments?.length ? transcript.segments : chunkTranscript(transcript.text);
  if (!candidates.length) return [];
  const questionTerms = new Set(extractWords(question));
  const scored = candidates.map((chunk) => ({
    ...chunk,
    score: scoreText(chunk.text, questionTerms),
  })).sort((a, b) => b.score - a.score);
  const picked = scored.filter((chunk) => chunk.score > 0).slice(0, maxChunks);
  return (picked.length ? picked : scored.slice(0, Math.min(4, maxChunks)))
    .map(({ score, ...chunk }) => ({ ...chunk, text: limitText(chunk.text, 1200) }));
};

const normalizeKnowledgeChecks = (lesson = {}) => normalizeArray(lesson.questions)
  .map((question) => ({
    timestamp: question.timestamp ?? null,
    position: question.position || '',
    question: cleanText(question.question),
    questionType: question.questionType || '',
    options: normalizeArray(question.options).map((option) => ({
      text: cleanText(option.text || option),
      isCorrect: Boolean(option.isCorrect),
    })).filter((option) => option.text),
    correctAnswer: cleanText(question.correctAnswer),
    explanation: cleanText(question.explanation),
  }))
  .filter((question) => question.question);

const normalizeVideoSummaryQuestions = (lesson = {}) => normalizeArray(lesson.videoSummary?.generated?.quizQuestions)
  .map((question) => ({
    question: cleanText(question.question),
    answer: cleanText(question.answer || question.correctAnswer),
    options: normalizeArray(question.options).map(cleanText).filter(Boolean),
    correctAnswer: cleanText(question.correctAnswer || question.answer),
    explanation: cleanText(question.explanation),
  }))
  .filter((question) => question.question);

const normalizeVideoSummaryFlashcards = (lesson = {}) => normalizeArray(lesson.videoSummary?.generated?.flashcards)
  .map((card) => ({
    front: cleanText(card.front || card.question || card.term),
    back: cleanText(card.back || card.answer || card.definition),
    difficulty: card.difficulty || '',
    tags: normalizeArray(card.tags).map(cleanText).filter(Boolean),
  }))
  .filter((card) => card.front && card.back);

const buildAssetResource = ({ id, title, type, url, downloadUrl, asset = {} }) => ({
  id,
  title: cleanText(title || asset.title || asset.originalName || 'Lesson resource'),
  type,
  url: cleanText(url || asset.viewUrl || asset.streamUrl || asset.urls?.viewUrl || asset.urls?.streamUrl || ''),
  downloadUrl: cleanText(downloadUrl || asset.downloadUrl || asset.urls?.downloadUrl || ''),
  description: cleanText(asset.description || ''),
  originalName: cleanText(asset.originalName || asset.fileName || ''),
  mimeType: cleanText(asset.mimeType || ''),
  fileSize: Number(asset.fileSize || 0),
  extractedText: limitText(asset.transcript?.text || asset.extractedText || asset.ocrText || '', 4000),
  imageCaption: cleanText(asset.imageCaption || asset.caption || asset.metadata?.caption || ''),
});

const getResources = async ({ lesson = {} }) => {
  const fileAssetIds = [
    ...normalizeArray(lesson.resources).map((resource) => resource.fileAssetId),
    lesson.imageAsset?.fileAssetId,
    lesson.audioAsset?.fileAssetId,
    lesson.videoAsset?.fileAssetId,
  ].map(objectId).filter(Boolean);

  const fileAssets = fileAssetIds.length
    ? await FileAsset.find({ _id: { $in: fileAssetIds } }).lean()
    : [];
  const fileAssetById = new Map(fileAssets.map((asset) => [String(asset._id), asset]));

  const resources = [];

  if (lesson.lessonImage || lesson.imageAsset?.fileAssetId) {
    const asset = fileAssetById.get(String(lesson.imageAsset?.fileAssetId)) || lesson.imageAsset || {};
    resources.push(buildAssetResource({
      id: 'lesson-image',
      title: lesson.imageAsset?.title || 'Lesson image',
      type: 'image',
      url: lesson.lessonImage,
      asset,
    }));
  }

  if (lesson.lessonAudio || lesson.audioAsset?.fileAssetId) {
    const asset = fileAssetById.get(String(lesson.audioAsset?.fileAssetId)) || lesson.audioAsset || {};
    resources.push(buildAssetResource({
      id: 'lesson-audio',
      title: lesson.audioAsset?.title || 'Lesson audio',
      type: 'audio',
      url: lesson.lessonAudio,
      asset,
    }));
  }

  if (lesson.lessonVideo || lesson.videoAsset?.fileAssetId) {
    const asset = fileAssetById.get(String(lesson.videoAsset?.fileAssetId)) || lesson.videoAsset || {};
    resources.push(buildAssetResource({
      id: 'lesson-video',
      title: lesson.videoAsset?.title || 'Lesson video',
      type: 'video',
      url: lesson.lessonVideo || lesson.videoUrl,
      asset,
    }));
  }

  for (const resource of normalizeArray(lesson.resources)) {
    const asset = fileAssetById.get(String(resource.fileAssetId)) || {};
    const type = cleanText(resource.type || asset.mediaType || 'link').toLowerCase();
    resources.push(buildAssetResource({
      id: String(resource._id || resource.id || resources.length + 1),
      title: resource.title || asset.title || asset.originalName || 'Lesson resource',
      type,
      url: resource.url || resource.viewUrl || resource.streamUrl || asset.urls?.viewUrl || asset.urls?.streamUrl,
      downloadUrl: resource.downloadUrl || asset.urls?.downloadUrl,
      asset: {
        ...asset,
        mimeType: resource.mimeType || asset.mimeType,
        fileSize: resource.fileSize || asset.fileSize,
        originalName: resource.originalName || asset.originalName,
      },
    }));
  }

  return resources.filter((resource) => resource.title || resource.url || resource.extractedText).slice(0, 20);
};

export const buildLessonContext = async ({ courseId, sectionId, lessonId, userId }) => {
  const { course, section, lesson } = await findCourseLesson({ courseId, sectionId, lessonId });
  if (!course || !lesson) return { course, section, lesson, context: null };

  const [latestAiNote, latestFlashcardDeck, manualNotes, resources] = await Promise.all([
    AiLessonNote.findOne({ student: userId, course: courseId, section: String(section._id), lesson: String(lessonId) })
      .sort({ createdAt: -1 })
      .lean(),
    AiFlashcardDeck.findOne({ student: userId, course: courseId, section: String(section._id), lesson: String(lessonId) })
      .sort({ createdAt: -1 })
      .lean(),
    LessonNote.find({ student: userId, course: courseId, section: String(section._id), lesson: String(lessonId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    getResources({ lesson }),
  ]);

  const transcript = getTranscript(lesson);
  const summary = getSummaryVersions(lesson.videoSummary || {});
  const aiGenerated = latestAiNote?.generated || {};

  const flashcards = [
    ...normalizeArray(latestFlashcardDeck?.cards).map((card) => ({
      front: cleanText(card.front),
      back: cleanText(card.back),
      difficulty: card.difficulty || '',
      tags: [],
    })),
    ...normalizeVideoSummaryFlashcards(lesson),
    ...normalizeArray(aiGenerated.flashcards).map((card) => ({
      front: cleanText(card.front || card.question),
      back: cleanText(card.back || card.answer),
      difficulty: card.difficulty || '',
      tags: normalizeArray(card.tags).map(cleanText).filter(Boolean),
    })),
  ].filter((card) => card.front && card.back).slice(0, 30);

  const questionAnswers = [
    ...normalizeVideoSummaryQuestions(lesson),
    ...normalizeArray(aiGenerated.quizQuestions).map((question) => ({
      question: cleanText(question.question),
      answer: cleanText(question.answer || question.correctAnswer),
      options: normalizeArray(question.options).map(cleanText).filter(Boolean),
      correctAnswer: cleanText(question.correctAnswer || question.answer),
      explanation: cleanText(question.explanation),
    })),
    ...normalizeArray(aiGenerated.interviewQuestions).map((question) => ({
      question: cleanText(question.question),
      answer: cleanText(question.answer),
      options: [],
      correctAnswer: cleanText(question.answer),
      explanation: '',
    })),
  ].filter((question) => question.question).slice(0, 30);

  const notesSummary = {
    summary: limitText(aiGenerated.summary || summary.short || lesson.summary || '', 5000),
    detailedSummary: limitText(aiGenerated.detailedSummary || summary.detailed || '', 8000),
    keyTakeaways: [
      ...normalizeArray(aiGenerated.keyTakeaways),
      ...summary.keyPoints,
    ].map(cleanText).filter(Boolean).slice(0, 25),
    revisionMaterial: limitText(aiGenerated.revisionMaterial || lesson.summary || '', 4000),
  };

  const context = {
    course: {
      id: String(course._id),
      title: cleanText(course.title),
      description: limitText(course.fullDescription || course.description || course.overview || course.subtitle || '', 5000),
    },
    section: {
      id: String(section._id),
      title: cleanText(section.title),
      description: limitText(section.fullDescription || section.description || '', 2500),
    },
    lesson: {
      id: String(lesson._id),
      title: cleanText(lesson.title),
      type: lesson.type || '',
      description: limitText(lesson.fullDescription || lesson.description || lesson.content || lesson.overview || '', 6000),
      videoUrl: cleanText(lesson.videoUrl || lesson.lessonVideo || ''),
      duration: lesson.videoDuration || lesson.videoSummary?.transcriptDurationSeconds || lesson.transcriptMeta?.audioDuration || '',
    },
    transcript,
    summary: notesSummary,
    flashcards,
    questionAnswers,
    knowledgeChecks: normalizeKnowledgeChecks(lesson),
    resources,
    studentNotes: manualNotes.map((note) => ({
      content: limitText(note.content, 1200),
      timestamp: note.timestamp ?? null,
      isImportant: Boolean(note.isImportant),
    })),
  };

  return { course, section, lesson, context };
};

export const getRelevantLessonContext = (question, fullContext) => {
  const transcriptChunks = selectRelevantTranscriptChunks({
    question,
    transcript: fullContext.transcript || {},
  });

  const questionTerms = new Set(extractWords(question));
  const resources = normalizeArray(fullContext.resources)
    .map((resource) => ({
      ...resource,
      extractedText: limitText(resource.extractedText, 2000),
      score: scoreText(`${resource.title} ${resource.description} ${resource.extractedText} ${resource.imageCaption}`, questionTerms),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ score, ...resource }) => resource);

  return {
    course: {
      ...fullContext.course,
      description: limitText(fullContext.course?.description, 1200),
    },
    section: {
      ...fullContext.section,
      description: limitText(fullContext.section?.description, 800),
    },
    lesson: {
      ...fullContext.lesson,
      description: limitText(fullContext.lesson?.description, 1400),
    },
    transcript: {
      available: Boolean(fullContext.transcript?.text || transcriptChunks.length),
      text: transcriptChunks.map((chunk) => chunk.text).join('\n\n'),
      chunks: transcriptChunks,
      wordCount: cleanText(fullContext.transcript?.text || '').split(/\s+/).filter(Boolean).length,
    },
    summary: {
      summary: limitText(fullContext.summary?.summary, 1600),
      detailedSummary: limitText(fullContext.summary?.detailedSummary, 2200),
      keyTakeaways: normalizeArray(fullContext.summary?.keyTakeaways).slice(0, 12),
      revisionMaterial: limitText(fullContext.summary?.revisionMaterial, 1000),
    },
    flashcards: normalizeArray(fullContext.flashcards).slice(0, 12),
    questionAnswers: normalizeArray(fullContext.questionAnswers).slice(0, 12),
    knowledgeChecks: normalizeArray(fullContext.knowledgeChecks).slice(0, 12),
    resources,
    studentNotes: normalizeArray(fullContext.studentNotes).slice(0, 8),
    availability: getContextAvailability(fullContext),
  };
};

export const getContextAvailability = (context = {}) => ({
  transcript: Boolean(context.transcript?.text || context.transcript?.segments?.length),
  summary: Boolean(context.summary?.summary || context.summary?.detailedSummary || context.summary?.keyTakeaways?.length),
  flashcards: Boolean(context.flashcards?.length),
  questionAnswers: Boolean(context.questionAnswers?.length),
  resources: Boolean(context.resources?.length),
  knowledgeChecks: Boolean(context.knowledgeChecks?.length),
  studentNotes: Boolean(context.studentNotes?.length),
});
