import mongoose from 'mongoose';

const learningActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // index removed - using compound index below
  },
  date: {
    type: Date,
    required: true
    // index removed - using compound index below
  },
  activities: {
    videoWatched: { type: Number, default: 0 },
    lessonsCompleted: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    assignmentsCompleted: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    notesCreated: { type: Number, default: 0 },
    dailyLogins: { type: Number, default: 0 },
    timeSpentMinutes: { type: Number, default: 0 }
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  courses: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    watchedMinutes: { type: Number, default: 0 },
    lessonsCompleted: { type: Number, default: 0 }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
learningActivitySchema.index({ user: 1, date: 1 }, { unique: true });

export const LearningActivity = mongoose.model('LearningActivity', learningActivitySchema);

// User Stats Model - caches calculated stats
const userStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // index removed - using unique index below
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  streakStartDate: {
    type: Date,
    default: null
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  totalDaysActive: {
    type: Number,
    default: 0
  },
  totalWatchTimeMinutes: {
    type: Number,
    default: 0
  },
  totalLessonsCompleted: {
    type: Number,
    default: 0
  },
  totalQuizzesCompleted: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  weeklyRank: {
    type: Number,
    default: null
  },
  monthlyRank: {
    type: Number,
    default: null
  },
  overallRank: {
    type: Number,
    default: null
  },
  lastCalculated: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userStatsSchema.index({ user: 1 }, { unique: true });
userStatsSchema.index({ currentStreak: -1 });
userStatsSchema.index({ totalPoints: -1 });
userStatsSchema.index({ weeklyRank: 1 });
userStatsSchema.index({ monthlyRank: 1 });
userStatsSchema.index({ overallRank: 1 });

export const UserStats = mongoose.model('UserStats', userStatsSchema);

// Leaderboard Entry for caching
const leaderboardSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'overall'],
    required: true
    // index removed - using unique index below
  },
  entries: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rank: Number,
    points: Number,
    watchTimeMinutes: Number,
    lessonsCompleted: Number,
    quizzesCompleted: Number,
    streak: Number,
    badges: [String],
    lastUpdated: Date
  }],
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

leaderboardSchema.index({ period: 1 }, { unique: true });

export const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
