import mongoose from 'mongoose';

const fileAssetSchema = new mongoose.Schema({
  storageProvider: {
    type: String,
    enum: ['gridfs', 'local', 's3', 'cloudinary'],
    default: 'gridfs',
    index: true,
  },
  bucketName: { type: String, default: 'uploads' },
  gridfsFileId: { type: mongoose.Schema.Types.ObjectId, index: true },
  originalName: { type: String, default: '' },
  fileName: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  mimeType: { type: String, default: 'application/octet-stream' },
  mediaType: {
    type: String,
    enum: ['video', 'image', 'audio', 'document', 'other'],
    index: true,
    default: 'other',
  },
  fileSize: { type: Number, default: 0 },
  extension: { type: String, default: '' },
  urls: {
    streamUrl: { type: String, default: '' },
    viewUrl: { type: String, default: '' },
    downloadUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
  },
  uploadedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userType: { type: String, default: '' },
    name: { type: String, default: '' },
  },
  accessLevel: {
    type: String,
    enum: ['public', 'enrolled', 'premium', 'private'],
    default: 'private',
  },
  relatedCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  tags: [{ type: String, trim: true }],
  category: { type: String, default: 'other' },
  usageType: { type: String, default: 'user-upload' },
  source: { type: String, default: 'unknown', index: true },
  module: { type: String, default: 'unknown', index: true },
  metadata: {
    duration: Number,
    width: Number,
    height: Number,
    resolution: String,
    bitrate: String,
    codec: String,
    pageCount: Number,
    checksum: String,
  },
  // ──── AI Processing Status ────
  aiProcessing: {
    transcriptStatus: {
      type: String,
      enum: ['idle', 'pending', 'processing', 'completed', 'failed'],
      default: 'idle',
    },
    transcriptStartedAt: Date,
    transcriptCompletedAt: Date,
    transcriptErrorMessage: String,
    transcriptJobId: String,
    lastTranscriptAttempt: Date,
  },
  transcript: {
    text: { type: String, default: '' },
    language: { type: String, default: 'auto' },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
    wordCount: { type: Number, default: 0 },
    audioDuration: { type: Number, default: 0 },
    generatedAt: Date,
    warning: { type: String, default: '' },
  },
  // ──────────────────────────────
  legacy: {
    oldUrl: String,
    oldLocalPath: String,
  },
  stats: {
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    uniqueViewers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now },
    }],
  },
  isActive: { type: Boolean, default: true },
  isTemporary: { type: Boolean, default: false },
}, { timestamps: true });

fileAssetSchema.index({ mediaType: 1, createdAt: -1 });
fileAssetSchema.index({ 'uploadedBy.userId': 1 });
fileAssetSchema.index({ relatedCourse: 1 });

const FileAsset = mongoose.model('FileAsset', fileAssetSchema);
export default FileAsset;
