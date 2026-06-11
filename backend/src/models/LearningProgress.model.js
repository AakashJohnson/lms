import mongoose from 'mongoose';

const learningProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  microLesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MicroLesson',
    required: true
  },
  // Progress tracking
  watchedTime: {
    type: Number, // in seconds
    default: 0
  },
  totalDuration: {
    type: Number, // in seconds
    default: 0
  },
  completionPercentage: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  // Quiz results
  quizAttempted: {
    type: Boolean,
    default: false
  },
  quizScore: {
    type: Number,
    default: 0
  },
  quizAttempts: {
    type: Number,
    default: 0
  },
  quizBestScore: {
    type: Number,
    default: 0
  },
  // Flashcard progress
  flashcardsReviewed: {
    type: Number,
    default: 0
  },
  flashcardsKnown: {
    type: Number,
    default: 0
  },
  // Bookmark status
  isBookmarked: {
    type: Boolean,
    default: false
  },
  bookmarkedAt: Date,
  // Notes
  userNotes: {
    type: String,
    default: ''
  },
  highlights: [{
    timestamp: Number,
    note: String,
    createdAt: { type: Date, default: Date.now }
  }],
  // Last position for resume
  lastPosition: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  // Streak tracking
  sessionDate: {
    type: Date,
    default: Date.now
  }
});

learningProgressSchema.index({ user: 1, microLesson: 1 }, { unique: true });
learningProgressSchema.index({ user: 1, course: 1 });

const LearningProgress = mongoose.model('LearningProgress', learningProgressSchema);

export default LearningProgress;
