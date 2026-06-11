import express from 'express';
import {
  submitRating,
  getCourseRatings,
  getMyRating,
  getAllRatings,
  getRecentRatings,
  deleteRating,
  toggleRatingVisibility
} from '../controllers/courseRating.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// Public routes
router.get('/course/:courseId', getCourseRatings);

// Protected routes (Student)
router.post('/', protect, submitRating);
router.get('/my-rating/:courseId', protect, getMyRating);

// Admin/Trainer routes
router.get('/', protect, authorize('administrator', 'trainer'), getAllRatings);
router.get('/recent', protect, authorize('administrator'), getRecentRatings);
router.delete('/:id', protect, authorize('administrator'), deleteRating);
router.patch('/:id/visibility', protect, authorize('administrator'), toggleRatingVisibility);

export default router;
