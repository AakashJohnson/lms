import express from 'express';
import { protect } from '../middlewares/auth.js';
import {
  recordActivity,
  getUserStats,
  getMonthlyActivity,
  getLeaderboard,
  getUserRank,
  recordDailyLogin,
  recalculateAllStreaks
} from '../services/streak.service.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Record learning activity
router.post('/activity', async (req, res) => {
  try {
    const { activityType, data } = req.body;
    const userId = req.user._id;

    const result = await recordActivity(userId, activityType, data);

    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record daily login (can be called automatically)
router.post('/login', async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await recordDailyLogin(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user streak stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await getUserStats(userId);

    res.json({
      success: true,
      data: {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        streakStartDate: stats.streakStartDate,
        lastActiveDate: stats.lastActiveDate,
        totalDaysActive: stats.totalDaysActive,
        totalWatchTimeMinutes: stats.totalWatchTimeMinutes,
        totalLessonsCompleted: stats.totalLessonsCompleted,
        totalQuizzesCompleted: stats.totalQuizzesCompleted,
        totalPoints: stats.totalPoints
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get monthly activity calendar
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const userId = req.user._id;

    const activityMap = await getMonthlyActivity(userId, parseInt(year), parseInt(month));

    res.json({
      success: true,
      data: activityMap
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const validPeriods = ['weekly', 'monthly', 'overall'];

    if (!validPeriods.includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid period' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const leaderboard = await getLeaderboard(period, limit);

    // Fetch user details
    const leaderboardWithUsers = await Promise.all(
      leaderboard.map(async (entry) => {
        const User = (await import('../models/User.model.js')).default;
        const user = await User.findById(entry.user).select('firstName lastName profilePicture').lean();
        return {
          rank: entry.rank,
          userId: entry.user,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          profilePicture: user?.profilePicture || null,
          points: entry.points,
          watchTimeMinutes: entry.watchTimeMinutes,
          lessonsCompleted: entry.lessonsCompleted,
          quizzesCompleted: entry.quizzesCompleted,
          streak: entry.streak,
          badges: entry.badges
        };
      })
    );

    res.json({
      success: true,
      data: leaderboardWithUsers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user rank
router.get('/rank/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const userId = req.user._id;

    const rank = await getUserRank(userId, period);

    res.json({
      success: true,
      data: rank
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Recalculate all streaks (admin only)
router.post('/recalculate', async (req, res) => {
  try {
    // Check if admin
    if (req.user.role !== 'administrator') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const result = await recalculateAllStreaks();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hook to record activity when lesson progress is updated
export const recordLearningActivity = async (userId, type, data) => {
  try {
    await recordActivity(userId, type, data);
  } catch (error) {
    console.error('Error recording learning activity:', error);
  }
};

export default router;