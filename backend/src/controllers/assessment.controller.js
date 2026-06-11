import Assessment from '../models/Assessment.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

const mkId = () => Math.random().toString(36).slice(2, 9);

// ─── Map frontend form → Mongoose schema ─────────────────────────────────────
function mapFormToSchema(body, userId) {
  const {
    title, type, course, module, description, instructions, tags,
    timeLimit, attemptsAllowed, passingScore, gracePeriod, gradingType,
    shuffleQuestions, shuffleOptions, showScore, showFeedback,
    showCorrectAnswers, questionsPerPage, allowBacktrack, autoSubmit,
    availableFrom, availableUntil,
    preventTabSwitch, requireFullscreen, disableCopyPaste,
    warnOnTabSwitch, autoSubmitOnViolation, maxViolationsAllowed,
    enableWebcam, enableFaceDetection, logSuspiciousActivity,
    questions,
    visibility, notifyStudents, scheduleAt,
  } = body;

  return {
    title:             title || '',
    type:              type  || 'quiz',
    course:            course || '',
    module:            module || '',
    description:       description  || '',
    instructions:      instructions || '',
    tags:              Array.isArray(tags) ? tags : [],

    timeLimit:          Number(timeLimit)        || 30,
    attemptsAllowed:    Number(attemptsAllowed)  || 3,
    passingScore:       Number(passingScore)     || 60,
    gracePeriod:        Number(gracePeriod)      || 5,
    gradingType:        gradingType || 'auto',

    shuffleQuestions:   !!shuffleQuestions,
    shuffleOptions:     shuffleOptions  !== false,
    showScore:          showScore       !== false,
    showFeedback:       showFeedback    !== false,
    showCorrectAnswers: showCorrectAnswers || 'immediate',
    questionsPerPage:   Number(questionsPerPage) || 1,
    allowBacktrack:     allowBacktrack  !== false,
    autoSubmit:         autoSubmit      !== false,

    availableFrom:  availableFrom  || null,
    availableUntil: availableUntil || null,

    preventTabSwitch:      !!preventTabSwitch,
    requireFullscreen:     !!requireFullscreen,
    disableCopyPaste:      !!disableCopyPaste,
    warnOnTabSwitch:       warnOnTabSwitch       !== false,
    autoSubmitOnViolation: !!autoSubmitOnViolation,
    maxViolationsAllowed:  Number(maxViolationsAllowed) || 3,
    enableWebcam:          !!enableWebcam,
    enableFaceDetection:   !!enableFaceDetection,
    logSuspiciousActivity: logSuspiciousActivity !== false,

    questions: Array.isArray(questions)
      ? questions.map((q, i) => ({
          clientId:       q.id || q.clientId || mkId(),
          type:           q.type || 'mcq',
          questionText:   q.questionText || '',
          explanation:    q.explanation  || '',
          points:         Number(q.points)        || 1,
          negativePoints: Number(q.negativePoints) || 0,
          difficulty:     q.difficulty || 'medium',
          tags:           Array.isArray(q.tags) ? q.tags : [],
          required:       q.required !== false,
          order:          i,

          options: Array.isArray(q.options)
            ? q.options.map((o) => ({
                clientId:    o.id || o.clientId || mkId(),
                text:        o.text        || '',
                isCorrect:   !!o.isCorrect,
                explanation: o.explanation || '',
              }))
            : [],

          tfAnswer:      q.tfAnswer !== undefined ? q.tfAnswer : null,
          blanks:        Array.isArray(q.blanks) ? q.blanks : [],
          caseSensitive: !!q.caseSensitive,

          matchPairs: Array.isArray(q.matchPairs)
            ? q.matchPairs.map((p) => ({
                clientId: p.id || p.clientId || mkId(),
                left:  p.left  || '',
                right: p.right || '',
              }))
            : [],

          sampleAnswer: q.sampleAnswer || '',
          wordLimit:    Number(q.wordLimit) || 0,
          keywords:     Array.isArray(q.keywords) ? q.keywords : [],
          rubric: Array.isArray(q.rubric)
            ? q.rubric.map((r) => ({
                clientId: r.id || r.clientId || mkId(),
                label:  r.label  || '',
                points: Number(r.points) || 0,
              }))
            : [],

          orderItems: Array.isArray(q.orderItems)
            ? q.orderItems.map((o) => ({
                clientId: o.id || o.clientId || mkId(),
                text: o.text || '',
              }))
            : [],

          ratingScale:    q.ratingScale    || 5,
          ratingMinLabel: q.ratingMinLabel || '',
          ratingMaxLabel: q.ratingMaxLabel || '',

          matrixRows: Array.isArray(q.matrixRows)
            ? q.matrixRows.map((r) => ({
                clientId:   r.id || r.clientId || mkId(),
                label:      r.label      || '',
                correctCol: r.correctCol || '',
              }))
            : [],
          matrixCols: Array.isArray(q.matrixCols)
            ? q.matrixCols.map((c) => ({
                clientId: c.id || c.clientId || mkId(),
                label:    c.label || '',
              }))
            : [],

          hotspotImage: q.hotspotImage || '',
          hotspotAreas: Array.isArray(q.hotspotAreas)
            ? q.hotspotAreas.map((a) => ({
                clientId: a.id || a.clientId || mkId(),
                x: a.x || 0, y: a.y || 0, w: a.w || 0, h: a.h || 0,
                label: a.label || '',
              }))
            : [],

          allowedFileTypes: Array.isArray(q.allowedFileTypes) ? q.allowedFileTypes : [],
          maxFileSizeMB:    Number(q.maxFileSizeMB) || 10,
          maxFiles:         Number(q.maxFiles)      || 1,

          codeLanguage:  q.codeLanguage  || 'javascript',
          codeTemplate:  q.codeTemplate  || '',
          codeTestCases: Array.isArray(q.codeTestCases)
            ? q.codeTestCases.map((tc) => ({
                clientId: tc.id || tc.clientId || mkId(),
                input:    tc.input    || '',
                expected: tc.expected || '',
              }))
            : [],
          codeSolution: q.codeSolution || '',

          maxRecordSeconds: Number(q.maxRecordSeconds) || 120,
          promptImage:      q.promptImage || '',
          promptAudio:      q.promptAudio || '',
          promptVideo:      q.promptVideo || '',
        }))
      : [],

    visibility:     visibility     || 'draft',
    notifyStudents: notifyStudents !== false,
    scheduleAt:     scheduleAt     || null,

    createdBy: userId,
  };
}

// ─── GET /assessments ─────────────────────────────────────────────────────────
export const getAssessments = asyncHandler(async (req, res) => {
  const { type, visibility, course, search, page = 1, limit = 50 } = req.query;

  const filter = { isActive: true };
  if (type)   filter.type   = type;
  if (course) filter.course = { $regex: course, $options: 'i' };
  if (search) filter.$text  = { $search: search };

  if (req.user.role === 'administrator') {
    if (visibility) filter.visibility = visibility;
  } else if (req.user.role === 'trainer') {
    filter.createdBy = req.user._id;
    if (visibility) filter.visibility = visibility;
  } else {
    // Participant — all published
    filter.visibility  = 'published';
    filter.isPublished = true;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [assessments, total] = await Promise.all([
    Assessment.find(filter)
      .select('-questions')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Assessment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    data:  assessments,
  });
});

// ─── GET /assessments/:id ─────────────────────────────────────────────────────
export const getAssessment = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ErrorResponse('Assessment not found', 404));
  res.status(200).json({ success: true, data: assessment });
});

// ─── POST /assessments ────────────────────────────────────────────────────────
export const createAssessment = asyncHandler(async (req, res, next) => {
  if (!req.body.title) {
    return next(new ErrorResponse('Assessment title is required', 400));
  }
  const data = mapFormToSchema(req.body, req.user._id);
  const assessment = await Assessment.create(data);

  // Send notifications to all active participants if published
  if (assessment.isPublished) {
    try {
      const { createNotification } = await import('./notification.controller.js');
      const { sendNotification } = await import('../utils/socketEmitter.js');
      const Participant = (await import('../models/Participant.model.js')).default;
      
      const activeParticipants = await Participant.find({ isActive: true }).select('_id').lean();
      
      for (const participant of activeParticipants) {
        await createNotification(
          participant._id.toString(),
          'New Assessment Available',
          `A new assessment "${assessment.title}" is now available`,
          'warning',
          'assessments'
        );

        // Send real-time notification
        const io = req.app?.get('io');
        if (io) {
          sendNotification(io, participant._id.toString(), {
            _id: assessment._id,
            title: 'New Assessment Available',
            message: `${assessment.title} - Take it now!`,
            type: 'warning',
            createdAt: new Date()
          });
        }
      }

      console.log(`✅ Assessment notifications sent to ${activeParticipants.length} students`);
    } catch (notifError) {
      console.error('❌ Failed to send assessment notifications:', notifError);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Assessment created successfully',
    data: assessment,
  });
});

// ─── PUT /assessments/:id ─────────────────────────────────────────────────────
export const updateAssessment = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ErrorResponse('Assessment not found', 404));

  const isOwner = assessment.createdBy.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'administrator') {
    return next(new ErrorResponse('Not authorised to update this assessment', 403));
  }

  const updates = mapFormToSchema(req.body, req.user._id);
  delete updates.createdBy;
  Object.assign(assessment, updates);
  await assessment.save();

  res.status(200).json({
    success: true,
    message: 'Assessment updated successfully',
    data: assessment,
  });
});

// ─── PATCH /assessments/:id/status ───────────────────────────────────────────
export const updateAssessmentStatus = asyncHandler(async (req, res, next) => {
  const { visibility } = req.body;
  if (!['draft', 'published', 'scheduled'].includes(visibility)) {
    return next(new ErrorResponse('visibility must be draft, published, or scheduled', 400));
  }

  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ErrorResponse('Assessment not found', 404));

  const isOwner = assessment.createdBy.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'administrator') {
    return next(new ErrorResponse('Not authorised', 403));
  }

  assessment.visibility  = visibility;
  assessment.isPublished = visibility === 'published';
  if (visibility === 'published' && !assessment.publishedAt) {
    assessment.publishedAt = new Date();
  }
  await assessment.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `Assessment ${visibility}`,
    data: {
      _id:         assessment._id,
      visibility:  assessment.visibility,
      isPublished: assessment.isPublished,
    },
  });
});

// ─── DELETE /assessments/:id ──────────────────────────────────────────────────
export const deleteAssessment = asyncHandler(async (req, res, next) => {
  const assessment = await Assessment.findById(req.params.id);
  if (!assessment) return next(new ErrorResponse('Assessment not found', 404));

  const isOwner = assessment.createdBy.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'administrator') {
    return next(new ErrorResponse('Not authorised to delete this assessment', 403));
  }

  assessment.isActive = false;
  await assessment.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Assessment deleted' });
});

// ─── POST /assessments/:id/duplicate ─────────────────────────────────────────
export const duplicateAssessment = asyncHandler(async (req, res, next) => {
  const original = await Assessment.findById(req.params.id);
  if (!original) return next(new ErrorResponse('Assessment not found', 404));

  const copy = original.toObject();
  delete copy._id;
  delete copy.id;
  copy.title       = `${copy.title} (Copy)`;
  copy.visibility  = 'draft';
  copy.isPublished = false;
  copy.publishedAt = null;
  copy.submissions = 0;
  copy.passRate    = 0;
  copy.avgScore    = 0;
  copy.createdBy   = req.user._id;
  copy.questions   = (copy.questions || []).map((q) => {
    const nq = { ...q };
    delete nq._id;
    return nq;
  });

  const newAssessment = await Assessment.create(copy);
  res.status(201).json({ success: true, message: 'Assessment duplicated', data: newAssessment });
});
