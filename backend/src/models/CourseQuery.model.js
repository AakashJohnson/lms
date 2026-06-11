import mongoose from 'mongoose';

const courseQuerySchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Make optional to handle cases where trainer is not assigned
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['course-content', 'lesson', 'assessment', 'technical', 'general'],
    default: 'general'
  },
  lessonReference: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'answered', 'closed'],
    default: 'pending'
  },
  replies: [{
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'replies.repliedByModel'
    },
    repliedByModel: {
      type: String,
      enum: ['User']
    },
    reply: {
      type: String,
      required: true,
      maxlength: [2000, 'Reply cannot exceed 2000 characters']
    },
    repliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
courseQuerySchema.index({ course: 1, status: 1 });
courseQuerySchema.index({ student: 1 });
courseQuerySchema.index({ trainer: 1, status: 1 });
courseQuerySchema.index({ createdAt: -1 });

// Virtual for upvote count
courseQuerySchema.virtual('upvoteCount').get(function() {
  return this.upvotes ? this.upvotes.length : 0;
});

// Virtual for reply count
courseQuerySchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Ensure virtuals are included in JSON
courseQuerySchema.set('toJSON', { virtuals: true });
courseQuerySchema.set('toObject', { virtuals: true });

const CourseQuery = mongoose.model('CourseQuery', courseQuerySchema);

export default CourseQuery;
