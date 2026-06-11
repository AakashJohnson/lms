import { LearningActivity, UserStats, Leaderboard } from '../models/LearningActivity.model.js';

// Point system for activities
const POINTS = {
  VIDEO_MINUTE: 1,
  LESSON_COMPLETE: 10,
  QUIZ_COMPLETE: 15,
  ASSIGNMENT_COMPLETE: 20,
  QUESTION_ASK: 5,
  NOTE_CREATE: 3,
  DAILY_LOGIN: 2,
  STREAK_BONUS: 5 // Bonus points per day of streak
};

// Minimum time (minutes) to consider a day as active
const MIN_ACTIVE_MINUTES = 5;

export const recordActivity = async (userId, activityType, data = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Find or create today's activity
    let activity = await LearningActivity.findOne({
      user: userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!activity) {
      activity = new LearningActivity({
        user: userId,
        date: today,
        activities: {},
        courses: []
      });
    }

    // Update activity based on type
    let pointsEarned = 0;

    switch (activityType) {
      case 'video_watch':
        const minutes = data.minutes || 0;
        activity.activities.videoWatched += minutes;
        activity.activities.timeSpentMinutes += minutes;
        pointsEarned = minutes * POINTS.VIDEO_MINUTE;
        break;

      case 'lesson_complete':
        activity.activities.lessonsCompleted += 1;
        pointsEarned = POINTS.LESSON_COMPLETE;
        break;

      case 'quiz_complete':
        activity.activities.quizzesCompleted += 1;
        pointsEarned = POINTS.QUIZ_COMPLETE;
        break;

      case 'assignment_complete':
        activity.activities.assignmentsCompleted += 1;
        pointsEarned = POINTS.ASSIGNMENT_COMPLETE;
        break;

      case 'question_ask':
        activity.activities.questionsAsked += 1;
        pointsEarned = POINTS.QUESTION_ASK;
        break;

      case 'note_create':
        activity.activities.notesCreated += 1;
        pointsEarned = POINTS.NOTE_CREATE;
        break;

      case 'daily_login':
        if (!activity.activities.dailyLogins) {
          activity.activities.dailyLogins = 1;
          pointsEarned = POINTS.DAILY_LOGIN;
        }
        break;

      default:
        break;
    }

    // Add streak bonus if this is first activity today
    const userStats = await getUserStats(userId);
    if (pointsEarned > 0 && userStats && userStats.currentStreak > 0) {
      pointsEarned += POINTS.STREAK_BONUS;
    }

    activity.totalPoints += pointsEarned;
    await activity.save();

    // Update user stats
    await updateUserStats(userId);

    return { success: true, pointsEarned, totalPoints: activity.totalPoints };
  } catch (error) {
    console.error('Error recording activity:', error);
    return { success: false, error: error.message };
  }
};

export const getUserStats = async (userId) => {
  let stats = await UserStats.findOne({ user: userId });

  if (!stats) {
    stats = new UserStats({ user: userId });
    await stats.save();
  }

  return stats;
};

export const updateUserStats = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let stats = await UserStats.findOne({ user: userId });

  if (!stats) {
    stats = new UserStats({ user: userId });
  }

  // Get all activities for this user
  const activities = await LearningActivity.find({
    user: userId,
    isActive: true
  }).sort({ date: -1 });

  // Calculate total stats
  stats.totalWatchTimeMinutes = activities.reduce((sum, a) => sum + (a.activities.timeSpentMinutes || 0), 0);
  stats.totalLessonsCompleted = activities.reduce((sum, a) => sum + (a.activities.lessonsCompleted || 0), 0);
  stats.totalQuizzesCompleted = activities.reduce((sum, a) => sum + (a.activities.quizzesCompleted || 0), 0);
  stats.totalPoints = activities.reduce((sum, a) => sum + (a.totalPoints || 0), 0);

  // Calculate streak
  const activeDates = activities
    .filter(a =>
      a.activities.timeSpentMinutes >= MIN_ACTIVE_MINUTES ||
      a.activities.lessonsCompleted > 0 ||
      a.activities.dailyLogins > 0
    )
    .map(a => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

  // Remove duplicates
  const uniqueDates = [...new Set(activeDates)].sort((a, b) => b - a);

  if (uniqueDates.length === 0) {
    stats.currentStreak = 0;
    stats.lastActiveDate = null;
  } else {
    const todayTime = today.getTime();
    const yesterdayTime = yesterday.getTime();

    const lastActiveTime = uniqueDates[0];
    const isActiveToday = lastActiveTime === todayTime;
    const wasActiveYesterday = uniqueDates[0] === yesterdayTime || (uniqueDates.length > 1 && uniqueDates[1] === yesterdayTime);

    if (isActiveToday || wasActiveYesterday) {
      // Calculate current streak
      let streak = 0;
      let checkDate = isActiveToday ? today : yesterday;

      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = new Date(checkDate);
        expectedDate.setDate(expectedDate.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (uniqueDates[i] === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      stats.currentStreak = streak;
      stats.lastActiveDate = new Date(lastActiveTime);

      if (streak > stats.longestStreak) {
        stats.longestStreak = streak;
        stats.streakStartDate = new Date(today.getTime() - (streak - 1) * 24 * 60 * 60 * 1000);
      }
    } else {
      // Streak broken
      stats.currentStreak = 0;
      stats.lastActiveDate = new Date(lastActiveTime);
    }
  }

  stats.totalDaysActive = uniqueDates.length;
  stats.lastCalculated = new Date();

  await stats.save();
  return stats;
};

export const getMonthlyActivity = async (userId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const activities = await LearningActivity.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).lean();

  const activityMap = {};

  activities.forEach(activity => {
    const day = new Date(activity.date).getDate();
    const isActive = activity.activities.timeSpentMinutes >= MIN_ACTIVE_MINUTES ||
                     activity.activities.lessonsCompleted > 0 ||
                     activity.activities.dailyLogins > 0;
    activityMap[day] = {
      active: isActive,
      minutes: activity.activities.timeSpentMinutes || 0,
      lessons: activity.activities.lessonsCompleted || 0,
      points: activity.totalPoints || 0
    };
  });

  return activityMap;
};

export const getLeaderboard = async (period = 'weekly', limit = 20) => {
  // Check cache first
  let leaderboard = await Leaderboard.findOne({ period });

  const now = new Date();
  let shouldRecalculate = true;

  if (leaderboard) {
    const hoursSinceUpdate = (now - leaderboard.calculatedAt) / (1000 * 60 * 60);

    if (period === 'weekly' && hoursSinceUpdate < 1) shouldRecalculate = false;
    else if (period === 'monthly' && hoursSinceUpdate < 6) shouldRecalculate = false;
    else if (period === 'overall' && hoursSinceUpdate < 24) shouldRecalculate = false;
  }

  if (shouldRecalculate || !leaderboard) {
    const startDate = new Date();

    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const stats = await UserStats.find({
      lastActiveDate: { $gte: startDate }
    }).sort({ totalPoints: -1 }).limit(100).populate('user', 'firstName lastName profilePicture').lean();

    const entries = stats.map((stat, index) => ({
      user: stat.user._id,
      rank: index + 1,
      points: stat.totalPoints || 0,
      watchTimeMinutes: stat.totalWatchTimeMinutes || 0,
      lessonsCompleted: stat.totalLessonsCompleted || 0,
      quizzesCompleted: stat.totalQuizzesCompleted || 0,
      streak: stat.currentStreak || 0,
      badges: getBadges(stat),
      lastUpdated: new Date()
    }));

    if (!leaderboard) {
      leaderboard = new Leaderboard({ period, entries });
    } else {
      leaderboard.entries = entries;
      leaderboard.calculatedAt = new Date();
    }

    await leaderboard.save();

    // Update ranks in UserStats
    for (let i = 0; i < entries.length; i++) {
      const updateField = period === 'weekly' ? 'weeklyRank' :
                         period === 'monthly' ? 'monthlyRank' : 'overallRank';
      await UserStats.findByIdAndUpdate(stats[i]._id, { [updateField]: i + 1 });
    }
  }

  return leaderboard.entries.slice(0, limit);
};

export const getUserRank = async (userId, period = 'overall') => {
  const stats = await UserStats.findOne({ user: userId });

  if (!stats) return null;

  const rankField = period === 'weekly' ? 'weeklyRank' :
                   period === 'monthly' ? 'monthlyRank' : 'overallRank';

  return {
    rank: stats[rankField] || null,
    totalPoints: stats.totalPoints || 0,
    currentStreak: stats.currentStreak || 0,
    totalWatchTimeMinutes: stats.totalWatchTimeMinutes || 0,
    totalLessonsCompleted: stats.totalLessonsCompleted || 0
  };
};

const getBadges = (stats) => {
  const badges = [];

  if (stats.currentStreak >= 30) badges.push('🔥 Streak Master');
  else if (stats.currentStreak >= 7) badges.push('🔥 Week Warrior');

  if (stats.totalLessonsCompleted >= 50) badges.push('📚 Bookworm');
  else if (stats.totalLessonsCompleted >= 20) badges.push('📖 Avid Learner');

  if (stats.totalQuizzesCompleted >= 30) badges.push('🧠 Quiz Champion');
  else if (stats.totalQuizzesCompleted >= 10) badges.push('✅ Quiz Taker');

  if (stats.totalWatchTimeMinutes >= 1000) badges.push('⏰ Time Lord');
  else if (stats.totalWatchTimeMinutes >= 500) badges.push('⏱️ Time Keeper');

  if (stats.totalPoints >= 1000) badges.push('⭐ Point Master');

  return badges;
};

export const recordDailyLogin = async (userId) => {
  return recordActivity(userId, 'daily_login');
};

// Auto-calculate streaks for all users (called via cron)
export const recalculateAllStreaks = async () => {
  const users = await UserStats.find({}, 'user');

  for (const user of users) {
    await updateUserStats(user.user);
  }

  // Recalculate leaderboards
  await getLeaderboard('weekly');
  await getLeaderboard('monthly');
  await getLeaderboard('overall');

  return { success: true, usersProcessed: users.length };
};
