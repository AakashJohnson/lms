import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { getAiUsageSummary } from '../controllers/aiOps.controller.js';

const router = express.Router();

router.use(protect);
router.get('/usage-summary', authorize('administrator'), getAiUsageSummary);

export default router;
