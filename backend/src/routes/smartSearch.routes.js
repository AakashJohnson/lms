import express from 'express';
import { protect } from '../middlewares/auth.js';
import { smartSearch } from '../controllers/smartSearch.controller.js';
import { aiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(protect);

// POST /api/v1/smart-search
router.post('/', aiRateLimiter, smartSearch);

export default router;

