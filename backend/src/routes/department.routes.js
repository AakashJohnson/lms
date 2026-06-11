import express from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentBatches
} from '../controllers/department.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Public routes (all authenticated users can view)
router.get('/', getDepartments);
router.get('/:id', getDepartment);
router.get('/:id/batches', getDepartmentBatches);

// Admin-only routes
router.post('/', authorize('administrator'), createDepartment);
router.put('/:id', authorize('administrator'), updateDepartment);
router.delete('/:id', authorize('administrator'), deleteDepartment);

export default router;
