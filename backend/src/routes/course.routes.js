import express from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { authorize, hasPermission } from '../middlewares/rbac.js';
import {
  createCourse,
  updateCourse,
  getCourses,
  getCourse,
  updateCourseStatus,
  saveLesson,
  createLesson,
  createSectionWithLessons,
  deleteCourse,
  submitCourseForReview,
  withdrawCourseReview,
} from '../controllers/course.controller.js';
import {
  enrollCourse,
  getEnrollmentStatus,
  getMyEnrollments,
  updateLessonProgress,
  getCourseProgress,
  getCourseEnrollments,
  getStudentDashboard,
  resetCourseProgress,
  getLearningHistory,
  getLearningStats,
} from '../controllers/enrollment.controller.js';

const router = express.Router();

// Public / optional-auth routes
router.get('/', optionalAuth, getCourses);

// Protected routes
router.use(protect);

// Student dashboard and my enrollments must stay before /:courseId.
router.get('/my-enrollments', getMyEnrollments);
router.get('/student-dashboard', getStudentDashboard);
router.get('/learning-stats', getLearningStats);

// CRUD
router.post('/', hasPermission('courses:create'), createCourse);

// Status toggle must stay before /:courseId GET.
router.patch('/:courseId/status', hasPermission('courses:update'), updateCourseStatus);
router.put('/:courseId/submit-review', authorize('trainer', 'administrator'), submitCourseForReview);
router.put('/:courseId/withdraw-review', authorize('trainer', 'administrator'), withdrawCourseReview);
router.post('/:courseId/sections-with-lessons', hasPermission('courses:update'), createSectionWithLessons);
router.post('/:courseId/sections/:sectionId/lessons', hasPermission('courses:update'), createLesson);
router.patch('/:courseId/sections/:sectionId/lessons/:lessonId', hasPermission('courses:update'), saveLesson);

router.get('/:courseId', optionalAuth, getCourse);
router.put('/:courseId', hasPermission('courses:update'), updateCourse);
router.delete('/:courseId', authorize('administrator'), deleteCourse);

// Enrollment
router.post('/:courseId/enroll', enrollCourse);
router.get('/:courseId/enrollment-status', getEnrollmentStatus);
router.get('/:courseId/progress', getCourseProgress);
router.put('/:courseId/progress', updateLessonProgress);
router.post('/:courseId/reset-progress', resetCourseProgress);
router.get('/:courseId/learning-history', getLearningHistory);
router.get('/:courseId/enrollments', authorize('administrator', 'trainer'), getCourseEnrollments);

// Reviews
router.post('/:courseId/reviews', (req, res) => res.json({ message: 'Add review' }));
router.get('/:courseId/reviews', (req, res) => res.json({ message: 'Get reviews' }));

export default router;
