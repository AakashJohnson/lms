import LessonNote from '../models/LessonNote.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Create a new lesson note
 * @route   POST /api/v1/lesson-notes
 * @access  Private (student)
 */
export const createLessonNote = asyncHandler(async (req, res, next) => {
  const { course, section, lesson, content, timestamp, isImportant, tags, title } = req.body;

  if (!course || !section || !lesson || !content) {
    return next(new ErrorResponse('Course, section, lesson, and content are required', 400));
  }

  const note = await LessonNote.create({
    student: req.user._id,
    course,
    section,
    lesson,
    content,
    timestamp,
    isImportant,
    title: title || "",
    tags: tags || []
  });

  res.status(201).json({
    success: true,
    message: 'Note created successfully',
    data: note
  });
});

/**
 * @desc    Get all notes for a student
 * @route   GET /api/v1/lesson-notes
 * @access  Private (student)
 */
export const getMyNotes = asyncHandler(async (req, res) => {
  const { course, section, lesson, page = 1, limit = 50 } = req.query;

  const filter = { student: req.user._id };

  if (course) filter.course = course;
  if (section) filter.section = section;
  if (lesson) filter.lesson = lesson;

  const skip = (Number(page) - 1) * Number(limit);

  const [notes, total] = await Promise.all([
    LessonNote.find(filter)
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    LessonNote.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: notes
  });
});

/**
 * @desc    Get notes for a specific lesson
 * @route   GET /api/v1/lesson-notes/lesson/:courseId/:sectionId/:lessonId
 * @access  Private (student)
 */
export const getLessonNotes = asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId } = req.params;

  const notes = await LessonNote.find({
    student: req.user._id,
    course: courseId,
    section: sectionId,
    lesson: lessonId
  })
    .sort({ timestamp: 1, createdAt: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes
  });
});

/**
 * @desc    Get single note
 * @route   GET /api/v1/lesson-notes/:id
 * @access  Private (student - own notes only)
 */
export const getNote = asyncHandler(async (req, res, next) => {
  const note = await LessonNote.findById(req.params.id)
    .populate('course', 'title')
    .lean();

  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to access this note', 403));
  }

  res.status(200).json({
    success: true,
    data: note
  });
});

/**
 * @desc    Update note
 * @route   PUT /api/v1/lesson-notes/:id
 * @access  Private (student - own notes only)
 */
export const updateNote = asyncHandler(async (req, res, next) => {
  let note = await LessonNote.findById(req.params.id);

  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to update this note', 403));
  }

  const { content, isImportant, tags, timestamp, title } = req.body;

  note = await LessonNote.findByIdAndUpdate(
    req.params.id,
    {
      ...(content !== undefined && { content }),
      ...(isImportant !== undefined && { isImportant }),
      ...(tags !== undefined && { tags }),
      ...(timestamp !== undefined && { timestamp }),
      ...(title !== undefined && { title })
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Note updated successfully',
    data: note
  });
});

/**
 * @desc    Delete note
 * @route   DELETE /api/v1/lesson-notes/:id
 * @access  Private (student - own notes only)
 */
export const deleteNote = asyncHandler(async (req, res, next) => {
  const note = await LessonNote.findById(req.params.id);

  if (!note) {
    return next(new ErrorResponse('Note not found', 404));
  }

  // Check ownership
  if (note.student.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to delete this note', 403));
  }

  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully'
  });
});

/**
 * @desc    Get notes count for a course
 * @route   GET /api/v1/lesson-notes/count/:courseId
 * @access  Private (student)
 */
export const getCourseNotesCount = asyncHandler(async (req, res) => {
  const count = await LessonNote.countDocuments({
    student: req.user._id,
    course: req.params.courseId
  });

  res.status(200).json({
    success: true,
    data: { count }
  });
});

/**
 * @desc    Search notes
 * @route   GET /api/v1/lesson-notes/search
 * @access  Private (student)
 */
export const searchNotes = asyncHandler(async (req, res) => {
  const { query, course } = req.query;

  if (!query) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }

  const filter = {
    student: req.user._id,
    content: { $regex: query, $options: 'i' }
  };

  if (course) filter.course = course;

  const notes = await LessonNote.find(filter)
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes
  });
});
