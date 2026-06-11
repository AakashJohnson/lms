import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Query title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Query description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['technical', 'course-content', 'assessment', 'certificate', 'payment', 'general'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  askedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    userType: {
      type: String,
      enum: ['admin', 'trainer', 'student'],
      required: true
    },
    name: String,
    email: String
  },
  assignedTo: {
    userId: mongoose.Schema.Types.ObjectId,
    userType: {
      type: String,
      enum: ['admin', 'trainer']
    },
    name: String,
    email: String
  },
  responses: [{
    respondedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['admin', 'trainer'],
        required: true
      },
      name: String,
      email: String
    },
    response: {
      type: String,
      required: true,
      maxlength: [2000, 'Response cannot exceed 2000 characters']
    },
    attachments: [{
      filename: String,
      url: String,
      fileType: String,
      fileSize: Number
    }],
    isExpertResponse: {
      type: Boolean,
      default: false
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    fileSize: Number
  }],
  tags: [String],
  viewCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  closedAt: Date
}, {
  timestamps: true
});

// Indexes
querySchema.index({ status: 1, priority: 1 });
querySchema.index({ 'askedBy.userId': 1 });
querySchema.index({ 'assignedTo.userId': 1 });
querySchema.index({ category: 1 });
querySchema.index({ createdAt: -1 });

const Query = mongoose.model('Query', querySchema);

export default Query;
