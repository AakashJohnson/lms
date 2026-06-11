import Enrollment from '../models/Enrollment.model.js';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import UserLearningStats from '../models/UserLearningStats.model.js';
import { recordActivity } from '../services/streak.service.js';
import { logStudentActivity } from '../services/activityLogger.service.js';

// ─── Enroll in a course ───────────────────────────────────────────────────────
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const approved = course.isPublished && course.status === 'active' && (course.reviewStatus === 'published' || !course.reviewStatus);
    if (!approved) {
      return res.status(403).json({ success: false, message: 'Course is not available for enrollment' });
    }

    // Check max students
    if (course.maxStudents) {
      const count = await Enrollment.countDocuments({ course: courseId, status: { $ne: 'dropped' } });
      if (count >= course.maxStudents) {
        return res.status(400).json({ success: false, message: 'Course is full' });
      }
    }

    // Check if already enrolled
    const existing = await Enrollment.findOne({ user: userId, course: courseId });
    if (existing) {
      if (existing.status === 'dropped') {
        existing.status = 'enrolled';
        existing.enrolledAt = new Date();
        await existing.save();
        return res.status(200).json({ success: true, message: 'Re-enrolled successfully', data: existing });
      }
      return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
    }

    const enrollment = await Enrollment.create({ user: userId, course: courseId });

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, { $inc: { 'statistics.totalEnrollments': 1, currentEnrollments: 1 } });

    // Update user's enrolledCourses
    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        enrolledCourses: { course: courseId, enrolledAt: new Date(), progress: 0, status: 'enrolled' }
      }
    });

    res.status(201).json({ success: true, message: 'Enrolled successfully', data: enrollment });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get enrollment status ────────────────────────────────────────────────────
export const getEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (!enrollment) {
      return res.json({ success: true, data: { enrolled: false } });
    }

    res.json({ success: true, data: { enrolled: true, enrollment } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get my enrolled courses ──────────────────────────────────────────────────
export const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { user: userId };
    if (status) filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate({
        path: 'course',
        select: 'title subtitle thumbnail category level sections statistics trainer status reviewStatus isPublished',
      })
      .sort({ lastAccessAt: -1 })
      .lean();

    // Attach lesson counts
    const enriched = enrollments.map(e => {
      const course = e.course;
      if (!course) return e;
      const totalLessons = (course.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
      const completedLessons = (e.lessonProgress || []).filter(lp => lp.completed).length;
      return { ...e, totalLessons, completedLessons };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update lesson progress (video position + completion) ────────────────────
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;
    const { lessonId, sectionId, lastPosition, watchedSeconds, totalDuration, completed, timeSpent } = req.body;

    if (!lessonId || !sectionId) {
      return res.status(400).json({ success: false, message: 'lessonId and sectionId are required' });
    }

    let enrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    const courseAccess = await Course.findById(courseId).select('status title').lean();
    if (courseAccess?.status === 'archived') {
      return res.status(403).json({
        success: false,
        message: 'This course is archived. Your participation is saved, but content progress is locked until it is republished.',
      });
    }

    // Find or create lesson progress entry
    const lpIndex = enrollment.lessonProgress.findIndex(
      lp => lp.lessonId.toString() === lessonId
    );

    const now = new Date();
    let wasJustCompleted = false;

    if (lpIndex === -1) {
      enrollment.lessonProgress.push({
        lessonId,
        sectionId,
        completed: !!completed,
        completedAt: completed ? now : undefined,
        lastPosition: lastPosition ?? 0,
        watchedSeconds: watchedSeconds ?? 0,
        totalDuration: totalDuration ?? 0,
        timeSpent: timeSpent ?? 0,
      });
      if (completed) wasJustCompleted = true;
    } else {
      const lp = enrollment.lessonProgress[lpIndex];
      if (lastPosition !== undefined) lp.lastPosition = lastPosition;
      if (watchedSeconds !== undefined) lp.watchedSeconds = Math.max(lp.watchedSeconds, watchedSeconds);
      if (totalDuration !== undefined) lp.totalDuration = totalDuration;
      if (timeSpent !== undefined) lp.timeSpent = (lp.timeSpent || 0) + timeSpent;

      if (completed && !lp.completed) {
        lp.completed = true;
        lp.completedAt = now;
        wasJustCompleted = true;
      }
    }

    // Update total time spent
    if (timeSpent) {
      enrollment.totalTimeSpent = (enrollment.totalTimeSpent || 0) + timeSpent;
    }

    // Update current position
    enrollment.currentLessonId = lessonId;
    enrollment.currentSectionId = sectionId;
    enrollment.lastAccessAt = now;

    // Add learning activity if completed
    if (wasJustCompleted) {
      enrollment.learningHistory.push({
        date: now,
        lessonId,
        sectionId,
        activityType: 'lesson_completed',
        duration: timeSpent || 0,
      });

      // Update streak
      const lastDate = enrollment.lastLearningDate ? new Date(enrollment.lastLearningDate).toDateString() : null;
      const today = now.toDateString();

      if (lastDate !== today) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate === yesterday.toDateString()) {
          // Consecutive day - increase streak
          enrollment.currentStreak = (enrollment.currentStreak || 0) + 1;
          if (enrollment.currentStreak > (enrollment.longestStreak || 0)) {
            enrollment.longestStreak = enrollment.currentStreak;
          }
        } else if (lastDate !== today) {
          // Streak broken - reset
          enrollment.currentStreak = 1;
        }
        enrollment.lastLearningDate = now;

        // Record lesson completion activity for streak system
        try {
          await recordActivity(userId, 'lesson_complete');
        } catch (err) {
          console.error('Error recording lesson completion:', err);
        }
      }
    } else if (watchedSeconds && watchedSeconds > 0) {
      // Log video watch activity
      enrollment.learningHistory.push({
        date: now,
        lessonId,
        sectionId,
        activityType: 'video_watched',
        duration: watchedSeconds,
      });

      // Record video watch time for streak system (every 5 minutes)
      const minutesWatched = Math.floor(watchedSeconds / 60);
      if (minutesWatched > 0) {
        try {
          await recordActivity(userId, 'video_watch', { minutes: minutesWatched });
        } catch (err) {
          console.error('Error recording video watch:', err);
        }
      }
      // Log video watch activity
      enrollment.learningHistory.push({
        date: now,
        lessonId,
        sectionId,
        activityType: 'video_watched',
        duration: watchedSeconds,
      });
    }

    // Recalculate overall progress
    const course = await Course.findById(courseId).select('sections').lean();
    if (course) {
      const totalLessons = (course.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
      const completedCount = enrollment.lessonProgress.filter(lp => lp.completed).length;
      let computedProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      if (computedProgress > 100) {
        console.warn(`[ENROLLMENT] Computed progress >100 (${computedProgress}) for user ${userId} course ${courseId} — clamping to 100`);
        computedProgress = 100;
      }
      if (computedProgress < 0) {
        console.warn(`[ENROLLMENT] Computed progress <0 (${computedProgress}) for user ${userId} course ${courseId} — setting to 0`);
        computedProgress = 0;
      }
      enrollment.progressPercent = computedProgress;

      // Check if course just completed
      const wasCompleted = enrollment.status === 'completed';

      if (enrollment.progressPercent === 100 && enrollment.status !== 'completed') {
        enrollment.status = 'completed';
        enrollment.completedAt = now;
        await Course.findByIdAndUpdate(courseId, { $inc: { 'statistics.totalCompletions': 1 } });

        // Auto-generate certificate when course is completed
        console.log('🎓 Course completed! Auto-generating certificate...');
        console.log(`   User ID: ${userId}`);
        console.log(`   Course ID: ${courseId}`);

        // Import and call certificate generator (async, don't wait)
        import('../services/certificateGenerator.service.js')
          .then(({ autoGenerateCertificate }) => {
            console.log('📜 Calling autoGenerateCertificate...');
            return autoGenerateCertificate(userId, courseId);
          })
          .then(result => {
            if (result && result.success) {
              console.log(`✅ Certificate generated successfully: ${result.certificate.certificateId}`);
            } else {
              console.log(`⚠️ Certificate generation result: ${result?.message}`);
            }
          })
          .catch(err => {
            console.error('❌ Error auto-generating certificate:', err);
          });
      } else if (enrollment.progressPercent > 0 && enrollment.status === 'enrolled') {
        enrollment.status = 'in-progress';
      }
    }

    await enrollment.save();

    const activityType = wasJustCompleted ? 'video_completed' : 'video_progress';
    if (req.user?.role === 'student' && (wasJustCompleted || watchedSeconds || timeSpent)) {
      logStudentActivity({
        req,
        studentId: userId,
        courseId,
        lessonId,
        sectionId,
        activityType,
        title: wasJustCompleted ? 'Lesson completed' : 'Video progress updated',
        description: wasJustCompleted ? 'Completed a course lesson' : 'Watched course video content',
        durationSeconds: timeSpent || watchedSeconds || 0,
        completionPercent: totalDuration
          ? Math.min(100, Math.round(((watchedSeconds || lastPosition || 0) / totalDuration) * 100))
          : (wasJustCompleted ? 100 : null),
        status: wasJustCompleted ? 'completed' : 'progress',
      }).catch(() => {});
    }

    res.json({
      success: true,
      data: {
        progressPercent: enrollment.progressPercent,
        status: enrollment.status,
        lessonProgress: enrollment.lessonProgress,
        currentStreak: enrollment.currentStreak,
        longestStreak: enrollment.longestStreak,
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get full course progress ─────────────────────────────────────────────────
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId }).lean();
    if (!enrollment) {
      return res.json({ success: true, data: { enrolled: false, progressPercent: 0, lessonProgress: [] } });
    }

    res.json({
      success: true,
      data: {
        enrolled: true,
        progressPercent: enrollment.progressPercent,
        status: enrollment.status,
        lessonProgress: enrollment.lessonProgress,
        currentLessonId: enrollment.currentLessonId,
        currentSectionId: enrollment.currentSectionId,
        lastAccessAt: enrollment.lastAccessAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get all enrollments for a course (trainer/admin) ────────────────────────
export const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [enrollments, total] = await Promise.all([
      Enrollment.find({ course: courseId })
        .populate('user', 'firstName lastName email profileImage')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Enrollment.countDocuments({ course: courseId }),
    ]);

    // Fetch stats for all enrolled users
    const userIds = enrollments.map(e => e.user?._id).filter(Boolean);
    const statsList = await UserLearningStats.find({ user: { $in: userIds } }).lean();
    const statsMap = statsList.reduce((map, s) => {
      map[s.user.toString()] = s;
      return map;
    }, {});

    const enrichedEnrollments = enrollments.map(e => {
      const uId = e.user?._id?.toString();
      const uStats = uId ? statsMap[uId] : null;
      return {
        ...e,
        currentStreak: uStats?.currentStreak || 0,
        totalXP: uStats?.totalXP || 0,
        level: uStats?.level || 1
      };
    });

    res.json({
      success: true,
      data: enrichedEnrollments,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Student dashboard stats ──────────────────────────────────────────────────
export const getStudentDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ user: userId })
      .populate({ path: 'course', select: 'title thumbnail category sections statistics' })
      .lean();

    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in-progress').length;
    const notStarted = enrollments.filter(e => e.status === 'enrolled').length;

    const avgProgress = total > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / total)
      : 0;

    // Recent activity (last 5 accessed)
    const recent = [...enrollments]
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
          currentSectionId: e.currentSectionId,
        };
      });

    res.json({
      success: true,
      data: {
        stats: { total, completed, inProgress, notStarted, avgProgress },
        recentCourses: recent,
        enrollments: enrollments.map(e => ({
          courseId: e.course?._id,
          title: e.course?.title,
          thumbnail: e.course?.thumbnail,
          category: e.course?.category,
          progressPercent: e.progressPercent,
          status: e.status,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
          lastAccessAt: e.lastAccessAt,
        })),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reset course progress ────────────────────────────────────────────────────
export const resetCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    // Reset progress but keep enrollment
    enrollment.lessonProgress = [];
    enrollment.progressPercent = 0;
    enrollment.status = 'enrolled';
    enrollment.completedAt = null;
    enrollment.currentLessonId = null;
    enrollment.currentSectionId = null;
    enrollment.totalTimeSpent = 0;
    enrollment.learningHistory = [];
    enrollment.currentStreak = 0;
    enrollment.lastLearningDate = null;

    await enrollment.save();

    res.json({ success: true, message: 'Progress reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get learning history for a course ────────────────────────────────────────
export const getLearningHistory = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;
    const { days = 30 } = req.query;

    const enrollment = await Enrollment.findOne({ user: userId, course: courseId })
      .populate('course', 'title sections')
      .lean();

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Not enrolled in this course' });
    }

    // Get lessons
    const lessons = (enrollment.course?.sections || []).flatMap(s =>
      (s.lessons || []).map(l => ({ ...l, sectionTitle: s.title }))
    );

    // Get recent activities
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const recentActivities = (enrollment.learningHistory || [])
      .filter(a => new Date(a.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Group by date
    const activitiesByDate = {};
    recentActivities.forEach(activity => {
      const dateKey = new Date(activity.date).toISOString().split('T')[0];
      if (!activitiesByDate[dateKey]) {
        activitiesByDate[dateKey] = [];
      }
      activitiesByDate[dateKey].push(activity);
    });

    res.json({
      success: true,
      data: {
        totalTimeSpent: enrollment.totalTimeSpent,
        currentStreak: enrollment.currentStreak,
        longestStreak: enrollment.longestStreak,
        completedLessons: (enrollment.lessonProgress || []).filter(lp => lp.completed).length,
        totalLessons: lessons.length,
        activitiesByDate,
        recentActivities: recentActivities.slice(0, 20),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get overall learning stats ───────────────────────────────────────────────
export const getLearningStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ user: userId }).lean();

    // Calculate overall stats
    const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0);
    const completedCourses = enrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = enrollments.filter(e => e.status === 'in-progress').length;

    // Calculate streaks across all enrollments
    let maxStreak = 0;
    let currentStreak = 0;
    enrollments.forEach(e => {
      if (e.longestStreak > maxStreak) maxStreak = e.longestStreak;
      if (e.currentStreak > currentStreak) currentStreak = e.currentStreak;
    });

    // Calculate total learning days (unique days with activity)
    const allDates = new Set();
    enrollments.forEach(e => {
      (e.learningHistory || []).forEach(a => {
        allDates.add(new Date(a.date).toISOString().split('T')[0]);
      });
    });

    // Get certificates earned
    const certificatesEarned = enrollments.filter(e => e.certificateIssued).length;

    // Calculate hours of learning
    const learningHours = Math.round(totalTimeSpent / 3600 * 10) / 10;

    res.json({
      success: true,
      data: {
        totalCourses: enrollments.length,
        completedCourses,
        inProgressCourses,
        certificatesEarned,
        learningHours,
        totalTimeSpent,
        currentStreak,
        longestStreak: maxStreak,
        totalLearningDays: allDates.size,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
