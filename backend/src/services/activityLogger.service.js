import crypto from 'crypto';
import StudentActivityLog from '../models/StudentActivityLog.model.js';
import StudentDailyActivitySummary from '../models/StudentDailyActivitySummary.model.js';

const HASH_SALT = process.env.ACTIVITY_HASH_SALT || process.env.JWT_SECRET || 'ceas-lms-activity';

export const toDateKey = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString().slice(0, 10);
};

export const toTimeKey = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString().slice(11, 16);
};

const hashValue = (value) => {
  if (!value) return undefined;
  return crypto.createHash('sha256').update(`${HASH_SALT}:${value}`).digest('hex');
};

const getRequestIp = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '';
};

const durationForStudyTime = (activityType, durationSeconds = 0) => {
  const seconds = Math.max(0, Number(durationSeconds || 0));
  if (seconds > 0) return seconds;
  return ['video_completed', 'lesson_opened', 'assessment_completed', 'live_class_left'].includes(activityType) ? 0 : 0;
};

const summaryIncrementFor = (activityType, durationSeconds = 0) => {
  const inc = {
    totalActivities: 1,
    totalStudySeconds: durationForStudyTime(activityType, durationSeconds),
  };

  const counters = {
    course_viewed: 'coursesViewed',
    lesson_opened: 'lessonsOpened',
    video_completed: 'lessonsCompleted',
    assessment_completed: 'assessmentsCompleted',
    assignment_submitted: 'assignmentsSubmitted',
    resource_downloaded: 'resourcesDownloaded',
    live_class_joined: 'liveClassesJoined',
    ai_tutor_used: 'aiTutorUses',
  };

  if (counters[activityType]) {
    inc[counters[activityType]] = 1;
  }

  return inc;
};

export const logStudentActivity = async ({
  req,
  studentId,
  courseId = null,
  lessonId = null,
  sectionId = null,
  assessmentId = null,
  activityType,
  title = '',
  description = '',
  durationSeconds = 0,
  completionPercent = null,
  scorePercent = null,
  status = 'success',
  metadata = {},
  createdByRole,
} = {}) => {
  try {
    if (!studentId || !activityType) return null;

    const now = new Date();
    const dateKey = toDateKey(now);
    const timeKey = toTimeKey(now);
    const role = createdByRole || req?.user?.role || 'student';
    const safeDuration = Math.max(0, Number(durationSeconds || 0));

    const log = await StudentActivityLog.create({
      student: studentId,
      course: courseId || null,
      lessonId: lessonId || null,
      sectionId: sectionId || null,
      assessment: assessmentId || null,
      activityType,
      title,
      description,
      durationSeconds: safeDuration,
      completionPercent,
      scorePercent,
      status,
      metadata,
      dateKey,
      timeKey,
      ipHash: hashValue(getRequestIp(req)),
      userAgentHash: hashValue(req?.get?.('user-agent') || req?.headers?.['user-agent']),
      createdByRole: role,
    });

    await StudentDailyActivitySummary.findOneAndUpdate(
      { student: studentId, dateKey },
      {
        $setOnInsert: { student: studentId, dateKey },
        $inc: summaryIncrementFor(activityType, safeDuration),
        $addToSet: { activityTypes: activityType },
        $set: { lastActivityAt: now },
      },
      { upsert: true, new: true }
    );

    return log;
  } catch (error) {
    console.error('[ACTIVITY LOGGER] Failed to write activity:', error.message);
    return null;
  }
};
