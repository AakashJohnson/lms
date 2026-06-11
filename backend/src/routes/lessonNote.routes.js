import express from 'express';
import {
  createLessonNote,
  getMyNotes,
  getLessonNotes,
  getNote,
  updateNote,
  deleteNote,
  getCourseNotesCount,
  searchNotes
} from '../controllers/lessonNote.controller.js';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';
import {
  generateAiLessonNotes,
  getLatestAiLessonNotes,
  getVideoSummary,
  generateLessonAiSummary,
  getLessonAiSummaryStatus,
  bookmarkAiLessonNotes,
  saveAiLessonNotesForRevision,
  regenerateVideoSummary,
} from '../controllers/aiLessonNote.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// General routes
router.post('/', createLessonNote);
router.get('/', getMyNotes);
router.get('/search', searchNotes);

// Specific lesson notes
router.get('/lesson/:courseId/:sectionId/:lessonId', getLessonNotes);

// Course notes count
router.get('/count/:courseId', getCourseNotesCount);

// AI-generated lesson notes
router.post('/ai/generate', aiRateLimiter, generateAiLessonNotes);
router.get('/ai/latest/:courseId/:sectionId/:lessonId', getLatestAiLessonNotes);
router.post('/ai/:aiNoteId/bookmark', bookmarkAiLessonNotes);
router.post('/ai/:aiNoteId/save', saveAiLessonNotesForRevision);

// Automatic AI video summaries
router.get('/video-summary/:courseId/:sectionId/:lessonId', getVideoSummary);
router.post('/video-summary/regenerate', aiRateLimiter, regenerateVideoSummary);
router.post('/video-summary/:courseId/:sectionId/:lessonId/generate', aiRateLimiter, generateLessonAiSummary);
router.get('/video-summary/:courseId/:sectionId/:lessonId/status', getLessonAiSummaryStatus);

// Single note operations
router.get('/:id', getNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
