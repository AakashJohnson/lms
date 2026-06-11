import express from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { hasPermission } from '../middlewares/rbac.js';
import { uploadRateLimiter } from '../middlewares/rateLimiter.js';
import {
  deleteFileAsset,
  downloadFileAsset,
  getFileAssetInfo,
  gridFsUpload,
  localFileUpload,
  streamFileAsset,
  uploadFileAsset,
  viewFileAsset,
} from '../controllers/file.controller.js';

const router = express.Router();
const fileStorageProvider = String(process.env.FILE_STORAGE_PROVIDER || 'gridfs').toLowerCase();
const uploadMiddleware = fileStorageProvider === 'gridfs' ? gridFsUpload.single('file') : localFileUpload.single('file');

router.get('/:fileAssetId/view', optionalAuth, viewFileAsset);
router.get('/:fileAssetId/stream', optionalAuth, streamFileAsset);
router.get('/:fileAssetId/download', optionalAuth, downloadFileAsset);
router.get('/:fileAssetId/info', optionalAuth, getFileAssetInfo);

// Temporary test route to isolate upload middleware vs controller/DB issues.
// This returns immediately after multer storage completes and exposes `req.file`.
router.post('/test-upload', uploadRateLimiter, uploadMiddleware, async (req, res) => {
  try {
    console.log('[TEST-UPLOAD] controller reached');
    console.log('[TEST-UPLOAD] req.file:', req.file && (typeof req.file === 'object' ? (req.file.gridfsFileId || req.file.filename || req.file.originalname) : String(req.file)));
    return res.status(201).json({ success: true, message: 'Upload middleware completed', file: req.file });
  } catch (err) {
    console.error('[TEST-UPLOAD] error:', err && err.message);
    return res.status(500).json({ success: false, message: err && err.message });
  }
});

router.use(protect);
router.post('/upload', uploadRateLimiter, hasPermission('content:upload'), uploadMiddleware, uploadFileAsset);
router.delete('/:fileAssetId', hasPermission('content:delete'), deleteFileAsset);

export default router;
