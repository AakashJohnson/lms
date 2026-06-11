import express from 'express';
import {
  getDashboardStats,
  getMyDashboard,
  getAdminDashboard,
  getTrainerDashboard
} from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/my-dashboard', protect, getMyDashboard);
router.get('/admin', protect, authorize('administrator'), getAdminDashboard);
router.get('/trainer', protect, authorize('trainer', 'administrator'), getTrainerDashboard);

export default router;
