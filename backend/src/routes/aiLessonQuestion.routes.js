import express from 'express';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';
import {
  askLessonQuestion,
  getLessonAiContext,
  getLessonQuestionHistory,
} from '../controllers/aiLessonQuestion.controller.js';

const router = express.Router();

router.use(protect);

router.post('/ask', aiRateLimiter, askLessonQuestion);
router.get('/context/:courseId/:lessonId', getLessonAiContext);
router.get('/history/:courseId/:sectionId/:lessonId', getLessonQuestionHistory);

export default router;
