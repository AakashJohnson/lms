import mongoose from 'mongoose';

const userLearningStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // XP and Level
  totalXP: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  levelTitle: {
    type: String,
    default: 'Newcomer'
  },
  xpToNextLevel: {
    type: Number,
    default: 100
  },
  // Streaks
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastActiveDate: {
    type: Date,
    default: null
  },
  streakHistory: [{
    startDate: Date,
    endDate: Date,
    length: Number
  }],
  // Learning stats
  totalLessonsCompleted: {
    type: Number,
    default: 0
  },
  totalCoursesStarted: {
    type: Number,
    default: 0
  },
  totalCoursesCompleted: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number, // in seconds
    default: 0
  },
  totalQuizzesTaken: {
    type: Number,
    default: 0
  },
  averageQuizScore: {
    type: Number,
    default: 0
  },
  // Flashcards
  totalFlashcardsReviewed: {
    type: Number,
    default: 0
  },
  flashcardsMastered: {
    type: Number,
    default: 0
  },
  // Daily goals
  dailyGoalMinutes: {
    type: Number,
    default: 30
  },
  dailyStreakMet: {
    type: Number,
    default: 0
  },
  // Weak areas (topics needing review)
  weakAreas: [{
    topic: String,
    poorScoreCount: Number,
    lastReviewedAt: Date
  }],
  // Strong areas
  strongAreas: [{
    topic: String,
    excellentScoreCount: Number
  }],
  // Learning pace
  averageLessonsPerDay: {
    type: Number,
    default: 0
  },
  preferredTimeOfDay: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: 'evening'
  },
  // Weekly stats (reset weekly)
  weeklyStats: {
    startDate: Date,
    lessonsCompleted: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    minutesLearned: { type: Number, default: 0 },
    quizzesPassed: { type: Number, default: 0 }
  },
  // Achievement tracking
  achievements: [{
    achievementId: String,
    unlockedAt: Date,
    progress: { type: Number, default: 0 }
  }],
  // Last updated
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Level titles mapping
const levelTitles = [
  'Newcomer', 'Explorer', 'Learner', 'Achiever', 'Expert',
  'Master', 'Champion', 'Legend', 'Guru', 'Sage'
];

// Calculate level from XP
userLearningStatsSchema.methods.calculateLevel = function() {
  const xp = this.totalXP;
  let level = 1;
  let xpRequired = 100;
  let title = levelTitles[0];

  for (let i = 1; i <= 100; i++) {
    if (xp >= xpRequired) {
      level = i + 1;
      xpRequired = Math.floor(xpRequired * 1.5);
    } else {
      break;
    }
  }

  title = levelTitles[Math.min(Math.floor((level - 1) / 10), levelTitles.length - 1)];
  this.level = level;
  this.levelTitle = title;
  this.xpToNextLevel = xpRequired;
};

// Pre-save middleware
userLearningStatsSchema.pre('save', function(next) {
  this.calculateLevel();
  this.lastUpdated = Date.now();
  next();
});

const UserLearningStats = mongoose.model('UserLearningStats', userLearningStatsSchema);

export default UserLearningStats;
