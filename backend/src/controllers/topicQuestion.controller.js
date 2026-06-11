import TopicQuestion from '../models/TopicQuestion.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Add a question to a lesson/topic
 * @route   POST /api/v1/topic-questions
 * @access  Private (Trainer/Admin)
 */
export const addTopicQuestion = asyncHandler(async (req, res, next) => {
  const { course, section, lesson, question, questionType, options, correctAnswer, explanation, order } = req.body;

  if (!course || !section || !lesson || !question) {
    return next(new ErrorResponse('Course, section, lesson, and question are required', 400));
  }

  // If multiple choice, validate options
  if (questionType === 'multiple-choice') {
    if (!options || options.length < 2) {
      return next(new ErrorResponse('Multiple choice questions need at least 2 options', 400));
    }
    const hasCorrect = options.some(opt => opt.isCorrect);
    if (!hasCorrect) {
      return next(new ErrorResponse('At least one option must be marked as correct', 400));
    }
  }

  const topicQuestion = await TopicQuestion.create({
    course,
    section,
    lesson,
    question,
    questionType: questionType || 'multiple-choice',
    options,
    correctAnswer,
    explanation,
    order: order || 0,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    message: 'Question added successfully',
    data: topicQuestion
  });
});

/**
 * @desc    Get questions for a specific lesson
 * @route   GET /api/v1/topic-questions/lesson/:lessonId
 * @access  Private
 */
export const getLessonQuestions = asyncHandler(async (req, res, next) => {
  const { lessonId } = req.params;

  const questions = await TopicQuestion.find({ lesson: lessonId, isActive: true })
    .sort({ order: 1 })
    .populate('createdBy', 'firstName lastName')
    .lean();

  // Don't expose correct answers to students
  const questionsForStudent = questions.map(q => ({
    _id: q._id,
    question: q.question,
    questionType: q.questionType,
    options: q.questionType === 'multiple-choice' ? q.options.map(opt => ({ _id: opt._id, text: opt.text })) : null,
    explanation: null,
    order: q.order
  }));

  res.status(200).json({
    success: true,
    count: questions.length,
    data: req.user.role === 'trainer' || req.user.role === 'administrator' ? questions : questionsForStudent
  });
});

/**
 * @desc    Get all questions for a course
 * @route   GET /api/v1/topic-questions/course/:courseId
 * @access  Private (Trainer/Admin)
 */
export const getCourseQuestions = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  const questions = await TopicQuestion.find({ course: courseId })
    .populate('lesson', 'title')
    .populate('section', 'title')
    .sort({ section: 1, order: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: questions.length,
    data: questions
  });
});

/**
 * @desc    Update a topic question
 * @route   PUT /api/v1/topic-questions/:id
 * @access  Private (Trainer/Admin)
 */
export const updateTopicQuestion = asyncHandler(async (req, res, next) => {
  const { question, questionType, options, correctAnswer, explanation, order } = req.body;

  let topicQuestion = await TopicQuestion.findById(req.params.id);

  if (!topicQuestion) {
    return next(new ErrorResponse('Question not found', 404));
  }

  // Check ownership
  if (topicQuestion.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'administrator') {
    return next(new ErrorResponse('Not authorized to update this question', 403));
  }

  topicQuestion = await TopicQuestion.findByIdAndUpdate(
    req.params.id,
    { question, questionType, options, correctAnswer, explanation, order },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Question updated successfully',
    data: topicQuestion
  });
});

/**
 * @desc    Delete a topic question
 * @route   DELETE /api/v1/topic-questions/:id
 * @access  Private (Trainer/Admin)
 */
export const deleteTopicQuestion = asyncHandler(async (req, res, next) => {
  const topicQuestion = await TopicQuestion.findById(req.params.id);

  if (!topicQuestion) {
    return next(new ErrorResponse('Question not found', 404));
  }

  // Check ownership
  if (topicQuestion.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'administrator') {
    return next(new ErrorResponse('Not authorized to delete this question', 403));
  }

  await topicQuestion.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Question deleted successfully'
  });
});

/**
 * @desc    Submit answer to a question
 * @route   POST /api/v1/topic-questions/:id/answer
 * @access  Private (Student)
 */
export const submitAnswer = asyncHandler(async (req, res, next) => {
  const { answer } = req.body;

  if (answer === undefined) {
    return next(new ErrorResponse('Answer is required', 400));
  }

  const question = await TopicQuestion.findById(req.params.id);

  if (!question) {
    return next(new ErrorResponse('Question not found', 404));
  }

  let isCorrect = false;
  let correctAnswer = '';

  if (question.questionType === 'multiple-choice') {
    const selectedOption = question.options.find(opt => opt._id.toString() === answer);
    isCorrect = selectedOption?.isCorrect || false;
    correctAnswer = question.options.find(opt => opt.isCorrect)?.text || '';
  } else if (question.questionType === 'true-false') {
    isCorrect = answer.toLowerCase() === question.correctAnswer.toLowerCase();
    correctAnswer = question.correctAnswer;
  } else {
    // Short answer - just save the response, no auto-grading
    isCorrect = null;
    correctAnswer = question.correctAnswer || '';
  }

  res.status(200).json({
    success: true,
    data: {
      isCorrect,
      correctAnswer,
      explanation: question.explanation
    }
  });
});

export default {
  addTopicQuestion,
  getLessonQuestions,
  getCourseQuestions,
  updateTopicQuestion,
  deleteTopicQuestion,
  submitAnswer
};