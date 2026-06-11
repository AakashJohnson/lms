import AiLessonQuestion from '../models/AiLessonQuestion.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';
import {
  buildLessonContext,
  cleanText,
  getContextAvailability,
  getRelevantLessonContext,
  userCanAccessLessonContext,
} from '../services/lessonContextBuilder.service.js';

const hasAnyContext = (availability = {}) => Object.values(availability).some(Boolean);
const LESSON_AI_TIMEOUT_MS = Number(process.env.LESSON_AI_TIMEOUT_MS || 90000);

const buildFallbackAnswer = ({ question, lessonTitle, availability }) => {
  if (!hasAnyContext(availability)) {
    return 'I do not have enough lesson material yet. Please generate transcript/summary or add lesson resources first.';
  }

  const available = Object.entries(availability)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');

  return [
    `For "${lessonTitle}", I could not reach the AI service right now.`,
    '',
    `Available lesson context: ${available || 'none'}.`,
    `Your question was: ${question}`,
    '',
    'Please try again in a moment for a full lesson-aware answer.',
  ].join('\n');
};

const buildSourceList = (compactContext = {}) => {
  const transcriptSources = (compactContext.transcript?.chunks || []).map((chunk) => ({
    label: chunk.label || 'Transcript',
    start: chunk.start || 0,
    end: chunk.end || 0,
    text: chunk.text || '',
  }));

  const resourceSources = (compactContext.resources || []).slice(0, 4).map((resource) => ({
    label: resource.title || resource.type || 'Lesson resource',
    start: 0,
    end: 0,
    text: [resource.type, resource.url, resource.description, resource.extractedText]
      .map(cleanText)
      .filter(Boolean)
      .join(' | ')
      .slice(0, 1200),
  }));

  return [...resourceSources, ...transcriptSources].filter((source) => source.text).slice(0, 8);
};

const resolveLessonContext = async ({ req, next }) => {
  const { courseId, sectionId, lessonId } = req.body || req.params || {};
  const userId = req.user?._id || req.user?.id;

  const built = await buildLessonContext({ courseId, sectionId, lessonId, userId });
  if (!built.course) return next(new ErrorResponse('Course not found', 404));
  if (!built.lesson) return next(new ErrorResponse('Lesson not found in this course', 404));

  const hasAccess = await userCanAccessLessonContext({ user: req.user, course: built.course });
  if (!hasAccess) return next(new ErrorResponse('Not authorized to access this lesson context', 403));

  return built;
};

/**
 * @route POST /api/v1/lesson-ai/ask
 * @route POST /api/v1/lesson-ai-questions/ask
 * @access Private
 */
export const askLessonQuestion = asyncHandler(async (req, res, next) => {
  const { courseId, sectionId, lessonId, question, language = 'auto', currentTimestamp = null } = req.body || {};
  const studentId = req.user?._id || req.user?.id;

  if (!courseId || !lessonId) {
    return next(new ErrorResponse('courseId and lessonId are required', 400));
  }

  const safeQuestion = cleanText(question);
  if (!safeQuestion) {
    return next(new ErrorResponse('Question is required', 400));
  }

  if (safeQuestion.length > 1200) {
    return next(new ErrorResponse('Question cannot exceed 1200 characters', 400));
  }

  const built = await resolveLessonContext({ req, next });
  if (!built) return;

  const start = Date.now();
  const fullContext = built.context;
  const compactContext = getRelevantLessonContext(safeQuestion, fullContext);
  const availability = compactContext.availability || getContextAvailability(fullContext);
  const contextSources = buildSourceList(compactContext);

  let answer = '';
  let model = '';
  let tokens = {};
  let status = 'success';

  if (!hasAnyContext(availability)) {
    answer = buildFallbackAnswer({
      question: safeQuestion,
      lessonTitle: built.lesson.title || 'this lesson',
      availability,
    });
    status = 'no_context';
  } else {
    try {
      const aiResponse = await callAiService({
        endpoint: '/v1/lesson-question/answer',
        retries: 0,
        timeout: LESSON_AI_TIMEOUT_MS,
        includeFallbackUrls: false,
        payload: {
          task: 'lesson_ask_ai',
          question: safeQuestion,
          language,
          currentTimestamp,
          context: compactContext,
          contextAvailability: availability,
          // Backwards-compatible fields for older AI service deployments.
          courseTitle: compactContext.course?.title || '',
          sectionTitle: compactContext.section?.title || '',
          lessonTitle: compactContext.lesson?.title || '',
          transcript: compactContext.transcript?.text || '',
          transcriptAvailable: availability.transcript,
          transcriptChunks: compactContext.transcript?.chunks || [],
          summary: compactContext.summary?.summary || compactContext.summary?.detailedSummary || '',
          allowGlobalKnowledge: true,
        },
      });

      answer = String(aiResponse?.data?.answer || aiResponse?.answer || '').trim();
      model = aiResponse?.meta?.model || '';
      tokens = aiResponse?.meta?.tokens || {};
    } catch (error) {
      status = 'fallback';
      answer = buildFallbackAnswer({
        question: safeQuestion,
        lessonTitle: built.lesson.title || 'this lesson',
        availability,
      });
    }
  }

  if (!answer) {
    answer = buildFallbackAnswer({
      question: safeQuestion,
      lessonTitle: built.lesson.title || 'this lesson',
      availability,
    });
    status = 'fallback';
  }

  const latencyMs = Date.now() - start;
  const doc = await AiLessonQuestion.create({
    student: studentId,
    course: courseId,
    section: String(built.section._id),
    lesson: String(lessonId),
    question: safeQuestion,
    answer,
    sources: contextSources,
    transcriptAvailable: availability.transcript,
    usedGlobalKnowledge: true,
    contextAvailability: availability,
    model,
    tokens,
    latencyMs,
  });

  await logAiUsage({
    userId: studentId,
    feature: 'ai_lesson_question',
    status,
    latencyMs,
    tokens,
    requestMeta: { courseId, sectionId: built.section._id, lessonId, contextAvailability: availability },
    model,
  });

  res.status(200).json({ success: true, data: doc });
});

/**
 * @route GET /api/v1/lesson-ai/context/:courseId/:lessonId
 * @access Private
 */
export const getLessonAiContext = asyncHandler(async (req, res, next) => {
  const reqWithParams = {
    ...req,
    body: {
      courseId: req.params.courseId,
      lessonId: req.params.lessonId,
      sectionId: req.query.sectionId,
    },
  };
  const built = await resolveLessonContext({ req: reqWithParams, next });
  if (!built) return;

  const compactContext = getRelevantLessonContext(String(req.query.question || ''), built.context);
  res.status(200).json({
    success: true,
    data: compactContext,
  });
});

/**
 * @route GET /api/v1/lesson-ai-questions/history/:courseId/:sectionId/:lessonId
 * @access Private
 */
export const getLessonQuestionHistory = asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId } = req.params;

  const history = await AiLessonQuestion.find({
    student: req.user?._id || req.user?.id,
    course: courseId,
    section: String(sectionId),
    lesson: String(lessonId),
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({ success: true, data: history.reverse() });
});
