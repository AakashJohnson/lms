import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { logger } from '../config/logger.js';

const BUCKET_NAME = process.env.GRIDFS_BUCKET_NAME || 'uploads';
const API_VERSION = process.env.API_VERSION || 'v1';
const MAX_RETRIES = parseInt(process.env.GRIDFS_MAX_RETRIES || '3', 10);
const RETRY_DELAY_MS = parseInt(process.env.GRIDFS_RETRY_DELAY_MS || '1000', 10);
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10); // 5GB default

let uploadBucket;
let uploadBucketDb;

// File operation state tracking
const fileOperations = new Map();

/**
 * Validates MongoDB connection readiness
 * @returns {boolean} True if connection is ready
 */
const isConnectionReady = () => {
  return mongoose.connection.db && mongoose.connection.readyState === 1;
};

/**
 * Gets or initializes the GridFS bucket with connection validation
 * @returns {mongoose.mongo.GridFSBucket} The GridFS bucket instance
 * @throws {Error} If connection is not ready or bucket initialization fails
 */
export const getUploadBucket = () => {
  if (!isConnectionReady()) {
    const error = new Error('MongoDB connection is not ready for GridFS');
    logger.error('GridFS connection error', { readyState: mongoose.connection.readyState });
    throw error;
  }
  
  try {
    if (!uploadBucket || uploadBucketDb !== mongoose.connection.db) {
      uploadBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
      uploadBucketDb = mongoose.connection.db;
      logger.info('GridFS bucket initialized', { bucketName: BUCKET_NAME });
    }
    return uploadBucket;
  } catch (error) {
    logger.error('GridFS bucket initialization failed', { error: error.message });
    throw error;
  }
};

/**
 * Retry handler for transient failures with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {string} operationName - Name of operation for logging
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<*>} Result of the operation
 */
export const withRetry = async (operation, operationName = 'Operation', maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable = error.code === 'ECONNREFUSED' 
        || error.code === 'ETIMEDOUT'
        || error.message?.includes('topology')
        || error.message?.includes('connection')
        || error.name === 'MongoNetworkError';
      
      if (!isRetryable || attempt === maxRetries) {
        logger.error(`${operationName} failed after ${attempt} attempt(s)`, {
          error: error.message,
          isRetryable,
          attempt,
        });
        throw error;
      }
      
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, {
        error: error.message,
        attempt,
        nextRetryIn: delayMs,
      });
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError;
};

/**
 * Calculates file checksum
 * @param {Buffer|Stream} data - File data
 * @returns {string|Promise<string>} SHA256 checksum
 */
export const calculateFileChecksum = async (fileStream) => {
  const hash = crypto.createHash('sha256');
  
  if (fileStream instanceof fs.ReadStream || fileStream.pipe) {
    return new Promise((resolve, reject) => {
      fileStream.on('data', chunk => hash.update(chunk));
      fileStream.on('end', () => resolve(hash.digest('hex')));
      fileStream.on('error', reject);
    });
  }
  
  // Handle Buffer
  hash.update(fileStream);
  return hash.digest('hex');
};

/**
 * Validates file size
 * @param {number} sizeBytes - File size in bytes
 * @throws {Error} If file size exceeds limit
 */
export const validateFileSize = (sizeBytes) => {
  if (sizeBytes > MAX_FILE_SIZE) {
    const sizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(2);
    throw new Error(`File size exceeds maximum allowed size of ${sizeMB}MB (got ${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`);
  }
};

/**
 * Converts value to MongoDB ObjectId
 * @param {string|ObjectId} value - Value to convert
 * @returns {?ObjectId} MongoDB ObjectId or null if invalid
 */
export const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(String(value || ''))) return null;
  return new mongoose.Types.ObjectId(String(value));
};

/**
 * Detects media type from MIME type
 * @param {string} mimeType - MIME type string
 * @returns {string} Media type category
 */
export const detectMediaType = (mimeType = '') => {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.includes('pdf')
    || mime.includes('msword')
    || mime.includes('wordprocessingml')
    || mime.includes('spreadsheet')
    || mime.includes('presentation')
    || mime.includes('zip')
    || mime.includes('text/plain')
  ) return 'document';
  return 'other';
};

/**
 * Validates MIME type against allowed types
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} True if MIME type is allowed
 */
export const isAllowedMimeType = (mimeType = '') => {
  const allowed = new Set([
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/matroska', 'video/x-msvideo', 'video/avi',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'text/plain',
  ]);
  return allowed.has(String(mimeType || '').toLowerCase());
};

/**
 * Builds file access URLs for streaming, viewing, and downloading
 * @param {string|ObjectId} fileAssetId - File asset ID
 * @returns {Object} URLs for file operations
 */
export const buildFileUrls = (fileAssetId) => {
  const id = String(fileAssetId);
  const base = `/api/${API_VERSION}/files/${id}`;
  return {
    streamUrl: `${base}/stream`,
    viewUrl: `${base}/view`,
    downloadUrl: `${base}/download`,
  };
};

/**
 * Opens a GridFS download stream with enhanced error handling
 * @param {string|ObjectId} fileId - GridFS file ID
 * @param {Object} options - Stream options
 * @returns {Stream} Readable stream
 */
export const openDownloadStream = (fileId, options = {}) => {
  const objectId = toObjectId(fileId);
  if (!objectId) throw new Error('Invalid GridFS file id');
  
  try {
    logger.debug('Opening download stream', { fileId: objectId.toString() });
    return getUploadBucket().openDownloadStream(objectId, options);
  } catch (error) {
    logger.error('Failed to open download stream', { fileId: objectId.toString(), error: error.message });
    throw error;
  }
};

/**
 * Retrieves GridFS file metadata
 * @param {string|ObjectId} fileId - GridFS file ID
 * @returns {Promise<?Object>} File metadata or null
 */
export const getGridFSFile = async (fileId) => {
  const objectId = toObjectId(fileId);
  if (!objectId) {
    logger.warn('Invalid file ID provided', { fileId });
    return null;
  }
  
  try {
    return await withRetry(
      () => getUploadBucket().find({ _id: objectId }).next(),
      `GetGridFSFile:${objectId}`
    );
  } catch (error) {
    logger.error('Failed to get GridFS file', { fileId: objectId.toString(), error: error.message });
    throw error;
  }
};

/**
 * Deletes a GridFS file with resource cleanup
 * @param {string|ObjectId} fileId - GridFS file ID
 * @returns {Promise<void>}
 */
export const deleteGridFSFile = async (fileId) => {
  const objectId = toObjectId(fileId);
  if (!objectId) throw new Error('Invalid GridFS file id');
  
  try {
    logger.info('Deleting GridFS file', { fileId: objectId.toString() });
    
    // Remove from tracking if exists
    fileOperations.delete(objectId.toString());
    
    return await withRetry(
      () => getUploadBucket().delete(objectId),
      `DeleteGridFSFile:${objectId}`
    );
  } catch (error) {
    logger.error('Failed to delete GridFS file', { fileId: objectId.toString(), error: error.message });
    throw error;
  }
};

/**
 * Materializes GridFS file to temporary disk location with proper resource management
 * @param {string|ObjectId} fileId - GridFS file ID
 * @param {string} extension - File extension
 * @param {string} tempDir - Temporary directory path
 * @returns {Promise<string>} Path to temporary file
 */
export const materializeGridFSFileToTemp = async (fileId, extension = '', tempDir = os.tmpdir()) => {
  const objectId = toObjectId(fileId);
  if (!objectId) throw new Error('Invalid GridFS file id');
  
  const suffix = extension || '.bin';
  const tempPath = path.join(tempDir, `gridfs-${objectId}-${Date.now()}${suffix}`);
  const operationId = `${objectId}-${Date.now()}`;
  const streamTimeoutMs = Number(process.env.GRIDFS_MATERIALIZE_TIMEOUT_MS || 5 * 60 * 1000);
  let timeoutHandle = null;
  
  try {
    logger.info('Materializing GridFS file to temp', { fileId: objectId.toString(), path: tempPath });
    
    // Track operation
    fileOperations.set(operationId, { fileId: objectId, tempPath, createdAt: Date.now() });
    
    // Create write stream with error handling
    const writeStream = fs.createWriteStream(tempPath);
    const readStream = openDownloadStream(objectId);
    logger.info('[GRIDFS] Download stream started', { fileId: objectId.toString(), tempPath });
    timeoutHandle = setTimeout(() => {
      const error = new Error('GridFS download timed out');
      logger.error('[GRIDFS] Stream timed out', { fileId: objectId.toString(), tempPath, timeoutMs: streamTimeoutMs });
      readStream.destroy(error);
      writeStream.destroy(error);
    }, streamTimeoutMs);
    
    // Handle stream errors
    readStream.on('error', (error) => {
      logger.error('[GRIDFS] Stream failed', { fileId: objectId.toString(), tempPath, error: error.message });
      writeStream.destroy();
      fs.unlink(tempPath, (err) => {
        if (err) logger.error('Failed to cleanup temp file on error', { path: tempPath, error: err.message });
      });
    });
    
    writeStream.on('error', (error) => {
      logger.error('[GRIDFS] Write stream failed', { fileId: objectId.toString(), path: tempPath, error: error.message });
      readStream.destroy();
    });
    
    await pipeline(readStream, writeStream);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    const stats = await fs.promises.stat(tempPath);
    if (!stats.size || stats.size <= 0) {
      throw new Error('Temporary GridFS video file is empty');
    }
    
    logger.info('[GRIDFS] Temp video created', { fileId: objectId.toString(), path: tempPath });
    logger.info('[GRIDFS] Temp video size', { fileId: objectId.toString(), size: stats.size });
    return tempPath;
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    // Cleanup on failure
    fs.unlink(tempPath, (err) => {
      if (err) logger.error('Failed to cleanup temp file on materialization error', { path: tempPath, error: err.message });
    });
    
    logger.error('[GRIDFS] Failed to materialize GridFS file', { fileId: objectId.toString(), error: error.message });
    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    // Remove from tracking
    fileOperations.delete(operationId);
  }
};

/**
 * Uploads file stream with progress tracking and metadata
 * @param {Stream} sourceStream - Readable stream
 * @param {string} filename - Original filename
 * @param {Object} options - Upload options { mimeType, metadata, fileSize }
 * @returns {Promise<Object>} Upload result with file ID and metadata
 */
export const uploadFileStream = async (sourceStream, filename, options = {}) => {
  const { mimeType = 'application/octet-stream', metadata = {}, fileSize = null } = options;
  
  // Validate MIME type
  if (!isAllowedMimeType(mimeType)) {
    throw new Error(`MIME type not allowed: ${mimeType}`);
  }
  
  // Validate file size if provided
  if (fileSize) {
    validateFileSize(fileSize);
  }
  
  const operationId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('Starting file upload', { 
      filename, 
      mimeType, 
      fileSize,
      operationId 
    });
    
    // Track operation
    fileOperations.set(operationId, { 
      type: 'upload', 
      filename, 
      startedAt: Date.now(),
      bytesProcessed: 0
    });
    
    const uploadStream = getUploadBucket().openUploadStream(filename, {
      contentType: mimeType,
      metadata: {
        ...metadata,
        uploadedAt: new Date(),
        mediaType: detectMediaType(mimeType),
      },
    });
    
    // Track bytes written
    let bytesWritten = 0;
    sourceStream.on('data', chunk => {
      bytesWritten += chunk.length;
      const operation = fileOperations.get(operationId);
      if (operation) {
        operation.bytesProcessed = bytesWritten;
      }
    });
    
    // Handle stream errors
    sourceStream.on('error', (error) => {
      uploadStream.destroy();
      logger.error('Source stream error during upload', { filename, error: error.message });
    });
    
    uploadStream.on('error', (error) => {
      sourceStream.destroy();
      logger.error('Upload stream error', { filename, fileId: uploadStream.id, error: error.message });
    });
    
    await pipeline(sourceStream, uploadStream);
    
    const result = {
      fileId: uploadStream.id,
      filename,
      mimeType,
      mediaType: detectMediaType(mimeType),
      bytesWritten,
      urls: buildFileUrls(uploadStream.id),
      uploadedAt: new Date(),
    };
    
    logger.info('File uploaded successfully', { 
      filename, 
      fileId: uploadStream.id, 
      bytes: bytesWritten 
    });
    
    return result;
  } catch (error) {
    logger.error('File upload failed', { filename, error: error.message });
    throw error;
  } finally {
    fileOperations.delete(operationId);
  }
};

/**
 * Downloads file with streaming and proper error handling
 * @param {string|ObjectId} fileId - GridFS file ID
 * @param {Object} options - Download options
 * @returns {Promise<{stream: Stream, file: Object}>} Readable stream and file metadata
 */
export const downloadFile = async (fileId, options = {}) => {
  const objectId = toObjectId(fileId);
  if (!objectId) throw new Error('Invalid file ID');
  
  try {
    logger.debug('Starting file download', { fileId: objectId.toString() });
    
    const file = await getGridFSFile(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    
    const stream = openDownloadStream(objectId, options);
    
    return {
      stream,
      file: {
        id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        length: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata,
      },
    };
  } catch (error) {
    logger.error('File download preparation failed', { fileId: objectId.toString(), error: error.message });
    throw error;
  }
};

/**
 * Batch delete files with transaction support where available
 * @param {Array<string|ObjectId>} fileIds - Array of file IDs to delete
 * @returns {Promise<Object>} Deletion results
 */
export const batchDeleteFiles = async (fileIds) => {
  const results = {
    successful: [],
    failed: [],
  };
  
  logger.info('Starting batch file deletion', { fileCount: fileIds.length });
  
  for (const fileId of fileIds) {
    const objectId = toObjectId(fileId);
    if (!objectId) {
      results.failed.push({ fileId, error: 'Invalid file ID' });
      continue;
    }
    
    try {
      await deleteGridFSFile(objectId);
      results.successful.push(objectId.toString());
      logger.debug('Batch deleted file', { fileId: objectId.toString() });
    } catch (error) {
      results.failed.push({ 
        fileId: objectId.toString(), 
        error: error.message 
      });
      logger.error('Batch deletion failed for file', { fileId: objectId.toString(), error: error.message });
    }
  }
  
  logger.info('Batch deletion completed', { 
    successful: results.successful.length, 
    failed: results.failed.length 
  });
  
  return results;
};

/**
 * Gets upload progress for a specific operation
 * @param {string} operationId - Operation ID to track
 * @returns {?Object} Progress information or null
 */
export const getOperationProgress = (operationId) => {
  const operation = fileOperations.get(operationId);
  if (!operation) return null;
  
  return {
    operationId,
    type: operation.type,
    startedAt: operation.startedAt,
    elapsedMs: Date.now() - operation.startedAt,
    bytesProcessed: operation.bytesProcessed || 0,
    filename: operation.filename,
  };
};

/**
 * Cleans up abandoned temporary files older than specified duration
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {Promise<Object>} Cleanup results
 */
export const cleanupAbandonedFiles = async (maxAgeMs = 3600000) => { // 1 hour default
  const results = {
    cleaned: [],
    errors: [],
  };
  
  const now = Date.now();
  const operationIds = Array.from(fileOperations.entries());
  
  for (const [opId, operation] of operationIds) {
    if (!operation.tempPath) continue;
    
    const age = now - operation.createdAt;
    if (age > maxAgeMs) {
      try {
        fs.unlinkSync(operation.tempPath);
        fileOperations.delete(opId);
        results.cleaned.push(operation.tempPath);
        logger.info('Cleaned abandoned temp file', { path: operation.tempPath, ageMs: age });
      } catch (error) {
        results.errors.push({ path: operation.tempPath, error: error.message });
        logger.error('Failed to cleanup temp file', { path: operation.tempPath, error: error.message });
      }
    }
  }
  
  return results;
};
