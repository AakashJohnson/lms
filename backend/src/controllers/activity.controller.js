import mongoose from 'mongoose';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import StudentActivityLog from '../models/StudentActivityLog.model.js';
import StudentDailyActivitySummary from '../models/StudentDailyActivitySummary.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

const ACTIVE_ENROLLMENT_STATUSES = ['enrolled', 'in-progress', 'completed', 'active'];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const toStartOfDay = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

const toEndOfDay = (dateKey) => new Date(`${dateKey}T23:59:59.999Z`);

const getMonthRange = (month) => {
  const normalized = /^\d{4}-\d{2}$/.test(month || '') ? month : new Date().toISOString().slice(0, 7);
  const start = new Date(`${normalized}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return {
    month: normalized,
    startDateKey: start.toISOString().slice(0, 10),
    endDateKey: end.toISOString().slice(0, 10),
  };
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const teacherCourseFilter = (teacherId) => ({
  $or: [
    { trainer: teacherId },
    { createdBy: teacherId },
  ],
});

const getTeacherCourseIds = async (teacherId) => {
  const courses = await Course.find(teacherCourseFilter(teacherId)).select('_id').lean();
  return courses.map((course) => course._id);
};

const assertTeacherCanViewStudent = async ({ teacherId, studentId, courseId }) => {
  const teacherCourseIds = await getTeacherCourseIds(teacherId);
  if (!teacherCourseIds.length) return false;

  const courseFilter = courseId
    ? { course: courseId }
    : { course: { $in: teacherCourseIds } };

  if (courseId && !teacherCourseIds.some((id) => String(id) === String(courseId))) {
    return false;
  }

  return !!(await Enrollment.exists({
    user: studentId,
    ...courseFilter,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
  }));
};

const buildLogQuery = ({ studentId, courseId, dateKey, startDate, endDate, activityType }) => {
  const query = { student: studentId };

  if (courseId && isObjectId(courseId)) query.course = courseId;
  if (activityType && activityType !== 'all') query.activityType = activityType;
  if (dateKey) query.dateKey = dateKey;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = toStartOfDay(startDate);
    if (endDate) query.createdAt.$lte = toEndOfDay(endDate);
  }

  return query;
};

const mapLogForClient = (log) => ({
  id: log._id,
  student: log.student,
  course: log.course,
  lessonId: log.lessonId,
  sectionId: log.sectionId,
  assessment: log.assessment,
  activityType: log.activityType,
  title: log.title,
  description: log.description,
  durationSeconds: log.durationSeconds,
  completionPercent: log.completionPercent,
  scorePercent: log.scorePercent,
  status: log.status,
  dateKey: log.dateKey,
  timeKey: log.timeKey,
  createdAt: log.createdAt,
});

const getSummaryForStudent = async (studentId, courseId) => {
  const totals = courseId
    ? await StudentActivityLog.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId), course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          totalStudySeconds: { $sum: '$durationSeconds' },
          activeDays: { $addToSet: '$dateKey' },
          lastActivityAt: { $max: '$createdAt' },
        },
      },
    ])
    : await StudentDailyActivitySummary.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: '$totalActivities' },
          totalStudySeconds: { $sum: '$totalStudySeconds' },
          activeDays: { $sum: { $cond: [{ $gt: ['$totalActivities', 0] }, 1, 0] } },
          coursesViewed: { $sum: '$coursesViewed' },
          lessonsOpened: { $sum: '$lessonsOpened' },
          lessonsCompleted: { $sum: '$lessonsCompleted' },
          assessmentsCompleted: { $sum: '$assessmentsCompleted' },
          assignmentsSubmitted: { $sum: '$assignmentsSubmitted' },
          resourcesDownloaded: { $sum: '$resourcesDownloaded' },
          liveClassesJoined: { $sum: '$liveClassesJoined' },
          aiTutorUses: { $sum: '$aiTutorUses' },
          lastActivityAt: { $max: '$lastActivityAt' },
        },
      },
    ]);

  const base = totals[0] || {};
  const activityTypes = await StudentActivityLog.aggregate([
    { $match: { student: new mongoose.Types.ObjectId(studentId), ...(courseId ? { course: new mongoose.Types.ObjectId(courseId) } : {}) } },
    { $group: { _id: '$activityType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    totalActivities: base.totalActivities || 0,
    totalStudySeconds: base.totalStudySeconds || 0,
    activeDays: Array.isArray(base.activeDays) ? base.activeDays.length : base.activeDays || 0,
    coursesViewed: base.coursesViewed || 0,
    lessonsOpened: base.lessonsOpened || 0,
    lessonsCompleted: base.lessonsCompleted || 0,
    assessmentsCompleted: base.assessmentsCompleted || 0,
    assignmentsSubmitted: base.assignmentsSubmitted || 0,
    resourcesDownloaded: base.resourcesDownloaded || 0,
    liveClassesJoined: base.liveClassesJoined || 0,
    aiTutorUses: base.aiTutorUses || 0,
    lastActivityAt: base.lastActivityAt || null,
    activityTypes,
  };
};

const getCalendarForStudent = async ({ studentId, month, courseId, activityType }) => {
  const { month: normalizedMonth, startDateKey, endDateKey } = getMonthRange(month);

  if (!courseId && (!activityType || activityType === 'all')) {
    const days = await StudentDailyActivitySummary.find({
      student: studentId,
      dateKey: { $gte: startDateKey, $lte: endDateKey },
    }).lean();

    return {
      month: normalizedMonth,
      days: days.map((day) => ({
        dateKey: day.dateKey,
        totalActivities: day.totalActivities,
        totalStudySeconds: day.totalStudySeconds,
        activityTypes: day.activityTypes,
        lastActivityAt: day.lastActivityAt,
      })),
    };
  }

  const match = {
    student: new mongoose.Types.ObjectId(studentId),
    dateKey: { $gte: startDateKey, $lte: endDateKey },
  };
  if (courseId && isObjectId(courseId)) match.course = new mongoose.Types.ObjectId(courseId);
  if (activityType && activityType !== 'all') match.activityType = activityType;

  const days = await StudentActivityLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$dateKey',
        totalActivities: { $sum: 1 },
        totalStudySeconds: { $sum: '$durationSeconds' },
        activityTypes: { $addToSet: '$activityType' },
        lastActivityAt: { $max: '$createdAt' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    month: normalizedMonth,
    days: days.map((day) => ({
      dateKey: day._id,
      totalActivities: day.totalActivities,
      totalStudySeconds: day.totalStudySeconds,
      activityTypes: day.activityTypes,
      lastActivityAt: day.lastActivityAt,
    })),
  };
};

const getDayForStudent = async ({ studentId, dateKey, courseId, activityType }) => {
  const query = buildLogQuery({ studentId, courseId, dateKey, activityType });
  const logs = await StudentActivityLog.find(query)
    .populate('course', 'title thumbnail')
    .populate('assessment', 'title')
    .sort({ createdAt: -1 })
    .lean();

  return {
    dateKey,
    logs: logs.map(mapLogForClient),
  };
};

export const getMyActivitySummary = asyncHandler(async (req, res) => {
  const summary = await getSummaryForStudent(req.user._id, req.query.courseId);
  res.json({ success: true, data: summary });
});

export const getMyActivityCalendar = asyncHandler(async (req, res) => {
  const data = await getCalendarForStudent({
    studentId: req.user._id,
    month: req.query.month,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

export const getMyActivityDay = asyncHandler(async (req, res) => {
  const dateKey = req.query.date || new Date().toISOString().slice(0, 10);
  const data = await getDayForStudent({
    studentId: req.user._id,
    dateKey,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

export const getMyActivityRange = asyncHandler(async (req, res) => {
  const query = buildLogQuery({
    studentId: req.user._id,
    courseId: req.query.courseId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    activityType: req.query.activityType,
  });
  const logs = await StudentActivityLog.find(query).populate('course', 'title').sort({ createdAt: -1 }).limit(500).lean();
  res.json({ success: true, data: logs.map(mapLogForClient) });
});

export const getTeacherCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find(teacherCourseFilter(req.user._id)).select('_id title thumbnail').sort({ title: 1 }).lean();
  res.json({ success: true, data: courses });
});

export const getTeacherCourseStudents = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  if (!isObjectId(courseId)) return next(new ErrorResponse('Invalid course id', 400));

  const ownsCourse = await Course.exists({ _id: courseId, ...teacherCourseFilter(req.user._id) });
  if (!ownsCourse) return next(new ErrorResponse('You can only view students from your own courses', 403));

  const enrollments = await Enrollment.find({
    course: courseId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
  }).populate('user', 'name email firstName lastName avatar role').sort({ updatedAt: -1 }).lean();

  res.json({
    success: true,
    data: enrollments
      .filter((item) => item.user)
      .map((item) => ({
        enrollmentId: item._id,
        progressPercent: item.progressPercent,
        status: item.status,
        student: item.user,
      })),
  });
});

const assertTeacherAccessOrThrow = async (req, next) => {
  const { studentId } = req.params;
  const { courseId } = req.query;
  if (!isObjectId(studentId)) return next(new ErrorResponse('Invalid student id', 400));

  const canView = await assertTeacherCanViewStudent({ teacherId: req.user._id, studentId, courseId });
  if (!canView) return next(new ErrorResponse('You can only view enrolled students in courses you teach', 403));

  return true;
};

export const getTeacherStudentSummary = asyncHandler(async (req, res, next) => {
  const ok = await assertTeacherAccessOrThrow(req, next);
  if (!ok) return;
  const summary = await getSummaryForStudent(req.params.studentId, req.query.courseId);
  res.json({ success: true, data: summary });
});

export const getTeacherStudentCalendar = asyncHandler(async (req, res, next) => {
  const ok = await assertTeacherAccessOrThrow(req, next);
  if (!ok) return;
  const data = await getCalendarForStudent({
    studentId: req.params.studentId,
    month: req.query.month,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

export const getTeacherStudentDay = asyncHandler(async (req, res, next) => {
  const ok = await assertTeacherAccessOrThrow(req, next);
  if (!ok) return;
  const dateKey = req.query.date || new Date().toISOString().slice(0, 10);
  const data = await getDayForStudent({
    studentId: req.params.studentId,
    dateKey,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

export const searchAdminStudents = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = { role: 'student' };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { firstName: pattern }, { lastName: pattern }, { email: pattern }];
  }
  const students = await User.find(filter).select('name firstName lastName email avatar department batch').limit(20).sort({ name: 1 }).lean();
  res.json({ success: true, data: students });
});

export const getAdminStudentSummary = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.studentId)) return next(new ErrorResponse('Invalid student id', 400));
  const summary = await getSummaryForStudent(req.params.studentId, req.query.courseId);
  res.json({ success: true, data: summary });
});

export const getAdminStudentCalendar = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.studentId)) return next(new ErrorResponse('Invalid student id', 400));
  const data = await getCalendarForStudent({
    studentId: req.params.studentId,
    month: req.query.month,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

export const getAdminStudentDay = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.studentId)) return next(new ErrorResponse('Invalid student id', 400));
  const dateKey = req.query.date || new Date().toISOString().slice(0, 10);
  const data = await getDayForStudent({
    studentId: req.params.studentId,
    dateKey,
    courseId: req.query.courseId,
    activityType: req.query.activityType,
  });
  res.json({ success: true, data });
});

const csvEscape = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

export const exportAdminStudentActivity = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.studentId)) return next(new ErrorResponse('Invalid student id', 400));

  const query = buildLogQuery({
    studentId: req.params.studentId,
    courseId: req.query.courseId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    activityType: req.query.activityType,
  });

  const logs = await StudentActivityLog.find(query)
    .populate('student', 'name email firstName lastName')
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const header = [
    'Date',
    'Time',
    'Student',
    'Email',
    'Course',
    'Activity Type',
    'Title',
    'Duration Seconds',
    'Completion Percent',
    'Score Percent',
    'Status',
  ];
  const rows = logs.map((log) => [
    log.dateKey,
    log.timeKey,
    log.student?.name || [log.student?.firstName, log.student?.lastName].filter(Boolean).join(' '),
    log.student?.email,
    log.course?.title,
    log.activityType,
    log.title,
    log.durationSeconds,
    log.completionPercent,
    log.scorePercent,
    log.status,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="student-activity-${req.params.studentId}.csv"`);
  res.send(csv);
});
