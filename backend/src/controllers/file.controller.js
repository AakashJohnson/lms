import multer from 'multer';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { once } from 'events';
import { pipeline } from 'stream/promises';
import FileAsset from '../models/FileAsset.model.js';
import Media from '../models/Media.model.js';
import Course from '../models/Course.model.js';
import {
  buildFileUrls,
  detectMediaType,
  getGridFSFile,
  getUploadBucket,
  isAllowedMimeType,
  toObjectId,
  deleteGridFSFile,
} from '../services/fileStorage.service.js';
import { enqueueFileAssetTranscriptJob } from '../services/fileAssetTranscriptJob.service.js';
import { streamGridFsRangeToResponse } from '../services/gridfsChunkReader.service.js';

const maxUploadMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 200);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '../../uploads/files');

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaType = String(file.mimetype || '').toLowerCase().startsWith('video/') ? 'videos'
      : String(file.mimetype || '').toLowerCase().startsWith('image/') ? 'images'
      : String(file.mimetype || '').toLowerCase().startsWith('audio/') ? 'audio'
      : 'documents';
    const dir = path.join(UPLOAD_ROOT, mediaType);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeBase = path.basename(file.originalname || 'upload', ext).replace(/[^\w.-]+/g, '-').slice(0, 80) || 'upload';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeBase}${ext}`);
  },
});

export const localFileUpload = multer({
  storage: localStorage,
  fileFilter: (req, file, cb) => {
    if (!isAllowedMimeType(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed`));
    }
    return cb(null, true);
  },
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

export const gridFsUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!isAllowedMimeType(file.mimetype)) {
      return cb(new Error(`File type ${file.mimetype} not allowed`));
    }
    return cb(null, true);
  },
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(tags).split(',').map((tag) => tag.trim()).filter(Boolean);
  }
};

const userType = (role = '') => (role === 'administrator' || role === 'admin' ? 'admin' : 'trainer');
const preferGridFsUpload = String(process.env.PREFER_GRIDFS_UPLOAD || 'true').toLowerCase() !== 'false';
const strictDbOnlyUploads = String(process.env.STRICT_DB_ONLY_UPLOADS || 'true').toLowerCase() !== 'false';
const gridFsPromotionTimeoutMs = Number(process.env.GRIDFS_PROMOTION_TIMEOUT_MS || 0);
const gridFsUploadTimeoutMs = Number(process.env.GRIDFS_UPLOAD_TIMEOUT_MS || 120000);
const gridFsUploadChunkBytes = Number(process.env.GRIDFS_UPLOAD_CHUNK_BYTES || 262144);
const gridFsFallbackTimeoutMs = Number(process.env.GRIDFS_FALLBACK_TIMEOUT_MS || 180000);
const gridFsForceManualRead = String(process.env.GRIDFS_FORCE_MANUAL_READ || 'false').toLowerCase() === 'true';
const gridFsFallbackEnsureIndexes = String(process.env.GRIDFS_FALLBACK_ENSURE_INDEXES || 'false').toLowerCase() === 'true';

const fileSizeAwareTimeout = (size = 0, baseMs = 120000) => {
  const safeBase = Number.isFinite(baseMs) && baseMs > 0 ? baseMs : 120000;
  const sizeMb = Math.max(1, Number(size || 0) / (1024 * 1024));
  return Math.max(safeBase, Math.ceil(sizeMb * 15000), 60000);
};

const withTimeout = (promise, ms, label = 'operation') => {
  if (!ms || ms <= 0) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

const cleanupGridFsArtifacts = async ({ fileId, bucketName }) => {
  const objectId = toObjectId(fileId);
  if (!objectId || !mongoose.connection?.db) return;
  const bucket = bucketName || process.env.GRIDFS_BUCKET_NAME || 'uploads';
  try {
    await Promise.all([
      mongoose.connection.db.collection(`${bucket}.chunks`).deleteMany({ files_id: objectId }),
      mongoose.connection.db.collection(`${bucket}.files`).deleteOne({ _id: objectId }),
    ]);
    try { console.log('[GRIDFS] cleanup partial upload:', String(objectId)); } catch (e) {}
  } catch (cleanupError) {
    try { console.error('[GRIDFS] cleanup partial upload failed:', cleanupError?.message || cleanupError); } catch (e) {}
  }
};

const manualGridFsBufferUpload = async ({ file, req, filename, mediaType, bucketName }) => {
  if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) {
    throw new Error(`MongoDB connection not ready for manual GridFS upload (state=${mongoose.connection.readyState})`);
  }
  const db = mongoose.connection.db;
  const filesCollection = db.collection(`${bucketName}.files`);
  const chunksCollection = db.collection(`${bucketName}.chunks`);

  const fileId = new mongoose.Types.ObjectId();
  const chunkSize = Math.max(16 * 1024, Number.isFinite(gridFsUploadChunkBytes) ? gridFsUploadChunkBytes : 262144);

  const chunks = [];
  let n = 0;
  for (let offset = 0; offset < file.buffer.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, file.buffer.length);
    chunks.push({
      _id: new mongoose.Types.ObjectId(),
      files_id: fileId,
      n,
      data: Buffer.from(file.buffer.subarray(offset, end)),
    });
    n += 1;
  }

  const fallbackTimeoutMs = fileSizeAwareTimeout(file.size, gridFsFallbackTimeoutMs);

  try {
    if (gridFsFallbackEnsureIndexes) {
      await withTimeout(
        Promise.all([
          filesCollection.createIndex({ filename: 1, uploadDate: 1 }, { background: true }),
          chunksCollection.createIndex({ files_id: 1, n: 1 }, { unique: true, background: true }),
        ]),
        fallbackTimeoutMs,
        'GridFS fallback index creation'
      );
    }

    if (chunks.length) {
      await withTimeout(
        chunksCollection.insertMany(chunks, { ordered: true }),
        fallbackTimeoutMs,
        'GridFS fallback chunks insert'
      );
    }

    const fileDoc = {
      _id: fileId,
      length: file.size,
      chunkSize,
      uploadDate: new Date(),
      filename,
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: req.user?._id || null,
        uploadedAt: new Date(),
        mediaType,
        usageType: req.body?.usageType || 'user-upload',
      },
    };

    await withTimeout(
      filesCollection.insertOne(fileDoc),
      fallbackTimeoutMs,
      'GridFS fallback file insert'
    );
  } catch (error) {
    await cleanupGridFsArtifacts({ fileId, bucketName });
    throw error;
  }

  return {
    gridfsFileId: fileId,
    filename,
    bucketName,
    size: file.size,
    mediaType,
  };
};

const promoteLocalFileToGridFs = async ({ file, req }) => {
  if (!file?.path) return null;
  const bucket = getUploadBucket();
  const mediaType = file.mediaType || detectMediaType(file.mimetype);
  const uploadStream = bucket.openUploadStream(file.filename, {
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      originalName: file.originalname,
      uploadedBy: req.user?._id,
      uploadedAt: new Date(),
      mediaType,
      usageType: req.body?.usageType || 'user-upload',
    },
  });
  await pipeline(fs.createReadStream(file.path), uploadStream);
  return {
    gridfsFileId: uploadStream.id,
    bucketName: process.env.GRIDFS_BUCKET_NAME || 'uploads',
    mediaType,
  };
};

const uploadBufferToGridFsPrimary = ({ file, req }) => new Promise((resolve, reject) => {
  if (!file?.buffer) {
    return reject(new Error('No upload buffer received'));
  }

  try { console.log('[GRIDFS] uploadBufferToGridFS start'); } catch (e) {}
  try { console.log('[GRIDFS] mongoose readyState:', mongoose.connection.readyState); } catch (e) {}
  if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) {
    return reject(new Error(`MongoDB connection not ready (state=${mongoose.connection.readyState})`));
  }

  const ext = path.extname(file.originalname || '');
  const safeBase = path.basename(file.originalname || 'upload', ext).replace(/[^\w.-]+/g, '-').slice(0, 80) || 'upload';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeBase}${ext}`;
  const mediaType = detectMediaType(file.mimetype);
  const bucketName = process.env.GRIDFS_BUCKET_NAME || 'uploads';
  const bucketOptions = { bucketName };
  const writeConcernW = Number(process.env.GRIDFS_UPLOAD_WRITE_CONCERN_W || 1);
  if (Number.isFinite(writeConcernW) && writeConcernW > 0) {
    bucketOptions.writeConcern = { w: writeConcernW };
  }

  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, bucketOptions);
  try {
    console.log('[GRIDFS] opening upload stream:', {
      bucketName,
      filename: fileName,
      size: file.size,
      writeConcernW: bucketOptions.writeConcern?.w ?? 'default',
    });
  } catch (e) {}
  const uploadStream = bucket.openUploadStream(fileName, {
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user?._id || null,
      uploadedAt: new Date(),
      mediaType,
      usageType: req.body?.usageType || 'user-upload',
    },
  });

  let settled = false;
  let finishSeen = false;
  let resolvedInfo = null;
  const idleTimeoutMs = fileSizeAwareTimeout(file.size, gridFsUploadTimeoutMs);
  let timeout = null;
  const armTimeout = (stage = 'upload') => {
    if (settled) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { console.error(`[GRIDFS] upload idle timeout during ${stage} after ${idleTimeoutMs}ms`); } catch (e) {}
      try { uploadStream.destroy(new Error('GridFS upload idle timeout')); } catch (e) {}
      cleanupGridFsArtifacts({ fileId: uploadStream.id, bucketName }).finally(() => {
        reject(new Error('GridFS upload idle timeout'));
      });
    }, idleTimeoutMs);
  };
  armTimeout('open');

  const done = (err, info) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    if (err) return reject(err);
    return resolve(info);
  };

  uploadStream.on('error', (err) => {
    console.error('[GRIDFS] uploadStream error:', err);
    cleanupGridFsArtifacts({ fileId: uploadStream.id, bucketName }).finally(() => done(err));
  });

  uploadStream.on('finish', () => {
    finishSeen = true;
    console.log('[GRIDFS] uploadStream finish:', {
      id: String(uploadStream.id),
      filename: uploadStream.filename || fileName,
      size: file.size,
    });
    resolvedInfo = {
      gridfsFileId: uploadStream.id,
      filename: uploadStream.filename || fileName,
      bucketName,
      size: file.size,
      mediaType,
    };
    done(null, resolvedInfo);
  });

  uploadStream.on('close', () => {
    try {
      console.log('[GRIDFS] uploadStream close:', {
        finished: finishSeen,
        writableEnded: uploadStream.writableEnded,
        writableFinished: uploadStream.writableFinished,
        destroyed: uploadStream.destroyed,
      });
    } catch (e) {}
    if (!settled && finishSeen && resolvedInfo) {
      done(null, resolvedInfo);
    }
  });

  const writeBufferInChunks = async () => {
    try { console.log('[GRIDFS] writing buffer to upload stream'); } catch (e) {}
    let offset = 0;
    let chunkNo = 0;
    const chunkBytes = Math.max(16 * 1024, Number.isFinite(gridFsUploadChunkBytes) ? gridFsUploadChunkBytes : 262144);
    while (offset < file.buffer.length) {
      const end = Math.min(offset + chunkBytes, file.buffer.length);
      const chunk = file.buffer.subarray(offset, end);
      chunkNo += 1;
      const canContinue = uploadStream.write(chunk);
      armTimeout(`chunk ${chunkNo}`);
      if (chunkNo <= 3 || end === file.buffer.length) {
        try { console.log(`[GRIDFS] write chunk #${chunkNo} size=${chunk.length} total=${end}`); } catch (e) {}
      }
      offset = end;
      if (!canContinue) {
        try { console.log('[GRIDFS] waiting for drain'); } catch (e) {}
        armTimeout(`drain after chunk ${chunkNo}`);
        await once(uploadStream, 'drain');
        armTimeout(`drained chunk ${chunkNo}`);
      }
    }
    uploadStream.end();
    armTimeout('finish');
    try { console.log('[GRIDFS] uploadStream.end() called after chunked write'); } catch (e) {}
  };

  writeBufferInChunks().catch((err) => {
    console.error('[GRIDFS] write buffer failed:', err);
    cleanupGridFsArtifacts({ fileId: uploadStream.id, bucketName }).finally(() => done(err));
  });
});

export const uploadBufferToGridFs = async ({ file, req }) => {
  const ext = path.extname(file.originalname || '');
  const safeBase = path.basename(file.originalname || 'upload', ext).replace(/[^\w.-]+/g, '-').slice(0, 80) || 'upload';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeBase}${ext}`;
  const mediaType = detectMediaType(file.mimetype);
  const bucketName = process.env.GRIDFS_BUCKET_NAME || 'uploads';

  try {
    return await uploadBufferToGridFsPrimary({ file, req });
  } catch (primaryError) {
    const message = String(primaryError?.message || '');
    const canFallback = message.includes('timeout') || message.includes('uploadStream') || message.includes('MongoDB connection not ready');
    if (!canFallback) throw primaryError;
    console.error('[GRIDFS] primary upload failed, trying manual fallback:', primaryError);
    try { console.log('[GRIDFS] fallback upload start'); } catch (e) {}
    const fallback = await manualGridFsBufferUpload({ file, req, filename: fileName, mediaType, bucketName });
    try { console.log('[GRIDFS] fallback upload success:', String(fallback.gridfsFileId)); } catch (e) {}
    return fallback;
  }
};

const manualReadGridFsBuffer = async ({ fileId, bucketName }) => {
  if (!mongoose.connection?.db || mongoose.connection.readyState !== 1) {
    throw new Error(`MongoDB connection not ready for manual GridFS read (state=${mongoose.connection.readyState})`);
  }

  const db = mongoose.connection.db;
  const filesCollection = db.collection(`${bucketName}.files`);
  const chunksCollection = db.collection(`${bucketName}.chunks`);
  const objectId = toObjectId(fileId);
  if (!objectId) throw new Error('Invalid GridFS file id for manual read');

  const fileDoc = await filesCollection.findOne({ _id: objectId });
  if (!fileDoc) throw new Error('GridFS file document not found');

  const chunks = await chunksCollection.find({ files_id: objectId }).sort({ n: 1 }).toArray();
  const expectedChunks = Math.ceil(Number(fileDoc.length || 0) / Number(fileDoc.chunkSize || 1));
  if (expectedChunks > 0 && chunks.length !== expectedChunks) {
    throw new Error(`GridFS chunks mismatch: expected=${expectedChunks} actual=${chunks.length}`);
  }

  const toNodeBuffer = (data) => {
    if (!data) return null;
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof Uint8Array) return Buffer.from(data);
    if (data?.buffer instanceof ArrayBuffer) {
      const byteOffset = Number.isFinite(data.byteOffset) ? data.byteOffset : 0;
      const byteLength = Number.isFinite(data.byteLength) ? data.byteLength : undefined;
      return Buffer.from(data.buffer, byteOffset, byteLength);
    }
    if (typeof data?.value === 'function') {
      const v = data.value(true);
      if (Buffer.isBuffer(v)) return v;
      if (v instanceof Uint8Array) return Buffer.from(v);
      if (v?.buffer instanceof ArrayBuffer) {
        const byteOffset = Number.isFinite(v.byteOffset) ? v.byteOffset : 0;
        const byteLength = Number.isFinite(v.byteLength) ? v.byteLength : undefined;
        return Buffer.from(v.buffer, byteOffset, byteLength);
      }
    }
    return null;
  };

  const buffers = chunks.map((chunk, idx) => {
    const data = chunk?.data;
    const buf = toNodeBuffer(data);
    if (!buf) {
      throw new Error(`Invalid GridFS chunk data type at index=${idx} n=${chunk?.n}`);
    }
    return buf;
  });

  const full = Buffer.concat(buffers);
  if (Number(fileDoc.length || 0) > 0 && full.length !== Number(fileDoc.length)) {
    throw new Error(`GridFS length mismatch: expected=${Number(fileDoc.length)} actual=${full.length}`);
  }

  return {
    buffer: full,
    fileDoc,
  };
};

export const serializeAsset = (asset) => ({
  fileAssetId: String(asset._id),
  gridfsFileId: asset.gridfsFileId ? String(asset.gridfsFileId) : undefined,
  storageProvider: asset.storageProvider,
  bucketName: asset.bucketName,
  originalName: asset.originalName,
  fileName: asset.fileName,
  mimeType: asset.mimeType,
  mediaType: asset.mediaType,
  fileSize: asset.fileSize,
  fileUrl: asset.mediaType === 'video' || asset.mediaType === 'audio' ? asset.urls.streamUrl : asset.urls.viewUrl,
  streamUrl: asset.urls.streamUrl,
  viewUrl: asset.urls.viewUrl,
  downloadUrl: asset.urls.downloadUrl,
  title: asset.title,
  accessLevel: asset.accessLevel,
  aiProcessing: asset.aiProcessing,
  transcript: asset.transcript?.text || '',
  transcriptStatus: asset.aiProcessing?.transcriptStatus || 'idle',
  transcriptWordCount: asset.transcript?.wordCount || 0,
});

export const createFileAssetFromUploadedFile = async ({ file, body = {}, user }) => {
  let effectiveFile = { ...file };

  try {
    console.log(`[UPLOAD] createFileAssetFromUploadedFile start: file=${effectiveFile.originalname || effectiveFile.filename} path=${effectiveFile.path || 'n/a'} hasGridFs=${Boolean(effectiveFile.gridfsFileId)} strictDbOnly=${strictDbOnlyUploads}`);
  } catch (e) {}

  if (!effectiveFile.gridfsFileId && effectiveFile.path && preferGridFsUpload) {
    try {
      try {
        console.log(`[UPLOAD] GridFS promotion start: ${effectiveFile.originalname || effectiveFile.filename}`);
      } catch (e) {}
      const promoted = await withTimeout(
        promoteLocalFileToGridFs({ file: effectiveFile, req: { user, body } }),
        gridFsPromotionTimeoutMs,
        'GridFS promotion'
      );
      if (promoted?.gridfsFileId) {
        effectiveFile = {
          ...effectiveFile,
          gridfsFileId: promoted.gridfsFileId,
          bucketName: promoted.bucketName,
          mediaType: promoted.mediaType || effectiveFile.mediaType,
        };
        try {
          console.log(`[UPLOAD] GridFS promotion success: fileId=${String(promoted.gridfsFileId)}`);
        } catch (e) {}
        fs.promises.unlink(file.path).catch(() => {});
      }
    } catch (promotionError) {
      try {
        if (file?.path) await fs.promises.unlink(file.path).catch(() => {});
      } catch (e) {}
      console.error('[UPLOAD] GridFS promotion failed/timeout:', promotionError?.message || promotionError);
      if (strictDbOnlyUploads) {
        throw promotionError;
      }
    }
  }

  if (strictDbOnlyUploads && !effectiveFile.gridfsFileId) {
    throw new Error('Strict DB-only upload is enabled, but GridFS file id was not created');
  }

  const fileAssetId = new mongoose.Types.ObjectId();
  const isGridFsFile = Boolean(effectiveFile.gridfsFileId);
  const urls = buildFileUrls(fileAssetId);
  try {
    console.log(`[UPLOAD] About to FileAsset.create: fileAssetId=${String(fileAssetId)} gridfsFileId=${String(effectiveFile.gridfsFileId || '')}`);
  } catch (e) {}
  const asset = await FileAsset.create({
    _id: fileAssetId,
    storageProvider: 'gridfs',
    bucketName: effectiveFile.bucketName || process.env.GRIDFS_BUCKET_NAME || 'uploads',
    gridfsFileId: effectiveFile.gridfsFileId,
    originalName: effectiveFile.originalname || effectiveFile.originalName || effectiveFile.filename,
    fileName: effectiveFile.filename,
    title: body.title || effectiveFile.originalname || effectiveFile.filename,
    description: body.description || '',
    mimeType: effectiveFile.mimetype,
    mediaType: effectiveFile.mediaType || detectMediaType(effectiveFile.mimetype),
    fileSize: effectiveFile.size || 0,
    extension: path.extname(effectiveFile.originalname || effectiveFile.filename || ''),
    urls,
    uploadedBy: {
      userId: user?._id,
      userType: userType(user?.role),
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '',
    },
    accessLevel: body.accessLevel || 'private',
    relatedCourse: body.relatedCourse || body.courseId || null,
    tags: parseTags(body.tags),
    category: body.category || 'other',
    usageType: body.usageType || 'user-upload',
    source: body.source || 'unknown',
    module: body.module || 'unknown',
    metadata: { resolution: urls.streamUrl },
  });
  try {
    console.log(`[UPLOAD] FileAsset.create complete: fileAssetId=${String(asset._id)} storageProvider=${asset.storageProvider}`);
  } catch (e) {}
  return asset;
};

export const uploadFileAsset = async (req, res) => {
  try {
    try { console.log('[FILES] controller reached'); } catch (e) {}
    try { console.log(`[UPLOAD] Enter uploadFileAsset ${req.method} ${req.originalUrl} content-type=${req.headers['content-type']}`); } catch (e) {}
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    try {
      console.log('[FILES] file received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (e) {}
    try { console.log('[FILES] before GridFS upload'); } catch (e) {}
    const uploaded = await uploadBufferToGridFs({ file: req.file, req });
    try { console.log('[FILES] after GridFS upload:', uploaded); } catch (e) {}
    try { console.log('[FILES] before FileAsset create'); } catch (e) {}
    const asset = await createFileAssetFromUploadedFile({
      file: {
        ...req.file,
        buffer: undefined,
        gridfsFileId: uploaded.gridfsFileId,
        bucketName: uploaded.bucketName,
        filename: uploaded.filename,
        size: uploaded.size,
        mediaType: uploaded.mediaType,
      },
      body: req.body,
      user: req.user,
    });
    try {
      console.log('[FILES] FileAsset created:', String(asset._id));
      console.log('[FILES] sending response');
    } catch (e) {}
    if (asset.mediaType === 'video') {
      asset.aiProcessing = {
        ...(asset.aiProcessing?.toObject ? asset.aiProcessing.toObject() : asset.aiProcessing),
        transcriptStatus: 'pending',
        transcriptErrorMessage: '',
        lastTranscriptAttempt: new Date(),
      };
      enqueueFileAssetTranscriptJob({ fileAssetId: asset._id });
    }
    return res.status(201).json({ success: true, message: 'File uploaded successfully', data: serializeAsset(asset) });
  } catch (error) {
    console.error('[FILES] upload error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadMediaAsset = async (req, res) => {
  try {
    try { console.log(`[UPLOAD] Enter uploadMediaAsset ${req.method} ${req.originalUrl} content-type=${req.headers['content-type']}`); } catch (e) {}
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    try { console.log('[FILES] before GridFS upload'); } catch (e) {}
    const uploaded = await uploadBufferToGridFs({ file: req.file, req });
    try { console.log('[FILES] after GridFS upload:', uploaded); } catch (e) {}
    try { console.log('[FILES] before FileAsset create'); } catch (e) {}
    const asset = await createFileAssetFromUploadedFile({
      file: {
        ...req.file,
        buffer: undefined,
        gridfsFileId: uploaded.gridfsFileId,
        bucketName: uploaded.bucketName,
        filename: uploaded.filename,
        size: uploaded.size,
        mediaType: uploaded.mediaType,
      },
      body: {
        ...req.body,
        source: req.body?.source || 'media_library',
        module: req.body?.module || 'media_library',
        usageType: req.body?.usageType || 'library_resource',
        accessLevel: req.body?.accessLevel || 'enrolled'
      },
      user: req.user,
    });
    if (asset.mediaType === 'video') {
      asset.aiProcessing = {
        ...(asset.aiProcessing?.toObject ? asset.aiProcessing.toObject() : asset.aiProcessing),
        transcriptStatus: 'pending',
        transcriptErrorMessage: '',
        lastTranscriptAttempt: new Date(),
      };
      enqueueFileAssetTranscriptJob({ fileAssetId: asset._id });
    }
    const data = serializeAsset(asset);
    const media = await Media.create({
      title: asset.title,
      description: asset.description || '',
      mediaType: asset.mediaType === 'other' ? 'document' : asset.mediaType,
      mimeType: asset.mimeType,
      fileUrl: data.fileUrl,
      streamUrl: data.streamUrl,
      viewUrl: data.viewUrl,
      downloadUrl: data.downloadUrl,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      category: req.body.category || 'educational',
      tags: parseTags(req.body.tags),
      uploadedBy: asset.uploadedBy,
      relatedCourse: req.body.courseId || req.body.relatedCourse || null,
      accessLevel: req.body.accessLevel || 'enrolled',
      storageProvider: 'gridfs',
      fileAssetId: asset._id,
      gridfsFileId: asset.gridfsFileId,
      bucketName: asset.bucketName,
      source: asset.source || 'media_library',
      module: asset.module || 'media_library',
      usageType: asset.usageType || 'library_resource',
      storage: {
        provider: 'gridfs',
        fileAssetId: asset._id,
        fileId: asset.gridfsFileId,
        bucketName: asset.bucketName,
        streamUrl: data.streamUrl,
        viewUrl: data.viewUrl,
        downloadUrl: data.downloadUrl,
        originalName: asset.originalName,
        uploadedAt: asset.createdAt,
      },
      metadata: { resolution: data.streamUrl },
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        _id: media._id,
        title: media.title,
        type: media.mediaType,
        category: media.category,
        tags: media.tags,
        ...data,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendGridFsFile = async ({ req, res, disposition = 'inline', allowRange = false }) => {
  const asset = await FileAsset.findById(req.params.fileAssetId);
  if (!asset || !asset.isActive) return res.status(404).json({ success: false, message: 'File not found' });
  const filename = asset.originalName || asset.fileName || 'download';
  const range = allowRange ? req.headers.range : null;

  const sendFromBuffer = async () => {
    const { buffer: fileBuffer, fileDoc } = await manualReadGridFsBuffer({
      fileId: asset.gridfsFileId,
      bucketName: asset.bucketName || process.env.GRIDFS_BUCKET_NAME || 'uploads',
    });
    const fileSize = fileBuffer.length;
    const contentType = asset.mimeType || fileDoc?.contentType || 'application/octet-stream';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(parts[0], 10);
      const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.sendStatus(416);
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      return res.end(fileBuffer.subarray(start, end + 1));
    }

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    return res.end(fileBuffer);
  };

  if (gridFsForceManualRead) {
    return sendFromBuffer();
  }

  const gridFile = await getGridFSFile(asset.gridfsFileId);
  if (!gridFile) return res.status(404).json({ success: false, message: 'GridFS file missing' });
  const fileSize = gridFile.length;
  const contentType = asset.mimeType || gridFile.contentType || 'application/octet-stream';

  // Stream via parallel chunk queries instead of a single GridFS download
  // stream: bandwidth-throttled clusters (e.g. Atlas free tier) starve a
  // single connection until it times out, which made videos unplayable.
  const streamRange = async (start, end, statusCode, headers) => {
    res.writeHead(statusCode, headers);
    try {
      await streamGridFsRangeToResponse({
        bucketName: asset.bucketName || process.env.GRIDFS_BUCKET_NAME || 'uploads',
        fileId: asset.gridfsFileId,
        chunkSize: gridFile.chunkSize || 261120,
        start,
        end,
        res,
      });
    } catch (error) {
      console.error('[FILES] parallel range stream failed:', {
        fileAssetId: req.params?.fileAssetId,
        message: error?.message,
      });
      res.destroy(error);
    }
  };

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.sendStatus(416);
    }
    return streamRange(start, end, 206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType,
      'Content-Disposition': `${disposition}; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
  }

  return streamRange(0, fileSize - 1, 200, {
    'Content-Length': fileSize,
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `${disposition}; filename="${filename}"`,
    'Cache-Control': 'public, max-age=3600',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
};

const handleFileResponse = async (req, res, options) => {
  try {
    return await sendGridFsFile({ req, res, ...options });
  } catch (error) {
    console.error('[FILES] read/stream error:', {
      fileAssetId: req.params?.fileAssetId,
      message: error?.message,
      stack: error?.stack,
    });
    return res.status(500).json({ success: false, message: error.message || 'Unable to read file' });
  }
};

export const viewFileAsset = (req, res) => handleFileResponse(req, res, { disposition: 'inline', allowRange: false });
export const streamFileAsset = (req, res) => handleFileResponse(req, res, { disposition: 'inline', allowRange: true });
export const downloadFileAsset = async (req, res) => {
  await FileAsset.findByIdAndUpdate(req.params.fileAssetId, { $inc: { 'stats.downloadCount': 1 } }).catch(() => {});
  return handleFileResponse(req, res, { disposition: 'attachment', allowRange: false });
};

export const getFileAssetInfo = async (req, res) => {
  const asset = await FileAsset.findById(req.params.fileAssetId).lean();
  if (!asset) return res.status(404).json({ success: false, message: 'File not found' });
  return res.json({ success: true, data: asset });
};

export const deleteFileAsset = async (req, res) => {
  const asset = await FileAsset.findById(req.params.fileAssetId);
  if (!asset) return res.status(404).json({ success: false, message: 'File not found' });

  const assetId = asset._id;
  const [mediaRef, courseRef] = await Promise.all([
    Media.exists({ fileAssetId: assetId }),
    Course.exists({
      $or: [
        { 'sections.lessons.videoAsset.fileAssetId': assetId },
        { 'sections.lessons.imageAsset.fileAssetId': assetId },
        { 'sections.lessons.audioAsset.fileAssetId': assetId },
        { 'sections.lessons.resources.fileAssetId': assetId },
        { 'sections.lessons.assignment.attachmentAsset.fileAssetId': assetId },
      ],
    }),
  ]);

  if (mediaRef || courseRef) {
    asset.isActive = false;
    await asset.save();
    return res.json({
      success: true,
      message: 'File is referenced by existing content, so it was deactivated instead of deleting binary data',
    });
  }

  if (asset.gridfsFileId && toObjectId(asset.gridfsFileId)) {
    await deleteGridFSFile(asset.gridfsFileId).catch(() => {});
  }
  await asset.deleteOne();
  return res.json({ success: true, message: 'File deleted' });
};
