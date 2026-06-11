import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

// Atlas free-tier clusters throttle bandwidth per connection, so a single GridFS
// download stream can stall past the socket timeout. Fetch chunks as independent
// small queries, but keep the default fan-out moderate so ASR jobs do not starve
// the same MongoDB connection pool while the user is polling progress.
export const CHUNK_CONCURRENCY = parseInt(
  process.env.GRIDFS_CHUNK_CONCURRENCY || process.env.ASR_GRIDFS_CHUNK_CONCURRENCY || '8',
  10
);
const CHUNK_FETCH_RETRIES = 3;
const CHUNK_FETCH_TIMEOUT_MS = parseInt(process.env.GRIDFS_CHUNK_TIMEOUT_MS || '60000', 10);

export const toBuffer = (data) => {
  if (Buffer.isBuffer(data)) return data;
  // mongodb BSON Binary
  if (typeof data?.length === 'function' && typeof data?.read === 'function') {
    return Buffer.from(data.read(0, data.length()));
  }
  return Buffer.from(data.buffer || data);
};

export const getChunksCollection = (bucketName) => {
  const bucket = bucketName || process.env.GRIDFS_BUCKET_NAME || 'uploads';
  return mongoose.connection.db.collection(`${bucket}.chunks`);
};

export const fetchChunkWithRetry = async (chunksColl, filesId, n) => {
  let lastError;
  for (let attempt = 1; attempt <= CHUNK_FETCH_RETRIES; attempt++) {
    try {
      const doc = await chunksColl.findOne({ files_id: filesId, n }, { maxTimeMS: CHUNK_FETCH_TIMEOUT_MS });
      if (!doc) throw new Error(`GridFS chunk ${n} not found`);
      return toBuffer(doc.data);
    } catch (err) {
      lastError = err;
      logger.warn('[GRIDFS-READER] Chunk fetch failed', { chunk: n, attempt, error: err.message });
      if (attempt < CHUNK_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
};

/**
 * Streams a byte range of a GridFS file to a writable (HTTP response),
 * fetching chunks with parallel prefetch but emitting them in order.
 * Headers must already be written by the caller.
 * @param {Object} params
 * @param {string} params.bucketName - GridFS bucket name
 * @param {string|ObjectId} params.fileId - GridFS file id
 * @param {number} params.chunkSize - chunkSize from the files document
 * @param {number} params.start - first byte (inclusive)
 * @param {number} params.end - last byte (inclusive)
 * @param {import('http').ServerResponse} params.res - response to write to
 */
export const streamGridFsRangeToResponse = async ({ bucketName, fileId, chunkSize, start, end, res }) => {
  const chunksColl = getChunksCollection(bucketName);
  const filesId = new mongoose.Types.ObjectId(fileId);
  const firstChunk = Math.floor(start / chunkSize);
  const lastChunk = Math.floor(end / chunkSize);

  let aborted = false;
  const onClose = () => { aborted = true; };
  res.on('close', onClose);

  const pending = new Map();
  let fetchNext = firstChunk;
  const prefetch = () => {
    while (fetchNext <= lastChunk && pending.size < CHUNK_CONCURRENCY && !aborted) {
      const n = fetchNext++;
      const promise = fetchChunkWithRetry(chunksColl, filesId, n);
      promise.catch(() => {}); // inspected when awaited in order; avoid unhandled rejection
      pending.set(n, promise);
    }
  };

  try {
    prefetch();
    for (let n = firstChunk; n <= lastChunk && !aborted; n++) {
      const buf = await pending.get(n);
      pending.delete(n);
      prefetch();

      const chunkStart = n * chunkSize;
      const sliceFrom = Math.max(0, start - chunkStart);
      const sliceTo = Math.min(buf.length, end + 1 - chunkStart);
      if (sliceTo <= sliceFrom) continue;

      if (aborted || res.destroyed || res.writableEnded) return;
      if (!res.write(buf.subarray(sliceFrom, sliceTo))) {
        await new Promise((resolve) => {
          res.once('drain', resolve);
          res.once('close', resolve);
        });
      }
    }
    if (!aborted && !res.writableEnded) res.end();
  } finally {
    res.off('close', onClose);
  }
};
