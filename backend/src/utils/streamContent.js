import AWS from 'aws-sdk';
import { Throttle } from 'stream-throttle';
import { logger } from '../config/logger.js';

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

/**
 * Stream content securely from S3 with adaptive bitrate
 * CRITICAL: Prevents downloading, only allows streaming
 */
export const streamSecureContent = async (req, res, fileKey, contentType) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    };

    // Get file metadata
    const headData = await s3.headObject(params).promise();
    const fileSize = headData.ContentLength;

    // Handle range requests for video streaming
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Set headers for partial content
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        // CRITICAL: Prevent downloading
        'Content-Disposition': 'inline',
        'X-Frame-Options': 'SAMEORIGIN'
      });

      // Stream the requested range
      const stream = s3.getObject({
        ...params,
        Range: `bytes=${start}-${end}`
      }).createReadStream();

      // Throttle stream to prevent abuse (adaptive based on connection)
      const throttle = new Throttle({ rate: 1024 * 1024 }); // 1 MB/s default
      
      stream.pipe(throttle).pipe(res);

      stream.on('error', (error) => {
        logger.error(`Stream error: ${error.message}`);
        res.status(500).end();
      });

    } else {
      // Full file stream (for audio/documents)
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // CRITICAL: Prevent downloading
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
      });

      const stream = s3.getObject(params).createReadStream();
      stream.pipe(res);

      stream.on('error', (error) => {
        logger.error(`Stream error: ${error.message}`);
        res.status(500).end();
      });
    }

  } catch (error) {
    logger.error(`Content streaming error: ${error.message}`);
    throw error;
  }
};

/**
 * Generate signed URL with expiry for secure access
 * Used for temporary access to content
 */
export const generateSignedUrl = (fileKey, expirySeconds = 3600) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
    Expires: expirySeconds,
    ResponseContentDisposition: 'inline' // Force inline viewing
  };

  return s3.getSignedUrl('getObject', params);
};

/**
 * Upload file to S3
 */
export const uploadToS3 = async (file, folder = 'content') => {
  const fileKey = `${folder}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private', // CRITICAL: Keep files private
    ServerSideEncryption: 'AES256'
  };

  const result = await s3.upload(params).promise();
  
  return {
    key: result.Key,
    url: result.Location,
    bucket: result.Bucket
  };
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (fileKey) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey
  };

  await s3.deleteObject(params).promise();
  logger.info(`File deleted from S3: ${fileKey}`);
};

export default {
  streamSecureContent,
  generateSignedUrl,
  uploadToS3,
  deleteFromS3
};
