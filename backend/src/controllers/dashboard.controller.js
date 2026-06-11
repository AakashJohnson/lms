import User from '../models/User.model.js';
import Course from '../models/Course.model.js';
import Certificate from '../models/Certificate.model.js';
import Query from '../models/Query.model.js';
import Media from '../models/Media.model.js';
import Payment from '../models/Payment.model.js';
import Enrollment from '../models/Enrollment.model.js';
import CourseRating from '../models/CourseRating.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cacheGet, cacheSet } from '../config/redis.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/dashboard/stats
 * @access  Public
 */
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Check cache first
  const cacheKey = 'dashboard:stats';
  const cachedStats = await cacheGet(cacheKey);

  if (cachedStats) {
    return res.status(200).json({
      success: true,
      data: cachedStats,
      cached: true
    });
  }

  // Aggregate statistics
  const [
    totalUsers,
    approvedUsers,
    totalCourses,
    publishedCourses,
    totalEnrollments,
    completedEnrollments,
    certificatesIssued
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isApproved: true, isActive: true }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Enrollment.countDocuments(),
    Enrollment.countDocuments({ status: 'completed' }),
    Certificate.countDocuments({ isActive: true, isRevoked: false })
  ]);

  const stats = {
    users: {
      total: totalUsers,
      registered: approvedUsers,
      pending: totalUsers - approvedUsers
    },
    courses: {
      total: totalCourses,
      published: publishedCourses,
      draft: totalCourses - publishedCourses
    },
    enrollments: {
      total: totalEnrollments,
      completed: completedEnrollments,
      inProgress: totalEnrollments - completedEnrollments
    },
    certificates: {
      issued: certificatesIssued
    },
    lastUpdated: new Date()
  };

  // Cache for 5 minutes
  await cacheSet(cacheKey, stats, 300);

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Get user-specific dashboard
 * @route   GET /api/v1/dashboard/my-dashboard
 * @access  Private
 */
export const getMyDashboard = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  // Use Enrollment model for accurate progress data
  const enrollments = await Enrollment.find({ user: userId })
    .populate({
      path: 'course',
      select: 'title thumbnail category level sections statistics trainer'
    })
    .lean();

  const inProgressCourses = enrollments.filter(e => e.status === 'in-progress');
  const completedCourses  = enrollments.filter(e => e.status === 'completed');

  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / enrollments.length)
    : 0;

  // Recent courses (last accessed)
  const recentCourses = [...enrollments]
    .sort((a, b) => new Date(b.lastAccessAt) - new Date(a.lastAccessAt))
    .slice(0, 5)
    .map(e => {
      const course = e.course;
      const totalLessons = (course?.sections || []).reduce((s, sec) => s + (sec.lessons?.length || 0), 0);
      const completedLessons = (e.lessonProgress || []).filter(lp => lp.completed).length;
      return {
        courseId: course?._id,
        title: course?.title,
        thumbnail: course?.thumbnail,
        category: course?.category,
        progressPercent: e.progressPercent,
        status: e.status,
        lastAccessAt: e.lastAccessAt,
        totalLessons,
        completedLessons,
        currentLessonId: e.currentLessonId,
      };
    });

  // Certificates
  const user = await User.findById(userId).select('certificates firstName lastName email role profileImage').lean();

  const dashboard = {
    user: {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      email: user?.email,
      role: user?.role,
      profileImage: user?.profileImage,
    },
    statistics: {
      enrolledCourses: enrollments.length,
      inProgressCourses: inProgressCourses.length,
      completedCourses: completedCourses.length,
      certificatesEarned: user?.certificates?.length || 0,
      averageProgress: avgProgress,
    },
    recentCourses,
    certificates: user?.certificates?.slice(-3) || [],
  };

  res.status(200).json({ success: true, data: dashboard });
});

/**
 * @desc    Get admin dashboard with detailed analytics
 * @route   GET /api/v1/dashboard/admin
 * @access  Private/Admin
 */
export const getAdminDashboard = asyncHandler(async (req, res, next) => {
  // Get counts from all collections using unified User model
  const [
    adminCount,
    trainerCount,
    studentCount,
    pendingTrainers,
    pendingStudents,
    totalCourses,
    publishedCourses,
    totalQueries,
    openQueries,
    totalMedia,
    totalCertificates,
    totalPayments,
    totalRevenue,
    recentTrainers,
    recentStudents
  ] = await Promise.all([
    User.countDocuments({ role: 'administrator', isActive: true }),
    User.countDocuments({ role: 'trainer', isActive: true }),
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'trainer', isApproved: false }),
    User.countDocuments({ role: 'student', isApproved: false }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Query.countDocuments(),
    Query.countDocuments({ status: 'open' }),
    Media.countDocuments({ isActive: true, source: 'media_library' }),
    Certificate.countDocuments(),
    Payment.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    User.find({ role: 'trainer' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt role'),
    User.find({ role: 'student' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt role')
  ]);

  // Combine recent registrations
  const allRecentRegistrations = [...recentTrainers, ...recentStudents]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  // Get enrollment count from Enrollment model
  const enrollmentCount = await Enrollment.countDocuments();
  const completedCount  = await Enrollment.countDocuments({ status: 'completed' });

  // Get recent ratings/reviews
  const recentRatings = await CourseRating.find({
    isApproved: true,
    isVisible: true
  })
    .populate('student', 'firstName lastName profilePicture')
    .populate('course', 'title thumbnail')
    .sort('-createdAt')
    .limit(10)
    .lean();

  const dashboard = {
    users: {
      total: adminCount + trainerCount + studentCount,
      admins: adminCount,
      trainers: trainerCount,
      students: studentCount,
      pendingApprovals: pendingTrainers + pendingStudents
    },
    courses: {
      total: totalCourses,
      published: publishedCourses,
      draft: totalCourses - publishedCourses
    },
    enrollments: {
      total: enrollmentCount,
      completed: completedCount,
      inProgress: enrollmentCount - completedCount,
    },
    queries: {
      total: totalQueries,
      open: openQueries,
      resolved: totalQueries - openQueries
    },
    media: {
      total: totalMedia
    },
    certificates: {
      total: totalCertificates
    },
    payments: {
      total: totalPayments,
      revenue: totalRevenue[0]?.total || 0
    },
    recentRegistrations: allRecentRegistrations,
    recentRatings: recentRatings,
    lastUpdated: new Date()
  };

  res.status(200).json({
    success: true,
    data: dashboard
  });
});

/**
 * @desc    Get trainer dashboard
 * @route   GET /api/v1/dashboard/trainer
 * @access  Private/Trainer
 */
export const getTrainerDashboard = asyncHandler(async (req, res, next) => {
  const trainerId = req.user._id;

  const [myCourses, coursePerformance] = await Promise.all([
    Course.find({
      $or: [{ trainer: trainerId }, { createdBy: trainerId }]
    }).select('title currentEnrollments isPublished ratings statistics _id'),

    Course.aggregate([
      { $match: { $or: [{ trainer: trainerId }, { createdBy: trainerId }] } },
      {
        $project: {
          title: 1,
          enrollments: '$currentEnrollments',
          completions: '$statistics.totalCompletions',
          completionRate: {
            $cond: [
              { $eq: ['$currentEnrollments', 0] }, 0,
              { $multiply: [{ $divide: ['$statistics.totalCompletions', '$currentEnrollments'] }, 100] }
            ]
          },
          avgRating: '$ratings.average'
        }
      }
    ])
  ]);

  // Get real enrollment counts from Enrollment model
  const courseIds = myCourses.map(c => c._id);
  const enrollmentStats = await Enrollment.aggregate([
    { $match: { course: { $in: courseIds } } },
    { $group: { _id: '$course', total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
  ]);
  const enrollMap = new Map(enrollmentStats.map(e => [e._id.toString(), e]));

  const totalStudents = enrollmentStats.reduce((sum, e) => sum + e.total, 0);

  const dashboard = {
    summary: {
      totalCourses: myCourses.length,
      publishedCourses: myCourses.filter(c => c.isPublished).length,
      totalStudents,
    },
    courses: myCourses.map(c => ({
      ...c.toObject(),
      enrollmentCount: enrollMap.get(c._id.toString())?.total || 0,
      completedCount: enrollMap.get(c._id.toString())?.completed || 0,
    })),
    performance: coursePerformance,
  };

  res.status(200).json({ success: true, data: dashboard });
});

export default {
  getDashboardStats,
  getMyDashboard,
  getAdminDashboard,
  getTrainerDashboard
};
