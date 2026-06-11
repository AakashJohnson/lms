import CourseRating from '../models/CourseRating.model.js';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Submit or update course rating
 * @route   POST /api/v1/ratings
 * @access  Private/Student
 */
export const submitRating = asyncHandler(async (req, res, next) => {
  const { courseId, rating, review, templateId } = req.body;
  const studentId = req.user._id;

  // Validate input
  if (!courseId || !rating) {
    return next(new ErrorResponse('Course ID and rating are required', 400));
  }

  if (rating < 1 || rating > 5) {
    return next(new ErrorResponse('Rating must be between 1 and 5', 400));
  }

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  // Check if student is enrolled and has completed the course
  const enrollment = await Enrollment.findOne({
    user: studentId,
    course: courseId
  });

  if (!enrollment) {
    return next(new ErrorResponse('You must be enrolled in this course to rate it', 403));
  }

  // Determine the final review text
  let finalReview = review;

  // If templateId is provided, get the template text
  if (templateId) {
    const ReviewTemplate = (await import('../models/ReviewTemplate.model.js')).default;
    const template = await ReviewTemplate.findById(templateId);
    if (!template) {
      return next(new ErrorResponse('Review template not found', 404));
    }
    // Use template text, or custom review if also provided (custom takes precedence)
    finalReview = review || template.templateText;
  }

  // Check if rating already exists
  let courseRating = await CourseRating.findOne({
    course: courseId,
    student: studentId
  });

  if (courseRating) {
    // Update existing rating
    courseRating.rating = rating;
    courseRating.review = finalReview || courseRating.review;
    await courseRating.save();
  } else {
    // Create new rating
    courseRating = await CourseRating.create({
      course: courseId,
      student: studentId,
      rating,
      review: finalReview
    });
  }

  // Populate student details
  await courseRating.populate('student', 'firstName lastName profilePicture');
  await courseRating.populate('course', 'title thumbnail');

  res.status(201).json({
    success: true,
    message: 'Rating submitted successfully',
    data: courseRating
  });
});

/**
 * @desc    Get ratings for a course
 * @route   GET /api/v1/ratings/course/:courseId
 * @access  Public
 */
export const getCourseRatings = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const ratings = await CourseRating.find({
    course: courseId,
    isApproved: true,
    isVisible: true
  })
    .populate('student', 'firstName lastName profilePicture')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await CourseRating.countDocuments({
    course: courseId,
    isApproved: true,
    isVisible: true
  });

  res.status(200).json({
    success: true,
    data: ratings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get student's rating for a course
 * @route   GET /api/v1/ratings/my-rating/:courseId
 * @access  Private/Student
 */
export const getMyRating = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const studentId = req.user._id;

  const rating = await CourseRating.findOne({
    course: courseId,
    student: studentId
  })
    .populate('course', 'title thumbnail')
    .lean();

  res.status(200).json({
    success: true,
    data: rating
  });
});

/**
 * @desc    Get all ratings (Admin/Trainer)
 * @route   GET /api/v1/ratings
 * @access  Private/Admin/Trainer
 */
export const getAllRatings = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, courseId, trainerId, minRating, maxRating } = req.query;
  
  const query = {};
  
  // If trainer, only show their course ratings
  if (req.user.role === 'trainer') {
    const courses = await Course.find({
      $or: [{ trainer: req.user._id }, { createdBy: req.user._id }]
    }).select('_id');
    query.course = { $in: courses.map(c => c._id) };
  }
  
  // Filter by course
  if (courseId) {
    query.course = courseId;
  }
  
  // Filter by trainer (admin only)
  if (trainerId && req.user.role === 'administrator') {
    const trainerCourses = await Course.find({
      $or: [{ trainer: trainerId }, { createdBy: trainerId }]
    }).select('_id');
    query.course = { $in: trainerCourses.map(c => c._id) };
  }
  
  // Filter by rating range
  if (minRating) {
    query.rating = { ...query.rating, $gte: parseInt(minRating) };
  }
  if (maxRating) {
    query.rating = { ...query.rating, $lte: parseInt(maxRating) };
  }

  const ratings = await CourseRating.find(query)
    .populate('student', 'firstName lastName email profilePicture')
    .populate('course', 'title thumbnail category')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await CourseRating.countDocuments(query);

  res.status(200).json({
    success: true,
    data: ratings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get recent ratings (for admin dashboard)
 * @route   GET /api/v1/ratings/recent
 * @access  Private/Admin
 */
export const getRecentRatings = asyncHandler(async (req, res, next) => {
  const { limit = 10 } = req.query;

  const ratings = await CourseRating.find({
    isApproved: true,
    isVisible: true
  })
    .populate('student', 'firstName lastName profilePicture')
    .populate('course', 'title thumbnail')
    .sort('-createdAt')
    .limit(parseInt(limit))
    .lean();

  res.status(200).json({
    success: true,
    data: ratings
  });
});

/**
 * @desc    Delete rating (Admin only)
 * @route   DELETE /api/v1/ratings/:id
 * @access  Private/Admin
 */
export const deleteRating = asyncHandler(async (req, res, next) => {
  const rating = await CourseRating.findById(req.params.id);

  if (!rating) {
    return next(new ErrorResponse('Rating not found', 404));
  }

  await rating.remove();

  res.status(200).json({
    success: true,
    message: 'Rating deleted successfully'
  });
});

/**
 * @desc    Toggle rating visibility (Admin only)
 * @route   PATCH /api/v1/ratings/:id/visibility
 * @access  Private/Admin
 */
export const toggleRatingVisibility = asyncHandler(async (req, res, next) => {
  const rating = await CourseRating.findById(req.params.id);

  if (!rating) {
    return next(new ErrorResponse('Rating not found', 404));
  }

  rating.isVisible = !rating.isVisible;
  await rating.save();

  res.status(200).json({
    success: true,
    message: `Rating ${rating.isVisible ? 'shown' : 'hidden'} successfully`,
    data: rating
  });
});

export default {
  submitRating,
  getCourseRatings,
  getMyRating,
  getAllRatings,
  getRecentRatings,
  deleteRating,
  toggleRatingVisibility
};
