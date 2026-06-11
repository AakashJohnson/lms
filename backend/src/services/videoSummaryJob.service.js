import mongoose from 'mongoose';
import Course from '../models/Course.model.js';
import { callAiService, logAiUsage } from './aiGateway.service.js';
import { transcribeLessonVideo } from './videoTranscription.service.js';
import { logger } from '../config/logger.js';
import { generateStudentSummary, getSummaryGenerationConfig, normalizeSummaryType } from './summaryGeneration.service.js';
import {
  buildGlobalLessonContext,
  buildVideoSummaryExtras,
  generateAiLessonNotesHeuristicFromLesson,
} from '../controllers/aiLessonNote.service.js';

const runningJobs = new Set();

export const getVideoSummaryJobKey = ({ courseId, sectionId, lessonId, summaryType }) => (
  `${courseId}:${sectionId}:${lessonId}:${normalizeSummaryType(summaryType)}`
);

export const isVideoSummaryJobRunning = ({ courseId, sectionId, lessonId, summaryType }) => (
  runningJobs.has(getVideoSummaryJobKey({ courseId, sectionId, lessonId, summaryType }))
);

const STATUS_PROGRESS = {
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
  generating_summary: 90,
  creating_summary: 90,
  completed: 100,
  failed: 0,
};

const getAiFailureCode = ({ error, onlyTranscript }) => {
  const raw = String(error?.code || error?.message || '');
  if (/ECONNREFUSED|ECONNRESET|ECONNABORTED|socket hang up|cancelled|canceled|timeout|AI service/i.test(raw)) return 'AI_SERVICE_UNAVAILABLE';
  if (/FFMPEG_UNAVAILABLE|FFmpeg binary|Bundled FFmpeg/i.test(raw)) return 'FFMPEG_UNAVAILABLE';
  return error?.code || (onlyTranscript ? 'TRANSCRIPT_GENERATION_FAILED' : 'SUMMARY_GENERATION_FAILED');
};

const getAiFailureMessage = ({ error, errorCode }) => {
  if (errorCode === 'AI_SERVICE_UNAVAILABLE') {
    return 'AI service is not running. Start AI server and retry transcript generation.';
  }
  if (errorCode === 'FFMPEG_UNAVAILABLE') {
    return 'Video transcription is temporarily unavailable because FFmpeg is missing. Video playback is not affected.';
  }
  return error?.message || 'AI generation failed';
};

const toObjectIdOrString = (value) => (
  mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : value
);

const getVideoUrl = (lesson = {}) => lesson.videoUrl || lesson.lessonVideo || '';

const getMeaningfulWordCount = (text = '') => (
  String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1).length
);

const buildTranscriptOnlyContext = ({ course = {}, section = {}, lesson = {}, transcript = '' }) => {
  const parts = [];
  const globalContext = buildGlobalLessonContext({ course, section, lesson });
  if (globalContext) parts.push(`Global context:\n${globalContext}`);
  parts.push(`Video transcript:\n${transcript}`);
  return parts.join('\n\n');
};

const updateLessonSummary = async ({ courseId, sectionId, lessonId, patch }) => {
  await Course.updateOne(
    { _id: courseId },
    { $set: Object.fromEntries(Object.entries(patch).map(([key, value]) => [`sections.$[section].lessons.$[lesson].videoSummary.${key}`, value])) },
    {
      arrayFilters: [
        { 'section._id': toObjectIdOrString(sectionId) },
        { 'lesson._id': toObjectIdOrString(lessonId) },
      ],
    },
  );
};

const updateLessonFields = async ({ courseId, sectionId, lessonId, patch }) => {
  await Course.updateOne(
    { _id: courseId },
    { $set: Object.fromEntries(Object.entries(patch).map(([key, value]) => [`sections.$[section].lessons.$[lesson].${key}`, value])) },
    {
      arrayFilters: [
        { 'section._id': toObjectIdOrString(sectionId) },
        { 'lesson._id': toObjectIdOrString(lessonId) },
      ],
    },
  );
};

const updateLessonSummaryStatus = async ({ courseId, sectionId, lessonId, status, stage, patch = {} }) => {
  const progress = Math.max(0, Math.min(100, Number(patch.aiProcessingProgress ?? STATUS_PROGRESS[status] ?? 0)));
  logger.info('[AI JOB] Progress updated', {
    courseId: String(courseId),
    sectionId: String(sectionId),
    lessonId: String(lessonId),
    progress,
    step: status,
    message: stage,
  });

  await updateLessonSummary({
    courseId,
    sectionId,
    lessonId,
    patch: {
      status,
      stage,
      aiProcessingStatus: status,
      aiProcessingProgress: progress,
      aiProcessingError: '',
      updatedAt: new Date(),
      ...patch,
      progress,
    },
  });
};

const buildCourseVideoSummary = async ({ course, section, lesson, transcript, cleanedTranscript, summary, summaryType }) => {
  const lessonForSummary = { ...lesson, transcript: cleanedTranscript || transcript };
  const lessonContext = buildTranscriptOnlyContext({ course, section, lesson: lessonForSummary, transcript: cleanedTranscript || transcript });
  const globalContext = buildGlobalLessonContext({ course, section, lesson: lessonForSummary });
  let generated = {
    summary: summaryType === 'short' ? summary : '',
    detailedSummary: summaryType === 'detailed' ? summary : '',
  };

  if (!summary) {
    try {
      const aiResponse = await callAiService({
        endpoint: '/v1/notes/generate',
        payload: {
          mode: summaryType,
          lessonTitle: lesson.title,
          courseTitle: course.title,
          globalContext,
          lessonContent: lessonContext,
          sourceType: 'video-asr-cleaned',
          lessonQuestions: [],
          lessonResources: [],
        },
      });
      generated = aiResponse?.data || aiResponse;
    } catch {
      generated = await generateAiLessonNotesHeuristicFromLesson({
        lessonTitle: lesson.title,
        courseTitle: course.title,
        course,
        section,
        lesson: lessonForSummary,
        mode: summaryType,
      });
    }
  }

  const extras = buildVideoSummaryExtras({
    transcript: cleanedTranscript || transcript,
    generated,
    lessonTitle: lesson.title,
    globalContext,
  });

  const importantConcepts = [
    ...new Set([
      ...(extras.flashcards || []).flatMap((card) => card.tags || []),
      ...((generated.mindMap?.branches || []).flatMap((branch) => branch.items || [])),
    ].filter(Boolean)),
  ].slice(0, 14);

  return {
    summary: summaryType === 'short' ? (summary || extras.summary || generated.summary || '') : (generated.summary || extras.summary || ''),
    detailedSummary: summaryType === 'detailed' ? (summary || extras.detailedSummary || generated.detailedSummary || '') : (generated.detailedSummary || extras.detailedSummary || ''),
    keyTakeaways: extras.keyTakeaways || generated.keyTakeaways || [],
    importantConcepts: importantConcepts.length ? importantConcepts : extras.importantConcepts || [],
    topicWisePoints: extras.topicWisePoints || extras.timestamps || [],
    timestamps: extras.timestamps || [],
    transcriptSegments: extras.transcriptSegments || [],
    flashcards: extras.flashcards || [],
    quizQuestions: extras.quizQuestions || [],
    revisionNotes: extras.revisionNotes || generated.revisionMaterial || '',
  };
};

export const processVideoSummaryJob = async ({ courseId, sectionId, lessonId, force = false, forceTranscript = false, requestedBy = null, summaryType, languageHint = 'auto', asrMode = 'Balanced', onlyTranscript = false }) => {
  const selectedSummaryType = normalizeSummaryType(summaryType);
  const jobKey = getVideoSummaryJobKey({ courseId, sectionId, lessonId, summaryType: selectedSummaryType });
  if (runningJobs.has(jobKey)) return;
  runningJobs.add(jobKey);
  const start = Date.now();
  let lastProgress = 0;
  const setSummaryStatus = async (params) => {
    const nextProgress = Number(params?.patch?.aiProcessingProgress ?? params?.patch?.progress ?? STATUS_PROGRESS[params.status] ?? lastProgress);
    lastProgress = Math.max(lastProgress, Math.max(0, Math.min(100, nextProgress)));
    const patch = {
      ...(params.patch || {}),
      aiProcessingProgress: lastProgress,
      progress: lastProgress,
    };
    return updateLessonSummaryStatus({ ...params, patch });
  };

  try {
    logger.info('[AI SUMMARY JOB] Started', { courseId, sectionId, lessonId, summaryType: selectedSummaryType });
    const course = await Course.findById(courseId).lean();
    if (!course) throw new Error('Course not found');

    const section = (course.sections || []).find((item) => String(item._id) === String(sectionId));
    const lesson = (section?.lessons || []).find((item) => String(item._id) === String(lessonId));
    if (!section || !lesson) throw new Error('Lesson not found');
    logger.info('[AI SUMMARY JOB] Lesson found', { courseId, sectionId, lessonId });

    const videoUrl = getVideoUrl(lesson);
    const hasVideoAsset = Boolean(lesson.videoAsset?.fileAssetId || lesson.videoAsset?.gridfsFileId);
    if (!videoUrl && !hasVideoAsset) throw new Error('No lesson video available for summary generation');

    const current = lesson.videoSummary || {};
    const existingVersion = current.summaryVersions?.[selectedSummaryType];
    if (!force && current.sourceVideoUrl === videoUrl && existingVersion?.status === 'completed' && existingVersion?.summary) {
      return;
    }

    const summaryConfig = getSummaryGenerationConfig();
    logger.info('AI video summary job started', {
      courseId,
      sectionId,
      lessonId,
      summaryType: selectedSummaryType,
      summaryModel: summaryConfig.model,
    });

    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: 'pending',
      stage: 'AI generation started',
      patch: {
        error: '',
        warning: '',
        aiProcessingError: '',
        aiProcessingProgress: 5,
        sourceVideoUrl: videoUrl || lesson.videoAsset?.streamUrl || lesson.videoAsset?.viewUrl || '',
        sourceFileAssetId: lesson.videoAsset?.fileAssetId || null,
        sourceGridfsFileId: lesson.videoAsset?.gridfsFileId || null,
        summaryType: selectedSummaryType,
        summaryLanguage: summaryConfig.outputLanguage,
        summaryModel: summaryConfig.model,
        startedAt: new Date(),
        aiProcessingStartedAt: new Date(),
        [`summaryVersions.${selectedSummaryType}.status`]: 'pending',
        [`summaryVersions.${selectedSummaryType}.progress`]: 5,
        [`summaryVersions.${selectedSummaryType}.error`]: '',
        [`summaryVersions.${selectedSummaryType}.startedAt`]: new Date(),
        [`summaryVersions.${selectedSummaryType}.updatedAt`]: new Date(),
      },
    });

    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: 'extracting_audio',
      stage: 'Reading video from GridFS and extracting audio',
      patch: {
        aiProcessingProgress: 25,
        [`summaryVersions.${selectedSummaryType}.status`]: 'extracting_audio',
        [`summaryVersions.${selectedSummaryType}.progress`]: 25,
      },
    });

    // When force=true but forceTranscript=false, reuse existing transcript for summary regeneration.
    // This avoids re-reading video from GridFS every time user clicks "Regenerate Summary".
    const shouldReuseCachedTranscript = !forceTranscript;
    const cachedTranscript = shouldReuseCachedTranscript
      ? (current.rawTranscript || current.transcript || lesson.transcript || '')
      : '';

    let transcript = '';
    let asrResult = null;
    if (cachedTranscript && getMeaningfulWordCount(cachedTranscript) >= 20) {
      // Use saved transcript — skip video processing entirely
      transcript = cachedTranscript;
      logger.info('[AI SUMMARY JOB] Using cached transcript, skipping video processing', {
        courseId, sectionId, lessonId,
        transcriptWordCount: getMeaningfulWordCount(cachedTranscript),
        source: 'cached',
      });
      await setSummaryStatus({
        courseId,
        sectionId,
        lessonId,
        status: 'extracting_audio',
        stage: 'Using previously generated transcript',
        patch: {
          aiProcessingProgress: 35,
          [`summaryVersions.${selectedSummaryType}.status`]: 'extracting_audio',
          [`summaryVersions.${selectedSummaryType}.progress`]: 35,
        },
      });
    } else {
      // Need to transcribe from video
      asrResult = await transcribeLessonVideo({
        lesson,
        courseId,
        sectionId,
        lessonId,
        languageHint,
        asrMode,
        onMetadata: (metadata = {}) => {
          setSummaryStatus({
            courseId,
            sectionId,
            lessonId,
            status: 'extracting_audio',
            stage: 'Reading video metadata and extracting audio',
            patch: {
              ...metadata,
              aiProcessingProgress: lastProgress || 25,
              [`summaryVersions.${selectedSummaryType}.status`]: 'extracting_audio',
              [`summaryVersions.${selectedSummaryType}.progress`]: lastProgress || 25,
            },
          }).catch(() => {});
        },
        onProgress: ({ completed = 0, total = 1, message = 'AI is generating transcript...' } = {}) => {
          const chunkProgress = 45 + Math.round((Number(completed) / Math.max(1, Number(total))) * 35);
          setSummaryStatus({
            courseId,
            sectionId,
            lessonId,
            status: 'transcribing',
            stage: message,
            patch: {
              aiProcessingProgress: chunkProgress,
              [`summaryVersions.${selectedSummaryType}.status`]: 'transcribing',
              [`summaryVersions.${selectedSummaryType}.progress`]: chunkProgress,
            },
          }).catch(() => {});
        },
      });
      transcript = asrResult.text;
    }

    const transcriptWordCount = getMeaningfulWordCount(transcript);
    if (!transcript || transcriptWordCount === 0) {
      const error = new Error('Speech-to-text returned no spoken lecture content from this video');
      error.code = 'NO_SPEECH_DETECTED';
      error.step = 'transcription';
      throw error;
    }

    // Save multi-tier raw transcript fields immediately on the lesson
    if (asrResult) {
      await updateLessonFields({
        courseId,
        sectionId,
        lessonId,
        patch: {
          transcript,
          generatedTranscript: transcript,
          transcriptRaw: {
            text: asrResult.text || '',
            language: asrResult.language || 'auto',
            provider: asrResult.provider || 'unknown',
            confidence: asrResult.confidence || null,
            segments: asrResult.segments || [],
            createdAt: new Date()
          },
          transcriptMeta: {
            jobId: `${courseId}:${sectionId}:${lessonId}`,
            audioDuration: asrResult.audioDuration || 0,
            detectedLanguage: asrResult.language || 'auto',
            languageHint: languageHint || 'auto',
            providersTried: asrResult.providersTried || [],
            selectedProvider: asrResult.provider || 'unknown',
            fallbackUsed: asrResult.fallbackUsed || false,
            qualityScore: asrResult.qualityScore || 0,
            warnings: asrResult.warnings || [],
            rawTranscriptLength: asrResult.text.length,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      });
    } else {
      await updateLessonFields({
        courseId,
        sectionId,
        lessonId,
        patch: { transcript, generatedTranscript: transcript },
      });
    }

    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: 'transcript_completed',
      stage: 'Transcript generated successfully',
      patch: {
        aiProcessingProgress: 40,
        rawTranscript: transcript,
        transcript,
        transcriptWordCount,
        transcriptLanguage: asrResult?.language || process.env.NVIDIA_ASR_LANGUAGE || 'en',
        [`summaryVersions.${selectedSummaryType}.status`]: 'transcript_completed',
        [`summaryVersions.${selectedSummaryType}.progress`]: 40,
      },
    });

    if (onlyTranscript) {
      await setSummaryStatus({
        courseId,
        sectionId,
        lessonId,
        status: 'transcript_completed',
        stage: 'Transcript generated successfully',
        patch: {
          aiProcessingProgress: 100,
          rawTranscript: transcript,
          transcript,
          transcriptWordCount,
          transcriptLanguage: asrResult?.language || process.env.NVIDIA_ASR_LANGUAGE || 'en',
          generated: {
            ...(current.generated || {}),
            transcript,
            rawTranscript: transcript,
          },
          [`summaryVersions.${selectedSummaryType}.status`]: 'transcript_completed',
          [`summaryVersions.${selectedSummaryType}.progress`]: 100,
        },
      });
      logger.info('[TRANSCRIPT] completed', { courseId, sectionId, lessonId });
      return;
    }

    const minimumWords = selectedSummaryType === 'detailed' ? 80 : 30;
    if (transcriptWordCount < minimumWords) {
      const warning = 'Transcript was generated but not enough lecture content was found to create a summary';
      await setSummaryStatus({
        courseId,
        sectionId,
        lessonId,
        status: 'failed',
        stage: warning,
        patch: {
          aiProcessingProgress: lastProgress,
          rawTranscript: transcript,
          transcript,
          transcriptWordCount,
          warning,
          error: warning,
          aiProcessingError: warning,
          [`summaryVersions.${selectedSummaryType}.status`]: 'failed',
          [`summaryVersions.${selectedSummaryType}.progress`]: lastProgress,
          [`summaryVersions.${selectedSummaryType}.error`]: warning,
          [`summaryVersions.${selectedSummaryType}.warning`]: warning,
          [`summaryVersions.${selectedSummaryType}.transcriptWordCount`]: transcriptWordCount,
        },
      });
      logger.warn('[ASR] Transcript validation result', {
        courseId,
        sectionId,
        lessonId,
        transcriptWordCount,
        minimumWords,
        warning,
      });
      return;
    }

    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: 'generating_summary',
      stage: `Creating ${selectedSummaryType} summary from raw transcript`,
      patch: {
        aiProcessingProgress: 90,
        [`summaryVersions.${selectedSummaryType}.status`]: 'generating_summary',
        [`summaryVersions.${selectedSummaryType}.progress`]: 90,
      },
    });

    const summaryResult = await generateStudentSummary({
      cleanedTranscript: transcript,
      transcriptAnalysis: { wordCount: transcriptWordCount, source: 'raw-transcript' },
      summaryType: selectedSummaryType,
      provider: summaryConfig.provider,
      model: summaryConfig.model,
      outputLanguage: summaryConfig.outputLanguage,
    });

    const generated = await buildCourseVideoSummary({
      course,
      section,
      lesson,
      transcript,
      cleanedTranscript: transcript,
      summary: summaryResult.summary,
      summaryType: selectedSummaryType,
    });

    const completedAt = new Date();
    await updateLessonFields({
      courseId,
      sectionId,
      lessonId,
      patch: {
        summary: summaryResult.summary || generated.summary || generated.detailedSummary || '',
      },
    });
    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: 'completed',
      stage: `${selectedSummaryType === 'detailed' ? 'Detailed' : 'Short'} English summary generated successfully`,
      patch: {
        aiProcessingProgress: 100,
        error: '',
        warning: '',
        aiProcessingError: '',
        transcript,
        rawTranscript: transcript,
        cleanedTranscript: transcript,
        transcriptAnalysisMeta: { wordCount: transcriptWordCount, source: 'raw-transcript' },
        summaryType: selectedSummaryType,
        summaryLanguage: summaryResult.outputLanguage || 'en',
        summaryModel: summaryResult.model,
        generated,
        completedAt,
        aiProcessingCompletedAt: completedAt,
        summaryGeneratedAt: completedAt,
        [`summaryVersions.${selectedSummaryType}`]: {
          summary: summaryResult.summary,
          status: 'completed',
          progress: 100,
          summaryType: selectedSummaryType,
          summaryLanguage: summaryResult.outputLanguage || 'en',
          generated,
          cleanedTranscript: transcript,
          transcriptAnalysisMeta: { wordCount: transcriptWordCount, source: 'raw-transcript' },
          summaryModel: summaryResult.model,
          generatedAt: completedAt,
          error: '',
        },
      },
    });
    logger.info('[AI SUMMARY JOB] Completed', { courseId, sectionId, lessonId, summaryType: selectedSummaryType });

    await logAiUsage({
      userId: requestedBy,
      feature: 'ai_video_summary',
      status: 'success',
      latencyMs: Date.now() - start,
      requestMeta: {
        courseId,
        sectionId,
        lessonId,
        summaryType: selectedSummaryType,
        transcriptWordCount,
      },
      model: summaryResult.model,
    });
  } catch (error) {
    const errorCode = getAiFailureCode({ error, onlyTranscript });
    const errorStep = error.step || 'unknown';
    const failureMessage = getAiFailureMessage({ error, errorCode });
    logger.error('[AI SUMMARY JOB] Failed', {
      courseId, sectionId, lessonId,
      summaryType: selectedSummaryType,
      error: failureMessage,
      errorCode,
      errorStep,
    });
    const failurePatch = {
      aiProcessingProgress: lastProgress,
      error: failureMessage,
      aiProcessingError: failureMessage,
      errorCode,
      errorStep,
      [`summaryVersions.${selectedSummaryType}.status`]: onlyTranscript ? 'transcript_failed' : 'failed',
      [`summaryVersions.${selectedSummaryType}.progress`]: lastProgress,
      [`summaryVersions.${selectedSummaryType}.error`]: failureMessage,
      [`summaryVersions.${selectedSummaryType}.errorCode`]: errorCode,
    };
    if (onlyTranscript) {
      failurePatch.transcriptStatus = 'failed';
      failurePatch.transcriptErrorMessage = failureMessage;
    }

    await setSummaryStatus({
      courseId,
      sectionId,
      lessonId,
      status: onlyTranscript ? 'transcript_failed' : 'failed',
      stage: onlyTranscript ? 'Transcript generation failed' : 'AI summary generation failed',
      patch: failurePatch,
    }).catch(() => {});

    await logAiUsage({
      userId: requestedBy,
      feature: 'ai_video_summary',
      status: 'failed',
      latencyMs: Date.now() - start,
      requestMeta: { courseId, sectionId, lessonId, summaryType: selectedSummaryType },
      errorMessage: failureMessage,
    });
  } finally {
    runningJobs.delete(jobKey);
  }
};

export const enqueueVideoSummaryJob = (job) => {
  if (job?.courseId && job?.sectionId && job?.lessonId) {
    const selectedSummaryType = normalizeSummaryType(job.summaryType);
    updateLessonSummaryStatus({
      courseId: job.courseId,
      sectionId: job.sectionId,
      lessonId: job.lessonId,
      status: 'queued',
      stage: 'AI summary is queued',
      patch: {
        error: '',
        warning: '',
        aiProcessingError: '',
        summaryType: selectedSummaryType,
        updatedAt: new Date(),
        [`summaryVersions.${selectedSummaryType}.status`]: 'queued',
        [`summaryVersions.${selectedSummaryType}.progress`]: 0,
        [`summaryVersions.${selectedSummaryType}.error`]: '',
        [`summaryVersions.${selectedSummaryType}.startedAt`]: new Date(),
        [`summaryVersions.${selectedSummaryType}.updatedAt`]: new Date(),
      },
    }).catch(() => {});
  }

  setTimeout(() => {
    processVideoSummaryJob(job).catch(() => {});
  }, 0);
};

export const enqueueVideoSummariesForCourse = (course, { force = false, requestedBy = null } = {}) => {
  for (const section of course.sections || []) {
    for (const lesson of section.lessons || []) {
      const videoUrl = getVideoUrl(lesson);
      const hasVideoAsset = Boolean(lesson.videoAsset?.fileAssetId || lesson.videoAsset?.gridfsFileId);
      if (lesson.type !== 'video' || (!videoUrl && !hasVideoAsset)) continue;
      const summary = lesson.videoSummary || {};
      const shouldQueue = force || summary.status === 'idle' || summary.status === 'failed' || summary.sourceVideoUrl !== videoUrl || !summary.generated?.summary;
      if (!shouldQueue) continue;
      enqueueVideoSummaryJob({
        courseId: course._id,
        sectionId: section._id,
        lessonId: lesson._id,
        force,
        requestedBy,
        summaryType: process.env.DEFAULT_SUMMARY_TYPE || 'short',
      });
    }
  }
};

export const generateOrRegenerate = async ({
  courseId,
  sectionId,
  lessonId,
  summaryType,
  languageHint = 'auto',
  onlyTranscript = false,
  forceTranscript = false,
  forceSummary = false,
  persist = false,
  previewOnly = true,
  requestedBy = null,
  requestedByRole = null,
}) => {
  const selectedSummaryType = normalizeSummaryType(summaryType);

  const course = await Course.findById(courseId).lean();
  if (!course) throw new Error('Course not found');

  const section = (course.sections || []).find((item) => String(item._id) === String(sectionId));
  const lesson = (section?.lessons || []).find((item) => String(item._id) === String(lessonId));
  if (!section || !lesson) throw new Error('Lesson not found');

  if (persist) {
    const jobId = `${courseId}:${sectionId}:${lessonId}:${selectedSummaryType}`;
    enqueueVideoSummaryJob({
      courseId,
      sectionId,
      lessonId,
      force: true,
      forceTranscript: Boolean(forceTranscript),
      requestedBy,
      summaryType: selectedSummaryType,
      languageHint,
      onlyTranscript: Boolean(onlyTranscript),
    });

    return {
      success: true,
      mode: 'saved',
      persisted: true,
      summaryType: selectedSummaryType,
      jobId,
      message: 'AI video summary job started in background',
    };
  } else {
    logger.info('[AI PREVIEW] Generating temporary preview', { courseId, sectionId, lessonId, summaryType: selectedSummaryType });

    let transcript = lesson.videoSummary?.rawTranscript || lesson.videoSummary?.transcript || lesson.transcript || '';
    let asrResult = null;

    if (!transcript && (lesson.videoUrl || lesson.lessonVideo || lesson.videoAsset?.fileAssetId)) {
      asrResult = await transcribeLessonVideo({
        lesson,
        courseId,
        sectionId,
        lessonId,
        languageHint,
      });
      transcript = asrResult.text;
    }

    const transcriptWordCount = getMeaningfulWordCount(transcript);
    if (!transcript || transcriptWordCount === 0) {
      throw new Error('Speech-to-text returned no spoken lecture content from this video');
    }

    if (onlyTranscript) {
      return {
        success: true,
        mode: 'preview',
        persisted: false,
        summaryType: selectedSummaryType,
        message: 'Transcript generated successfully',
        data: {
          courseId,
          sectionId,
          lessonId,
          status: 'transcript_completed',
          transcript,
          rawTranscript: transcript,
          videoSummary: { status: 'transcript_completed' },
        },
      };
    }

    const cleanedTranscript = transcript;
    const transcriptAnalysis = { wordCount: transcriptWordCount, source: 'raw-transcript' };
    const summaryConfig = getSummaryGenerationConfig();
    const summaryResult = await generateStudentSummary({
      cleanedTranscript,
      transcriptAnalysis,
      summaryType: selectedSummaryType,
      provider: summaryConfig.provider,
      model: summaryConfig.model,
      outputLanguage: summaryConfig.outputLanguage,
    });

    const generated = await buildCourseVideoSummary({
      course,
      section,
      lesson,
      transcript,
      cleanedTranscript,
      summary: summaryResult.summary,
      summaryType: selectedSummaryType,
    });

    const previewSummary = {
      summary: selectedSummaryType === 'detailed' ? generated.detailedSummary : generated.summary,
      notes: generated.detailedSummary || generated.summary || '',
      keyPoints: generated.keyTakeaways || [],
      importantConcepts: generated.importantConcepts || [],
      importantDefinitions: generated.importantConcepts || [],
      topicWisePoints: generated.topicWisePoints || [],
      flashcards: generated.flashcards || [],
      quizQuestions: generated.quizQuestions || [],
      revisionNotes: generated.revisionNotes || '',
      warnings: generated.warning ? [generated.warning] : [],
      model: summaryResult.model || summaryConfig.model,
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      mode: 'preview',
      persisted: false,
      summaryType: selectedSummaryType,
      previewSummary,
      message: 'This regenerated summary is a temporary preview and has not replaced the saved lesson summary.',
    };
  }
};
