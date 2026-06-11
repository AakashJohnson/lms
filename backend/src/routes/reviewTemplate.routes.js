import express from 'express';
import {
  getActiveTemplates,
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} from '../controllers/reviewTemplate.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// Public route - get active templates for students
router.get('/', getActiveTemplates);

// Admin routes
router.get('/admin', protect, authorize('administrator'), getAllTemplates);
router.post('/', protect, authorize('administrator'), createTemplate);
router.put('/:id', protect, authorize('administrator'), updateTemplate);
router.delete('/:id', protect, authorize('administrator'), deleteTemplate);

export default router;