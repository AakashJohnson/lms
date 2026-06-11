import Course from '../models/Course.model.js';
import AiFlashcardDeck from '../models/AiFlashcardDeck.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import { generateAiFlashcardsHeuristicFromLesson } from '../utils/aiFlashcardsGenerator.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const updateSrs = ({ card, rating }) => {
  const now = new Date();

  // SM-2-ish lightweight scheduler.
  let ease = typeof card.srs?.easeFactor === 'number' ? card.srs.easeFactor : 2.5;
  let reps = typeof card.srs?.repetitions === 'number' ? card.srs.repetitions : 0;
  let interval = typeof card.srs?.intervalDays === 'number' ? card.srs.intervalDays : 0;

  if (rating === 'again') {
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else if (rating === 'hard') {
    reps = reps + 1;
    interval = interval ? Math.round(interval * 1.2) : 2;
    ease = Math.max(1.3, ease - 0.15);
  } else if (rating === 'good') {
    reps = reps + 1;
    if (!interval) interval = 1;
    interval = Math.round(interval * ease);
    ease = ease + 0.05;
  } else if (rating === 'easy') {
    reps = reps + 1;
    if (!interval) interval = 3;
    interval = Math.round(interval * ease * 1.3);
    ease = ease + 0.1;
  } else {
    // default: treat unknown as good
    reps = reps + 1;
    if (!interval) interval = 1;
    interval = Math.round(interval * ease);
  }

  const dueAt = new Date(now.getTime() + interval * ONE_DAY_MS);

  card.srs = {
    repetitions: reps,
    intervalDays: interval,
    easeFactor: ease,
    dueAt,
    lastReviewedAt: now,
  };
};

/**
 * @route POST /api/v1/flashcards/generate
 * @access Private
 */
export const generateFlashcards = asyncHandler(async (req, res, next) => {
  const { courseId, sectionId, lessonId, mode = 'short' } = req.body || {};

  if (!courseId || !sectionId || !lessonId) {
    return next(new ErrorResponse('courseId, sectionId, and lessonId are required', 400));
  }
  if (!['short', 'detailed'].includes(mode)) {
    return next(new ErrorResponse('mode must be either short or detailed', 400));
  }

  const course = await Course.findById(courseId).select('title sections').lean();
  if (!course) return next(new ErrorResponse('Course not found', 404));

  const section = (course.sections || []).find((s) => String(s._id) === String(sectionId));
  const lesson = (section?.lessons || []).find((l) => String(l._id) === String(lessonId));
  if (!section || !lesson) return next(new ErrorResponse('Lesson not found in this course', 404));

  let cards = [];
  const start = Date.now();
  try {
    const aiResponse = await callAiService({
      endpoint: '/v1/flashcards/generate',
      payload: {
        mode,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        lessonContent: lesson.content || '',
        lessonQuestions: lesson.questions || [],
      },
    });
    cards = aiResponse?.data?.cards || aiResponse?.cards || [];
    await logAiUsage({
      userId: req.user?._id,
      feature: 'ai_flashcards_generate',
      status: 'success',
      latencyMs: Date.now() - start,
      tokens: aiResponse?.meta?.tokens || {},
      requestMeta: { mode, courseId, lessonId },
      model: aiResponse?.meta?.model,
    });
  } catch (error) {
    const fallback = await generateAiFlashcardsHeuristicFromLesson({
      lessonTitle: lesson.title,
      lesson,
      mode,
    });
    cards = fallback.cards;
    await logAiUsage({
      userId: req.user?._id,
      feature: 'ai_flashcards_generate',
      status: 'fallback',
      latencyMs: Date.now() - start,
      requestMeta: { mode, courseId, lessonId },
      errorMessage: error.message,
    });
  }

  const deck = await AiFlashcardDeck.create({
    student: req.user._id,
    course: courseId,
    section: String(sectionId),
    lesson: String(lessonId),
    source: { inputType: 'lesson-content' },
    cards,
  });

  res.status(201).json({ success: true, data: deck });
});

/**
 * @route GET /api/v1/flashcards/latest/:courseId/:sectionId/:lessonId
 * @access Private
 */
export const getLatestFlashcardDeck = asyncHandler(async (req, res, next) => {
  const { courseId, sectionId, lessonId } = req.params;

  const deck = await AiFlashcardDeck.findOne({
    student: req.user._id,
    course: courseId,
    section: String(sectionId),
    lesson: String(lessonId),
  }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: deck || null });
});

/**
 * @route POST /api/v1/flashcards/:deckId/:cardId/review
 * @access Private
 */
export const reviewFlashcard = asyncHandler(async (req, res, next) => {
  const { deckId, cardId } = req.params;
  const { rating } = req.body || {};

  if (!deckId || !cardId) return next(new ErrorResponse('deckId and cardId are required', 400));
  if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
    return next(new ErrorResponse('rating must be again|hard|good|easy', 400));
  }

  const deck = await AiFlashcardDeck.findById(deckId);
  if (!deck) return next(new ErrorResponse('Flashcard deck not found', 404));
  if (String(deck.student) !== String(req.user._id)) return next(new ErrorResponse('Not authorized', 403));

  const card = deck.cards.id(cardId);
  if (!card) return next(new ErrorResponse('Flashcard not found', 404));

  updateSrs({ card, rating });
  await deck.save();

  res.status(200).json({ success: true, data: deck });
});

