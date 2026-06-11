import mongoose from 'mongoose';

// Per-lesson progress tracking
const lessonProgressSchema = new mongoose.Schema({
  lessonId:        { type: mongoose.Schema.Types.ObjectId, required: true },
  sectionId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  completed:       { type: Boolean, default: false },
  completedAt:     { type: Date },
  watchedSeconds:  { type: Number, default: 0 },   // seconds watched
  lastPosition:    { type: Number, default: 0 },   // last playback position in seconds
  totalDuration:   { type: Number, default: 0 },   // total video duration in seconds
  timeSpent:       { type: Number, default: 0 },   // total time spent on this lesson (seconds)
}, { _id: false });

// Learning activity history
const learningActivitySchema = new mongoose.Schema({
  date:           { type: Date, required: true },
  lessonId:       { type: mongoose.Schema.Types.ObjectId },
  sectionId:      { type: mongoose.Schema.Types.ObjectId },
  activityType:   { type: String, enum: ['video_watched', 'lesson_completed', 'quiz_completed', 'assignment_submitted', 'note_added'], required: true },
  duration:       { type: Number, default: 0 },   // seconds spent
  metadata:       { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  status: {
    type: String,
    enum: ['enrolled', 'in-progress', 'completed', 'dropped'],
    default: 'enrolled',
  },
  enrolledAt:   { type: Date, default: Date.now },
  completedAt:  { type: Date },
  lastAccessAt: { type: Date, default: Date.now },

  // Overall progress 0-100
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },

  // Per-lesson tracking
  lessonProgress: [lessonProgressSchema],

  // Current position (for resume)
  currentSectionId: { type: mongoose.Schema.Types.ObjectId },
  currentLessonId:  { type: mongoose.Schema.Types.ObjectId },

  // Total time spent learning (seconds)
  totalTimeSpent: { type: Number, default: 0 },

  // Learning history for analytics
  learningHistory: [learningActivitySchema],

  // Streak tracking
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastLearningDate: { type: Date },

  // Certificate
  certificateIssued:  { type: Boolean, default: false },
  certificateIssuedAt: { type: Date },
}, {
  timestamps: true,
});

// Compound unique index — one enrollment per user per course
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });

export default mongoose.model('Enrollment', enrollmentSchema);
