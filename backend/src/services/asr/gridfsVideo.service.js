import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { getGridFSFile } from '../fileStorage.service.js';
import {
  CHUNK_CONCURRENCY,
  fetchChunkWithRetry,
  getChunksCollection,
} from '../gridfsChunkReader.service.js';
import { logger } from '../../config/logger.js';

const BUCKET_NAME = process.env.GRIDFS_BUCKET_NAME || 'uploads';
const CACHE_DIR = path.resolve(process.cwd(), 'temp', 'asr-cache');

const copyCachedVideo = async (cachePath, tempVideoPath, gridfsFile) => {
  fs.mkdirSync(path.dirname(tempVideoPath), { recursive: true });
  await fs.promises.copyFile(cachePath, tempVideoPath);
  const stats = fs.statSync(tempVideoPath);
  logger.info('[ASR-GRIDFS] Reused cached GridFS video', {
    fileId: String(gridfsFile._id || ''),
    cachePath,
    tempVideoPath,
    size: stats.size
  });
  return {
    filename: gridfsFile.filename,
    contentType: gridfsFile.contentType,
    length: gridfsFile.length,
    size: stats.size,
  };
};

/**
 * Downloads a video from MongoDB GridFS and performs checks.
 * Reads the chunks collection directly with many small parallel queries
 * (each retried independently) instead of one long-lived download stream,
 * which stalls on bandwidth-throttled connections.
 * @param {string} fileId - GridFS file ID
 * @param {string} tempVideoPath - Target path to write
 * @returns {Promise<Object>} file metadata
 */
export const downloadVideoFromGridFS = async (fileId, tempVideoPath) => {
  logger.info('[ASR-GRIDFS] Fetching file info', { fileId });

  let gridfsFile;
  try {
    gridfsFile = await getGridFSFile(fileId);
  } catch (err) {
    logger.error('[ASR-GRIDFS] GridFS file lookup failed', { fileId, error: err.message });
    throw new Error('Video file not found. Please re-upload the lesson video.');
  }

  if (!gridfsFile) {
    throw new Error('Video file not found. Please re-upload the lesson video.');
  }

  const chunkSize = gridfsFile.chunkSize || 261120;
  const totalChunks = Math.ceil(gridfsFile.length / chunkSize);
  const cachePath = path.join(CACHE_DIR, `${String(fileId)}.mp4`);

  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size === gridfsFile.length) {
    return copyCachedVideo(cachePath, tempVideoPath, gridfsFile);
  }

  if (fs.existsSync(tempVideoPath)) {
    const existingSize = fs.statSync(tempVideoPath).size;
    if (existingSize === gridfsFile.length) {
      logger.info('[ASR-GRIDFS] Reusing existing materialized video', {
        fileId,
        tempVideoPath,
        size: existingSize
      });
      return {
        filename: gridfsFile.filename,
        contentType: gridfsFile.contentType,
        length: gridfsFile.length,
        size: existingSize,
      };
    }
  }

  logger.info('[ASR-GRIDFS] Downloading video in parallel chunks', {
    fileId,
    filename: gridfsFile.filename,
    contentType: gridfsFile.contentType,
    length: gridfsFile.length,
    totalChunks,
    concurrency: CHUNK_CONCURRENCY,
    tempVideoPath
  });

  fs.mkdirSync(path.dirname(tempVideoPath), { recursive: true });

  const chunksColl = getChunksCollection(BUCKET_NAME);
  const filesId = new mongoose.Types.ObjectId(fileId);
  const fileHandle = await fs.promises.open(tempVideoPath, 'w');

  let nextChunk = 0;
  let completedChunks = 0;
  let aborted = false;
  const startedAt = Date.now();

  const worker = async () => {
    while (!aborted) {
      const n = nextChunk++;
      if (n >= totalChunks) return;
      const data = await fetchChunkWithRetry(chunksColl, filesId, n);
      await fileHandle.write(data, 0, data.length, n * chunkSize);
      completedChunks++;
      if (completedChunks % 25 === 0 || completedChunks === totalChunks) {
        logger.info('[ASR-GRIDFS] Download progress', {
          fileId,
          completedChunks,
          totalChunks,
          elapsedMs: Date.now() - startedAt
        });
      }
    }
  };

  try {
    const workers = Array.from({ length: Math.min(CHUNK_CONCURRENCY, totalChunks) }, () => worker());
    await Promise.all(workers);
  } catch (err) {
    aborted = true;
    logger.error('[ASR-GRIDFS] Chunked download failed', { fileId, completedChunks, totalChunks, error: err.message });
    await fileHandle.close().catch(() => {});
    throw new Error('Video could not be read from storage. Please try again.');
  }

  await fileHandle.close();

  const stats = fs.statSync(tempVideoPath);
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    await fs.promises.copyFile(tempVideoPath, cachePath);
  } catch (cacheErr) {
    logger.warn('[ASR-GRIDFS] Failed to cache materialized video', { fileId, error: cacheErr.message });
  }

  logger.info('[ASR-GRIDFS] Download completed', {
    tempSize: stats.size,
    gridfsLength: gridfsFile.length,
    elapsedMs: Date.now() - startedAt
  });

  if (stats.size === 0) {
    throw new Error('Video file is empty.');
  }

  if (stats.size !== gridfsFile.length) {
    throw new Error(`Downloaded file size (${stats.size}) does not match GridFS length (${gridfsFile.length})`);
  }

  return {
    filename: gridfsFile.filename,
    contentType: gridfsFile.contentType,
    length: gridfsFile.length,
    size: stats.size,
  };
};
