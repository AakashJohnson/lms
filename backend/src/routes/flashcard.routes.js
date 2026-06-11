import express from 'express';
import { protect } from '../middlewares/auth.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';
import {
  generateFlashcards,
  getLatestFlashcardDeck,
  reviewFlashcard,
} from '../controllers/aiFlashcard.controller.js';

const router = express.Router();

router.use(protect);

router.post('/generate', aiRateLimiter, generateFlashcards);
router.get('/latest/:courseId/:sectionId/:lessonId', getLatestFlashcardDeck);
router.post('/:deckId/:cardId/review', reviewFlashcard);

export default router;

