import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Media from '../models/Media.model.js';
import { notifyNewMedia, SOCKET_EVENTS } from '../utils/socketEmitter.js';
import { gridFsUpload, uploadMediaAsset } from './file.controller.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Upload directory ─────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Multer config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('video') ? 'videos'
               : file.mimetype.startsWith('image') ? 'images'
               : file.mimetype.startsWith('audio') ? 'audio'
               : 'documents';
    const dir = path.join(UPLOAD_DIR, type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'video/x-matroska', 'video/matroska', // MKV support
    'video/x-msvideo', 'video/avi', // AVI support
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`File type ${file.mimetype} not allowed`), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB for large videos
});

export { gridFsUpload };

// ─── Upload media ─────────────────────────────────────────────────────────────
export const uploadMedia = async (req, res) => {
  try { console.log(`[UPLOAD] Enter uploadMedia ${req.method} ${req.originalUrl} content-type=${req.headers['content-type']}`); } catch (e) {}
  if (req.file?.gridfsFileId) {
    return uploadMediaAsset(req, res);
  }

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { title, description, courseId, lessonId, category, tags } = req.body;
    const file = req.file;

    // Determine type
    const type = file.mimetype.startsWith('video') ? 'video'
               : file.mimetype.startsWith('image') ? 'image'
               : file.mimetype.startsWith('audio') ? 'audio'
               : 'document';

    // Build accessible URL (relative to server)
    const relativePath = file.path.replace(path.join(__dirname, '../..'), '').replace(/\\/g, '/');
    const fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}${relativePath}`;

    console.log('📁 File uploaded:');
    console.log('  - Original path:', file.path);
    console.log('  - Relative path:', relativePath);
    console.log('  - File URL:', fileUrl);
    console.log('  - Category:', category);
    console.log('  - Tags:', tags);

    // Parse tags if it's a JSON string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (e) {
        parsedTags = [];
      }
    }

    const media = await Media.create({
      title: title || file.originalname,
      description: description || '',
      mediaType: type,
      mimeType: file.mimetype,
      fileUrl,
      fileName: file.filename,
      fileSize: file.size,
      category: category || 'educational',
      tags: parsedTags,
      uploadedBy: {
        userId: req.user._id,
        userType: req.user.role === 'administrator' ? 'admin' : 'trainer',
        name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
      },
      relatedCourse: courseId || null,
      accessLevel: 'enrolled',
      isActive: true,
      views: 0,
      source: req.body.source || 'media_library',
      module: req.body.module || 'media_library',
      usageType: req.body.usageType || 'library_resource',
      // Store relative path in metadata for streaming
      metadata: { resolution: relativePath },
    });

    // Emit real-time event to all students
    const io = req.app.get('io');
    if (io) {
      notifyNewMedia(io, media);
    }

    // Send notifications to all active students
    // Send notifications in background so upload API responds quickly
    (async () => {
      try {
        const { createNotification } = await import('./notification.controller.js');
        const { sendNotification } = await import('../utils/socketEmitter.js');
        const User = (await import('../models/User.model.js')).default;

        const activeStudents = await User.find({ role: 'student', isActive: true }).select('_id').lean();

        const notifyPromises = activeStudents.map((student) =>
          createNotification(
            student._id.toString(),
            'New Content Uploaded',
            `New ${type} uploaded: "${title || file.originalname}"`,
            'info',
            'media-library'
          )
            .then(() => {
              if (io) {
                sendNotification(io, student._id.toString(), {
                  _id: media._id,
                  title: 'New Content Uploaded',
                  message: `${title || file.originalname} - Check it out!`,
                  type: 'info',
                  createdAt: new Date(),
                });
              }
            })
            .catch((err) => console.error('Notification send failed for', student._id, err))
        );

        await Promise.allSettled(notifyPromises);
        console.log(`✅ Media upload notifications sent to ${activeStudents.length} students`);
      } catch (notifError) {
        console.error('❌ Failed to send media notifications:', notifError);
      }
    })();

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        _id: media._id,
        title: media.title,
        type: media.mediaType,
        fileUrl: media.fileUrl,
        fileSize: media.fileSize,
        mimeType: media.mimeType,
        category: media.category,
        tags: media.tags,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Stream / serve media ─────────────────────────────────────────────────────
export const streamMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const media = await Media.findById(mediaId);

    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

    if (media.storageProvider === 'gridfs' && media.fileAssetId) {
      req.params.fileAssetId = String(media.fileAssetId);
      const { streamFileAsset } = await import('./file.controller.js');
      return streamFileAsset(req, res);
    }

    // fileKey stored in metadata.resolution field
    const fileKey = media.metadata?.resolution;
    if (!fileKey) return res.status(404).json({ success: false, message: 'File path not found' });

    const filePath = path.join(__dirname, '../..', fileKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range && media.type === 'video') {
      // Range request for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': media.mimeType || 'video/mp4',
        'Content-Disposition': 'inline',
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': media.mimeType || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }

    // Increment view count
    Media.findByIdAndUpdate(mediaId, { $inc: { viewCount: 1 } }).catch(() => {});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get media library ────────────────────────────────────────────────────────
export const getMediaLibrary = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true, source: 'media_library' };
    if (type) filter.mediaType = type;

    // Trainers see only their own media; admins see all
    if (req.user?.role === 'trainer') filter['uploadedBy.userId'] = req.user._id;

    const [items, total] = await Promise.all([
      Media.find(filter)
        .populate('uploadedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Media.countDocuments(filter),
    ]);

    // Add unique viewers count to each item
    const itemsWithViewers = items.map(item => ({
      ...item,
      uniqueViewersCount: item.uniqueViewers?.length || 0
    }));

    res.json({
      success: true,
      data: itemsWithViewers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get single media ─────────────────────────────────────────────────────────
export const getMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.mediaId).populate('uploadedBy', 'firstName lastName').lean();
    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete media ─────────────────────────────────────────────────────────────
export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.mediaId);
    if (!media) return res.status(404).json({ success: false, message: 'Media not found' });

    // Delete file from disk
    const fileKey = media.metadata?.resolution;
    if (fileKey) {
      const filePath = path.join(__dirname, '../..', fileKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await media.deleteOne();
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Increment view count ─────────────────────────────────────────────────────
export const incrementViewCount = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user._id;
    
    const media = await Media.findById(mediaId);
    
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    // Check if user has already viewed this media
    const hasViewed = media.uniqueViewers.some(
      viewer => viewer.userId.toString() === userId.toString()
    );

    if (!hasViewed) {
      // Add user to unique viewers list
      media.uniqueViewers.push({
        userId: userId,
        viewedAt: new Date()
      });
    }

    // Always increment total view count (for multiple views by same user)
    media.viewCount += 1;
    
    await media.save();

    res.json({ 
      success: true, 
      message: 'View count incremented',
      data: { 
        viewCount: media.viewCount,
        uniqueViewers: media.uniqueViewers.length,
        isFirstView: !hasViewed
      }
    });
  } catch (error) {
    console.error('View count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
