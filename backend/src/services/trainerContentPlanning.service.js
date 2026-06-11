import Course from '../models/Course.model.js';
import MicroLesson from '../models/MicroLesson.model.js';
import Assessment from '../models/Assessment.model.js';
import StudentAssessment from '../models/StudentAssessment.model.js';
import Enrollment from '../models/Enrollment.model.js';
import LiveSession from '../models/LiveSession.model.js';
import { callAiService } from './aiGateway.service.js';

const cleanText = (value = '') => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const arr = (value) => (Array.isArray(value) ? value : []);
const limit = (value = '', max = 4000) => cleanText(value).slice(0, max);

export const fetchTeacherCourses = async (teacherId, role = 'trainer') => {
  const filter = role === 'administrator' || role === 'admin'
    ? {}
    : { $or: [{ trainer: teacherId }, { createdBy: teacherId }] };
  return Course.find(filter)
    .select('title subtitle description fullDescription overview sections.title sections.description sections.lessons.title sections.lessons.type sections.lessons.description sections.lessons.content sections.lessons.videoSummary sections.lessons.resources trainer createdBy')
    .sort({ updatedAt: -1 })
    .lean();
};

export const assertTeacherCourseAccess = async ({ teacherId, role, courseId }) => {
  const filter = role === 'administrator' || role === 'admin'
    ? { _id: courseId }
    : { _id: courseId, $or: [{ trainer: teacherId }, { createdBy: teacherId }] };
  return Course.findOne(filter).lean();
};

export const fetchCourseStructure = (course = {}) => ({
  id: String(course._id || ''),
  title: cleanText(course.title),
  description: limit(course.fullDescription || course.description || course.overview || course.subtitle || '', 2500),
  modules: arr(course.sections).map((section) => ({
    id: String(section._id || ''),
    title: cleanText(section.title),
    description: limit(section.description || section.fullDescription || '', 1000),
    lessons: arr(section.lessons).map((lesson) => ({
      id: String(lesson._id || ''),
      title: cleanText(lesson.title),
      type: lesson.type || '',
      description: limit(lesson.description || lesson.content || '', 1200),
    })),
  })),
});

export const fetchSavedSummariesAndNotes = (course = {}, moduleId = '') => {
  const sections = moduleId
    ? arr(course.sections).filter((section) => String(section._id) === String(moduleId) || cleanText(section.title).toLowerCase() === cleanText(moduleId).toLowerCase())
    : arr(course.sections);
  const summaries = [];
  const flashcards = [];
  const uploadedNotes = [];
  sections.forEach((section) => {
    arr(section.lessons).forEach((lesson) => {
      const generated = lesson.videoSummary?.generated || {};
      if (generated.summary || generated.detailedSummary || generated.revisionNotes) {
        summaries.push({
          lessonId: String(lesson._id || ''),
          lessonTitle: cleanText(lesson.title),
          summary: limit(generated.summary, 1800),
          detailedSummary: limit(generated.detailedSummary, 2400),
          revisionNotes: limit(generated.revisionNotes, 1800),
          keyTakeaways: arr(generated.keyTakeaways).map(cleanText).filter(Boolean).slice(0, 12),
        });
      }
      arr(generated.flashcards).forEach((card) => {
        flashcards.push({
          lessonId: String(lesson._id || ''),
          front: cleanText(card.front || card.question),
          back: cleanText(card.back || card.answer),
        });
      });
      arr(lesson.resources).forEach((resource) => {
        uploadedNotes.push({
          lessonId: String(lesson._id || ''),
          title: cleanText(resource.title || resource.originalName || 'Uploaded material'),
          type: cleanText(resource.type || resource.mimeType || 'resource'),
          extractedText: limit(resource.extractedText || resource.ocrText || resource.description || '', 1600),
        });
      });
    });
  });
  return { summaries: summaries.slice(0, 30), flashcards: flashcards.slice(0, 40), uploadedNotes: uploadedNotes.slice(0, 20) };
};

export const fetchByteStatus = async (courseId) => {
  const bytes = await MicroLesson.find({
    $or: [{ course: courseId }, { courseId }],
    status: { $ne: 'archived' },
  }).select('title description status isPublished section duration xpReward topics').lean();
  return {
    total: bytes.length,
    publishedBytes: bytes.filter((item) => item.isPublished || item.status === 'published').length,
    draftBytes: bytes.filter((item) => !item.isPublished && item.status !== 'published').length,
    bytes: bytes.map((item) => ({
      id: String(item._id),
      title: cleanText(item.title),
      status: item.isPublished || item.status === 'published' ? 'published' : item.status || 'draft',
      topics: arr(item.topics).map(cleanText).filter(Boolean),
      duration: item.duration || 5,
    })),
  };
};

export const fetchAssessmentStats = async (courseId) => {
  const assessments = await Assessment.find({ course: { $in: [courseId, String(courseId)] } })
    .select('title type visibility questions submissions passRate avgScore createdAt')
    .lean();
  const ids = assessments.map((item) => item._id);
  const studentAssessments = ids.length
    ? await StudentAssessment.find({ assessment: { $in: ids } }).select('attempts.stats attempts.answers').lean()
    : [];
  return {
    total: assessments.length,
    published: assessments.filter((item) => item.visibility === 'published' || item.isPublished).length,
    pending: assessments.filter((item) => item.visibility !== 'published' && !item.isPublished).length,
    avgScore: Math.round(
      assessments.reduce((sum, item) => sum + Number(item.avgScore || 0), 0) / Math.max(1, assessments.length)
    ),
    attempts: studentAssessments.length,
    assessments: assessments.slice(0, 20).map((item) => ({
      id: String(item._id),
      title: cleanText(item.title),
      type: item.type,
      visibility: item.visibility,
      avgScore: item.avgScore || 0,
      passRate: item.passRate || 0,
    })),
  };
};

export const fetchStudentProgress = async (courseId) => {
  const enrollments = await Enrollment.find({ course: courseId, status: { $ne: 'dropped' } })
    .select('progressPercent status lessonProgress')
    .lean();
  const avgProgress = Math.round(
    enrollments.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) / Math.max(1, enrollments.length)
  );
  const incompleteStudents = enrollments.filter((item) => Number(item.progressPercent || 0) < 60).length;
  return {
    totalEnrolled: enrollments.length,
    avgProgress,
    incompleteStudents,
  };
};

export const detectWeakTopics = ({ savedContent = {}, byteStatus = {}, assessmentStats = {}, studentProgress = {} }) => {
  const weak = [];
  if (Number(assessmentStats.avgScore || 0) > 0 && Number(assessmentStats.avgScore || 0) < 60) {
    weak.push({ topic: 'Assessment fundamentals', evidence: `Average score ${assessmentStats.avgScore}%`, priority: 'high' });
  }
  if (Number(studentProgress.avgProgress || 0) < 50 && studentProgress.totalEnrolled > 0) {
    weak.push({ topic: 'Course completion', evidence: `Average progress ${studentProgress.avgProgress}%`, priority: 'high' });
  }
  arr(byteStatus.bytes).filter((item) => item.status !== 'published').slice(0, 4).forEach((item) => {
    weak.push({ topic: item.title, evidence: 'Byte is still draft/unpublished', priority: 'medium' });
  });
  arr(savedContent.summaries).slice(0, 5).forEach((item) => {
    arr(item.keyTakeaways).slice(0, 2).forEach((topic) => {
      if (weak.length < 10) weak.push({ topic, evidence: `Saved summary from ${item.lessonTitle}`, priority: 'low' });
    });
  });
  return weak.slice(0, 10);
};

export const fetchLiveSessionStats = async (courseId, trainerId) => {
  const sessions = await LiveSession.find({ course: courseId, trainer: trainerId })
    .select('title date startTime endTime status attendees agenda')
    .sort({ date: -1 })
    .limit(10)
    .lean()
    .catch(() => []);
  return {
    total: sessions.length,
    upcoming: sessions.filter((item) => ['scheduled', 'upcoming'].includes(item.status)).length,
    sessions: sessions.map((item) => ({
      id: String(item._id),
      title: cleanText(item.title),
      status: item.status,
      date: item.date,
      agenda: arr(item.agenda).map(cleanText).filter(Boolean),
    })),
  };
};

export const buildTeacherPlanningContext = async ({ teacher, courseId, moduleId, planningRequest }) => {
  if (planningRequest?.planningMode === 'custom' || !courseId) {
    const customTitle = cleanText(planningRequest.customTitle || 'New Course / Uploaded Material');
    const customContent = limit(planningRequest.customContent || '', 50000);
    const derivedSentences = customContent
      .split(/(?<=[.!?])\s+/)
      .map(cleanText)
      .filter((line) => line.length > 35)
      .slice(0, 12);

    return {
      teacher: {
        id: String(teacher._id),
        name: teacher.fullName || teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
      },
      course: {
        id: '',
        title: customTitle,
        description: limit(customContent, 2500),
        modules: [{
          id: 'custom-module',
          title: customTitle,
          description: limit(customContent, 1200),
          lessons: derivedSentences.slice(0, 8).map((sentence, index) => ({
            id: `custom-lesson-${index + 1}`,
            title: sentence.slice(0, 80),
            type: 'text',
            description: sentence,
          })),
        }],
      },
      selectedModuleId: 'custom-module',
      savedContent: {
        summaries: [{
          lessonId: 'custom-material',
          lessonTitle: customTitle,
          summary: limit(customContent, 3000),
          detailedSummary: limit(customContent, 6000),
          revisionNotes: derivedSentences.join('\n'),
          keyTakeaways: derivedSentences.slice(0, 8),
        }],
        flashcards: [],
        uploadedNotes: [{
          lessonId: 'custom-material',
          title: customTitle,
          type: planningRequest.customFileName || 'manual-text',
          extractedText: limit(customContent, 8000),
        }],
      },
      contentStatus: {
        publishedBytes: 0,
        draftBytes: 0,
        pendingLessons: [],
      },
      byteStatus: { total: 0, publishedBytes: 0, draftBytes: 0, bytes: [] },
      studentInsights: {
        totalEnrolled: 0,
        avgProgress: 0,
        incompleteStudents: 0,
        avgAssessmentScore: 0,
        weakTopics: [],
      },
      assessmentStats: { total: 0, published: 0, pending: 0, avgScore: 0, attempts: 0, assessments: [] },
      liveSessionContext: { total: 0, upcoming: 0, sessions: [] },
      planningRequest,
    };
  }

  const course = await assertTeacherCourseAccess({ teacherId: teacher._id, role: teacher.role, courseId });
  if (!course) {
    const error = new Error('Course not found or not accessible');
    error.statusCode = 404;
    throw error;
  }

  const [byteStatus, assessmentStats, studentProgress, liveSessions] = await Promise.all([
    fetchByteStatus(courseId),
    fetchAssessmentStats(courseId),
    fetchStudentProgress(courseId),
    fetchLiveSessionStats(courseId, teacher._id),
  ]);

  const courseStructure = fetchCourseStructure(course);
  const savedContent = fetchSavedSummariesAndNotes(course, moduleId);
  const weakTopics = detectWeakTopics({ savedContent, byteStatus, assessmentStats, studentProgress });

  return {
    teacher: {
      id: String(teacher._id),
      name: teacher.fullName || teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
    },
    course: courseStructure,
    selectedModuleId: moduleId || '',
    savedContent,
    contentStatus: {
      publishedBytes: byteStatus.publishedBytes,
      draftBytes: byteStatus.draftBytes,
      pendingLessons: courseStructure.modules.flatMap((module) => module.lessons).filter((lesson) => lesson.type !== 'quiz').slice(0, 20),
    },
    byteStatus,
    studentInsights: {
      ...studentProgress,
      avgAssessmentScore: assessmentStats.avgScore,
      weakTopics,
    },
    assessmentStats,
    liveSessionContext: liveSessions,
    planningRequest,
  };
};

const outputSchema = {
  title: '',
  summary: '',
  learningObjectives: [],
  prerequisites: [],
  teachingSequence: [],
  byteSuggestions: [],
  assessmentSuggestions: [],
  liveClassPlan: {},
  homework: [],
  weakTopicRecovery: [],
  expectedOutcomes: [],
};

export const buildTeacherPlannerPrompt = (context) => `
You are an expert teacher assistant and curriculum planner for an LMS.
Generate a teacher content plan using only the provided LMS data.
Return only valid JSON. Do not use markdown. Do not invent resources.
Align with planningType, duration, language, and teaching style.
Weak topic recovery must be based only on provided student insights.

Return JSON in this exact structure:
${JSON.stringify(outputSchema)}

Teacher planning context:
${JSON.stringify(context)}
`;

const extractJson = (value) => {
  const raw = typeof value === 'string' ? value : JSON.stringify(value || {});
  const cleaned = raw.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(cleaned.slice(first, last + 1));
};

export const normalizeTeacherPlan = (plan = {}, context = {}) => {
  const lessons = context.course?.modules?.flatMap((module) => module.lessons || []) || [];
  const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
  const uniqueSteps = new Set();

  const teachingSequence = arr(plan.teachingSequence).map((step, index) => ({
    stepNo: Number(step.stepNo || index + 1),
    title: cleanText(step.title || `Step ${index + 1}`),
    activity: cleanText(step.activity),
    teacherAction: cleanText(step.teacherAction),
    studentAction: cleanText(step.studentAction),
    estimatedMinutes: Number(step.estimatedMinutes || 10),
    resources: arr(step.resources).map(cleanText).filter(Boolean).slice(0, 6),
  })).filter((step) => {
    const key = `${step.title}-${step.activity}`;
    if (uniqueSteps.has(key)) return false;
    uniqueSteps.add(key);
    return step.title;
  });

  return {
    title: cleanText(plan.title || `${context.course?.title || 'Course'} Teaching Plan`),
    summary: cleanText(plan.summary || 'AI generated teaching plan from saved LMS content.'),
    learningObjectives: arr(plan.learningObjectives).map(cleanText).filter(Boolean).slice(0, 12),
    prerequisites: arr(plan.prerequisites).map(cleanText).filter(Boolean).slice(0, 10),
    teachingSequence,
    byteSuggestions: arr(plan.byteSuggestions).map((item) => ({
      title: cleanText(item.title),
      objective: cleanText(item.objective),
      estimatedMinutes: Number(item.estimatedMinutes || 5),
      sourceLessonId: lessonIds.has(String(item.sourceLessonId || '')) ? String(item.sourceLessonId) : '',
      reason: cleanText(item.reason),
    })).filter((item) => item.title).slice(0, 10),
    assessmentSuggestions: arr(plan.assessmentSuggestions).map((item) => ({
      title: cleanText(item.title),
      type: cleanText(item.type || 'quiz'),
      questionCount: Number(item.questionCount || 5),
      difficulty: cleanText(item.difficulty || 'medium'),
      objective: cleanText(item.objective),
    })).filter((item) => item.title).slice(0, 10),
    liveClassPlan: {
      title: cleanText(plan.liveClassPlan?.title || `${context.course?.title || 'Course'} Live Class`),
      agenda: arr(plan.liveClassPlan?.agenda).map(cleanText).filter(Boolean).slice(0, 10),
      activities: arr(plan.liveClassPlan?.activities).map(cleanText).filter(Boolean).slice(0, 10),
      estimatedMinutes: Number(plan.liveClassPlan?.estimatedMinutes || 60),
    },
    homework: arr(plan.homework).map((item) => ({
      title: cleanText(item.title),
      description: cleanText(item.description),
      estimatedMinutes: Number(item.estimatedMinutes || 20),
    })).filter((item) => item.title).slice(0, 8),
    weakTopicRecovery: arr(plan.weakTopicRecovery).map((item) => ({
      topic: cleanText(item.topic),
      evidence: cleanText(item.evidence),
      suggestedAction: cleanText(item.suggestedAction),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
    })).filter((item) => item.topic).slice(0, 10),
    expectedOutcomes: arr(plan.expectedOutcomes).map(cleanText).filter(Boolean).slice(0, 12),
  };
};

export const validateTeacherPlanJson = (plan, context) => normalizeTeacherPlan(plan, context);

export const makeMockTeacherPlan = (context = {}) => normalizeTeacherPlan({
  title: `${context.course?.title || 'Course'} ${context.planningRequest?.planningType || 'Teaching'} Plan`,
  summary: `Practical plan for ${context.course?.title || 'the selected course'} using saved summaries, byte status and student insights.`,
  learningObjectives: ['Recall key concepts from saved lessons', 'Apply concepts through guided activities', 'Close weak-topic gaps using retrieval practice'],
  prerequisites: ['Review previous lesson summary', 'Check published bytes and draft bytes'],
  teachingSequence: [
    { stepNo: 1, title: 'Quick recap', activity: 'Warm-up discussion from previous lesson', teacherAction: 'Ask 3 diagnostic questions', studentAction: 'Answer and self-check', estimatedMinutes: 10, resources: ['Saved summary'] },
    { stepNo: 2, title: 'Core teaching block', activity: 'Explain selected module with examples', teacherAction: 'Use board examples and checkpoints', studentAction: 'Take notes and answer prompts', estimatedMinutes: 25, resources: ['Course lesson'] },
    { stepNo: 3, title: 'Retrieval practice', activity: 'Byte-sized quiz and flashcards', teacherAction: 'Assign one byte and discuss errors', studentAction: 'Attempt quiz and review flashcards', estimatedMinutes: 15, resources: ['Byte Learning'] },
  ],
  byteSuggestions: [{ title: '5-minute recap byte', objective: 'Reinforce the weakest concept', estimatedMinutes: 5, sourceLessonId: context.course?.modules?.[0]?.lessons?.[0]?.id || '', reason: 'Supports fast retrieval practice' }],
  assessmentSuggestions: [{ title: 'Checkpoint quiz', type: 'quiz', questionCount: 5, difficulty: 'medium', objective: 'Check understanding before next lesson' }],
  liveClassPlan: { title: 'Interactive doubt clearing class', agenda: ['Recap', 'Practice questions', 'Doubt clearing'], activities: ['Poll', 'Worked example'], estimatedMinutes: 45 },
  homework: [{ title: 'Revision worksheet', description: 'Practice key concepts and write two examples.', estimatedMinutes: 20 }],
  weakTopicRecovery: arr(context.studentInsights?.weakTopics).slice(0, 3).map((item) => ({ topic: item.topic, evidence: item.evidence, suggestedAction: 'Add recap, byte and practice quiz', priority: item.priority })),
  expectedOutcomes: ['Students complete the planned byte', 'Teacher identifies remaining gaps', 'Assessment readiness improves'],
}, context);

export const callExistingAIServer = async (context) => {
  if (process.env.AI_TEACHER_PLANNER_MOCK === 'true') return makeMockTeacherPlan(context);
  const response = await callAiService({
    endpoint: '/v1/tutor/chat',
    timeout: Number(process.env.AI_TEACHER_PLANNER_TIMEOUT_MS || 180000),
    retries: 0,
    payload: {
      message: buildTeacherPlannerPrompt(context),
      userRole: 'trainer',
      context: {
        tutorMode: 'Teacher Content Planner',
        lessonContent: JSON.stringify(context).slice(0, 60000),
      },
    },
  });
  const parsed = extractJson(response?.data?.message || response?.message || response);
  return validateTeacherPlanJson(parsed, context);
};

export const createSourceContext = (context = {}) => ({
  usedSources: [
    'course_structure',
    context.savedContent?.summaries?.length ? 'saved_summaries' : '',
    context.savedContent?.flashcards?.length ? 'flashcards' : '',
    context.byteStatus?.total ? 'byte_status' : '',
    context.assessmentStats?.total ? 'assessment_results' : '',
    context.studentInsights?.totalEnrolled ? 'student_progress' : '',
    context.liveSessionContext?.total ? 'live_sessions' : '',
  ].filter(Boolean),
  weakTopicsDetected: arr(context.studentInsights?.weakTopics).map((item) => item.topic).filter(Boolean),
  contentCoverage: Math.min(100, Math.round(((context.savedContent?.summaries?.length || 0) + (context.byteStatus?.total || 0) + (context.assessmentStats?.total || 0)) * 8)),
  studentInsightsSnapshot: context.studentInsights || {},
  courseSnapshot: context.course || {},
});
