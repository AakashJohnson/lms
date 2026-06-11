import express from 'express';
import {
  analyzeContent,
  getCourseMicroLessons,
  getMicroLesson,
  updateProgress,
  submitQuiz,
  getUserStats,
  getLeaderboard,
  askAITutor,
  uploadTutorAttachment,
  tutorAttachmentUpload,
  getTutorConversation,
  clearTutorConversation,
  toggleBookmark,
  getRecommendations,
  updateMicroLesson,
  deleteMicroLesson,
  getTeacherCourseBytes
} from '../controllers/byteSize.controller.js';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Content analysis (admin/trainer only - will add role check in controller)
router.post('/analyze', analyzeContent);

// Course micro-lessons
router.get('/course/:courseId', getCourseMicroLessons);
router.get('/teacher/courses/:courseId/bytes', getTeacherCourseBytes);

// Single lesson
router.get('/lesson/:lessonId', getMicroLesson);
router.put('/lesson/:lessonId', updateMicroLesson);
router.delete('/lesson/:lessonId', deleteMicroLesson);

// Progress tracking
router.post('/progress', updateProgress);

// Quiz
router.post('/quiz', submitQuiz);

// Stats and gamification
router.get('/stats', getUserStats);
router.get('/leaderboard', getLeaderboard);

// AI Tutor
router.post('/tutor', aiRateLimiter, askAITutor);
router.post('/tutor/attachment', aiRateLimiter, tutorAttachmentUpload.single('file'), uploadTutorAttachment);
router.get('/tutor/conversation', getTutorConversation);
router.delete('/tutor/conversation', clearTutorConversation);

// Bookmarks
router.post('/bookmark', toggleBookmark);

// Recommendations
router.get('/recommendations', getRecommendations);

export default router;
