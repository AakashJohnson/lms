import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import TeacherContentPlan from '../models/TeacherContentPlan.model.js';
import MicroLesson from '../models/MicroLesson.model.js';
import Assessment from '../models/Assessment.model.js';
import LiveSession from '../models/LiveSession.model.js';
import {
  buildTeacherPlanningContext,
  callExistingAIServer,
  createSourceContext,
  fetchTeacherCourses,
  makeMockTeacherPlan,
} from '../services/trainerContentPlanning.service.js';

const cleanText = (value = '') => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const extractUploadedPlanningText = async (file) => {
  if (!file?.buffer) return '';
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.includes('pdf') || String(file.originalname || '').toLowerCase().endsWith('.pdf')) {
    const pdfModule = await import('pdf-parse');
    const parser = pdfModule.default || pdfModule;
    if (typeof parser === 'function') {
      const parsed = await parser(file.buffer);
      return cleanText(parsed?.text || '');
    }
  }
  return cleanText(file.buffer.toString('utf8'));
};

const findOwnedPlan = async (planId, user) => {
  const query = ['administrator', 'admin'].includes(user.role)
    ? { _id: planId }
    : { _id: planId, teacherId: user._id };
  return TeacherContentPlan.findOne(query);
};

export const getPlanningOverview = asyncHandler(async (req, res) => {
  const courses = await fetchTeacherCourses(req.user._id, req.user.role);
  const activeCourse = courses[0] || null;
  let overview = {
    activeCourse: activeCourse ? { id: String(activeCourse._id), title: activeCourse.title } : null,
    publishedBytes: 0,
    draftBytes: 0,
    studentsEnrolled: 0,
    weakTopicsDetected: 0,
    pendingAssessments: 0,
  };

  if (activeCourse) {
    const context = await buildTeacherPlanningContext({
      teacher: req.user,
      courseId: activeCourse._id,
      planningRequest: { planningType: 'weekly_content', duration: '1_week', language: 'hinglish' },
    });
    overview = {
      activeCourse: { id: String(activeCourse._id), title: activeCourse.title },
      publishedBytes: context.byteStatus.publishedBytes,
      draftBytes: context.byteStatus.draftBytes,
      studentsEnrolled: context.studentInsights.totalEnrolled,
      weakTopicsDetected: context.studentInsights.weakTopics.length,
      pendingAssessments: context.assessmentStats.pending,
    };
  }

  const history = await TeacherContentPlan.find({ teacherId: req.user._id, status: { $ne: 'archived' } })
    .populate('courseId', 'title')
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.json({ success: true, data: { courses, overview, history } });
});

export const generateTeacherContentPlan = asyncHandler(async (req, res, next) => {
  const {
    courseId,
    moduleId,
    planningType = 'weekly_content',
    duration = '1_week',
    classLevel = '',
    language = 'hinglish',
    teachingStyle = 'interactive',
    teacherInstruction = '',
    planningMode = 'course',
    customTitle = '',
    customContent = '',
  } = req.body || {};

  const uploadedText = await extractUploadedPlanningText(req.file);
  const mergedCustomContent = [customContent, uploadedText].map(cleanText).filter(Boolean).join('\n\n');

  if (planningMode !== 'custom' && !courseId) return next(new ErrorResponse('courseId is required', 400));
  if (planningMode === 'custom' && !mergedCustomContent) return next(new ErrorResponse('Add text or upload a PDF/text file for custom planning', 400));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const generationCount = await TeacherContentPlan.countDocuments({
    teacherId: req.user._id,
    createdAt: { $gte: today },
  });
  if (generationCount >= 20) return next(new ErrorResponse('Daily AI plan generation limit reached', 429));

  const planningRequest = {
    planningMode,
    planningType,
    duration,
    classLevel,
    language,
    teachingStyle,
    teacherInstruction,
    customTitle,
    customContent: mergedCustomContent,
    customFileName: req.file?.originalname || '',
  };
  const context = await buildTeacherPlanningContext({ teacher: req.user, courseId, moduleId, planningRequest });

  let aiPlan;
  let source = 'ai';
  try {
    aiPlan = await callExistingAIServer(context);
  } catch (error) {
    source = 'fallback';
    aiPlan = makeMockTeacherPlan(context);
  }

  const doc = await TeacherContentPlan.create({
    teacherId: req.user._id,
    courseId: courseId || null,
    moduleId: moduleId || '',
    planningMode,
    customTitle: cleanText(customTitle || context.course?.title || ''),
    customContentPreview: cleanText(mergedCustomContent).slice(0, 1200),
    planningType,
    duration,
    classLevel,
    language,
    teachingStyle,
    teacherInstruction,
    aiPlan,
    sourceContext: createSourceContext(context),
    status: 'draft',
  });

  res.json({ success: true, source, data: doc });
});

export const getTeacherContentPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  res.json({ success: true, data: plan });
});

export const updateTeacherContentPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  ['aiPlan', 'status', 'teacherInstruction', 'classLevel', 'teachingStyle', 'duration', 'language'].forEach((key) => {
    if (req.body[key] !== undefined) plan[key] = req.body[key];
  });
  await plan.save();
  res.json({ success: true, data: plan });
});

export const deleteTeacherContentPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  plan.status = 'archived';
  await plan.save();
  res.json({ success: true, message: 'Plan archived' });
});

export const publishPlanToStudents = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  plan.status = 'published';
  await plan.save();
  res.json({ success: true, data: plan });
});

export const createByteFromPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  if (!plan.courseId) return next(new ErrorResponse('Link this plan to a course before creating a Byte draft', 400));
  const suggestion = plan.aiPlan.byteSuggestions.id(req.body.suggestionId) || plan.aiPlan.byteSuggestions[0];
  if (!suggestion) return next(new ErrorResponse('No byte suggestion found in plan', 400));
  const existingCount = await MicroLesson.countDocuments({ course: plan.courseId });
  const byte = await MicroLesson.create({
    course: plan.courseId,
    courseId: plan.courseId,
    sectionId: String(plan.moduleId || ''),
    lessonId: suggestion.sourceLessonId || '',
    teacherId: req.user._id,
    createdBy: req.user._id,
    section: String(plan.moduleId || 'AI Content Plan'),
    order: existingCount + 1,
    title: cleanText(suggestion.title),
    description: cleanText(suggestion.objective || suggestion.reason),
    content: cleanText(plan.aiPlan.summary),
    contentType: 'text',
    duration: Number(suggestion.estimatedMinutes || 5),
    xpReward: 10,
    status: 'draft',
    isPublished: false,
    aiContent: {
      summary: cleanText(suggestion.objective),
      keyTakeaways: plan.aiPlan.learningObjectives || [],
      simpleExplanation: cleanText(suggestion.reason),
      revisionNotes: cleanText(plan.aiPlan.summary),
    },
    topics: [suggestion.title, suggestion.objective].map(cleanText).filter(Boolean),
  });
  res.json({ success: true, data: byte });
});

export const createAssessmentFromPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  if (!plan.courseId) return next(new ErrorResponse('Link this plan to a course before creating an Assessment draft', 400));
  const suggestion = plan.aiPlan.assessmentSuggestions.id(req.body.suggestionId) || plan.aiPlan.assessmentSuggestions[0];
  if (!suggestion) return next(new ErrorResponse('No assessment suggestion found in plan', 400));
  const assessment = await Assessment.create({
    title: cleanText(suggestion.title),
    type: suggestion.type || 'quiz',
    course: plan.courseId,
    module: String(plan.moduleId || ''),
    description: cleanText(suggestion.objective),
    instructions: 'Draft created from AI Content Planner. Review questions before publishing.',
    questions: [],
    totalPoints: 0,
    passingMarks: 0,
    timeLimit: Math.max(10, Number(suggestion.questionCount || 5) * 2),
    attemptsAllowed: 1,
    passingScore: 60,
    visibility: 'draft',
    isPublished: false,
    createdBy: req.user._id,
  });
  res.json({ success: true, data: assessment });
});

export const createLiveSessionFromPlan = asyncHandler(async (req, res, next) => {
  const plan = await findOwnedPlan(req.params.planId, req.user);
  if (!plan) return next(new ErrorResponse('Content plan not found', 404));
  if (!plan.courseId) return next(new ErrorResponse('Link this plan to a course before creating a Live Session draft', 400));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const live = await LiveSession.create({
    title: cleanText(plan.aiPlan.liveClassPlan?.title || `${plan.aiPlan.title} Live Class`),
    course: plan.courseId,
    module: String(plan.moduleId || ''),
    description: cleanText(plan.aiPlan.summary),
    agenda: (plan.aiPlan.liveClassPlan?.agenda || []).join('\n'),
    trainer: req.user._id,
    date: tomorrow,
    startTime: '10:00',
    duration: Number(plan.aiPlan.liveClassPlan?.estimatedMinutes || 60),
    platform: 'Custom',
    joinLink: 'https://example.com/draft-live-session',
    status: 'scheduled',
  });
  res.json({ success: true, data: live });
});

export const getPlanHistory = asyncHandler(async (req, res) => {
  const plans = await TeacherContentPlan.find({ teacherId: req.user._id, status: { $ne: 'archived' } })
    .populate('courseId', 'title')
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit || 30))
    .lean();
  res.json({ success: true, data: plans });
});
