import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  listForumPosts,
  createForumPost,
  getForumPost,
  addForumReply,
  togglePostLike,
  togglePostSolved,
  togglePostPin,
  aiGenerateSummary,
  aiSuggestReply,
} from '../controllers/forum.controller.js';

const router = express.Router();

router.use(protect);

router.get('/posts', listForumPosts);
router.post('/posts', createForumPost);
router.get('/posts/:postId', getForumPost);

router.post('/posts/:postId/replies', addForumReply);
router.post('/posts/:postId/like', togglePostLike);
router.post('/posts/:postId/solve', togglePostSolved);
router.post('/posts/:postId/pin', togglePostPin);

router.post('/posts/:postId/ai/summary', aiGenerateSummary);
router.post('/posts/:postId/ai/suggest-reply', aiSuggestReply);

export default router;

