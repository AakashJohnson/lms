import express from 'express';
import {
  createCourseQuery,
  getCourseQueries,
  getTrainerQueries,
  replyToCourseQuery,
  getMyQueries,
  updateQueryStatus,
  toggleQueryVisibility,
  upvoteQuery,
  togglePinQuery
} from '../controllers/courseQuery.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// Student routes
router.post('/', protect, authorize('student'), createCourseQuery);
router.get('/my-queries', protect, authorize('student'), getMyQueries);
router.get('/course/:courseId', protect, authorize('student'), getCourseQueries);
router.patch('/:queryId/visibility', protect, authorize('student'), toggleQueryVisibility);
router.post('/:queryId/upvote', protect, authorize('student'), upvoteQuery);

// Trainer/Admin routes
router.get('/trainer', protect, authorize('trainer', 'administrator', 'admin'), getTrainerQueries);
router.post('/:queryId/reply', protect, authorize('trainer', 'administrator', 'admin'), replyToCourseQuery);
router.patch('/:queryId/status', protect, authorize('trainer', 'administrator', 'admin'), updateQueryStatus);
router.patch('/:queryId/pin', protect, authorize('trainer', 'administrator', 'admin'), togglePinQuery);

export default router;
