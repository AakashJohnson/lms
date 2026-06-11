import ForumPost from '../models/ForumPost.model.js';
import ForumReply from '../models/ForumReply.model.js';
import Course from '../models/Course.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import { moderateForumText } from '../utils/aiForumModeration.js';
import mongoose from 'mongoose';

const buildHeuristicSummary = (title, body, replies) => {
  const clean = `${title}\n${body}\n${(replies || []).map((r) => r.content).join('\n')}`.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const top = sentences.slice(0, 4).join(' ');
  return top || clean.slice(0, 400);
};

const buildSmartReplySuggestion = (postTitle, postBody, userMessage) => {
  const query = userMessage ? userMessage.toLowerCase() : '';
  const base =
    `Here’s a helpful approach:\n\n` +
    `1) Restate what the lesson/topic is asking (in your own words).\n` +
    `2) Give 2–3 key points from the course material.\n` +
    `3) Include a simple example and then a quick “check for understanding”.\n\n`;

  const add =
    query.includes('how') || query.includes('explain')
      ? `For "${postTitle}", start by defining the core concept, then walk through the steps and finish with an example.`
      : `For "${postTitle}", focus on clarity: define the key term(s), connect them to the lesson context, and mention one practical application.`;

  return base + add;
};

// GET /api/v1/forum/posts
export const listForumPosts = asyncHandler(async (req, res) => {
  const { query = '', category, tag, limit = 12 } = req.query;

  const q = String(query || '').trim();
  const courseRegex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

  const match = {};
  if (category && category !== 'all') match.category = category;
  if (tag && tag !== 'all') match.tags = String(tag).toLowerCase();

  if (courseRegex) {
    match.$or = [{ title: courseRegex }, { body: courseRegex }, { tags: courseRegex }];
  }

  const posts = await ForumPost.find(match)
    .sort({ pinned: -1, solved: -1, viewCount: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'firstName lastName email profilePicture')
    .lean();

  res.status(200).json({ success: true, data: posts });
});

// POST /api/v1/forum/posts
export const createForumPost = asyncHandler(async (req, res, next) => {
  const { courseId = null, title, body, category = 'general', tags = [] } = req.body || {};
  if (!title || !body) return next(new ErrorResponse('title and body are required', 400));

  const moderated = moderateForumText({ text: `${title}\n${body}` });
  if (!moderated.safe) return next(new ErrorResponse(moderated.reason, 400));

  const post = await ForumPost.create({
    author: req.user._id,
    course: courseId || null,
    title: String(title).trim(),
    body: String(body).trim(),
    category,
    tags: Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 8) : [],
  });

  const populated = await ForumPost.findById(post._id).populate('author', 'firstName lastName email profilePicture').lean();

  res.status(201).json({ success: true, data: populated });
});

// GET /api/v1/forum/posts/:postId
export const getForumPost = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) return next(new ErrorResponse('Invalid postId', 400));

  const post = await ForumPost.findById(postId)
    .populate('author', 'firstName lastName email profilePicture')
    .populate('course', 'title thumbnail')
    .lean();

  if (!post) return next(new ErrorResponse('Post not found', 404));

  await ForumPost.findByIdAndUpdate(postId, { $inc: { viewCount: 1 } }).catch(() => {});

  const replies = await ForumReply.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate('author', 'firstName lastName email profilePicture')
    .lean();

  res.status(200).json({ success: true, data: { post, replies } });
});

// POST /api/v1/forum/posts/:postId/replies
export const addForumReply = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { content, parentReplyId = null } = req.body || {};

  if (!content) return next(new ErrorResponse('content is required', 400));

  const moderated = moderateForumText({ text: content });
  if (!moderated.safe) return next(new ErrorResponse(moderated.reason, 400));

  const reply = await ForumReply.create({
    post: postId,
    parentReplyId: parentReplyId || null,
    author: req.user._id,
    content: String(content).trim(),
  });

  const populated = await ForumReply.findById(reply._id)
    .populate('author', 'firstName lastName email profilePicture')
    .lean();

  res.status(201).json({ success: true, data: populated });
});

// POST /api/v1/forum/posts/:postId/like
export const togglePostLike = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const post = await ForumPost.findById(postId);
  if (!post) return next(new ErrorResponse('Post not found', 404));

  const userId = req.user._id;
  const hasLiked = post.likes.some((id) => String(id) === String(userId));
  if (hasLiked) {
    post.likes = post.likes.filter((id) => String(id) !== String(userId));
  } else {
    post.likes.push(userId);
  }

  await post.save();
  res.status(200).json({ success: true, data: post });
});

// POST /api/v1/forum/posts/:postId/solve
export const togglePostSolved = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  if (!['trainer', 'administrator', 'admin'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const post = await ForumPost.findById(postId);
  if (!post) return next(new ErrorResponse('Post not found', 404));

  post.solved = !post.solved;
  await post.save();

  res.status(200).json({ success: true, data: post });
});

// POST /api/v1/forum/posts/:postId/pin
export const togglePostPin = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  if (!['trainer', 'administrator', 'admin'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const post = await ForumPost.findById(postId);
  if (!post) return next(new ErrorResponse('Post not found', 404));

  post.pinned = !post.pinned;
  await post.save();

  res.status(200).json({ success: true, data: post });
});

// POST /api/v1/forum/posts/:postId/ai/summary
export const aiGenerateSummary = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { force = false } = req.body || {};

  const post = await ForumPost.findById(postId).lean();
  if (!post) return next(new ErrorResponse('Post not found', 404));

  if (post.aiSummary && !force) {
    return res.status(200).json({ success: true, data: { summary: post.aiSummary } });
  }

  const replies = await ForumReply.find({ post: postId }).lean();
  const summary = buildHeuristicSummary(post.title, post.body, replies);

  await ForumPost.findByIdAndUpdate(postId, { aiSummary: summary }).catch(() => {});
  res.status(200).json({ success: true, data: { summary } });
});

// POST /api/v1/forum/posts/:postId/ai/suggest-reply
export const aiSuggestReply = asyncHandler(async (req, res, next) => {
  const { postId } = req.params;
  const { userMessage = '' } = req.body || {};

  const post = await ForumPost.findById(postId).lean();
  if (!post) return next(new ErrorResponse('Post not found', 404));

  const suggestion = buildSmartReplySuggestion(post.title, post.body, userMessage);
  res.status(200).json({ success: true, data: { suggestion } });
});

