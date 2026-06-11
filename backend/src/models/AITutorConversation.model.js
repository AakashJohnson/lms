import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Sources used for the answer
  sources: [{
    lessonTitle: String,
    lessonId: mongoose.Schema.Types.ObjectId,
    excerpt: String
  }]
});

const tutorAttachmentChunkSchema = new mongoose.Schema({
  index: { type: Number, default: 0 },
  text: { type: String, default: '' },
  chapterTitle: { type: String, default: '' },
  keywords: [{ type: String }],
  embedding: [{ type: Number }],
}, { _id: false });

const tutorAttachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, default: 0 },
  fileUrl: { type: String, default: '' },
  extractedText: { type: String, default: '' },
  summary: { type: String, default: '' },
  documentStructure: {
    chapters: [{ title: String, index: Number }],
    tables: [{ index: Number, preview: String }],
    importantConcepts: [{ term: String, score: Number }],
    flashcards: [{ question: String, answer: String }],
    quizQuestions: [{
      question: String,
      options: [String],
      answer: String,
      explanation: String,
    }],
    conceptMap: [{ concept: String, related: [String] }],
  },
  chunks: [tutorAttachmentChunkSchema],
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const aiTutorConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MicroLesson'
  },
  messages: [messageSchema],
  attachments: [tutorAttachmentSchema],
  activeAttachmentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  // Context for the conversation
  context: {
    currentTopic: String,
    topicsCovered: [String],
    userLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  },
  // Feedback on responses
  ratings: [{
    messageIndex: Number,
    helpful: Boolean,
    feedback: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Session info
  isActive: {
    type: Boolean,
    default: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
});

aiTutorConversationSchema.index({ user: 1, isActive: 1 });

const AITutorConversation = mongoose.model('AITutorConversation', aiTutorConversationSchema);

export default AITutorConversation;
