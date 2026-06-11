import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Media title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  mediaType: {
    type: String,
    enum: ['video', 'audio', 'image', 'document'],
    required: true
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  storageProvider: {
    type: String,
    enum: ['gridfs', 'local', 's3', 'cloudinary'],
    default: 'local'
  },
  fileAssetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileAsset',
    default: null
  },
  gridfsFileId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  bucketName: {
    type: String,
    default: 'uploads'
  },
  streamUrl: String,
  viewUrl: String,
  downloadUrl: String,
  storage: {
    provider: {
      type: String,
      enum: ['gridfs', 'local', 's3', 'cloudinary'],
      default: 'local'
    },
    fileAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileAsset',
      default: null
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    bucketName: {
      type: String,
      default: 'uploads'
    },
    streamUrl: String,
    viewUrl: String,
    downloadUrl: String,
    originalName: String,
    uploadedAt: Date
  },
  thumbnailUrl: {
    type: String
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  duration: {
    type: Number // in seconds (for video/audio)
  },
  category: {
    type: String,
    enum: ['educational', 'training', 'documentary', 'tutorial', 'webinar', 'other'],
    default: 'educational'
  },
  tags: [String],
  uploadedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userType: {
      type: String,
      enum: ['admin', 'trainer'],
      required: true
    },
    name: String
  },
  relatedCourse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  accessLevel: {
    type: String,
    enum: ['public', 'enrolled', 'premium'],
    default: 'enrolled'
  },
  source: {
    type: String,
    default: 'media_library',
    index: true
  },
  module: {
    type: String,
    default: 'media_library',
    index: true
  },
  usageType: {
    type: String,
    default: 'library_resource',
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  uniqueViewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  downloadCount: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  metadata: {
    resolution: String, // for videos
    bitrate: String,
    codec: String,
    aspectRatio: String
  }
}, {
  timestamps: true
});

// Indexes
mediaSchema.index({ mediaType: 1, category: 1 });
mediaSchema.index({ fileAssetId: 1 });
mediaSchema.index({ gridfsFileId: 1 });
mediaSchema.index({ 'uploadedBy.userId': 1 });
mediaSchema.index({ relatedCourse: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isActive: 1, isFeatured: 1 });
mediaSchema.index({ createdAt: -1 });

const Media = mongoose.model('Media', mediaSchema);

export default Media;
