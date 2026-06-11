import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Course from '../models/Course.model.js';
import { buildLessonContext, cleanText, getContextAvailability } from '../services/lessonContextBuilder.service.js';
import { callAiService, logAiUsage } from '../services/aiGateway.service.js';

const QUESTION_TYPES = new Set(['mcq', 'msq', 'truefalse', 'fillblank', 'match', 'shortanswer', 'longanswer', 'ordering']);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

const mkId = () => Math.random().toString(36).slice(2, 10);
const arr = (value) => (Array.isArray(value) ? value : []);
const limit = (value = '', max = 12000) => cleanText(value).slice(0, max);
const bool = (value, fallback = true) => (typeof value === 'boolean' ? value : fallback);

const normalizeType = (value = 'mcq') => {
  const key = String(value || '').toLowerCase().replace(/[\s_-]/g, '');
  const map = {
    multiplechoice: 'mcq',
    singlechoice: 'mcq',
    multipleanswer: 'msq',
    multipleselect: 'msq',
    truefalse: 'truefalse',
    fillintheblank: 'fillblank',
    fillblank: 'fillblank',
    matching: 'match',
    match: 'match',
    shortanswer: 'shortanswer',
    essay: 'longanswer',
    longanswer: 'longanswer',
    ordering: 'ordering',
    sequence: 'ordering',
  };
  return QUESTION_TYPES.has(key) ? key : (map[key] || 'mcq');
};

const normalizeDifficulty = (value = 'medium') => {
  const key = String(value || '').toLowerCase();
  return DIFFICULTIES.has(key) ? key : 'medium';
};

const normalizeShowAnswers = (value) => {
  const key = String(value || '').toLowerCase();
  if (key === 'never' || key === 'after_due') return key;
  return 'immediate';
};

const makeOption = (option, index, correctIndexes = []) => {
  if (typeof option === 'string') {
    return {
      id: mkId(),
      text: cleanText(option),
      isCorrect: correctIndexes.includes(index),
    };
  }
  return {
    id: String(option?.id || mkId()),
    text: cleanText(option?.text || option?.label || option?.value || `Option ${index + 1}`),
    isCorrect: Boolean(option?.isCorrect || option?.correct || correctIndexes.includes(index)),
    explanation: cleanText(option?.explanation || ''),
  };
};

const normalizeQuestion = (question = {}, index = 0, preferredType = 'mcq') => {
  const type = normalizeType(question.type || question.questionType || preferredType);
  const base = {
    id: String(question.id || mkId()),
    type,
    questionText: cleanText(question.questionText || question.question || question.prompt || `Question ${index + 1}`),
    explanation: cleanText(question.explanation || question.feedback || question.rationale || ''),
    points: Math.max(1, Number(question.points || question.marks || 1)),
    negativePoints: Math.max(0, Number(question.negativePoints || 0)),
    difficulty: normalizeDifficulty(question.difficulty),
    tags: arr(question.tags).map(cleanText).filter(Boolean).slice(0, 6),
    required: bool(question.required, true),
  };

  if (type === 'mcq' || type === 'msq') {
    const correctRaw = question.correctAnswer ?? question.answer ?? question.correctOption;
    const correctValues = arr(correctRaw).map((item) => String(item).toLowerCase());
    const correctIndexes = arr(question.correctIndexes).map(Number);
    let options = arr(question.options).map((option, optionIndex) => makeOption(option, optionIndex, correctIndexes));
    if (!options.length && arr(question.choices).length) {
      options = arr(question.choices).map((option, optionIndex) => makeOption(option, optionIndex, correctIndexes));
    }
    options = options.filter((option) => option.text).slice(0, 6);
    options = options.map((option, optionIndex) => ({
      ...option,
      isCorrect: option.isCorrect || correctValues.includes(option.text.toLowerCase()) || correctValues.includes(String(optionIndex)) || correctValues.includes(String.fromCharCode(97 + optionIndex)),
    }));
    if (!options.some((option) => option.isCorrect) && options.length) options[0].isCorrect = true;
    while (options.length < 4) options.push({ id: mkId(), text: `Option ${options.length + 1}`, isCorrect: false });
    return { ...base, options };
  }

  if (type === 'truefalse') {
    return { ...base, tfAnswer: Boolean(question.tfAnswer ?? question.answer ?? question.correctAnswer ?? true) };
  }

  if (type === 'fillblank') {
    const blanks = arr(question.blanks).length ? question.blanks : [question.answer || question.correctAnswer || ''];
    return { ...base, blanks: arr(blanks).map(cleanText).filter(Boolean).slice(0, 5), caseSensitive: Boolean(question.caseSensitive) };
  }

  if (type === 'match') {
    const pairs = arr(question.matchPairs || question.pairs).map((pair) => ({
      id: String(pair.id || mkId()),
      left: cleanText(pair.left || pair.term || pair.prompt),
      right: cleanText(pair.right || pair.answer || pair.match),
    })).filter((pair) => pair.left && pair.right);
    return { ...base, points: Math.max(2, base.points), matchPairs: pairs.length ? pairs : [{ id: mkId(), left: '', right: '' }, { id: mkId(), left: '', right: '' }] };
  }

  if (type === 'ordering') {
    const items = arr(question.orderItems || question.items || question.sequence).map((item) => ({
      id: String(item.id || mkId()),
      text: cleanText(item.text || item.label || item),
    })).filter((item) => item.text);
    return { ...base, orderItems: items.length ? items : [{ id: mkId(), text: '' }, { id: mkId(), text: '' }, { id: mkId(), text: '' }] };
  }

  return {
    ...base,
    points: type === 'longanswer' ? Math.max(5, base.points) : Math.max(2, base.points),
    sampleAnswer: cleanText(question.sampleAnswer || question.answer || question.correctAnswer || ''),
    keywords: arr(question.keywords).map(cleanText).filter(Boolean).slice(0, 10),
    wordLimit: Number(question.wordLimit || (type === 'longanswer' ? 500 : 150)),
  };
};

const findSectionLesson = (course, sectionId, lessonId) => {
  let section = null;
  let lesson = null;
  for (const candidateSection of arr(course.sections)) {
    if (sectionId && String(candidateSection._id) !== String(sectionId)) continue;
    if (!section) section = candidateSection;
    const lessons = arr(candidateSection.lessons);
    const matchedLesson = lessonId
      ? lessons.find((item) => String(item._id) === String(lessonId))
      : lessons[0];
    if (matchedLesson) {
      section = candidateSection;
      lesson = matchedLesson;
      break;
    }
  }
  return { section, lesson };
};

const lessonToMiniContext = (course, section, lesson) => ({
  course: {
    id: String(course._id),
    title: cleanText(course.title),
    description: limit(course.fullDescription || course.description || course.overview || course.subtitle || '', 3000),
  },
  section: {
    id: String(section?._id || ''),
    title: cleanText(section?.title || ''),
    description: limit(section?.fullDescription || section?.description || '', 1500),
  },
  lesson: {
    id: String(lesson?._id || ''),
    title: cleanText(lesson?.title || ''),
    type: lesson?.type || '',
    description: limit(lesson?.fullDescription || lesson?.description || lesson?.content || lesson?.overview || '', 3000),
  },
  transcript: {
    text: limit(
      lesson?.videoSummary?.finalTranscript ||
      lesson?.videoSummary?.cleanedTranscript ||
      lesson?.videoSummary?.transcript ||
      lesson?.transcriptEnglish?.text ||
      lesson?.transcriptCleaned?.text ||
      lesson?.transcriptRaw?.text ||
      lesson?.transcript?.text ||
      lesson?.transcript ||
      '',
      12000,
    ),
    segments: arr(lesson?.videoSummary?.transcriptSegments).slice(0, 20),
  },
  summary: {
    summary: limit(lesson?.videoSummary?.generated?.summary || lesson?.summary || '', 3500),
    detailedSummary: limit(lesson?.videoSummary?.generated?.detailedSummary || '', 6000),
    keyTakeaways: arr(lesson?.videoSummary?.generated?.keyTakeaways).map(cleanText).filter(Boolean).slice(0, 20),
    revisionMaterial: limit(lesson?.videoSummary?.generated?.revisionNotes || '', 3500),
  },
  flashcards: arr(lesson?.videoSummary?.generated?.flashcards).map((card) => ({
    front: cleanText(card.question || card.front),
    back: cleanText(card.answer || card.back),
    difficulty: card.difficulty || 'medium',
  })).filter((card) => card.front && card.back).slice(0, 30),
  questionAnswers: arr(lesson?.videoSummary?.generated?.quizQuestions).map((question) => ({
    question: cleanText(question.question),
    options: arr(question.options).map(cleanText).filter(Boolean),
    answer: cleanText(question.answer || question.correctAnswer),
    explanation: cleanText(question.explanation),
  })).filter((question) => question.question).slice(0, 30),
  knowledgeChecks: arr(lesson?.questions).slice(0, 30),
  resources: arr(lesson?.resources).map((resource) => ({
    title: cleanText(resource.title),
    type: cleanText(resource.type),
    extractedText: limit(resource.extractedText || resource.ocrText || resource.description || '', 2500),
  })).filter((resource) => resource.title || resource.extractedText).slice(0, 20),
  studentNotes: [],
});

const applyContentSwitches = (context, useContent = {}) => {
  const enabled = {
    transcript: useContent.transcript !== false,
    summary: useContent.summary !== false && useContent.aiSummary !== false,
    detailedSummary: useContent.detailedSummary !== false,
    revisionNotes: useContent.revisionNotes !== false,
    flashcards: useContent.flashcards !== false,
    uploadedNotes: useContent.uploadedNotes !== false,
    imageAnalysis: useContent.imageAnalysis !== false,
    audioTranscript: useContent.audioTranscript !== false,
  };

  const resources = arr(context.resources);
  return {
    ...context,
    transcript: enabled.transcript ? context.transcript : { text: '', segments: [] },
    summary: {
      summary: enabled.summary ? context.summary?.summary : '',
      detailedSummary: enabled.detailedSummary ? context.summary?.detailedSummary : '',
      keyTakeaways: enabled.summary ? arr(context.summary?.keyTakeaways) : [],
      revisionMaterial: enabled.revisionNotes ? context.summary?.revisionMaterial : '',
    },
    flashcards: enabled.flashcards ? arr(context.flashcards) : [],
    resources: resources.filter((resource) => {
      const type = String(resource.type || resource.mimeType || '').toLowerCase();
      if (type.includes('image')) return enabled.imageAnalysis;
      if (type.includes('audio')) return enabled.audioTranscript;
      return enabled.uploadedNotes;
    }),
  };
};

const buildKnowledgePack = async (body, userId) => {
  const { courseId, sectionId, lessonId, useContent = {}, teacherInstruction = '' } = body;
  if (!courseId) throw new ErrorResponse('courseId is required', 400);

  const course = await Course.findById(courseId)
    .select('title subtitle description fullDescription overview sections')
    .lean();
  if (!course) throw new ErrorResponse('Course not found', 404);

  let context;
  let section;
  let lesson;
  if (lessonId) {
    const built = await buildLessonContext({ courseId, sectionId, lessonId, userId });
    if (!built.lesson || !built.context) throw new ErrorResponse('Lesson not found in this course', 404);
    section = built.section;
    lesson = built.lesson;
    context = built.context;
  } else {
    ({ section, lesson } = findSectionLesson(course, sectionId, lessonId));
    if (!section) throw new ErrorResponse('Module not found in this course', 404);
    context = lessonToMiniContext(course, section, lesson);
  }

  const filtered = applyContentSwitches(context, useContent);
  return {
    courseId: String(course._id),
    sectionId: String(section?._id || ''),
    lessonId: String(lesson?._id || ''),
    courseTitle: filtered.course?.title || cleanText(course.title),
    moduleTitle: filtered.section?.title || cleanText(section?.title),
    lessonTitle: filtered.lesson?.title || cleanText(lesson?.title),
    transcript: limit(filtered.transcript?.text, 12000),
    summary: limit(filtered.summary?.summary, 3500),
    detailedSummary: limit(filtered.summary?.detailedSummary, 6000),
    revisionNotes: limit(filtered.summary?.revisionMaterial, 3500),
    keyTakeaways: arr(filtered.summary?.keyTakeaways).slice(0, 20),
    flashcards: arr(filtered.flashcards).slice(0, 30),
    existingQuizQuestions: [...arr(filtered.questionAnswers), ...arr(filtered.knowledgeChecks)].slice(0, 30),
    uploadedNotes: arr(filtered.resources).filter((resource) => !String(resource.type || '').toLowerCase().includes('image')).slice(0, 15),
    imageInsights: arr(filtered.resources).filter((resource) => String(resource.type || '').toLowerCase().includes('image')).slice(0, 10),
    audioTranscript: arr(filtered.resources).filter((resource) => String(resource.type || '').toLowerCase().includes('audio')).map((resource) => resource.extractedText).filter(Boolean).join('\n\n').slice(0, 6000),
    teacherInstruction: cleanText(teacherInstruction),
    availability: getContextAvailability(filtered),
  };
};

const packHasContent = (pack) => Boolean(
  pack.transcript ||
  pack.summary ||
  pack.detailedSummary ||
  pack.revisionNotes ||
  pack.flashcards.length ||
  pack.existingQuizQuestions.length ||
  pack.uploadedNotes.length ||
  pack.imageInsights.length ||
  pack.audioTranscript,
);

const localQuestionSeeds = (pack) => {
  const flashcardSeeds = pack.flashcards.map((card) => ({
    question: card.front,
    answer: card.back,
    explanation: card.back,
    difficulty: card.difficulty || 'medium',
  }));
  const quizSeeds = pack.existingQuizQuestions.map((item) => ({
    question: item.question || item.questionText,
    answer: item.answer || item.correctAnswer,
    options: item.options,
    explanation: item.explanation || item.answer || item.correctAnswer,
    difficulty: item.difficulty || 'medium',
  }));
  const text = [pack.summary, pack.detailedSummary, pack.revisionNotes, pack.transcript, pack.audioTranscript]
    .filter(Boolean)
    .join(' ');
  const textSeeds = text
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter((sentence) => sentence.length > 45)
    .slice(0, 20)
    .map((sentence) => ({
      question: `Which statement best matches this concept: ${sentence.slice(0, 90)}?`,
      answer: sentence,
      explanation: sentence,
      difficulty: 'medium',
    }));
  return [...quizSeeds, ...flashcardSeeds, ...textSeeds].filter((seed) => seed.question || seed.answer);
};

const makeLocalAssessment = (pack, options = {}, onlyQuestions = false) => {
  const requestedTypes = arr(options.questionTypes).length ? arr(options.questionTypes) : ['mcq', 'truefalse', 'shortanswer'];
  const count = Math.max(1, Math.min(50, Number(options.questionCount || 8)));
  const seeds = localQuestionSeeds(pack);
  const questions = Array.from({ length: count }, (_, index) => {
    const seed = seeds[index % Math.max(1, seeds.length)] || {};
    const type = normalizeType(requestedTypes[index % requestedTypes.length]);
    if (type === 'truefalse') {
      return normalizeQuestion({
        type,
        questionText: `True or false: ${cleanText(seed.answer || seed.question || pack.lessonTitle || pack.courseTitle).slice(0, 140)}`,
        answer: true,
        explanation: seed.explanation || seed.answer,
        difficulty: options.difficulty || seed.difficulty || 'medium',
      }, index, type);
    }
    if (type === 'shortanswer' || type === 'longanswer') {
      return normalizeQuestion({
        type,
        questionText: seed.question?.endsWith('?') ? seed.question : `Explain: ${seed.question || pack.lessonTitle || pack.courseTitle}`,
        sampleAnswer: seed.answer || seed.explanation || pack.summary,
        explanation: seed.explanation || seed.answer,
        difficulty: options.difficulty || seed.difficulty || 'medium',
      }, index, type);
    }
    return normalizeQuestion({
      type: 'mcq',
      questionText: seed.question?.endsWith('?') ? seed.question : `What is the best answer for ${seed.question || pack.lessonTitle || pack.courseTitle}?`,
      options: [
        { text: seed.answer || seed.explanation || 'The main concept from the saved lesson content', isCorrect: true },
        { text: 'An unrelated idea not supported by the lesson', isCorrect: false },
        { text: 'A partially correct but incomplete answer', isCorrect: false },
        { text: 'A distractor answer for review practice', isCorrect: false },
      ],
      explanation: seed.explanation || seed.answer,
      difficulty: options.difficulty || seed.difficulty || 'medium',
    }, index, 'mcq');
  });

  if (onlyQuestions) return { questions };
  return {
    assessment: {
      title: `${pack.lessonTitle || pack.moduleTitle || pack.courseTitle} Assessment`,
      type: options.assessmentType || 'quiz',
      course: pack.courseId,
      module: pack.moduleTitle || '',
      description: `AI-generated assessment from saved content for ${pack.lessonTitle || pack.courseTitle}.`,
      instructions: 'Read each question carefully and answer using the lesson concepts covered in this course.',
      tags: ['ai-generated', pack.courseTitle, pack.lessonTitle].filter(Boolean).slice(0, 5),
      timeLimit: Math.max(10, Math.ceil(count * 2)),
      attemptsAllowed: 1,
      passingScore: 60,
      gradingType: 'auto',
      shuffleQuestions: true,
      shuffleOptions: true,
      showScore: true,
      showCorrectAnswers: 'immediate',
      showFeedback: true,
      questionsPerPage: 1,
      allowBacktrack: true,
      autoSubmit: true,
      preventTabSwitch: false,
      requireFullscreen: false,
      disableCopyPaste: false,
      warnOnTabSwitch: true,
      autoSubmitOnViolation: false,
      maxViolationsAllowed: 3,
      enableWebcam: false,
      enableFaceDetection: false,
      logSuspiciousActivity: true,
      visibility: 'draft',
      notifyStudents: true,
      questions,
    },
  };
};

const extractJson = (value) => {
  const raw = typeof value === 'string' ? value : JSON.stringify(value || {});
  const withoutFence = raw.replace(/```json/gi, '```').replace(/```/g, '').trim();
  const first = withoutFence.indexOf('{');
  const last = withoutFence.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) throw new Error('AI did not return JSON');
  return JSON.parse(withoutFence.slice(first, last + 1));
};

const normalizeAssessment = (aiData, pack, options = {}) => {
  const setup = aiData.setup || aiData.assessment || aiData;
  const settings = aiData.settings || {};
  const display = aiData.display || {};
  const proctoring = aiData.proctoring || {};
  const questionList = arr(aiData.questions || setup.questions).map((question, index) =>
    normalizeQuestion(question, index, arr(options.questionTypes)[index % Math.max(1, arr(options.questionTypes).length)] || 'mcq'));

  const fallback = makeLocalAssessment(pack, options).assessment;
  return {
    ...fallback,
    title: cleanText(setup.title || fallback.title),
    type: setup.type || options.assessmentType || fallback.type,
    course: pack.courseId,
    module: cleanText(setup.module || setup.moduleTitle || pack.moduleTitle || ''),
    description: cleanText(setup.description || fallback.description),
    instructions: cleanText(setup.instructions || setup.studentInstructions || fallback.instructions),
    tags: arr(setup.tags).length ? arr(setup.tags).map(cleanText).filter(Boolean).slice(0, 8) : fallback.tags,
    timeLimit: Number(settings.timeLimit || fallback.timeLimit),
    attemptsAllowed: Number(settings.attemptsAllowed || fallback.attemptsAllowed),
    passingScore: Number(settings.passingScore || fallback.passingScore),
    gradingType: ['auto', 'manual', 'hybrid'].includes(settings.gradingType) ? settings.gradingType : fallback.gradingType,
    shuffleQuestions: bool(settings.shuffleQuestions ?? display.shuffleQuestions, true),
    shuffleOptions: bool(settings.shuffleOptions ?? display.shuffleOptions, true),
    showScore: bool(display.showScore, true),
    showCorrectAnswers: normalizeShowAnswers(display.showCorrectAnswers),
    showFeedback: bool(display.showFeedback, true),
    questionsPerPage: Number(display.questionsPerPage ?? 1),
    allowBacktrack: bool(display.allowBacktrack, true),
    autoSubmit: bool(settings.autoSubmit, true),
    preventTabSwitch: bool(proctoring.preventTabSwitch, false),
    requireFullscreen: bool(proctoring.requireFullscreen, false),
    disableCopyPaste: bool(proctoring.disableCopyPaste, false),
    warnOnTabSwitch: bool(proctoring.warnOnTabSwitch ?? proctoring.showWarningOnTabSwitch, true),
    autoSubmitOnViolation: bool(proctoring.autoSubmitOnViolation ?? proctoring.autoSubmitOnMaxViolations, false),
    maxViolationsAllowed: Number(proctoring.maxViolationsAllowed || 3),
    enableWebcam: bool(proctoring.enableWebcam ?? proctoring.webcamMonitoring, false),
    enableFaceDetection: bool(proctoring.enableFaceDetection, false),
    logSuspiciousActivity: bool(proctoring.logSuspiciousActivity, true),
    questions: questionList.length ? questionList : fallback.questions,
  };
};

const aiPrompt = ({ pack, options, mode, currentQuestion }) => `
Create ${mode === 'questions' ? 'only additional assessment questions' : 'a complete LMS assessment draft'} from SAVED DB CONTENT only.
Do not invent external facts. If content is thin, create concept-check questions from the available summaries/flashcards.
Return strict JSON only. No markdown.

Required JSON shape:
{
  "setup": {"title":"","type":"quiz|exam|assignment|practice","module":"","description":"","instructions":"","tags":[]},
  "settings": {"timeLimit":30,"attemptsAllowed":1,"passingScore":60,"gradingType":"auto|manual|hybrid","shuffleQuestions":true,"shuffleOptions":true,"autoSubmit":true},
  "display": {"showScore":true,"showCorrectAnswers":"never|immediate|after_due","showFeedback":true,"questionsPerPage":1,"allowBacktrack":true},
  "proctoring": {"preventTabSwitch":false,"requireFullscreen":false,"disableCopyPaste":false,"warnOnTabSwitch":true,"autoSubmitOnViolation":false,"maxViolationsAllowed":3,"enableWebcam":false,"enableFaceDetection":false,"logSuspiciousActivity":true},
  "questions": [
    {"type":"mcq","questionText":"","options":[{"text":"","isCorrect":true},{"text":"","isCorrect":false},{"text":"","isCorrect":false},{"text":"","isCorrect":false}],"explanation":"","points":1,"difficulty":"medium","tags":[]}
  ],
  "sourceReference": {"courseTitle":"","moduleTitle":"","lessonTitle":"","usedContent":[]}
}

Options: ${JSON.stringify(options)}
Current question for regeneration: ${JSON.stringify(currentQuestion || null)}
Knowledge pack: ${JSON.stringify(pack)}
`;

const callAssessmentAi = async ({ pack, options, mode = 'full', currentQuestion, userId }) => {
  const startedAt = Date.now();
  try {
    const response = await callAiService({
      endpoint: '/v1/tutor/chat',
      payload: {
        message: aiPrompt({ pack, options, mode, currentQuestion }),
        userRole: 'trainer',
        context: {
          tutorMode: 'Assessment JSON Generator',
          lessonContent: [pack.summary, pack.detailedSummary, pack.revisionNotes, pack.transcript].filter(Boolean).join('\n\n').slice(0, 16000),
        },
      },
      retries: 0,
      timeout: 45000,
    });
    await logAiUsage({
      userId,
      feature: 'assessment-generate-from-saved-content',
      status: 'success',
      latencyMs: Date.now() - startedAt,
      requestMeta: { mode, courseId: pack.courseId, lessonId: pack.lessonId },
    });
    return extractJson(response?.data?.message || response?.message || response);
  } catch (error) {
    await logAiUsage({
      userId,
      feature: 'assessment-generate-from-saved-content',
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      requestMeta: { mode, courseId: pack.courseId, lessonId: pack.lessonId },
      errorMessage: error.message,
    });
    throw error;
  }
};

const packSummary = (pack) => ({
  courseTitle: pack.courseTitle,
  moduleTitle: pack.moduleTitle,
  lessonTitle: pack.lessonTitle,
  availability: pack.availability,
  counts: {
    flashcards: pack.flashcards.length,
    existingQuizQuestions: pack.existingQuizQuestions.length,
    uploadedNotes: pack.uploadedNotes.length,
    imageInsights: pack.imageInsights.length,
  },
});

export const generateAssessmentFromSavedContent = asyncHandler(async (req, res, next) => {
  const options = req.body || {};
  const pack = await buildKnowledgePack(options, req.user?._id);
  if (!packHasContent(pack)) return next(new ErrorResponse('No saved lesson content found for AI assessment generation', 400));

  let source = 'ai';
  let assessment;
  try {
    const aiData = await callAssessmentAi({ pack, options, mode: 'full', userId: req.user?._id });
    assessment = normalizeAssessment(aiData, pack, options);
  } catch (error) {
    source = 'fallback';
    assessment = makeLocalAssessment(pack, options).assessment;
  }

  res.json({
    success: true,
    source,
    data: {
      assessment,
      questions: assessment.questions,
      knowledgePackSummary: packSummary(pack),
    },
  });
});

export const addQuestionsFromSavedContent = asyncHandler(async (req, res, next) => {
  const options = req.body || {};
  const pack = await buildKnowledgePack(options, req.user?._id);
  if (!packHasContent(pack)) return next(new ErrorResponse('No saved lesson content found for AI question generation', 400));

  let source = 'ai';
  let questions;
  try {
    const aiData = await callAssessmentAi({ pack, options, mode: 'questions', userId: req.user?._id });
    questions = arr(aiData.questions).map((question, index) => normalizeQuestion(question, index, arr(options.questionTypes)[0] || 'mcq'));
  } catch (error) {
    source = 'fallback';
    questions = makeLocalAssessment(pack, options, true).questions;
  }

  res.json({
    success: true,
    source,
    data: {
      questions,
      knowledgePackSummary: packSummary(pack),
    },
  });
});

export const regenerateQuestion = asyncHandler(async (req, res, next) => {
  const options = req.body || {};
  const pack = await buildKnowledgePack(options, req.user?._id);
  if (!packHasContent(pack)) return next(new ErrorResponse('No saved lesson content found for AI question regeneration', 400));

  let source = 'ai';
  let question;
  try {
    const aiData = await callAssessmentAi({
      pack,
      options: { ...options, questionCount: 1, questionTypes: [options.question?.type || 'mcq'] },
      mode: 'regenerate',
      currentQuestion: options.question,
      userId: req.user?._id,
    });
    question = normalizeQuestion(arr(aiData.questions)[0] || aiData.question || aiData, 0, options.question?.type || 'mcq');
  } catch (error) {
    source = 'fallback';
    question = makeLocalAssessment(pack, { ...options, questionCount: 1, questionTypes: [options.question?.type || 'mcq'] }, true).questions[0];
  }

  res.json({
    success: true,
    source,
    data: {
      question,
      knowledgePackSummary: packSummary(pack),
    },
  });
});
