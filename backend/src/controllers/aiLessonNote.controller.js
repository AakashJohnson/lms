import Course from '../models/Course.model.js';
import AiLessonNote from '../models/AiLessonNote.model.js';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import {
  buildInsufficientLectureNotes,
  buildGlobalLessonContext,
  buildLessonTextForAi,
  buildVideoSummaryExtras,
  generateAiLessonNotesHeuristicFromLesson,
  resolveLessonLectureText,
} from './aiLessonNote.service.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';
import { transcribeLessonVideo } from '../services/videoTranscription.service.js';
import { enqueueVideoSummaryJob, generateOrRegenerate, isVideoSummaryJobRunning } from '../services/videoSummaryJob.service.js';
import { normalizeSummaryType } from '../services/summaryGeneration.service.js';
import { logger } from '../config/logger.js';

// Note: For now we use a heuristic generator (no external LLM dependency).
// If later you add a real AI provider, swap the implementation behind the service.

/**
 * @route POST /api/v1/lesson-notes/ai/generate
 * @access Private (student)
 */
export const generateAiLessonNotes = asyncHandler(async (req, res, next) => {
  const { courseId, sectionId, lessonId, mode = 'short', transcript = '', sourceText = '' } = req.body || {};

  if (!courseId || !sectionId || !lessonId) {
    return next(new ErrorResponse('courseId, sectionId, and lessonId are required', 400));
  }

  if (!['short', 'detailed'].includes(mode)) {
    return next(new ErrorResponse('mode must be either short or detailed', 400));
  }

  // Fetch lesson content from embedded course structure
  const course = await Course.findById(courseId)
    .select('title subtitle description objectives requirements targetAudience tags sections')
    .lean();
  if (!course) return next(new ErrorResponse('Course not found', 404));

  const section = (course.sections || []).find((s) => String(s._id) === String(sectionId));
  const lesson = (section?.lessons || []).find((l) => String(l._id) === String(lessonId));

  if (!section || !lesson) {
    return next(new ErrorResponse('Lesson not found in this course', 404));
  }

  let generated;
  const start = Date.now();
  const transcriptOverride = transcript || sourceText;
  let lecture = await resolveLessonLectureText({ lesson, transcriptOverride });

  // Fallback: Try to transcribe video if no transcript found (handles both local and DB videos)
  if (!lecture.text && (lesson.videoUrl || lesson.lessonVideo || lesson.videoAsset?.fileAssetId)) {
    try {
      console.log(`[AI] Attempting fallback video transcription for lesson ${lessonId}`);
      const videoTranscript = await transcribeLessonVideo({ lesson });
      if (videoTranscript) {
        console.log(`[AI] Fallback transcription successful`);
        lecture = { text: videoTranscript, source: 'video-asr' };
      }
    } catch (error) {
      console.warn(`[AI] Fallback transcription failed: ${error.message}`);
      // Check if it's a DB video asset issue
      if (lesson.videoAsset?.fileAssetId && error.message.includes('not found')) {
        console.error(`[AI] FileAsset referenced but missing: ${lesson.videoAsset.fileAssetId}`);
      }
      await logAiUsage({
        userId: req.user?._id,
        feature: 'ai_video_transcription',
        status: 'failed',
        latencyMs: Date.now() - start,
        requestMeta: { courseId, lessonId, videoAssetId: lesson.videoAsset?.fileAssetId },
        errorMessage: error.message,
      });
    }
  }

  const shouldCacheTranscript = ['youtube-captions', 'manual-transcript', 'video-asr'].includes(lecture.source);
  const lessonForNotes = shouldCacheTranscript
    ? { ...lesson, transcript: lecture.text }
    : lesson;
  const lessonContext = buildLessonTextForAi({ course, section, lesson: lessonForNotes });
  const globalContext = buildGlobalLessonContext({ course, section, lesson: lessonForNotes });

  if (shouldCacheTranscript) {
    Course.updateOne(
      { _id: courseId },
      { $set: { 'sections.$[section].lessons.$[lesson].transcript': lecture.text } },
      {
        arrayFilters: [
          { 'section._id': mongoose.Types.ObjectId.isValid(sectionId) ? new mongoose.Types.ObjectId(sectionId) : sectionId },
          { 'lesson._id': mongoose.Types.ObjectId.isValid(lessonId) ? new mongoose.Types.ObjectId(lessonId) : lessonId },
        ],
      },
    ).catch(() => {});
  }

  if (!lecture.text) {
    generated = buildInsufficientLectureNotes({ lessonTitle: lesson.title, mode });
    await logAiUsage({
      userId: req.user?._id,
      feature: 'ai_notes_generate',
      status: 'fallback',
      latencyMs: Date.now() - start,
      requestMeta: { mode, courseId, lessonId, reason: 'missing_lecture_transcript' },
      errorMessage: 'No lecture transcript or meaningful lesson content was available',
    });
  } else {
    try {
      const aiResponse = await callAiService({
        endpoint: '/v1/notes/generate',
        payload: {
          mode,
          lessonTitle: lessonForNotes.title,
          courseTitle: course.title,
          globalContext,
          lessonContent: lessonContext,
          sourceType: lecture.source,
          lessonQuestions: lessonForNotes.questions || [],
          lessonResources: lessonForNotes.resources || [],
        },
      });
      generated = aiResponse?.data || aiResponse;
      await logAiUsage({
        userId: req.user?._id,
        feature: 'ai_notes_generate',
        status: 'success',
        latencyMs: Date.now() - start,
        tokens: aiResponse?.meta?.tokens || {},
        requestMeta: { mode, courseId, lessonId },
        model: aiResponse?.meta?.model,
      });
    } catch (error) {
      generated = await generateAiLessonNotesHeuristicFromLesson({
        lessonTitle: lessonForNotes.title,
        courseTitle: course.title,
        course,
        section,
        lesson: lessonForNotes,
        mode,
      });
      await logAiUsage({
        userId: req.user?._id,
        feature: 'ai_notes_generate',
        status: 'fallback',
        latencyMs: Date.now() - start,
        requestMeta: { mode, courseId, lessonId },
        errorMessage: error.message,
      });
    }
  }

  if (lecture.text) {
    generated = {
      ...generated,
      ...buildVideoSummaryExtras({
        transcript: lecture.text,
        generated,
        lessonTitle: lessonForNotes.title || lesson.title,
        globalContext,
      }),
    };
  }

  const doc = await AiLessonNote.create({
    student: req.user._id,
    course: courseId,
    section: String(sectionId),
    lesson: String(lessonId),
    mode,
    source: {
      inputType: lecture.source || 'missing-lecture-source',
      transcript: lecture.text || '',
      transcriptLanguage: process.env.NVIDIA_ASR_LANGUAGE || 'en',
      transcriptGeneratedAt: lecture.text ? new Date() : undefined,
    },
    generated,
  });

  res.status(201).json({ success: true, data: doc });
});

/**
 * @route GET /api/v1/lesson-notes/ai/latest/:courseId/:sectionId/:lessonId
 * @access Private
 */
export const getLatestAiLessonNotes = asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId } = req.params;

  const note = await AiLessonNote.findOne({
    student: req.user._id,
    course: courseId,
    section: String(sectionId),
    lesson: String(lessonId),
  }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: note || null });
});

/**
 * @route POST /api/v1/lesson-notes/ai/:aiNoteId/bookmark
 * @access Private
 */
export const bookmarkAiLessonNotes = asyncHandler(async (req, res, next) => {
  const { aiNoteId } = req.params;
  const { sectionType, label = '' } = req.body || {};

  if (!aiNoteId) return next(new ErrorResponse('aiNoteId is required', 400));

  const allowed = ['summary', 'keyTakeaways', 'mindMap', 'interviewQuestions', 'examples', 'revisionMaterial'];
  if (!sectionType || !allowed.includes(sectionType)) {
    return next(new ErrorResponse(`sectionType must be one of: ${allowed.join(', ')}`, 400));
  }

  const doc = await AiLessonNote.findById(aiNoteId);
  if (!doc) return next(new ErrorResponse('AI note not found', 404));

  if (String(doc.student) !== String(req.user._id)) {
    return next(new ErrorResponse('Not authorized to access this note', 403));
  }

  const existingIndex = (doc.bookmarks || []).findIndex((b) => b.sectionType === sectionType);
  const bookmarked = existingIndex === -1;
  if (bookmarked) {
    doc.bookmarks = doc.bookmarks || [];
    doc.bookmarks.push({ sectionType, label });
  } else {
    doc.bookmarks.splice(existingIndex, 1);
  }

  await doc.save();

  res.status(200).json({ success: true, data: doc, bookmarked });
});

/**
 * @route POST /api/v1/lesson-notes/ai/:aiNoteId/save
 * @access Private
 */
export const saveAiLessonNotesForRevision = asyncHandler(async (req, res, next) => {
  const { aiNoteId } = req.params;
  const { savedForRevision } = req.body || {};

  const doc = await AiLessonNote.findById(aiNoteId);
  if (!doc) return next(new ErrorResponse('AI note not found', 404));

  if (String(doc.student) !== String(req.user._id)) {
    return next(new ErrorResponse('Not authorized to access this note', 403));
  }

  doc.isSavedForRevision = typeof savedForRevision === 'boolean' ? savedForRevision : !doc.isSavedForRevision;
  await doc.save();

  res.status(200).json({ success: true, data: doc });
});

const toObjectIdOrString = (value) => (
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value
);

const findCourseLesson = async ({ courseId, sectionId, lessonId }) => {
  const course = await Course.findById(courseId).select('title createdBy trainer sections').lean();
  if (!course) return { course: null, section: null, lesson: null };

  const section = (course.sections || []).find((item) => String(item._id) === String(sectionId));
  const lesson = (section?.lessons || []).find((item) => String(item._id) === String(lessonId));
  return { course, section, lesson };
};

const statusProgressMap = {
  idle: 0,
  pending: 0,
  queued: 0,
  reading_gridfs_video: 10,
  validating_video_audio: 20,
  extracting_audio: 30,
  validating_extracted_audio: 35,
  transcribing: 50,
  generating_transcript: 50,
  transcript_completed: 55,
  transcript_failed: 0,
  creating_summary: 90,
  generating_summary: 90,
  completed: 100,
  failed: 0,
};

const statusMessage = (status, summaryType = 'short') => {
  const label = summaryType === 'detailed' ? 'detailed' : 'short';
  const messages = {
    idle: 'No AI summary has been generated yet.',
    pending: 'AI summary is queued.',
    queued: 'AI summary is queued.',
    reading_gridfs_video: 'Step 1 of 3: Reading video from storage...',
    validating_video_audio: 'Validating video audio stream...',
    extracting_audio: 'Extracting audio from video...',
    validating_extracted_audio: 'Validating extracted audio...',
    transcribing: 'AI is generating transcript...',
    generating_transcript: 'AI is generating transcript...',
    transcript_completed: 'Transcript generated successfully.',
    transcript_failed: 'Transcript generation failed.',
    creating_summary: `Creating ${label} summary...`,
    generating_summary: `Creating ${label} summary...`,
    completed: `${label === 'detailed' ? 'Detailed' : 'Short'} English summary generated successfully.`,
    failed: 'AI summary generation failed.',
  };
  return messages[status] || messages.idle;
};

const buildVideoSummaryResponse = (videoSummary = {}, summaryTypeInput) => {
  const summaryType = normalizeSummaryType(summaryTypeInput || videoSummary.summaryType);
  const version = videoSummary.summaryVersions?.[summaryType] || {};
  const status = version.status || videoSummary.aiProcessingStatus || videoSummary.status || 'idle';
  const generated = version.generated || videoSummary.generated || {};
  const legacySummary = summaryType === 'detailed'
    ? generated.detailedSummary || generated.summary
    : generated.summary;
  const summary = version.summary || legacySummary || '';
  const progress = Math.max(
    Number(version.progress ?? 0),
    Number(videoSummary.progress ?? 0),
    Number(videoSummary.aiProcessingProgress ?? 0),
    Number(statusProgressMap[status] ?? 0),
  );
  const error = version.error || videoSummary.aiProcessingError || videoSummary.error || '';
  const errorCode = version.errorCode || videoSummary.errorCode || '';
  const warning = version.warning || videoSummary.warning || '';

  const resObj = {
    ...videoSummary,
    status,
    step: status,
    progress,
    summaryType,
    message: videoSummary.stage || statusMessage(status, summaryType),
    rawTranscriptAvailable: Boolean(videoSummary.rawTranscript || videoSummary.transcript),
    cleanedTranscriptAvailable: Boolean(version.cleanedTranscript || videoSummary.cleanedTranscript),
    summaryAvailable: Boolean(summary),
    summary,
    generated,
    transcript: videoSummary.rawTranscript || videoSummary.transcript || '',
    cleanedTranscript: version.cleanedTranscript || videoSummary.cleanedTranscript || '',
    transcriptAnalysisMeta: version.transcriptAnalysisMeta || videoSummary.transcriptAnalysisMeta || {},
    transcriptWordCount: version.transcriptWordCount || videoSummary.transcriptWordCount || 0,
    warning,
    error,
    errorMessage: error,
    errorCode,
    transcriptStatus: videoSummary.transcriptStatus || (Boolean(videoSummary.rawTranscript || videoSummary.transcript) ? 'completed' : 'idle'),
  };

  if (process.env.NODE_ENV === 'development') {
    resObj.selectedFileId = videoSummary.sourceGridfsFileId || '';
  }

  return resObj;
};

const getClientAiError = (error) => {
  const raw = String(error?.code || error?.message || '');
  if (/FFMPEG_UNAVAILABLE|FFmpeg binary|Bundled FFmpeg/i.test(raw)) {
    return {
      statusCode: 422,
      code: 'FFMPEG_UNAVAILABLE',
      message: 'Video transcription is temporarily unavailable because FFmpeg is missing. Video playback is not affected.',
    };
  }
  if (/TRANSCRIPTION_ALREADY_RUNNING/i.test(raw)) {
    return {
      statusCode: 202,
      code: 'TRANSCRIPTION_ALREADY_RUNNING',
      message: 'A transcript job is already running for this video.',
    };
  }
  if (/ECONNREFUSED|ECONNRESET|ECONNABORTED|socket hang up|cancelled|canceled|timeout|AI service/i.test(raw)) {
    return {
      statusCode: 422,
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI service stopped or disconnected during transcription. Keep AI service running and retry transcript generation.',
    };
  }
  return {
    statusCode: 422,
    code: error?.code || 'AI_GENERATION_FAILED',
    message: error?.message || 'AI generation failed',
  };
};

const runningVideoSummaryStatuses = new Set([
  'pending',
  'queued',
  'processing',
  'lesson_found',
  'selecting_video_asset',
  'downloading_gridfs_video',
  'reading_gridfs_video',
  'validating_video_audio',
  'transcribing',
  'extracting_audio',
  'validating_extracted_audio',
  'detecting_language',
  'detecting_speech',
  'generating_transcript',
  'cleaning_transcript',
  'analyzing_transcript',
  'creating_summary',
  'generating_summary',
  'saving_summary',
]);

const getVideoSummaryLastActivityAt = (videoSummary = {}, summaryType) => {
  const version = videoSummary.summaryVersions?.[summaryType] || {};
  const candidates = [
    version.updatedAt,
    version.startedAt,
    videoSummary.updatedAt,
    videoSummary.aiProcessingStartedAt,
    videoSummary.startedAt,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
};

const isStaleVideoSummaryJob = (videoSummary = {}, summaryType) => {
  const staleMs = Number(process.env.AI_VIDEO_JOB_STALE_MS || 600000);
  if (!Number.isFinite(staleMs) || staleMs <= 0) return false;
  const lastActivityAt = getVideoSummaryLastActivityAt(videoSummary, summaryType);
  if (!lastActivityAt) return true;
  return Date.now() - lastActivityAt > staleMs;
};

const shouldTreatRunningStatusAsInterrupted = ({ videoSummary = {}, summaryType, status, hasActiveWorker }) => {
  if (!runningVideoSummaryStatuses.has(status) || hasActiveWorker) return false;
  if (status === 'pending' || status === 'queued') return false;
  const lastActivityAt = getVideoSummaryLastActivityAt(videoSummary, summaryType);
  if (!lastActivityAt) return true;
  const interruptMs = Number(process.env.AI_VIDEO_JOB_INTERRUPTED_MS || 30000);
  return Date.now() - lastActivityAt > interruptMs;
};

const markInterruptedVideoSummaryJob = async ({ courseId, sectionId, lessonId, summaryType, onlyTranscript = true }) => {
  const failedStatus = onlyTranscript ? 'transcript_failed' : 'failed';
  const message = 'Previous transcript job was interrupted. Please retry generation.';
  await Course.updateOne(
    { _id: courseId },
    {
      $set: {
        'sections.$[section].lessons.$[lesson].videoSummary.status': failedStatus,
        'sections.$[section].lessons.$[lesson].videoSummary.aiProcessingStatus': failedStatus,
        'sections.$[section].lessons.$[lesson].videoSummary.aiProcessingProgress': 0,
        'sections.$[section].lessons.$[lesson].videoSummary.stage': message,
        'sections.$[section].lessons.$[lesson].videoSummary.error': message,
        'sections.$[section].lessons.$[lesson].videoSummary.aiProcessingError': message,
        'sections.$[section].lessons.$[lesson].videoSummary.updatedAt': new Date(),
        [`sections.$[section].lessons.$[lesson].videoSummary.summaryVersions.${summaryType}.status`]: failedStatus,
        [`sections.$[section].lessons.$[lesson].videoSummary.summaryVersions.${summaryType}.progress`]: 0,
        [`sections.$[section].lessons.$[lesson].videoSummary.summaryVersions.${summaryType}.error`]: message,
        [`sections.$[section].lessons.$[lesson].videoSummary.summaryVersions.${summaryType}.updatedAt`]: new Date(),
      },
    },
    {
      arrayFilters: [
        { 'section._id': toObjectIdOrString(sectionId) },
        { 'lesson._id': toObjectIdOrString(lessonId) },
      ],
    },
  );
  return message;
};

/**
 * @route GET /api/v1/lesson-notes/video-summary/:courseId/:sectionId/:lessonId
 * @access Private
 */
export const getVideoSummary = asyncHandler(async (req, res, next) => {
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  const { courseId, sectionId, lessonId } = req.params;
  const summaryType = normalizeSummaryType(req.query.summaryType);
  const { course, section, lesson } = await findCourseLesson({ courseId, sectionId, lessonId });

  if (!course) return next(new ErrorResponse('Course not found', 404));
  if (!section || !lesson) return next(new ErrorResponse('Lesson not found in this course', 404));

  const currentStatus = lesson.videoSummary?.summaryVersions?.[summaryType]?.status
    || lesson.videoSummary?.aiProcessingStatus
    || lesson.videoSummary?.status;
  const hasActiveWorker = currentStatus && isVideoSummaryJobRunning({ courseId, sectionId, lessonId, summaryType });
  if (shouldTreatRunningStatusAsInterrupted({
    videoSummary: lesson.videoSummary,
    summaryType,
    status: currentStatus,
    hasActiveWorker,
  })) {
    const message = await markInterruptedVideoSummaryJob({ courseId, sectionId, lessonId, summaryType, onlyTranscript: true });
    logger.warn('[AI SUMMARY] Interrupted running job marked failed during status poll', {
      courseId,
      sectionId,
      lessonId,
      summaryType,
      status: currentStatus,
    });
    return res.status(200).json({
      success: true,
      data: {
        ...buildVideoSummaryResponse({
          ...(lesson.videoSummary || {}),
          status: 'transcript_failed',
          aiProcessingStatus: 'transcript_failed',
          aiProcessingProgress: 0,
          progress: 0,
          stage: message,
          error: message,
          aiProcessingError: message,
          summaryVersions: {
            ...(lesson.videoSummary?.summaryVersions || {}),
            [summaryType]: {
              ...(lesson.videoSummary?.summaryVersions?.[summaryType] || {}),
              status: 'transcript_failed',
              progress: 0,
              error: message,
            },
          },
        }, summaryType),
        uploadedSummary: lesson.summary || "",
        teacherSummary: lesson.summary || "",
      },
    });
  }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.status(200).json({
    success: true,
    data: {
      ...buildVideoSummaryResponse(lesson.videoSummary || { status: 'idle' }, summaryType),
      uploadedSummary: lesson.summary || "",
      teacherSummary: lesson.summary || "",
    },
  });
});

/**
 * @route POST /api/v1/lesson-notes/video-summary/regenerate
 * @access Private
 */
export const regenerateVideoSummary = asyncHandler(async (req, res, next) => {
  const {
    courseId,
    sectionId,
    lessonId,
    forceRegenerate = true,
    forceTranscript = false,
    languageHint = 'auto',
    asrMode = 'Balanced',
    onlyTranscript = false
  } = req.body || {};
  const summaryType = normalizeSummaryType(req.body?.summaryType);
  logger.info('[AI SUMMARY] Regenerate requested', { courseId, sectionId, lessonId, summaryType, forceTranscript, languageHint, asrMode, onlyTranscript });

  if (!courseId || !sectionId || !lessonId) {
    return res.status(400).json({
      success: false,
      message: "Please save the lesson video before generating transcript.",
      code: "LESSON_NOT_SAVED"
    });
  }

  const { course, section, lesson } = await findCourseLesson({ courseId, sectionId, lessonId });
  if (!course || !section || !lesson) {
    return res.status(400).json({
      success: false,
      message: "Please save the lesson video before generating transcript.",
      code: "LESSON_NOT_SAVED"
    });
  }

  const isStudent = req.user?.role === 'student';
  const isTeacherOrAdmin = ['teacher', 'trainer', 'admin', 'administrator'].includes(req.user?.role);

  const persist = isTeacherOrAdmin && (req.body.persist === true || req.body.previewOnly !== true);
  const previewOnly = isStudent || req.body.previewOnly === true || !persist;

  const fileAssetId = lesson.videoAsset?.fileAssetId;
  const gridfsFileId = lesson.videoAsset?.gridfsFileId || lesson.videoAsset?.fileAssetId;
  if (fileAssetId || gridfsFileId) {
    const FileAsset = (await import('../models/FileAsset.model.js')).default;
    const searchConditions = [];
    if (mongoose.isValidObjectId(fileAssetId)) searchConditions.push({ _id: fileAssetId });
    if (mongoose.isValidObjectId(gridfsFileId)) searchConditions.push({ gridfsFileId });
    
    if (searchConditions.length > 0) {
      const asset = await FileAsset.findOne({ $or: searchConditions });
      if (!asset) {
        return res.status(400).json({
          success: false,
          message: "Please save the lesson video before generating transcript.",
          code: "LESSON_NOT_SAVED"
        });
      }
      if (asset.storageProvider === 'gridfs' && asset.gridfsFileId) {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: asset.bucketName || 'uploads' });
        const fileExists = await bucket.find({ _id: new mongoose.Types.ObjectId(asset.gridfsFileId) }).hasNext();
        if (!fileExists) {
          return res.status(400).json({
            success: false,
            message: "Please save the lesson video before generating transcript.",
            code: "LESSON_NOT_SAVED"
          });
        }
      }
    }
  }

  const videoUrl = lesson.videoUrl || lesson.lessonVideo || '';
  const hasVideoAsset = Boolean(lesson.videoAsset?.fileAssetId || lesson.videoAsset?.gridfsFileId);
  if (!videoUrl && !hasVideoAsset) {
    return res.status(400).json({
      success: false,
      message: "No lecture video is available for this lesson",
      code: "NO_VIDEO"
    });
  }

  if (persist) {
    const existingVersion = lesson.videoSummary?.summaryVersions?.[summaryType];
    if (!forceRegenerate && existingVersion?.status === 'completed' && existingVersion?.summary) {
      return res.status(200).json({
        success: true,
        mode: 'saved',
        persisted: true,
        summaryType,
        message: `${summaryType === 'detailed' ? 'Detailed' : 'Short'} summary already available`,
        data: {
          ...buildVideoSummaryResponse(lesson.videoSummary, summaryType),
          uploadedSummary: lesson.summary || "",
          teacherSummary: lesson.summary || "",
        },
      });
    }

    const currentStatus = lesson.videoSummary?.summaryVersions?.[summaryType]?.status || lesson.videoSummary?.status;
    const hasRunningStatus = runningVideoSummaryStatuses.has(currentStatus);
    const hasActiveWorker = hasRunningStatus && isVideoSummaryJobRunning({ courseId, sectionId, lessonId, summaryType });
    const isStaleRunningJob = hasRunningStatus && isStaleVideoSummaryJob(lesson.videoSummary, summaryType);
    if (hasRunningStatus && hasActiveWorker && !isStaleRunningJob) {
      logger.info('[AI SUMMARY] Existing active job found', { courseId, sectionId, lessonId, summaryType, status: currentStatus });
      return res.status(202).json({
        success: true,
        mode: 'saved',
        persisted: true,
        summaryType,
        status: currentStatus,
        jobId: `${courseId}:${sectionId}:${lessonId}:${summaryType}`,
        data: {
          ...buildVideoSummaryResponse(lesson.videoSummary, summaryType),
          uploadedSummary: lesson.summary || "",
          teacherSummary: lesson.summary || "",
        },
      });
    }
    if (isStaleRunningJob) {
      logger.warn('[AI SUMMARY] Stale running job found; queueing a fresh job', {
        courseId,
        sectionId,
        lessonId,
        summaryType,
        status: currentStatus,
        staleMs: Number(process.env.AI_VIDEO_JOB_STALE_MS || 600000),
      });
    } else if (hasRunningStatus && !hasActiveWorker) {
      logger.warn('[AI SUMMARY] Running DB status has no active worker; queueing a fresh job', {
        courseId,
        sectionId,
        lessonId,
        summaryType,
        status: currentStatus,
      });
    }

    const result = await generateOrRegenerate({
      courseId,
      sectionId,
      lessonId,
      summaryType,
      languageHint: req.body.language || languageHint,
      onlyTranscript,
      forceTranscript,
      forceSummary: req.body.forceSummary || forceRegenerate,
      persist: true,
      previewOnly: false,
      requestedBy: req.user?._id,
      requestedByRole: req.user?.role,
    });

    return res.status(202).json({
      success: true,
      mode: 'saved',
      persisted: true,
      summaryType,
      status: 'queued',
      jobId: result.jobId,
      data: {
        ...buildVideoSummaryResponse({
          ...(lesson.videoSummary || {}),
          status: 'queued',
          stage: 'AI summary is queued',
          error: '',
          sourceVideoUrl: videoUrl,
          updatedAt: new Date(),
          summaryType,
        }, summaryType),
        uploadedSummary: lesson.summary || "",
        teacherSummary: lesson.summary || "",
      },
    });
  } else {
    // Synchronous preview mode
    let result;
    try {
      result = await generateOrRegenerate({
        courseId,
        sectionId,
        lessonId,
        summaryType,
        languageHint: req.body.language || languageHint,
        onlyTranscript,
        forceTranscript,
        forceSummary: req.body.forceSummary || forceRegenerate,
        persist: false,
        previewOnly: true,
        requestedBy: req.user?._id,
        requestedByRole: req.user?.role,
      });
    } catch (error) {
      const clientError = getClientAiError(error);
      logger.warn('[AI SUMMARY] Preview generation failed without server error', {
        courseId,
        sectionId,
        lessonId,
        summaryType,
        code: clientError.code,
        error: error?.message,
      });
      return res.status(clientError.statusCode).json({
        success: clientError.statusCode === 202,
        mode: 'preview',
        persisted: false,
        summaryType,
        status: clientError.code === 'TRANSCRIPTION_ALREADY_RUNNING' ? 'queued' : 'failed',
        code: clientError.code,
        message: clientError.message,
      });
    }

    return res.status(200).json(result);
  }
});

export const generateLessonAiSummary = asyncHandler(async (req, res, next) => {
  req.body = {
    ...(req.body || {}),
    courseId: req.body?.courseId || req.params.courseId,
    sectionId: req.body?.sectionId || req.params.sectionId,
    lessonId: req.body?.lessonId || req.params.lessonId,
    forceRegenerate: Boolean(req.body?.forceRegenerate),
  };
  return regenerateVideoSummary(req, res, next);
});

export const getLessonAiSummaryStatus = asyncHandler(async (req, res, next) => {
  req.query = {
    ...(req.query || {}),
    summaryType: req.query?.summaryType || req.params.summaryType,
  };
  return getVideoSummary(req, res, next);
});
