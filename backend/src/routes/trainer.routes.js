import express from 'express';
import {
  getMyStudents,
  getStudentDetails
} from '../controllers/trainer.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All routes require authentication and trainer role
router.use(protect);
router.use(authorize('trainer'));

// Get students from trainer's assigned batches
router.get('/students', getMyStudents);

// Get specific student details
router.get('/students/:id', getStudentDetails);

export default router;
