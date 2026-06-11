import mongoose from 'mongoose';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import AssignmentSubmission from '../models/AssignmentSubmission.model.js';
import ErrorResponse from '../utils/errorResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createFileAssetFromUploadedFile, serializeAsset, uploadBufferToGridFs } from './file.controller.js';

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const normalizeAssignment = (assignment = {}) => {
  if (!assignment || assignment.enabled === false) return null;
  const raw = assignment.toObject ? assignment.toObject() : assignment;
  const asset = raw.attachmentAsset || raw.attachment || {};
  const fileId = asset.fileAssetId || asset.fileId || null;
  return {
    enabled: raw.enabled !== false,
    title: raw.title || '',
    description: raw.description || raw.instructions || '',
    instructions: raw.instructions || raw.description || '',
    dueDate: raw.dueDate || '',
    maxScore: Number(raw.maxScore || 100),
    attachment: {
      fileId,
      url: asset.downloadUrl || raw.attachmentUrl || asset.url || '',
      filename: asset.fileName || asset.filename || '',
      originalName: asset.originalName || raw.attachmentUrl?.split('/').pop() || '',
      mimetype: asset.mimeType || asset.mimetype || '',
      size: Number(asset.fileSize || asset.size || 0),
    },
  };
};

const sanitizeText = (value = '') => String(value || '').replace(/[<>]/g, '').trim();

const statusCounts = (submissions = [], dueDate) => {
  const due = dueDate ? new Date(dueDate) : null;
  const isPastDue = due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  return submissions.reduce((acc, submission) => {
    const status = submission.status || 'submitted';
    acc.totalSubmissions += 1;
    if (status === 'graded') acc.graded += 1;
    if (['submitted', 'resubmitted', 'pending_review', 'needs_resubmission'].includes(status)) acc.pendingReview += 1;
    if (submission.isLate || (isPastDue && status !== 'graded')) acc.overdue += 1;
    return acc;
  }, { totalSubmissions: 0, pendingReview: 0, graded: 0, overdue: 0 });
};

const findCourseAssignmentByLessonId = async (assignmentId) => {
  if (!isObjectId(assignmentId)) throw new ErrorResponse('Invalid assignment id', 400);
  const course = await Course.findOne({ 'sections.lessons._id': assignmentId });
  if (!course) throw new ErrorResponse('Assignment not found', 404);

  for (const section of course.sections || []) {
    const lesson = (section.lessons || []).id(assignmentId);
    if (lesson) {
      const assignment = normalizeAssignment(lesson.assignment);
      if (!assignment) throw new ErrorResponse('Assignment not found for this lesson', 404);
      return { course, section, lesson, assignment };
    }
  }
  throw new ErrorResponse('Assignment not found', 404);
};

const serializeAssignmentOverview = ({ course, section, lesson, assignment, submissions }) => {
  const counts = statusCounts(submissions, assignment.dueDate);
  return {
    assignmentId: String(lesson._id),
    courseId: String(course._id),
    lessonId: String(lesson._id),
    sectionId: String(section._id),
    title: assignment.title || 'Lesson Assignment',
    courseName: course.title || '',
    lessonTitle: lesson.title || '',
    sectionTitle: section.title || '',
    dueDate: assignment.dueDate || '',
    maxScore: assignment.maxScore || 100,
    instructions: assignment.instructions || assignment.description || '',
    attachment: assignment.attachment || {},
    ...counts,
  };
};

const findLessonWithAssignment = async (courseId, lessonId) => {
  if (!isObjectId(courseId) || !isObjectId(lessonId)) {
    throw new ErrorResponse('Invalid course or lesson id', 400);
  }
  const course = await Course.findById(courseId);
  if (!course) throw new ErrorResponse('Course not found', 404);

  let selectedLesson = null;
  for (const section of course.sections || []) {
    const lesson = (section.lessons || []).id(lessonId);
    if (lesson) {
      selectedLesson = lesson;
      break;
    }
  }
  if (!selectedLesson) throw new ErrorResponse('Lesson not found', 404);

  return { course, lesson: selectedLesson, assignment: normalizeAssignment(selectedLesson.assignment) };
};

const ensureEnrollment = async (courseId, userId) => {
  const enrollment = await Enrollment.findOne({
    course: courseId,
    user: userId,
    status: { $in: ['enrolled', 'in-progress', 'completed'] },
  });
  if (!enrollment) throw new ErrorResponse('You must be enrolled to access this assignment', 403);
  return enrollment;
};

const ensureTeacherAccess = (course, user) => {
  const role = user?.role;
  const userId = String(user?._id || '');
  const ownerIds = [course.createdBy, course.trainer].filter(Boolean).map((id) => String(id));
  if (role === 'administrator' || role === 'admin' || ownerIds.includes(userId)) return;
  throw new ErrorResponse('Not authorized to manage this assignment', 403);
};

const serializeSubmission = (submission, detail = {}) => {
  if (!submission) return null;
  const raw = submission.toObject ? submission.toObject() : submission;
  const legacyAttachment = raw.submissionFile?.fileId || raw.submissionFile?.url ? raw.submissionFile : raw.attachment;
  const maxScore = Number(raw.grade?.maxScore || detail.assignment?.maxScore || 100);
  const gradeScore = raw.grade?.score ?? raw.score ?? null;
  const teacherFeedback = {
    ...(raw.teacherFeedback || {}),
    text: raw.teacherFeedback?.text || raw.feedback || '',
    attachment: raw.teacherFeedback?.attachment || {},
  };
  return {
    ...raw,
    _id: String(raw._id),
    assignmentId: String(raw.assignmentId || raw.lessonId || ''),
    courseId: String(raw.courseId),
    lessonId: String(raw.lessonId),
    teacherId: raw.teacherId ? String(raw.teacherId) : '',
    attachment: legacyAttachment || {},
    submissionFile: legacyAttachment || {},
    score: gradeScore,
    feedback: teacherFeedback.text || '',
    grade: {
      score: gradeScore,
      maxScore,
      percentage: raw.grade?.percentage ?? (gradeScore !== null ? Math.round((Number(gradeScore) / maxScore) * 10000) / 100 : null),
    },
    teacherFeedback,
    studentId: raw.studentId?._id ? {
      _id: String(raw.studentId._id),
      name: raw.studentId.name || raw.studentId.fullName || `${raw.studentId.firstName || ''} ${raw.studentId.lastName || ''}`.trim(),
      email: raw.studentId.email || '',
      rollNumber: raw.studentId.rollNumber || raw.studentId.studentId || '',
    } : String(raw.studentId),
    assignment: detail.assignment || undefined,
    course: detail.course || undefined,
    lesson: detail.lesson || undefined,
  };
};

const uploadSubmissionAttachment = async (req, courseId) => {
  if (!req.file) return {};
  const uploaded = await uploadBufferToGridFs({ file: req.file, req });
  const asset = await createFileAssetFromUploadedFile({
    file: {
      ...req.file,
      buffer: undefined,
      gridfsFileId: uploaded.gridfsFileId,
      bucketName: uploaded.bucketName,
      filename: uploaded.filename,
      size: uploaded.size,
      mediaType: uploaded.mediaType,
    },
    body: {
      title: req.file.originalname,
      category: 'assignment-submission',
      usageType: 'assignment_submission',
      source: 'assignment',
      module: 'course_assignment',
      accessLevel: 'enrolled',
      relatedCourse: courseId,
    },
    user: req.user,
  });
  const data = serializeAsset(asset);
  return {
    fileId: asset._id,
    url: data.downloadUrl || data.fileUrl || '',
    filename: data.fileName || '',
    originalName: data.originalName || req.file.originalname,
    mimetype: data.mimeType || req.file.mimetype,
    size: data.fileSize || req.file.size,
  };
};

export const getLessonAssignment = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId } = req.params;
  const { course, assignment } = await findLessonWithAssignment(courseId, lessonId);
  if (!assignment) {
    return res.json({ success: true, data: { assignment: null, submission: null } });
  }

  await ensureEnrollment(courseId, req.user._id);
  const submission = await AssignmentSubmission.findOne({
    courseId,
    lessonId,
    studentId: req.user._id,
  }).lean();

  res.json({
    success: true,
    data: {
      assignment,
      submission: serializeSubmission(submission),
    },
  });
});

export const submitLessonAssignment = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId } = req.params;
  const { course, assignment } = await findLessonWithAssignment(courseId, lessonId);
  if (!assignment) return next(new ErrorResponse('Assignment not found for this lesson', 404));

  await ensureEnrollment(courseId, req.user._id);
  const answerText = String(req.body.answerText || '').trim();
  if (!answerText && !req.file) {
    return next(new ErrorResponse('Write an answer or upload a file before submitting', 400));
  }

  const attachment = await uploadSubmissionAttachment(req, courseId);
  const existing = await AssignmentSubmission.findOne({ courseId, lessonId, studentId: req.user._id });
  const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isLate = due && !Number.isNaN(due.getTime()) ? due.getTime() < Date.now() : false;
  const update = {
    assignmentId: lessonId,
    courseId,
    lessonId,
    studentId: req.user._id,
    teacherId: course.trainer || course.createdBy || null,
    assignmentTitle: assignment.title,
    answerText,
    status: existing ? 'resubmitted' : 'submitted',
    score: null,
    feedback: '',
    grade: { score: null, maxScore: assignment.maxScore, percentage: null },
    'teacherFeedback.text': '',
    'teacherFeedback.attachment': {},
    'teacherFeedback.reviewedBy': null,
    'teacherFeedback.reviewedAt': null,
    submittedAt: new Date(),
    resubmittedAt: existing ? new Date() : null,
    isLate,
    attemptNumber: Number(existing?.attemptNumber || 0) + 1,
  };
  if (attachment.fileId || attachment.url) {
    update.attachment = attachment;
    update.submissionFile = attachment;
  }

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { courseId, lessonId, studentId: req.user._id },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ success: true, data: serializeSubmission(submission) });
});

export const getLessonAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const { course, assignment } = await findLessonWithAssignment(courseId, lessonId);
  ensureTeacherAccess(course, req.user);
  if (!assignment) return res.json({ success: true, data: [] });

  const submissions = await AssignmentSubmission.find({ courseId, lessonId })
    .populate('studentId', 'name firstName lastName email rollNumber studentId')
    .sort({ submittedAt: -1 });

  res.json({ success: true, data: submissions.map(serializeSubmission) });
});

export const getTeacherAssignmentOverview = asyncHandler(async (req, res) => {
  const filter = req.query || {};
  const courseQuery = req.user.role === 'administrator' || req.user.role === 'admin'
    ? {}
    : { $or: [{ trainer: req.user._id }, { createdBy: req.user._id }] };

  const courses = await Course.find(courseQuery).select('title createdBy trainer sections').lean(false);
  const lessonIds = [];
  const overviewItems = [];

  for (const course of courses) {
    for (const section of course.sections || []) {
      for (const lesson of section.lessons || []) {
        const assignment = normalizeAssignment(lesson.assignment);
        if (!assignment) continue;
        if (filter.courseId && String(course._id) !== String(filter.courseId)) continue;
        if (filter.lessonId && String(lesson._id) !== String(filter.lessonId)) continue;
        lessonIds.push(lesson._id);
        overviewItems.push({ course, section, lesson, assignment });
      }
    }
  }

  const submissions = lessonIds.length
    ? await AssignmentSubmission.find({ lessonId: { $in: lessonIds } }).lean()
    : [];
  const submissionsByLesson = submissions.reduce((map, submission) => {
    const key = String(submission.lessonId);
    if (!map[key]) map[key] = [];
    map[key].push(submission);
    return map;
  }, {});

  let data = overviewItems.map((item) => serializeAssignmentOverview({
    ...item,
    submissions: submissionsByLesson[String(item.lesson._id)] || [],
  }));

  if (filter.status && filter.status !== 'all') {
    const status = String(filter.status);
    data = data.filter((item) => {
      if (status === 'pending_review') return item.pendingReview > 0;
      if (status === 'graded') return item.graded > 0;
      if (status === 'overdue') return item.overdue > 0;
      return (submissionsByLesson[item.lessonId] || []).some((submission) => submission.status === status);
    });
  }

  if (filter.date && filter.date !== 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000;
    data = data.filter((item) => {
      const due = item.dueDate ? new Date(item.dueDate).getTime() : 0;
      if (!due) return false;
      if (filter.date === 'due_today') return due >= todayStart && due < todayEnd;
      if (filter.date === 'overdue') return due < Date.now();
      if (filter.date === 'this_week') return due >= todayStart && due < weekEnd;
      return true;
    });
  }

  const summary = data.reduce((acc, item) => {
    acc.totalAssignments += 1;
    acc.totalSubmissions += item.totalSubmissions;
    acc.pendingReview += item.pendingReview;
    acc.graded += item.graded;
    acc.overdue += item.overdue;
    return acc;
  }, { totalAssignments: 0, totalSubmissions: 0, pendingReview: 0, graded: 0, overdue: 0 });

  res.json({ success: true, data, summary });
});

export const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { course, lesson, assignment } = await findCourseAssignmentByLessonId(req.params.assignmentId);
  ensureTeacherAccess(course, req.user);

  const submissions = await AssignmentSubmission.find({
    $or: [{ assignmentId: req.params.assignmentId }, { lessonId: req.params.assignmentId }],
  })
    .populate('studentId', 'name firstName lastName email rollNumber studentId')
    .sort({ submittedAt: -1 });

  res.json({
    success: true,
    data: submissions.map((submission) => serializeSubmission(submission, {
      assignment,
      course: { _id: String(course._id), title: course.title },
      lesson: { _id: String(lesson._id), title: lesson.title },
    })),
  });
});

export const getSubmissionDetail = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.submissionId)) return next(new ErrorResponse('Invalid submission id', 400));
  const submission = await AssignmentSubmission.findById(req.params.submissionId)
    .populate('studentId', 'name firstName lastName email rollNumber studentId')
    .populate('teacherFeedback.reviewedBy', 'name firstName lastName email');
  if (!submission) return next(new ErrorResponse('Submission not found', 404));

  const { course, lesson, assignment } = await findLessonWithAssignment(submission.courseId, submission.lessonId);
  ensureTeacherAccess(course, req.user);

  res.json({
    success: true,
    data: serializeSubmission(submission, {
      assignment,
      course: { _id: String(course._id), title: course.title },
      lesson: { _id: String(lesson._id), title: lesson.title },
    }),
  });
});

export const reviewSubmission = asyncHandler(async (req, res, next) => {
  if (!isObjectId(req.params.submissionId)) return next(new ErrorResponse('Invalid submission id', 400));
  const submission = await AssignmentSubmission.findById(req.params.submissionId);
  if (!submission) return next(new ErrorResponse('Submission not found', 404));

  const { course, assignment } = await findLessonWithAssignment(submission.courseId, submission.lessonId);
  ensureTeacherAccess(course, req.user);

  const status = String(req.body.status || 'graded');
  const allowedStatuses = ['graded', 'needs_resubmission', 'rejected'];
  if (!allowedStatuses.includes(status)) return next(new ErrorResponse('Invalid review status', 400));

  const feedback = sanitizeText(req.body.feedback);
  const maxScore = Number(assignment?.maxScore || 100);
  const score = req.body.score === '' || req.body.score === null || req.body.score === undefined ? null : Number(req.body.score);

  if (status === 'graded' && !Number.isFinite(score)) return next(new ErrorResponse('Score is required when grading', 400));
  if (Number.isFinite(score) && score < 0) return next(new ErrorResponse('Score cannot be less than 0', 400));
  if (Number.isFinite(score) && score > maxScore) return next(new ErrorResponse(`Score cannot exceed ${maxScore}`, 400));
  if (status === 'needs_resubmission' && !feedback) return next(new ErrorResponse('Feedback is required when requesting resubmission', 400));

  const teacherAttachment = req.body.teacherAttachment && typeof req.body.teacherAttachment === 'object'
    ? req.body.teacherAttachment
    : {};
  const percentage = Number.isFinite(score) ? Math.round((score / maxScore) * 10000) / 100 : null;

  submission.status = status;
  submission.score = Number.isFinite(score) ? score : null;
  submission.feedback = feedback;
  submission.grade = {
    score: Number.isFinite(score) ? score : null,
    maxScore,
    percentage,
  };
  submission.teacherFeedback = {
    text: feedback,
    attachment: teacherAttachment,
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  };
  await submission.save();

  const populated = await AssignmentSubmission.findById(submission._id)
    .populate('studentId', 'name firstName lastName email rollNumber studentId');
  res.json({ success: true, data: serializeSubmission(populated, { assignment }) });
});

export const uploadTeacherFeedbackFile = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('File is required', 400));
  const uploaded = await uploadBufferToGridFs({ file: req.file, req });
  const asset = await createFileAssetFromUploadedFile({
    file: {
      ...req.file,
      buffer: undefined,
      gridfsFileId: uploaded.gridfsFileId,
      bucketName: uploaded.bucketName,
      filename: uploaded.filename,
      size: uploaded.size,
      mediaType: uploaded.mediaType,
    },
    body: {
      title: req.file.originalname,
      category: 'assignment-feedback',
      usageType: 'assignment_feedback',
      source: 'assignment',
      module: 'course_assignment_review',
      accessLevel: 'enrolled',
    },
    user: req.user,
  });
  const data = serializeAsset(asset);
  res.status(201).json({
    success: true,
    data: {
      fileId: asset._id,
      url: data.downloadUrl || data.fileUrl || '',
      filename: data.fileName || '',
      originalName: data.originalName || req.file.originalname,
      mimetype: data.mimeType || req.file.mimetype,
      size: data.fileSize || req.file.size,
    },
  });
});

export const gradeAssignmentSubmission = asyncHandler(async (req, res, next) => {
  const submission = await AssignmentSubmission.findById(req.params.submissionId);
  if (!submission) return next(new ErrorResponse('Submission not found', 404));

  const { course, assignment } = await findLessonWithAssignment(submission.courseId, submission.lessonId);
  ensureTeacherAccess(course, req.user);

  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0) return next(new ErrorResponse('Valid score is required', 400));
  if (score > Number(assignment?.maxScore || 100)) {
    return next(new ErrorResponse(`Score cannot exceed ${assignment.maxScore}`, 400));
  }

  submission.score = score;
  submission.feedback = sanitizeText(req.body.feedback);
  submission.status = 'graded';
  submission.grade = {
    score,
    maxScore: Number(assignment?.maxScore || 100),
    percentage: Math.round((score / Number(assignment?.maxScore || 100)) * 10000) / 100,
  };
  submission.teacherFeedback = {
    text: submission.feedback,
    attachment: submission.teacherFeedback?.attachment || {},
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  };
  await submission.save();

  res.json({ success: true, data: serializeSubmission(submission) });
});
