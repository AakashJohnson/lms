import mongoose from 'mongoose';

const forumReplySchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
    parentReplyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumReply', default: null, index: true },

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  { timestamps: true },
);

forumReplySchema.index({ post: 1, parentReplyId: 1, createdAt: -1 });

const ForumReply = mongoose.model('ForumReply', forumReplySchema);
export default ForumReply;

