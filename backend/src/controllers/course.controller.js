import Course from '../models/Course.model.js';
import FileAsset from '../models/FileAsset.model.js';
import Enrollment from '../models/Enrollment.model.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import { enqueueVideoSummariesForCourse } from '../services/videoSummaryJob.service.js';
import { enqueueFileAssetTranscriptJob } from '../services/fileAssetTranscriptJob.service.js';
import { logStudentActivity } from '../services/activityLogger.service.js';
import { normalizeVideoSummaryStatus, VIDEO_SUMMARY_STATUS_VALUES } from '../constants/videoSummaryStatus.js';

const IMG_SRC_REGEX = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;

const getDescriptionMeta = (html = '') => {
  const source = String(html || '');
  const images = [];
  let match;
  while ((match = IMG_SRC_REGEX.exec(source)) !== null) {
    images.push(match[1]);
  }
  IMG_SRC_REGEX.lastIndex = 0;

  return {
    length: source.length,
    imageCount: images.length,
    hasBlobUrl: images.some((src) => String(src || '').trim().toLowerCase().startsWith('blob:')),
    hasDataUrl: images.some((src) => String(src || '').trim().toLowerCase().startsWith('data:')),
  };
};

const sanitizeCourseDescription = (html = '') =>
  String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+=(['"]).*?\1/gi, '')
    .replace(/\son\w+=([^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"')
    .trim();

const isObjectIdLike = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));
const isTempId = (value) => !value || String(value).startsWith('temp-') || String(value).startsWith('sec-') || String(value).startsWith('les-') || !isObjectIdLike(value);
const objectIdOrNew = (value) => (isTempId(value) ? new mongoose.Types.ObjectId() : value);
const stripPreviewUrl = (value = '') => {
  const text = String(value || '').trim();
  return text.startsWith('blob:') || text.startsWith('data:') ? '' : text;
};

const normalizeVideoSummary = (input = {}, previous = {}) => {
  const source = input && typeof input === 'object' ? input : {};
  const base = previous && typeof previous === 'object' ? previous : {};
  const status = normalizeVideoSummaryStatus(source.status || base.status);
  const generated = {
    ...(base.generated || {}),
    ...(source.generated || {}),
  };
  const transcript = source.transcript || source.rawTranscript || generated.transcript || generated.rawTranscript || base.transcript || base.rawTranscript || '';
  if (transcript) {
    generated.transcript = generated.transcript || transcript;
    generated.rawTranscript = generated.rawTranscript || transcript;
  }
  return {
    ...base,
    ...source,
    status,
    aiProcessingStatus: normalizeVideoSummaryStatus(source.aiProcessingStatus || base.aiProcessingStatus || status),
    generated,
    rawTranscript: source.rawTranscript || base.rawTranscript || transcript,
    transcript: source.transcript || base.transcript || transcript,
    updatedAt: source.updatedAt || base.updatedAt || new Date(),
  };
};

const sanitizeLessonAsset = (asset) => {
  if (!asset || typeof asset !== 'object') return undefined;
  const fileAssetId = asset.fileAssetId || asset._id || null;
  return {
    ...asset,
    fileAssetId: isObjectIdLike(fileAssetId) ? fileAssetId : null,
    gridfsFileId: isObjectIdLike(asset.gridfsFileId) ? asset.gridfsFileId : null,
    streamUrl: stripPreviewUrl(asset.streamUrl || ''),
    viewUrl: stripPreviewUrl(asset.viewUrl || ''),
    downloadUrl: stripPreviewUrl(asset.downloadUrl || ''),
  };
};

const sanitizeResources = (items, previous = []) => Array.isArray(items) ? items.map((r) => ({
  title: r.title || '',
  url: stripPreviewUrl(r.url || ''),
  type: r.type || 'link',
  storageProvider: r.storageProvider || 'local',
  fileAssetId: isObjectIdLike(r.fileAssetId || r.fileAsset) ? (r.fileAssetId || r.fileAsset) : null,
  fileAsset: isObjectIdLike(r.fileAsset || r.fileAssetId) ? (r.fileAsset || r.fileAssetId) : null,
  gridfsFileId: isObjectIdLike(r.gridfsFileId) ? r.gridfsFileId : null,
  streamUrl: stripPreviewUrl(r.streamUrl || ''),
  viewUrl: stripPreviewUrl(r.viewUrl || ''),
  downloadUrl: stripPreviewUrl(r.downloadUrl || ''),
  mimeType: r.mimeType || '',
  fileSize: r.fileSize || r.size || 0,
  size: r.size || r.fileSize || 0,
  originalName: r.originalName || '',
  createdAt: r.createdAt || new Date(),
})) : previous;

const sanitizeAssignments = (items, previous = []) => Array.isArray(items) ? items.map((item) => ({
  ...(isObjectIdLike(item._id) ? { _id: item._id } : {}),
  title: item.title || '',
  description: item.description || '',
  instructions: item.instructions || '',
  dueDate: item.dueDate || '',
  attachmentUrl: stripPreviewUrl(item.attachmentUrl || ''),
  maxScore: item.maxScore ?? item.points ?? 100,
  points: item.points ?? item.maxScore ?? 100,
  fileAsset: item.fileAsset || null,
  attachments: Array.isArray(item.attachments) ? item.attachments : [],
  isRequired: Boolean(item.isRequired),
  attachmentAsset: sanitizeLessonAsset(item.attachmentAsset) || undefined,
  createdAt: item.createdAt || new Date(),
  updatedAt: new Date(),
})) : previous;

const sanitizeKnowledgeChecks = (items, previous = []) => Array.isArray(items) ? items.map((item) => ({
  ...(isObjectIdLike(item._id || item.id) ? { _id: item._id || item.id } : {}),
  question: item.question || '',
  type: item.type || item.questionType || 'multiple-choice',
  options: Array.isArray(item.options)
    ? item.options.map((option) => typeof option === 'string' ? option : option.text || '').filter(Boolean)
    : [],
  correctAnswer: item.correctAnswer || '',
  explanation: item.explanation || '',
  timestamp: item.timestamp ?? null,
  points: item.points || 0,
  createdAt: item.createdAt || new Date(),
  updatedAt: new Date(),
})) : previous;

const sanitizeChecklist = (items, previous = []) => Array.isArray(items) ? items.map((item) => ({
  ...(isObjectIdLike(item._id || item.id) ? { _id: item._id || item.id } : {}),
  label: item.label || '',
  type: item.type || 'content',
  isRequired: item.isRequired !== false,
  completed: Boolean(item.completed),
  createdAt: item.createdAt || new Date(),
})) : previous;

const LESSON_SAVE_FIELDS = [
  'title',
  'type',
  'description',
  'content',
  'order',
  'duration',
  'videoDuration',
  'videoUrl',
  'lessonImage',
  'lessonAudio',
  'lessonVideo',
  'videoAsset',
  'imageAsset',
  'audioAsset',
  'mediaAssets',
  'transcript',
  'manualTranscript',
  'generatedTranscript',
  'videoDescription',
  'fullDescription',
  'overview',
  'summary',
  'notes',
  'attachments',
  'resources',
  'assignment',
  'assignments',
  'knowledgeChecks',
  'questions',
  'requiredChecklist',
  'languageMode',
  'transcriptionMode',
  'videoSummary',
  'isPreview',
];

const hasOwn = (obj, field) => Object.prototype.hasOwnProperty.call(obj || {}, field);

const mergeDefinedLessonInput = (incoming = {}, previous = {}) => {
  const previousObj = previous?.toObject ? previous.toObject() : (previous || {});
  const merged = { ...previousObj };
  for (const field of LESSON_SAVE_FIELDS) {
    if (hasOwn(incoming, field)) merged[field] = incoming[field];
  }
  return merged;
};

const sanitizeLessonForSave = (les = {}, li = 0, previous = {}) => {
  const lessonId = objectIdOrNew(les._id || les.id);
  const previousObj = previous?.toObject ? previous.toObject() : (previous || {});
  const transcript = typeof les.transcript === 'object' ? (les.transcript.text || '') : (les.transcript ?? previousObj.transcript ?? '');
  const videoAsset = sanitizeLessonAsset(les.videoAsset) || sanitizeLessonAsset(previousObj.videoAsset);
  const hasVideo = Boolean(videoAsset?.fileAssetId || stripPreviewUrl(les.lessonVideo || les.videoUrl || previousObj.lessonVideo || previousObj.videoUrl));
  return {
    ...previousObj,
    _id: lessonId,
    title: les.title?.trim() || previousObj.title || 'Untitled Lesson',
    type: les.type || previousObj.type || 'video',
    content: les.content ?? previousObj.content ?? '',
    videoDescription: les.videoDescription ?? previousObj.videoDescription ?? les.description ?? '',
    description: sanitizeCourseDescription(les.description ?? previousObj.description ?? (les.type !== 'article' ? les.content : '') ?? ''),
    fullDescription: sanitizeCourseDescription(les.fullDescription ?? previousObj.fullDescription ?? ''),
    overview: les.overview ?? previousObj.overview ?? '',
    transcript,
    manualTranscript: les.manualTranscript ?? previousObj.manualTranscript ?? '',
    generatedTranscript: les.generatedTranscript ?? previousObj.generatedTranscript ?? (transcript || ''),
    summary: les.summary ?? previousObj.summary ?? '',
    notes: les.notes ?? previousObj.notes ?? '',
    videoUrl: stripPreviewUrl(les.videoUrl ?? previousObj.videoUrl ?? ''),
    videoDuration: les.videoDuration ?? previousObj.videoDuration ?? '',
    duration: les.duration ?? previousObj.duration ?? '',
    languageMode: les.languageMode ?? previousObj.languageMode ?? 'auto',
    transcriptionMode: les.transcriptionMode ?? previousObj.transcriptionMode ?? 'balanced',
    lessonImage: stripPreviewUrl(les.lessonImage ?? previousObj.lessonImage ?? ''),
    lessonAudio: stripPreviewUrl(les.lessonAudio ?? previousObj.lessonAudio ?? ''),
    lessonVideo: stripPreviewUrl(les.lessonVideo ?? previousObj.lessonVideo ?? ''),
    videoAsset,
    imageAsset: sanitizeLessonAsset(les.imageAsset) || sanitizeLessonAsset(previousObj.imageAsset),
    audioAsset: sanitizeLessonAsset(les.audioAsset) || sanitizeLessonAsset(previousObj.audioAsset),
    mediaAssets: Array.isArray(les.mediaAssets) ? les.mediaAssets : (previousObj.mediaAssets || []),
    videoSummary: normalizeVideoSummary(
      les.videoSummary || (hasVideo ? { status: 'uploaded' } : {}),
      previousObj.videoSummary,
    ),
    isPreview: !!(les.isPreview ?? previousObj.isPreview),
    order: Number.isFinite(Number(les.order)) ? Number(les.order) : li,
    resources: sanitizeResources(les.resources, previousObj.resources || []),
    attachments: sanitizeResources(les.attachments, previousObj.attachments || []),
    assignment: les.assignment ?? previousObj.assignment,
    assignments: sanitizeAssignments(les.assignments, previousObj.assignments || []),
    knowledgeChecks: sanitizeKnowledgeChecks(
      Array.isArray(les.knowledgeChecks) ? les.knowledgeChecks : les.questions,
      previousObj.knowledgeChecks || [],
    ),
    requiredChecklist: sanitizeChecklist(les.requiredChecklist, previousObj.requiredChecklist || []),
    questions: Array.isArray(les.questions) ? les.questions : (previousObj.questions || []),
    updatedAt: new Date(),
  };
};

const mergeSectionsForSave = (existingSections = [], incomingSections = []) => {
  if (!Array.isArray(incomingSections)) return existingSections;
  return incomingSections.map((incomingSection, sectionIndex) => {
    const incomingSectionId = incomingSection?._id || incomingSection?.id;
    const existingSection = isObjectIdLike(incomingSectionId)
      ? existingSections.find((section) => String(section._id) === String(incomingSectionId))
      : null;
    const previousSectionObj = existingSection?.toObject ? existingSection.toObject() : (existingSection || {});
    const incomingLessons = Array.isArray(incomingSection.lessons) ? incomingSection.lessons : [];
    const existingLessons = existingSection?.lessons || [];

    return {
      ...previousSectionObj,
      _id: objectIdOrNew(incomingSectionId),
      title: incomingSection.title?.trim() || previousSectionObj.title || 'Untitled Section',
      description: sanitizeCourseDescription(incomingSection.description ?? previousSectionObj.description ?? ''),
      fullDescription: sanitizeCourseDescription(incomingSection.fullDescription ?? previousSectionObj.fullDescription ?? ''),
      order: Number.isFinite(Number(incomingSection.order)) ? Number(incomingSection.order) : sectionIndex,
      lessons: incomingLessons.map((incomingLesson, lessonIndex) => {
        const incomingLessonId = incomingLesson?._id || incomingLesson?.id;
        const existingLesson = isObjectIdLike(incomingLessonId)
          ? existingLessons.find((lesson) => String(lesson._id) === String(incomingLessonId))
          : null;
        const mergedLesson = mergeDefinedLessonInput(incomingLesson, existingLesson);
        return sanitizeLessonForSave(
          { ...mergedLesson, _id: existingLesson?._id || incomingLessonId },
          lessonIndex,
          existingLesson,
        );
      }),
    };
  });
};

const sanitizeReviewMessage = (value = '') => String(value || '').replace(/[<>]/g, '').trim();

const getCourseOwnerIds = (course) => [course.createdBy, course.trainer].filter(Boolean).map((id) => String(id));

const ensureCourseOwnerOrAdmin = (course, user) => {
  if (user?.role === 'administrator') return;
  if (getCourseOwnerIds(course).includes(String(user?._id))) return;
  throw new ErrorResponse('Not authorised to manage this course', 403);
};

const ensureCourseOwner = (course, user) => {
  if (getCourseOwnerIds(course).includes(String(user?._id))) return;
  throw new ErrorResponse('Not authorised to manage this course', 403);
};

const pushReviewHistory = (course, { status, decision = '', message = '', user }) => {
  course.reviewHistory = course.reviewHistory || [];
  course.reviewHistory.push({
    status,
    decision,
    message: sanitizeReviewMessage(message),
    changedBy: user?._id || null,
    changedByRole: user?.role || '',
    createdAt: new Date(),
  });
};

const buildArchivedCourseSnapshot = (course) => {
  const data = course.toObject ? course.toObject() : course;
  return {
    ...data,
    sections: [],
    archivedAccess: true,
    archiveMessage: 'This course has been archived by the trainer. Your enrollment and progress are saved, but course content is currently unavailable.',
  };
};

const validateReviewReady = (course) => {
  const issues = [];
  if (!String(course.title || '').trim()) issues.push('Course title is required');
  if (!String(course.description || '').trim()) issues.push('Course description is required');
  const lessonCount = (course.sections || []).reduce((sum, section) => sum + (section.lessons?.length || 0), 0);
  if (lessonCount <= 0) issues.push('At least one lesson is required');
  if (!course.pricing?.isFree && (course.pricing?.amount === undefined || course.pricing?.amount === null || Number(course.pricing.amount) < 0)) {
    issues.push('Valid course price is required');
  }
  return issues;
};

const getLessonVideoAssetId = (lesson = {}) => {
  const value = lesson.videoAsset?.fileAssetId || '';
  return isObjectIdLike(value) ? String(value) : '';
};

const hydrateLessonTranscriptsFromFileAssets = async (courseData) => {
  const fileAssetIds = new Set();
  for (const section of courseData.sections || []) {
    for (const lesson of section.lessons || []) {
      const fileAssetId = getLessonVideoAssetId(lesson);
      if (fileAssetId) fileAssetIds.add(fileAssetId);
    }
  }

  if (!fileAssetIds.size) return;
  const assets = await FileAsset.find({ _id: { $in: [...fileAssetIds] } })
    .select('mediaType mimeType transcript aiProcessing')
    .lean();
  const assetById = new Map(assets.map((asset) => [String(asset._id), asset]));

  for (const section of courseData.sections || []) {
    for (const lesson of section.lessons || []) {
      const fileAssetId = getLessonVideoAssetId(lesson);
      if (!fileAssetId) continue;
      const asset = assetById.get(fileAssetId);
      const isVideo = asset?.mediaType === 'video' || String(asset?.mimeType || '').startsWith('video/');
      if (!isVideo) continue;
      if (!asset?.transcript?.text && asset?.aiProcessing?.transcriptStatus !== 'processing') {
        enqueueFileAssetTranscriptJob({ fileAssetId });
      }
      if (!lesson.transcript && asset?.transcript?.text) {
        lesson.transcript = asset.transcript.text;
        lesson.videoSummary = {
          ...(lesson.videoSummary || {}),
          status: 'transcript_completed',
          aiProcessingStatus: 'transcript_completed',
          aiProcessingProgress: 40,
          rawTranscript: asset.transcript.text,
          transcript: asset.transcript.text,
          transcriptWordCount: asset.transcript.wordCount || 0,
          transcriptLanguage: asset.transcript.language || 'auto',
          provider: asset.transcript.provider || 'transcript-generator',
          warning: asset.transcript.warning || '',
        };
      }
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map form data (CourseFormData from frontend) → Course schema fields
 */
function mapFormToSchema(body, userId) {
  const {
    title, subtitle, description, fullDescription, overview,
    category, subCategory, language, level, tags, thumbnail, promoVideo,
    objectives, requirements, targetAudience,
    price, enrollType, enrollStart, enrollEnd, batches, trainer, maxStudents,
    sections,
    visibility, enableCertificate, certPassScore, enableDiscussion,
    courseValidity, welcomeMessage, congratsMessage, metaTitle, metaDescription,
  } = body;

  const reviewStatus = body.reviewStatus === 'pending_review' ? 'pending_review' : 'draft';

  return {
    title,
    subtitle: subtitle || '',
    description: sanitizeCourseDescription(description),
    fullDescription: sanitizeCourseDescription(fullDescription || ''),
    overview: overview || '',
    category,
    subCategory: subCategory || '',
    language: language || 'en',
    level: level || 'beginner',
    tags: Array.isArray(tags) ? tags : [],
    thumbnail: thumbnail || '',
    promoVideo: promoVideo || '',

    objectives: Array.isArray(objectives) ? objectives.filter(Boolean) : [],
    requirements: Array.isArray(requirements) ? requirements.filter(Boolean) : [],
    targetAudience: targetAudience || '',

    pricing: {
      isFree: false,
      amount: price ?? 50,
      currency: 'INR',
    },

    enrollmentType: enrollType || 'open',
    enrollStart: enrollStart || null,
    enrollEnd: enrollEnd || null,
    maxStudents: maxStudents ? Number(maxStudents) : null,
    trainer: trainer || userId,  // Use current user as trainer if not specified
    batches: Array.isArray(batches) ? batches : [],

    sections: Array.isArray(sections)
      ? sections.map((sec, si) => ({
        _id: objectIdOrNew(sec._id || sec.id),
        title: sec.title?.trim() || "Untitled Section",
        description: sanitizeCourseDescription(sec.description || ''),
        fullDescription: sanitizeCourseDescription(sec.fullDescription || ''),
        order: si,
        lessons: Array.isArray(sec.lessons)
          ? sec.lessons.map((les, li) => sanitizeLessonForSave(les, li))
          : [],
      }))
      : [],

    visibility: visibility || 'draft',
    enableCertificate: enableCertificate !== false,
    certPassScore: certPassScore ?? 70,
    enableDiscussion: enableDiscussion !== false,
    courseValidity: courseValidity || '365',
    welcomeMessage: welcomeMessage || '',
    congratsMessage: congratsMessage || '',
    metaTitle: metaTitle || '',
    metaDescription: metaDescription || '',

    status: 'draft',
    reviewStatus,
    isPublished: false,
    createdBy: userId,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Create a new course
 * @route   POST /api/v1/courses
 * @access  Private (trainer / admin)
 */
export const createCourse = asyncHandler(async (req, res, next) => {
  if (!req.body.title || !req.body.description || !req.body.category) {
    return next(new ErrorResponse('Title, description and category are required', 400));
  }

  const descriptionMeta = getDescriptionMeta(req.body.description);
  console.log('[COURSE] create description meta:', descriptionMeta);
  if (descriptionMeta.hasBlobUrl) {
    return next(new ErrorResponse('Course description contains temporary blob image URLs. Please re-upload images and try again.', 400));
  }

  const courseData = mapFormToSchema(req.body, req.user._id);
  await hydrateLessonTranscriptsFromFileAssets(courseData);
  const course = await Course.create(courseData);
  enqueueVideoSummariesForCourse(course, { requestedBy: req.user?._id });

  // Send notifications to students only after admin-approved publishing.
  if (course.isPublished && course.reviewStatus === 'published') try {
    const { createNotification } = await import('./notification.controller.js');
    const { sendNotification } = await import('../utils/socketEmitter.js');
    const Participant = (await import('../models/Participant.model.js')).default;

    const activeParticipants = await Participant.find({ isActive: true }).select('_id').lean();

    for (const participant of activeParticipants) {
      await createNotification(
        participant._id.toString(),
        'New Course Available',
        `A new course "${course.title}" has been added to the platform`,
        'success',
        'courses'
      );

      // Send real-time notification
      const io = req.app?.get('io');
      if (io) {
        sendNotification(io, participant._id.toString(), {
          _id: course._id,
          title: 'New Course Available',
          message: `${course.title} - Enroll now!`,
          type: 'success',
          createdAt: new Date()
        });
      }
    }

    console.log(`✅ Course creation notifications sent to ${activeParticipants.length} students`);
  } catch (notifError) {
    console.error('❌ Failed to send course notifications:', notifError);
  }

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: course,
  });
});

/**
 * @desc    Save course as draft (upsert by id)
 * @route   PUT /api/v1/courses/:courseId
 * @access  Private (trainer / admin)
 */
export const updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.courseId)
    .populate('trainer', 'name email firstName lastName');

  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  ensureCourseOwnerOrAdmin(course, req.user);

  if (req.user.role !== 'administrator' && course.reviewStatus === 'pending_review') {
    return next(new ErrorResponse('This course is under admin review. You can edit it only after admin requests changes or you withdraw review.', 403));
  }

  if (req.user.role !== 'administrator' && course.reviewStatus === 'published') {
    return next(new ErrorResponse('Published course changes require admin approval. Direct editing is disabled for now.', 403));
  }

  if (typeof req.body.description === 'string') {
    const descriptionMeta = getDescriptionMeta(req.body.description);
    console.log('[COURSE] update description meta:', descriptionMeta);
    if (descriptionMeta.hasBlobUrl) {
      return next(new ErrorResponse('Course description contains temporary blob image URLs. Please re-upload images and try again.', 400));
    }
  }

  const updates = mapFormToSchema(req.body, req.user._id);
  updates.sections = mergeSectionsForSave(course.sections || [], req.body.sections || []);
  await hydrateLessonTranscriptsFromFileAssets(updates);
  delete updates.createdBy; // don't overwrite ownership
  if (req.user.role !== 'administrator') {
    updates.reviewStatus = ['changes_requested', 'rejected'].includes(course.reviewStatus) ? course.reviewStatus : 'draft';
    updates.isPublished = false;
  }

  const previousLessonSummaries = new Map();
  for (const section of course.sections || []) {
    for (const lesson of section.lessons || []) {
      previousLessonSummaries.set(String(lesson._id), {
        videoUrl: lesson.videoUrl || '',
        lessonVideo: lesson.lessonVideo || '',
        transcript: lesson.transcript || '',
        videoSummary: lesson.videoSummary?.toObject ? lesson.videoSummary.toObject() : lesson.videoSummary,
      });
    }
  }

  for (const section of updates.sections || []) {
    for (const lesson of section.lessons || []) {
      const previous = lesson._id ? previousLessonSummaries.get(String(lesson._id)) : null;
      if (!previous) continue;

      const sameVideo = (previous.videoUrl || '') === (lesson.videoUrl || '')
        && (previous.lessonVideo || '') === (lesson.lessonVideo || '');
      if (!sameVideo) continue;

      if (!lesson.transcript && previous.transcript) {
        lesson.transcript = previous.transcript;
      }
      if (previous.videoSummary) {
        lesson.videoSummary = normalizeVideoSummary(lesson.videoSummary || {}, previous.videoSummary);
      }
    }
  }

  console.log('[COURSE SAVE] draft save started', { courseId: String(course._id), user: String(req.user?._id || '') });
  console.log('[COURSE SAVE] incoming sections count', { count: updates.sections?.length || 0 });
  console.log('[COURSE SAVE] incoming lesson keys', (req.body.sections || []).map((section) => (section.lessons || []).map((lesson) => Object.keys(lesson || {}))));
  for (const [idx, section] of (updates.sections || []).entries()) {
    console.log('[COURSE SAVE] incoming lessons count per section', { sectionIndex: idx, sectionId: String(section._id), lessons: section.lessons?.length || 0 });
  }

  Object.assign(course, updates);
  try {
    await course.save();
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map((err) => ({
        path: err.path,
        value: err.value,
        allowedValues: err.properties?.enumValues || (String(err.path || '').includes('videoSummary.status') ? VIDEO_SUMMARY_STATUS_VALUES : undefined),
      }));
      return res.status(400).json({
        success: false,
        message: 'Course save failed',
        errorCode: 'COURSE_VALIDATION_ERROR',
        details,
      });
    }
    throw error;
  }
  console.log('[COURSE SAVE] save success', { courseId: String(course._id) });
  enqueueVideoSummariesForCourse(course, { requestedBy: req.user?._id });

  // Re-populate trainer after save
  await course.populate('trainer', 'name email firstName lastName');

  res.status(200).json({
    success: true,
    message: 'Course updated successfully',
    data: course,
  });
});

/**
 * @desc    Get all courses (with filters)
 * @route   GET /api/v1/courses
 * @access  Public / Private
 */
export const getCourses = asyncHandler(async (req, res) => {
  const {
    status, category, level, language,
    search, page = 1, limit = 20,
    createdBy,
  } = req.query;

  const filter = {};

  if (category) filter.category = category;
  if (level) filter.level = level;
  if (language) filter.language = language;

  // Handle createdBy filter
  if (createdBy) {
    if (createdBy === 'me' && req.user) {
      // Special case: 'me' means current user's courses only
      filter.$or = [{ createdBy: req.user._id }, { trainer: req.user._id }];
    } else {
      filter.createdBy = createdBy;
    }
  }

  if (req.user) {
    if (req.user.role === 'administrator') {
      // Admin sees everything — apply status filter if provided
      if (status) {
        if (['pending_review', 'changes_requested', 'published', 'rejected', 'unpublished'].includes(status)) filter.reviewStatus = status;
        else filter.status = status;
      }
    } else {
      // If createdBy filter is already set (including 'me'), use it exclusively
      if (filter.createdBy || (createdBy === 'me')) {
        // Only show user's own courses with optional status filter
        if (status) {
          if (['pending_review', 'changes_requested', 'published', 'rejected', 'unpublished'].includes(status)) filter.reviewStatus = status;
          else filter.status = status;
        }
      } else if (req.user.role === 'student' || req.user.role === 'participant') {
        filter.isPublished = true;
        filter.status = 'active';
        filter.visibility = 'public';
        filter.$or = [{ reviewStatus: 'published' }, { reviewStatus: { $exists: false } }];
      } else {
        // Trainer / participant: see own courses OR active public courses
        const orClauses = [
          { createdBy: req.user._id },
          { trainer: req.user._id },
          { isPublished: true, status: 'active', visibility: 'public', $or: [{ reviewStatus: 'published' }, { reviewStatus: { $exists: false } }] },
        ];
        // If a specific status filter is requested, narrow own-courses clauses
        if (status) {
          if (['pending_review', 'changes_requested', 'published', 'rejected', 'unpublished'].includes(status)) {
            orClauses[0].reviewStatus = status;
            orClauses[1].reviewStatus = status;
          } else {
            orClauses[0].status = status;
            orClauses[1].status = status;
          }
        }
        filter.$or = orClauses;
      }
    }
  } else {
    // Unauthenticated: only admin-approved public courses
    filter.isPublished = true;
    filter.status = 'active';
    filter.visibility = 'public';
    filter.$or = [{ reviewStatus: 'published' }, { reviewStatus: { $exists: false } }];
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .select('title subtitle description fullDescription overview slug category subCategory level language tags thumbnail status reviewStatus isPublished submittedForReviewAt publishedAt rejectedAt unpublishedAt adminReview reviewHistory visibility pricing enrollmentType currentEnrollments trainer batches ratings statistics createdBy createdAt updatedAt sections')
      .populate('trainer', 'name email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Course.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: courses,
  });
});

/**
 * @desc    Get single course
 * @route   GET /api/v1/courses/:courseId
 * @access  Public / Private
 */
export const getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId)
    .populate('trainer', 'name email firstName lastName')
    .populate('departments', 'name code')
    .populate('batches', 'name code department year');

  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  const isPublishedCourse = course.isPublished && course.status === 'active' && (course.reviewStatus === 'published' || !course.reviewStatus);
  const isOwner = req.user && getCourseOwnerIds(course).includes(String(req.user._id));
  const isAdmin = req.user?.role === 'administrator';
  let isEnrolled = false;
  if (req.user && !isPublishedCourse && !isOwner && !isAdmin) {
    isEnrolled = !!(await Enrollment.exists({
      course: course._id,
      user: req.user._id,
      status: { $in: ['enrolled', 'in-progress', 'completed', 'active'] },
    }));
  }

  if (!isPublishedCourse && !isOwner && !isAdmin && !isEnrolled) {
    return next(new ErrorResponse('This course is not available for students yet', 404));
  }

  if (req.user?.role === 'student') {
    logStudentActivity({
      req,
      studentId: req.user._id,
      courseId: course._id,
      activityType: 'course_viewed',
      title: course.title || 'Course viewed',
      description: course.status === 'archived' ? 'Opened archived course notice' : 'Opened course details',
      status: 'success',
    }).catch(() => {});
  }

  if (isEnrolled && course.status === 'archived' && !isOwner && !isAdmin) {
    return res.status(200).json({ success: true, data: buildArchivedCourseSnapshot(course) });
  }

  res.status(200).json({ success: true, data: course });
});

export const saveLesson = asyncHandler(async (req, res, next) => {
  const { courseId, sectionId, lessonId } = req.params;
  console.log('[LESSON SAVE] started', { courseId, sectionId, lessonId });
  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse('Course not found', 404));
  ensureCourseOwnerOrAdmin(course, req.user);

  let section = (course.sections || []).find((item) => String(item._id) === String(sectionId));
  if (!section) {
    section = course.sections.create({
      _id: objectIdOrNew(sectionId),
      title: req.body.section?.title || 'Untitled Section',
      description: sanitizeCourseDescription(req.body.section?.description || ''),
      order: course.sections.length,
      lessons: [],
    });
    course.sections.push(section);
    console.log('[LESSON SAVE] new section created', { sectionId: String(section._id) });
  }

  const incoming = req.body.lesson || req.body || {};
  console.log('[LESSON SAVE] received body keys:', Object.keys(req.body || {}));
  console.log('[LESSON SAVE] fields received', {
    keys: Object.keys(incoming || {}),
    hasVideoDescription: typeof incoming.videoDescription === 'string',
    hasTranscript: typeof incoming.transcript === 'string' && incoming.transcript.length > 0,
    hasSummary: typeof incoming.summary === 'string' && incoming.summary.length > 0,
    resources: Array.isArray(incoming.resources) ? incoming.resources.length : 0,
    assignments: Array.isArray(incoming.assignments) ? incoming.assignments.length : (incoming.assignment ? 1 : 0),
    knowledgeChecks: Array.isArray(incoming.knowledgeChecks) ? incoming.knowledgeChecks.length : 0,
  });
  let lesson = (section.lessons || []).find((item) => String(item._id) === String(lessonId));
  const mergedIncoming = mergeDefinedLessonInput(incoming, lesson);
  const sanitized = sanitizeLessonForSave({ ...mergedIncoming, _id: lesson?._id || lessonId }, section.lessons.length, lesson);
  if (lesson) {
    Object.assign(lesson, sanitized);
    console.log('[LESSON SAVE] existing lesson updated', { lessonId: String(lesson._id) });
  } else {
    lesson = section.lessons.create(sanitized);
    section.lessons.push(lesson);
    console.log('[LESSON SAVE] new lesson created', { lessonId: String(lesson._id) });
  }

  if (lesson.videoAsset?.fileAssetId) console.log('[LESSON SAVE] videoAsset saved', { fileAssetId: String(lesson.videoAsset.fileAssetId) });
  await hydrateLessonTranscriptsFromFileAssets({ sections: [section] });
  await course.save();
  console.log('[LESSON SAVE] success', {
    courseId,
    sectionId: String(section._id),
    lessonId: String(lesson._id),
    transcriptLength: String(lesson.transcript || '').length,
    summaryLength: String(lesson.summary || '').length,
    videoDescriptionLength: String(lesson.videoDescription || '').length,
    assignments: lesson.assignments?.length || 0,
    resources: lesson.resources?.length || 0,
    knowledgeChecks: lesson.knowledgeChecks?.length || 0,
  });

  res.json({
    success: true,
    message: 'Lesson saved successfully',
    data: {
      courseId: String(course._id),
      sectionId: String(section._id),
      lessonId: String(lesson._id),
      lesson,
      course,
    },
  });
});

export const createLesson = asyncHandler(async (req, res, next) => {
  req.params.lessonId = new mongoose.Types.ObjectId().toString();
  return saveLesson(req, res, next);
});

export const createSectionWithLessons = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const course = await Course.findById(courseId);
  if (!course) return next(new ErrorResponse('Course not found', 404));
  ensureCourseOwnerOrAdmin(course, req.user);

  const incomingSection = req.body.section || req.body || {};
  const sectionId = new mongoose.Types.ObjectId();
  const section = course.sections.create({
    _id: sectionId,
    title: incomingSection.title?.trim() || 'Untitled Section',
    description: sanitizeCourseDescription(incomingSection.description || ''),
    fullDescription: sanitizeCourseDescription(incomingSection.fullDescription || ''),
    order: Number.isFinite(Number(incomingSection.order)) ? Number(incomingSection.order) : course.sections.length,
    lessons: Array.isArray(incomingSection.lessons)
      ? incomingSection.lessons.map((lesson, index) => sanitizeLessonForSave(lesson, index))
      : [],
  });
  course.sections.push(section);
  await hydrateLessonTranscriptsFromFileAssets({ sections: [section] });
  await course.save();

  res.status(201).json({
    success: true,
    message: 'Section saved successfully',
    data: {
      courseId: String(course._id),
      sectionId: String(section._id),
      section,
      course,
    },
  });
});

/**
 * @desc    Update course status (active / archived / draft)
 * @route   PATCH /api/v1/courses/:courseId/status
 * @access  Private (trainer / admin)
 */
export const updateCourseStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['draft', 'active', 'archived'].includes(status)) {
    return next(new ErrorResponse('Status must be draft, active, or archived', 400));
  }

  const course = await Course.findById(req.params.courseId);

  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  const isOwner = getCourseOwnerIds(course).includes(String(req.user._id));
  const isAdmin = req.user.role === 'administrator';

  if (!isOwner && !isAdmin) {
    return next(new ErrorResponse('Not authorised to change this course status', 403));
  }

  if (!isAdmin && status === 'active') {
    return next(new ErrorResponse('Archived courses must be submitted for admin review before they can be republished.', 403));
  }

  course.status = status;
  // Sync isPublished
  course.isPublished = isAdmin && status === 'active';
  course.reviewStatus = isAdmin && status === 'active' ? 'published' : status === 'archived' ? 'unpublished' : 'draft';
  if (isAdmin && status === 'active' && !course.publishedAt) {
    course.publishedAt = new Date();
  }
  await course.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `Course status updated to "${status}"`,
    data: { _id: course._id, status: course.status, isPublished: course.isPublished },
  });
});

export const submitCourseForReview = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new ErrorResponse('Course not found', 404));
  ensureCourseOwner(course, req.user);

  if (course.reviewStatus === 'pending_review') {
    return next(new ErrorResponse('Course is already under admin review', 400));
  }
  if (course.reviewStatus === 'published') {
    return next(new ErrorResponse('Published course changes require admin approval. Direct resubmission is disabled for now.', 400));
  }

  const issues = validateReviewReady(course);
  if (issues.length) return next(new ErrorResponse(issues.join(', '), 400));

  course.reviewStatus = 'pending_review';
  course.status = 'draft';
  course.isPublished = false;
  course.submittedForReviewAt = new Date();
  course.submittedBy = req.user._id;
  course.adminReview = {
    decision: null,
    message: '',
    reviewedAt: null,
    reviewedBy: null,
  };
  pushReviewHistory(course, { status: 'pending_review', decision: 'submitted', message: 'Submitted for admin review', user: req.user });
  await course.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Course submitted for admin review', data: course });
});

export const withdrawCourseReview = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new ErrorResponse('Course not found', 404));
  ensureCourseOwner(course, req.user);
  if (course.reviewStatus !== 'pending_review') return next(new ErrorResponse('Only pending review courses can be withdrawn', 400));

  course.reviewStatus = 'draft';
  course.status = 'draft';
  course.isPublished = false;
  pushReviewHistory(course, { status: 'draft', decision: 'withdrawn', message: 'Teacher withdrew review request', user: req.user });
  await course.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Course review request withdrawn', data: course });
});

export const getAdminCourseReviewList = asyncHandler(async (req, res) => {
  const { status, teacherId, search, category, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.reviewStatus = status;
  if (teacherId && teacherId !== 'all') filter.$or = [{ trainer: teacherId }, { createdBy: teacherId }];
  if (category && category !== 'all') filter.category = category;
  if (search) {
    const regex = new RegExp(String(search).trim(), 'i');
    filter.$or = [
      ...(filter.$or || []),
      { title: regex },
      { subtitle: regex },
      { description: regex },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [courses, total, stats] = await Promise.all([
    Course.find(filter)
      .populate('trainer', 'name email firstName lastName fullName')
      .populate('createdBy', 'name email firstName lastName fullName')
      .sort({ submittedForReviewAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Course.countDocuments(filter),
    Course.aggregate([{ $group: { _id: '$reviewStatus', count: { $sum: 1 } } }]),
  ]);

  const summary = stats.reduce((acc, item) => {
    acc[item._id || 'draft'] = item.count;
    acc.total = (acc.total || 0) + item.count;
    return acc;
  }, { total: 0 });

  res.json({ success: true, data: courses, total, page: Number(page), pages: Math.ceil(total / Number(limit)), summary });
});

export const getAdminCourseReviewDetail = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId)
    .populate('trainer', 'name email firstName lastName fullName')
    .populate('createdBy', 'name email firstName lastName fullName')
    .populate('reviewHistory.changedBy', 'name email firstName lastName fullName')
    .populate('adminReview.reviewedBy', 'name email firstName lastName fullName')
    .lean();
  if (!course) return next(new ErrorResponse('Course not found', 404));
  res.json({ success: true, data: course });
});

const applyAdminReviewDecision = async ({ req, next, status, decision, messageRequired = false }) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new ErrorResponse('Course not found', 404));
  const message = sanitizeReviewMessage(req.body.message);
  if (messageRequired && !message) return next(new ErrorResponse('Review message is required', 400));

  course.reviewStatus = status;
  course.reviewedBy = req.user._id;
  course.adminReview = {
    decision,
    message,
    reviewedAt: new Date(),
    reviewedBy: req.user._id,
  };

  if (status === 'published') {
    course.status = 'active';
    course.visibility = 'public';
    course.isPublished = true;
    course.publishedAt = new Date();
  } else {
    course.isPublished = false;
    course.status = status === 'unpublished' ? 'archived' : 'draft';
    if (status === 'rejected') course.rejectedAt = new Date();
    if (status === 'unpublished') course.unpublishedAt = new Date();
  }

  pushReviewHistory(course, { status, decision, message, user: req.user });
  await course.save({ validateBeforeSave: false });
  return course;
};

export const publishCourse = asyncHandler(async (req, res, next) => {
  const course = await applyAdminReviewDecision({ req, next, status: 'published', decision: 'approved' });
  if (!course) return;
  res.json({ success: true, message: 'Course published', data: course });
});

export const requestCourseChanges = asyncHandler(async (req, res, next) => {
  const course = await applyAdminReviewDecision({ req, next, status: 'changes_requested', decision: 'changes_requested', messageRequired: true });
  if (!course) return;
  res.json({ success: true, message: 'Changes requested', data: course });
});

export const rejectCourse = asyncHandler(async (req, res, next) => {
  const course = await applyAdminReviewDecision({ req, next, status: 'rejected', decision: 'rejected', messageRequired: true });
  if (!course) return;
  res.json({ success: true, message: 'Course rejected', data: course });
});

export const unpublishCourse = asyncHandler(async (req, res, next) => {
  const course = await applyAdminReviewDecision({ req, next, status: 'unpublished', decision: 'changes_requested' });
  if (!course) return;
  res.json({ success: true, message: 'Course unpublished', data: course });
});

/**
 * @desc    Delete course
 * @route   DELETE /api/v1/courses/:courseId
 * @access  Private (admin only)
 */
export const deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);

  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  await course.deleteOne();

  res.status(200).json({ success: true, message: 'Course deleted successfully' });
});
