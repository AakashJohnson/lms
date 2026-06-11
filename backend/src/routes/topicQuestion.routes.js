import express from 'express';
import {
  addTopicQuestion,
  getLessonQuestions,
  getCourseQuestions,
  updateTopicQuestion,
  deleteTopicQuestion,
  submitAnswer
} from '../controllers/topicQuestion.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get questions for a lesson (all users)
router.get('/lesson/:lessonId', getLessonQuestions);

// Submit answer (students only)
router.post('/:id/answer', authorize('participant'), submitAnswer);

// Admin/Trainer routes
router.post('/', authorize('trainer', 'administrator'), addTopicQuestion);
router.get('/course/:courseId', authorize('trainer', 'administrator'), getCourseQuestions);
router.put('/:id', authorize('trainer', 'administrator'), updateTopicQuestion);
router.delete('/:id', authorize('trainer', 'administrator'), deleteTopicQuestion);

export default router;