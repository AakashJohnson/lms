import mongoose from 'mongoose';

const forumPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 10000 },

    category: {
      type: String,
      default: 'general',
      enum: ['general', 'course', 'lesson', 'assessment', 'technical', 'resource'],
    },
    tags: [{ type: String, trim: true, lowercase: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinned: { type: Boolean, default: false, index: true },
    solved: { type: Boolean, default: false, index: true },

    viewCount: { type: Number, default: 0 },

    aiSummary: { type: String, default: '' },
    isFlagged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

forumPostSchema.index({ pinned: 1, createdAt: -1 });
forumPostSchema.index({ solved: 1, createdAt: -1 });
forumPostSchema.index({ author: 1, createdAt: -1 });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);
export default ForumPost;

