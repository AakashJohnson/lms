import express from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { hasPermission } from '../middlewares/rbac.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.js';
import {
  uploadMedia,
  gridFsUpload,
  streamMedia,
  getMediaLibrary,
  getMedia,
  deleteMedia,
  incrementViewCount,
} from '../controllers/media.controller.js';

const router = express.Router();

// Public / optional-auth
router.get('/', optionalAuth, getMediaLibrary);
router.get('/:mediaId', optionalAuth, getMedia);
router.get('/:mediaId/stream', optionalAuth, streamMedia);

// Protected
router.use(protect);
router.post('/:mediaId/view', incrementViewCount); // New route for view count
router.post(
  '/upload',
  (req, res, next) => {
    try {
      console.log(`[UPLOAD] Incoming request: ${req.method} ${req.originalUrl} - content-type: ${req.headers['content-type']}`);
    } catch (e) {
      // ignore
    }
    return next();
  },
  uploadRateLimiter,
  hasPermission('content:upload'),
  gridFsUpload.single('file'),
  uploadMedia
);
router.delete('/:mediaId', hasPermission('content:delete'), deleteMedia);

export default router;
