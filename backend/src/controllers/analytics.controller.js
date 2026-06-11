import Enrollment from '../models/Enrollment.model.js';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import { logger } from '../config/logger.js';

/**
 * @desc    Get overview analytics (total watch hours, views, completion rate, etc.)
 * @route   GET /api/v1/analytics/overview
 * @access  Private (Admin/Trainer)
 */
export const getOverviewAnalytics = async (req, res) => {
  try {
    // Check if there are any enrollments
    const enrollmentCount = await Enrollment.countDocuments();
    
    if (enrollmentCount === 0) {
      // Return zero values if no enrollments exist
      return res.status(200).json({
        success: true,
        data: {
          totalWatchHours: 0,
          totalViews: 0,
          avgWatchTime: '0 min',
          completionRate: 0,
          uniqueViewers: 0
        }
      });
    }

    // 1. Total Watch Hours - sum of all watchedSeconds from lessonProgress
    const watchHoursData = await Enrollment.aggregate([
      { $unwind: { path: '$lessonProgress', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: { $ifNull: ['$lessonProgress.watchedSeconds', 0] } }
        }
      }
    ]);

    const totalWatchHours = watchHoursData.length > 0 
      ? Math.round(watchHoursData[0].totalSeconds / 3600) 
      : 0;

    // 2. Total Video Views - count of all lesson progress entries
    const viewsData = await Enrollment.aggregate([
      { $unwind: { path: '$lessonProgress', preserveNullAndEmptyArrays: true } },
      { $match: { 'lessonProgress.watchedSeconds': { $gt: 0 } } },
      { $count: 'total' }
    ]);

    const totalViews = viewsData.length > 0 ? viewsData[0].total : 0;

    // 3. Average Watch Time per lesson
    const avgWatchTimeMinutes = totalViews > 0 
      ? Math.round((watchHoursData[0]?.totalSeconds || 0) / totalViews / 60 * 10) / 10
      : 0;

    // 4. Video Completion Rate - percentage of completed lessons
    const completionData = await Enrollment.aggregate([
      { $unwind: { path: '$lessonProgress', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$lessonProgress.completed', true] }, 1, 0] }
          }
        }
      }
    ]);

    const completionRate = completionData.length > 0 && completionData[0].total > 0
      ? Math.round((completionData[0].completed / completionData[0].total) * 100)
      : 0;

    // 5. Unique Viewers - distinct users with enrollments
    const uniqueViewers = await Enrollment.distinct('user');

    res.status(200).json({
      success: true,
      data: {
        totalWatchHours,
        totalViews,
        avgWatchTime: `${avgWatchTimeMinutes} min`,
        completionRate,
        uniqueViewers: uniqueViewers.length
      }
    });
  } catch (error) {
    logger.error('Error fetching overview analytics:', error);
    console.error('Analytics error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get per-course analytics
 * @route   GET /api/v1/analytics/courses
 * @access  Private (Admin/Trainer)
 */
export const getCourseAnalytics = async (req, res) => {
  try {
    const { trainerId } = req.query;
    
    // Build match filter for trainer-specific courses
    const matchFilter = {};
    if (trainerId) {
      matchFilter.createdBy = trainerId;
    }

    // Check if there are any courses
    const courseCount = await Course.countDocuments(matchFilter);
    
    if (courseCount === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const courseAnalytics = await Course.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          enrollmentCount: { $size: '$enrollments' },
          completions: {
            $size: {
              $filter: {
                input: '$enrollments',
                as: 'e',
                cond: { $gte: ['$$e.progressPercent', 100] }
              }
            }
          },
          avgProgress: {
            $cond: {
              if: { $gt: [{ $size: '$enrollments' }, 0] },
              then: { $avg: '$enrollments.progressPercent' },
              else: 0
            }
          },
          // Calculate watch hours from lesson progress
          watchHours: {
            $divide: [
              {
                $sum: {
                  $map: {
                    input: '$enrollments',
                    as: 'enrollment',
                    in: {
                      $sum: {
                        $map: {
                          input: { $ifNull: ['$$enrollment.lessonProgress', []] },
                          as: 'lp',
                          in: { $ifNull: ['$$lp.watchedSeconds', 0] }
                        }
                      }
                    }
                  }
                }
              },
              3600
            ]
          },
          // Calculate retention (students active in last 30 days)
          retention: {
            $cond: {
              if: { $gt: [{ $size: '$enrollments' }, 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: '$enrollments',
                            as: 'e',
                            cond: {
                              $gte: [
                                '$$e.lastAccessAt',
                                { $subtract: [new Date(), 30 * 24 * 60 * 60 * 1000] }
                              ]
                            }
                          }
                        }
                      },
                      { $size: '$enrollments' }
                    ]
                  },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          enrollments: '$enrollmentCount',
          completions: 1,
          watchHours: { $round: ['$watchHours', 0] },
          avgProgress: { $round: ['$avgProgress', 0] },
          avgRating: { $ifNull: ['$ratings.average', 0] },
          retention: { $round: ['$retention', 0] },
          mostWatchedModule: { $literal: 'Module 1' },
          comments: { $literal: 0 },
          likes: { $literal: 0 },
          certificatesIssued: '$completions'
        }
      },
      { $sort: { enrollments: -1 } },
      { $limit: 50 }
    ]);

    res.status(200).json({
      success: true,
      count: courseAnalytics.length,
      data: courseAnalytics
    });
  } catch (error) {
    logger.error('Error fetching course analytics:', error);
    console.error('Course analytics error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get detailed analytics for a specific course
 * @route   GET /api/v1/analytics/course/:courseId
 * @access  Private (Admin/Trainer)
 */
export const getCourseDetailedAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Get enrollments for this course
    const enrollments = await Enrollment.find({ course: courseId })
      .populate('user', 'firstName lastName email')
      .lean();

    // Calculate metrics
    const totalEnrollments = enrollments.length;
    const completions = enrollments.filter(e => e.progressPercent >= 100).length;
    const avgProgress = totalEnrollments > 0
      ? enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / totalEnrollments
      : 0;

    // Calculate watch hours
    let totalWatchSeconds = 0;
    enrollments.forEach(enrollment => {
      if (enrollment.lessonProgress) {
        enrollment.lessonProgress.forEach(lp => {
          totalWatchSeconds += lp.watchedSeconds || 0;
        });
      }
    });
    const watchHours = Math.round(totalWatchSeconds / 3600);

    // Calculate retention (active in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeStudents = enrollments.filter(e => 
      e.lastAccessAt && new Date(e.lastAccessAt) >= thirtyDaysAgo
    ).length;
    const retention = totalEnrollments > 0
      ? Math.round((activeStudents / totalEnrollments) * 100)
      : 0;

    // Get student progress details
    const studentProgress = enrollments.map(e => ({
      studentId: e.user?._id,
      studentName: e.user ? `${e.user.firstName} ${e.user.lastName}` : 'Unknown',
      email: e.user?.email,
      progress: Math.round(e.progressPercent),
      status: e.status,
      enrolledAt: e.enrolledAt,
      lastAccessAt: e.lastAccessAt,
      completedAt: e.completedAt
    }));

    res.status(200).json({
      success: true,
      data: {
        courseId: course._id,
        courseTitle: course.title,
        metrics: {
          totalEnrollments,
          completions,
          completionRate: totalEnrollments > 0 
            ? Math.round((completions / totalEnrollments) * 100) 
            : 0,
          avgProgress: Math.round(avgProgress),
          watchHours,
          avgRating: course.ratings?.average || 0,
          retention,
          certificatesIssued: completions
        },
        studentProgress
      }
    });
  } catch (error) {
    logger.error('Error fetching detailed course analytics:', error);
    console.error('Detailed analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed course analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get peak usage hours analytics
 * @route   GET /api/v1/analytics/peak-hours
 * @access  Private (Admin)
 */
export const getPeakHoursAnalytics = async (req, res) => {
  try {
    // Get enrollments with lastAccessAt in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const hourlyActivity = await Enrollment.aggregate([
      {
        $match: {
          lastAccessAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $project: {
          hour: { $hour: '$lastAccessAt' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Find max count for percentage calculation
    const maxCount = Math.max(...hourlyActivity.map(h => h.count), 1);

    // Format peak hours data
    const peakHours = hourlyActivity.map(h => ({
      hour: `${h._id}:00 - ${h._id + 1}:00`,
      users: h.count,
      percentage: Math.round((h.count / maxCount) * 100)
    }));

    res.status(200).json({
      success: true,
      data: peakHours
    });
  } catch (error) {
    logger.error('Error fetching peak hours analytics:', error);
    console.error('Peak hours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch peak hours analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get recent activity timeline
 * @route   GET /api/v1/analytics/recent-activity
 * @access  Private (Admin/Trainer)
 */
export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get recent enrollments
    const recentEnrollments = await Enrollment.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    // Manually fetch user details from all three collections
    const activities = [];
    
    for (const enrollment of recentEnrollments) {
      let userName = 'Unknown User';
      
      // Try to find user in all three collections
      if (enrollment.user) {
        // Get user from unified User model
        const user = await User.findById(enrollment.user).select('firstName lastName').lean();
        
        if (user) {
          userName = `${user.firstName} ${user.lastName}`;
        }
      }

      // Get course details
      const course = await Course.findById(enrollment.course).select('title').lean();
      const courseTitle = course?.title || 'Unknown Course';

      // Determine action and item
      let action = 'Started';
      let item = 'Course';
      
      if (enrollment.status === 'completed') {
        action = 'Completed';
      } else if (enrollment.progressPercent > 0 && enrollment.progressPercent < 100) {
        action = 'Watching';
        item = `Progress: ${Math.round(enrollment.progressPercent)}%`;
      }

      activities.push({
        time: new Date(enrollment.updatedAt).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        user: userName,
        action,
        item,
        course: courseTitle
      });
    }

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Error fetching recent activity:', error);
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activity',
      error: error.message
    });
  }
};
