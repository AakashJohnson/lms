import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import connectDB from './src/config/database.js';
import { createFileAssetFromUploadedFile } from './src/controllers/file.controller.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-upload-test-'));
const filePath = path.join(tempDir, 'test-video.mp4');
fs.writeFileSync(filePath, Buffer.alloc(1024 * 1024 * 2, 7));

console.log('temp file:', filePath);
await connectDB();
console.log('db connected');
const started = Date.now();
const asset = await createFileAssetFromUploadedFile({
  file: {
    path: filePath,
    filename: 'test-video.mp4',
    originalname: 'test-video.mp4',
    mimetype: 'video/mp4',
    size: fs.statSync(filePath).size,
    mediaType: 'video',
  },
  body: { title: 'test video', usageType: 'user-upload', accessLevel: 'enrolled' },
  user: { _id: '60f7b2a8a0d1234567890123', role: 'trainer', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
});
console.log('done in ms:', Date.now() - started);
console.log(JSON.stringify({ id: String(asset._id), storageProvider: asset.storageProvider, gridfsFileId: String(asset.gridfsFileId || '') }, null, 2));
