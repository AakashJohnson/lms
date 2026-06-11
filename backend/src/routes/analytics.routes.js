import express from 'express';
import {
  getOverviewAnalytics,
  getCourseAnalytics,
  getCourseDetailedAnalytics,
  getPeakHoursAnalytics,
  getRecentActivity
} from '../controllers/analytics.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All analytics routes require authentication
router.use(protect);

// Overview analytics - accessible by admin and trainer
router.get('/overview', authorize('administrator', 'trainer'), getOverviewAnalytics);

// Course analytics - accessible by admin and trainer
router.get('/courses', authorize('administrator', 'trainer'), getCourseAnalytics);

// Detailed course analytics - accessible by admin and trainer
router.get('/course/:courseId', authorize('administrator', 'trainer'), getCourseDetailedAnalytics);

// Peak hours analytics - admin only
router.get('/peak-hours', authorize('administrator'), getPeakHoursAnalytics);

// Recent activity - accessible by admin and trainer
router.get('/recent-activity', authorize('administrator', 'trainer'), getRecentActivity);

export default router;
