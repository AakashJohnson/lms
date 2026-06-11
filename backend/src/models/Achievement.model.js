import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  achievementId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'trophy'
  },
  category: {
    type: String,
    enum: ['streak', 'completion', 'quiz', 'consistency', 'milestone', 'special'],
    required: true
  },
  // Criteria to unlock
  criteria: {
    type: {
      type: String,
      enum: ['lessons_completed', 'streak_days', 'quiz_score', 'xp_earned', 'courses_completed', 'flashcards_mastered', 'special'],
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  },
  // Rewards
  xpReward: {
    type: Number,
    default: 0
  },
  badgeColor: {
    type: String,
    default: '#6366F1'
  },
  // Rarity
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const Achievement = mongoose.model('Achievement', achievementSchema);

// Predefined achievements
const defaultAchievements = [
  {
    achievementId: 'first_lesson',
    name: 'First Steps',
    description: 'Complete your first micro-lesson',
    icon: 'play',
    category: 'milestone',
    criteria: { type: 'lessons_completed', value: 1 },
    xpReward: 10,
    rarity: 'common'
  },
  {
    achievementId: 'ten_lessons',
    name: 'Getting Started',
    description: 'Complete 10 micro-lessons',
    icon: 'book',
    category: 'milestone',
    criteria: { type: 'lessons_completed', value: 10 },
    xpReward: 50,
    rarity: 'common'
  },
  {
    achievementId: 'fifty_lessons',
    name: 'Dedicated Learner',
    description: 'Complete 50 micro-lessons',
    icon: 'award',
    category: 'milestone',
    criteria: { type: 'lessons_completed', value: 50 },
    xpReward: 200,
    rarity: 'rare'
  },
  {
    achievementId: 'hundred_lessons',
    name: 'Knowledge Seeker',
    description: 'Complete 100 micro-lessons',
    icon: 'star',
    category: 'milestone',
    criteria: { type: 'lessons_completed', value: 100 },
    xpReward: 500,
    rarity: 'epic'
  },
  {
    achievementId: 'streak_3',
    name: 'On Fire',
    description: 'Maintain a 3-day learning streak',
    icon: 'flame',
    category: 'streak',
    criteria: { type: 'streak_days', value: 3 },
    xpReward: 30,
    rarity: 'common'
  },
  {
    achievementId: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: 'flame',
    category: 'streak',
    criteria: { type: 'streak_days', value: 7 },
    xpReward: 100,
    rarity: 'rare'
  },
  {
    achievementId: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    icon: 'flame',
    category: 'streak',
    criteria: { type: 'streak_days', value: 30 },
    xpReward: 500,
    rarity: 'epic'
  },
  {
    achievementId: 'perfect_quiz',
    name: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: 'check-circle',
    category: 'quiz',
    criteria: { type: 'quiz_score', value: 100 },
    xpReward: 50,
    rarity: 'rare'
  },
  {
    achievementId: 'quiz_master',
    name: 'Quiz Master',
    description: 'Pass 10 quizzes',
    icon: 'award',
    category: 'quiz',
    criteria: { type: 'quiz_score', value: 10 },
    xpReward: 100,
    rarity: 'rare'
  },
  {
    achievementId: 'first_course',
    name: 'Course Complete',
    description: 'Complete your first course',
    icon: 'graduation-cap',
    category: 'completion',
    criteria: { type: 'courses_completed', value: 1 },
    xpReward: 100,
    rarity: 'rare'
  },
  {
    achievementId: 'xp_500',
    name: 'Rising Star',
    description: 'Earn 500 XP',
    icon: 'zap',
    category: 'milestone',
    criteria: { type: 'xp_earned', value: 500 },
    xpReward: 0,
    rarity: 'common'
  },
  {
    achievementId: 'xp_1000',
    name: 'XP Hunter',
    description: 'Earn 1000 XP',
    icon: 'zap',
    category: 'milestone',
    criteria: { type: 'xp_earned', value: 1000 },
    xpReward: 0,
    rarity: 'rare'
  },
  {
    achievementId: 'flashcard_pro',
    name: 'Memory Master',
    description: 'Master 50 flashcards',
    icon: 'layers',
    category: 'special',
    criteria: { type: 'flashcards_mastered', value: 50 },
    xpReward: 100,
    rarity: 'rare'
  }
];

export { defaultAchievements };
export default Achievement;
