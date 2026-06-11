import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Settings, ClipboardList, Eye,
  Plus, Trash2, Search, Clock, Shuffle, ChevronDown, ChevronRight,
  AlertCircle, GripVertical, Loader2, Globe, BookOpen,
  BarChart3, Users, Award, Calendar, X, Zap, FileText,
  Shield, Camera, Monitor, MousePointer, Activity, Bot,
  Send, Minimize2, Maximize2, MessageSquare, Info,
  ToggleLeft, Lock, Bell, RefreshCw,
} from 'lucide-react';
import { VoiceInputField } from '../course/VoiceInputField';
import { RichTextEditor } from '../course/RichTextEditor';
import { SUPPORTED_LANGUAGES, voiceInputService } from '../../services/voiceInputService';
import {
  QuestionEditor, Question, QuestionType, QUESTION_TYPES,
  makeQuestion,
} from './QuestionEditor';
import {
  createAssessment as apiCreate,
  updateAssessment as apiUpdate,
  generateAssessmentFromSavedContent,
  addQuestionsFromSavedContent,
  regenerateAssessmentQuestion,
} from '../../services/assessmentService';
import { getCourses, DBCourse } from '../../services/courseService';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssessmentType = 'quiz' | 'exam' | 'assignment' | 'survey' | 'practice' | 'poll';
type ShowAnswers = 'never' | 'immediate' | 'after_due';
type AiGenerateMode = 'full' | 'questions';

interface AssessmentFormData {
  // Step 0: Setup
  title: string;
  type: AssessmentType;
  course: string;
  module: string;
  description: string;
  instructions: string;
  tags: string[];

  // Step 1: Settings — Time & Attempts
  timeLimit: number;
  attemptsAllowed: number;
  gracePeriod: number;

  // Step 1: Settings — Scoring
  passingScore: number;
  totalPoints: number;
  gradingType: 'auto' | 'manual' | 'hybrid';

  // Step 1: Settings — Display & Navigation
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScore: boolean;
  showCorrectAnswers: ShowAnswers;
  showFeedback: boolean;
  questionsPerPage: number;
  allowBacktrack: boolean;
  autoSubmit: boolean;

  // Step 1: Settings — Scheduling
  availableFrom: string;
  availableUntil: string;

  // Step 1: Settings — Proctoring
  preventTabSwitch: boolean;
  requireFullscreen: boolean;
  disableCopyPaste: boolean;
  warnOnTabSwitch: boolean;
  autoSubmitOnViolation: boolean;
  maxViolationsAllowed: number;
  enableWebcam: boolean;
  enableFaceDetection: boolean;
  logSuspiciousActivity: boolean;

  // Step 2: Questions
  questions: Question[];

  // Step 3: Review
  visibility: 'draft' | 'published' | 'scheduled';
  notifyStudents: boolean;
  scheduleAt: string;
}

// ─── Chatbot messages ─────────────────────────────────────────────────────────
interface ChatMsg { role: 'bot' | 'user'; text: string; }

interface AiAssessmentForm {
  courseId: string;
  sectionId: string;
  lessonId: string;
  assessmentType: AssessmentType;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  language: string;
  teacherInstruction: string;
  useContent: {
    transcript: boolean;
    summary: boolean;
    detailedSummary: boolean;
    revisionNotes: boolean;
    flashcards: boolean;
    uploadedNotes: boolean;
    imageAnalysis: boolean;
    audioTranscript: boolean;
  };
}

const STEP_HINTS: Record<number, string[]> = {
  0: [
    '👋 Welcome! Start by selecting the assessment type. Quiz is great for quick checks, Exam for formal tests.',
    '📝 Fill in the title clearly — students will see this first.',
    '🎯 Assign to a course so students can find this assessment easily.',
    '📋 Write clear student instructions — what tools are allowed, how to attempt, etc.',
  ],
  1: [
    '⏱️ Set a time limit. For quizzes, 30 min is standard. Use 0 for unlimited.',
    '🔄 Attempts: 3 is recommended for quizzes. Use 1 for exams.',
    '📊 Passing score of 60% is standard. Adjust based on difficulty.',
    '🔀 Shuffle questions to prevent cheating in online exams.',
    '🛡️ Enable proctoring features for high-stakes exams.',
  ],
  2: [
    '➕ Click "Add Question" to start building your question bank.',
    '🎯 Mix question types — MCQ for quick checks, Short Answer for deeper understanding.',
    '⚖️ Assign points based on difficulty. Hard questions can be worth more.',
    '🔍 Use the search and filter to find specific questions quickly.',
  ],
  3: [
    '✅ Review all details before publishing.',
    '📢 Enable "Notify Students" to alert enrolled students.',
    '📅 Use "Schedule" to set a future publish date.',
    '💾 You can always save as draft and publish later.',
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSESSMENT_TYPES: { type: AssessmentType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { type: 'quiz',       label: 'Quiz',          desc: 'Short knowledge check, auto-graded',       icon: Zap,          color: 'indigo' },
  { type: 'exam',       label: 'Exam',          desc: 'Formal exam with time limit & proctoring', icon: ClipboardList, color: 'red' },
  { type: 'assignment', label: 'Assignment',    desc: 'Submission-based, manual grading',          icon: FileText,     color: 'purple' },
  { type: 'survey',     label: 'Survey',        desc: 'Collect opinions, no right/wrong',         icon: BarChart3,    color: 'teal' },
  { type: 'practice',   label: 'Practice Test', desc: 'Unlimited attempts, for self-study',       icon: BookOpen,     color: 'green' },
  { type: 'poll',       label: 'Poll',          desc: 'Single-question quick poll',               icon: Users,        color: 'yellow' },
];

const STEPS = [
  { id: 0, label: 'Setup',     icon: BookOpen },
  { id: 1, label: 'Settings',  icon: Settings },
  { id: 2, label: 'Questions', icon: ClipboardList },
  { id: 3, label: 'Review',    icon: Eye },
];

const mkId = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_AI_FORM: AiAssessmentForm = {
  courseId: '',
  sectionId: '',
  lessonId: '',
  assessmentType: 'quiz',
  questionCount: 8,
  questionTypes: ['mcq', 'truefalse', 'shortanswer'],
  difficulty: 'mixed',
  language: 'English',
  teacherInstruction: '',
  useContent: {
    transcript: true,
    summary: true,
    detailedSummary: true,
    revisionNotes: true,
    flashcards: true,
    uploadedNotes: true,
    imageAnalysis: true,
    audioTranscript: true,
  },
};

const DEFAULT_DATA: AssessmentFormData = {
  title: '',
  type: 'quiz',
  course: '',
  module: '',
  description: '',
  instructions: '',
  tags: [],
  timeLimit: 30,
  attemptsAllowed: 3,
  passingScore: 60,
  totalPoints: 0,
  shuffleQuestions: false,
  shuffleOptions: true,
  showScore: true,
  showCorrectAnswers: 'immediate',
  showFeedback: true,
  questionsPerPage: 1,
  allowBacktrack: true,
  autoSubmit: true,
  availableFrom: '',
  availableUntil: '',
  gracePeriod: 5,
  preventTabSwitch: false,
  requireFullscreen: false,
  disableCopyPaste: false,
  warnOnTabSwitch: true,
  autoSubmitOnViolation: false,
  maxViolationsAllowed: 3,
  enableWebcam: false,
  enableFaceDetection: false,
  logSuspiciousActivity: true,
  gradingType: 'auto',
  questions: [],
  visibility: 'draft',
  notifyStudents: true,
  scheduleAt: '',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateAssessmentProps {
  userRole: 'admin' | 'trainer';
  onBack: () => void;
  onPublished?: (data: AssessmentFormData) => void;
  initialData?: Partial<AssessmentFormData>;
  initialAssessmentId?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateAssessment({ userRole, onBack, onPublished, initialData, initialAssessmentId }: CreateAssessmentProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AssessmentFormData>(() =>
    initialData ? { ...DEFAULT_DATA, ...initialData } : DEFAULT_DATA
  );
  const [globalLang, setGlobalLang] = useState('en');
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(initialAssessmentId ?? null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Courses state
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiMode, setAiMode] = useState<AiGenerateMode>('full');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState<AiAssessmentForm>(() => ({
    ...DEFAULT_AI_FORM,
    courseId: initialData?.course || '',
    assessmentType: (initialData?.type as AssessmentType) || 'quiz',
  }));

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([
    { role: 'bot', text: STEP_HINTS[0][0] },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Q builder state
  const [searchQ, setSearchQ] = useState('');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showTypePanel, setShowTypePanel] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Auto-scroll chatbot
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  // Fetch courses on mount
  useEffect(() => {
    setLoadingCourses(true);
    getCourses({ limit: '100', status: 'active' })
      .then(res => {
        if (res.success && res.data) {
          setCourses(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to fetch courses:', err);
        toast.error('Failed to load courses');
      })
      .finally(() => setLoadingCourses(false));
  }, []);

  // Show step hint when step changes
  useEffect(() => {
    const hints = STEP_HINTS[step];
    if (hints?.length) {
      const hint = hints[Math.floor(Math.random() * hints.length)];
      setChatMsgs((prev) => [...prev, { role: 'bot', text: hint }]);
    }
  }, [step]);

  const set = useCallback(<K extends keyof AssessmentFormData>(k: K, v: AssessmentFormData[K]) => {
    setData((d) => ({ ...d, [k]: v }));
  }, []);

  // ── Auto-save to localStorage ────────────────────────────────────────────
  const AUTO_SAVE_KEY = 'assessment_draft_autosave';
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount (if no initialData)
  useEffect(() => {
    if (!initialData && !initialAssessmentId) {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const shouldRestore = window.confirm(
            '📝 Found unsaved draft from previous session. Do you want to restore it?'
          );
          if (shouldRestore) {
            setData(parsed.data);
            setStep(parsed.step || 0);
            toast.success('Draft restored!', { icon: '📝' });
          } else {
            localStorage.removeItem(AUTO_SAVE_KEY);
          }
        } catch (error) {
          console.error('Failed to restore draft:', error);
          localStorage.removeItem(AUTO_SAVE_KEY);
        }
      }
    }
  }, [initialData, initialAssessmentId]);

  // Auto-save to localStorage whenever data or step changes
  useEffect(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer (debounce for 2 seconds)
    autoSaveTimerRef.current = setTimeout(() => {
      if (!initialAssessmentId && data.title) {
        // Only auto-save if there's a title (indicates user has started)
        const saveData = {
          data,
          step,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
        console.log('Auto-saved draft to localStorage');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [data, step, initialAssessmentId]);

  // Clear auto-save when assessment is published
  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    console.log('Cleared auto-save draft');
  }, []);

  // Handle page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (data.title && !saved && data.visibility === 'draft') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data.title, saved, data.visibility]);

  // ── Chatbot ───────────────────────────────────────────────────────────────
  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMsgs((prev) => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    // Simple keyword-based responses
    setTimeout(() => {
      let reply = "I'm here to help! Try asking about time limits, question types, proctoring, or scoring.";
      const lower = msg.toLowerCase();
      if (lower.includes('time') || lower.includes('limit')) reply = '⏱️ Set time limit in Settings → Time & Attempts. Use 0 for unlimited. Grace period gives extra time after the clock runs out.';
      else if (lower.includes('proctor') || lower.includes('cheat')) reply = '🛡️ Enable proctoring in Settings → Proctoring. Tab switch detection, fullscreen enforcement, and copy-paste restriction are available.';
      else if (lower.includes('question') || lower.includes('mcq')) reply = '❓ Go to Step 3 (Questions) and click "+ Add Question". Choose from 15 question types including MCQ, True/False, Fill in Blank, and more.';
      else if (lower.includes('pass') || lower.includes('score')) reply = '📊 Set passing score in Settings → Scoring & Grading. 60% is standard. Use the slider to adjust.';
      else if (lower.includes('publish') || lower.includes('draft')) reply = '📢 In the Review step, choose "Publish Now" to go live immediately, or "Schedule" to set a future date. "Save Draft" keeps it hidden.';
      else if (lower.includes('shuffle') || lower.includes('random')) reply = '🔀 Enable "Shuffle question order" and "Shuffle MCQ option order" in Settings → Display & Navigation to prevent cheating.';
      else if (lower.includes('attempt')) reply = '🔄 Set attempts in Settings → Time & Attempts. 1 for exams, 3 for quizzes, 999 for unlimited (practice tests).';
      else if (lower.includes('webcam') || lower.includes('camera')) reply = '📷 Webcam monitoring is in Settings → Proctoring. Enable "Webcam Monitoring" and optionally "Face Detection" for high-stakes exams.';
      setChatMsgs((prev) => [...prev, { role: 'bot', text: reply }]);
    }, 600);
  };

  // ── Tags ──────────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !data.tags.includes(t)) set('tags', [...data.tags, t]);
    setTagInput('');
  };

  // ── Question CRUD ─────────────────────────────────────────────────────────

  const addQuestion = (type: QuestionType) => {
    set('questions', [...data.questions, makeQuestion(type)]);
    setShowTypePanel(false);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) =>
    set('questions', data.questions.map((q) => q.id === id ? { ...q, ...patch } : q));

  const removeQuestion = (id: string) =>
    set('questions', data.questions.filter((q) => q.id !== id));

  const duplicateQuestion = (id: string) => {
    const idx = data.questions.findIndex((q) => q.id === id);
    if (idx === -1) return;
    const copy = { ...data.questions[idx], id: mkId() };
    const arr = [...data.questions];
    arr.splice(idx + 1, 0, copy);
    set('questions', arr);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const openAiGenerator = (mode: AiGenerateMode) => {
    setAiMode(mode);
    setAiForm((current) => ({
      ...current,
      courseId: current.courseId || data.course || courses[0]?._id || '',
      assessmentType: data.type || current.assessmentType,
    }));
    setAiModalOpen(true);
  };

  const normalizeAiQuestions = (questions: any[] = []): Question[] =>
    questions.map((question) => ({
      ...question,
      id: question.id || mkId(),
      type: (question.type || 'mcq') as QuestionType,
      difficulty: question.difficulty || 'medium',
      tags: Array.isArray(question.tags) ? question.tags : [],
      points: Number(question.points || 1),
      negativePoints: Number(question.negativePoints || 0),
      required: question.required !== false,
      questionText: question.questionText || question.question || '',
      explanation: question.explanation || '',
    }));

  const buildAiPayload = () => ({
    courseId: aiForm.courseId,
    sectionId: aiForm.sectionId || undefined,
    lessonId: aiForm.lessonId || undefined,
    assessmentType: aiForm.assessmentType,
    useContent: aiForm.useContent,
    questionCount: aiForm.questionCount,
    questionTypes: aiForm.questionTypes,
    difficulty: aiForm.difficulty === 'mixed' ? undefined : aiForm.difficulty,
    language: aiForm.language,
    teacherInstruction: aiForm.teacherInstruction,
    existingQuestions: data.questions.map((question) => ({
      type: question.type,
      questionText: question.questionText,
      difficulty: question.difficulty,
    })),
  });

  const handleAiGenerate = async () => {
    if (!aiForm.courseId) {
      toast.error('Please select a course for AI generation.');
      return;
    }
    setAiGenerating(true);
    try {
      const payload = buildAiPayload();
      const res = aiMode === 'full'
        ? await generateAssessmentFromSavedContent(payload)
        : await addQuestionsFromSavedContent(payload);

      if (!res.success) {
        toast.error(res.message || 'AI generation failed.');
        return;
      }

      const selectedCourse = courses.find((course) => course._id === aiForm.courseId);
      const selectedSection = selectedCourse?.sections?.find((section) => section._id === aiForm.sectionId);
      const generated = res.data?.assessment || {};
      const questions = normalizeAiQuestions((aiMode === 'full' ? generated.questions : res.data?.questions) || []);

      if (aiMode === 'full') {
        setData((current) => ({
          ...current,
          ...generated,
          course: generated.course || aiForm.courseId,
          module: generated.module || selectedSection?.title || current.module,
          type: (generated.type || aiForm.assessmentType || current.type) as AssessmentType,
          visibility: current.visibility,
          questions,
        }));
        setStep(2);
        toast.success(`Assessment generated${res.source === 'fallback' ? ' from saved content fallback' : ' with AI'}.`);
      } else {
        set('questions', [...data.questions, ...questions]);
        toast.success(`${questions.length} AI questions added.`);
      }
      setAiModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'AI generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleRegenerateQuestion = async (question: Question) => {
    const courseId = aiForm.courseId || data.course;
    if (!courseId) {
      toast.error('Select a course before regenerating a question.');
      return;
    }
    setRegeneratingQuestionId(question.id);
    try {
      const res = await regenerateAssessmentQuestion({
        ...buildAiPayload(),
        courseId,
        questionCount: 1,
        questionTypes: [question.type],
        question,
      });
      if (!res.success || !res.data?.question) {
        toast.error(res.message || 'Could not regenerate this question.');
        return;
      }
      const [replacement] = normalizeAiQuestions([res.data.question]);
      updateQuestion(question.id, { ...replacement, id: question.id });
      toast.success(`Question regenerated${res.source === 'fallback' ? ' from saved content fallback' : ' with AI'}.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not regenerate this question.');
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  const handleDragStart = (i: number) => setDraggingIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (i: number) => {
    if (draggingIdx === null || draggingIdx === i) { setDraggingIdx(null); setDragOverIdx(null); return; }
    const arr = [...data.questions];
    const [item] = arr.splice(draggingIdx, 1);
    arr.splice(i, 0, item);
    set('questions', arr);
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  // ── BujjiChuti ─────────────────────────────────────────────────────────────

  const handleTranslateAll = async () => {
    if (globalLang === 'en') return;
    setIsTranslatingAll(true);
    try {
      const tr = (t: string) => voiceInputService.translate(t, globalLang, 'en');
      const [title, module] = await Promise.all([tr(data.title), tr(data.module)]);
      set('title', title);
      set('module', module);
    } finally {
      setIsTranslatingAll(false);
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────

  const totalPoints = data.questions.reduce((a, q) => a + q.points, 0);
  const selectedAiCourse = courses.find((course) => course._id === aiForm.courseId);
  const selectedAiSection = selectedAiCourse?.sections?.find((section) => section._id === aiForm.sectionId);
  const aiLessonOptions = selectedAiSection?.lessons || [];
  const filteredQ = data.questions.filter((q) => {
    const matchSearch = !searchQ || q.questionText.toLowerCase().includes(searchQ.toLowerCase());
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    const matchType = filterType === 'all' || q.type === filterType;
    return matchSearch && matchDiff && matchType;
  });

  const completenessChecks = [
    { label: 'Title set', ok: !!data.title },
    { label: 'Course assigned', ok: !!data.course },
    { label: 'Instructions written', ok: !!data.instructions },
    { label: 'At least 1 question', ok: data.questions.length > 0 },
    { label: 'All questions have text', ok: data.questions.every((q) => !!q.questionText) },
    { label: 'MCQ/MSQ have a correct answer', ok: data.questions.filter((q) => q.type === 'mcq' || q.type === 'msq').every((q) => q.options?.some((o) => o.isCorrect)) },
    { label: 'Time limit set', ok: data.timeLimit > 0 },
    { label: 'Passing score set', ok: data.passingScore > 0 },
  ];
  const readyToPublish = completenessChecks.filter((c) => c.ok).length >= 5;

  const handleSaveDraft = async () => {
    if (!data.title) { toast.error('Please enter an assessment title before saving.'); return; }
    setIsSaving(true);
    setApiError(null);
    try {
      const payload = { ...data, visibility: 'draft' } as unknown as Record<string, unknown>;
      let res;
      if (assessmentId) {
        res = await apiUpdate(assessmentId, payload);
      } else {
        res = await apiCreate(payload);
        if (res.success && res.data?._id) setAssessmentId(res.data._id as string);
      }
      if (res.success) {
        clearAutoSave(); // Clear localStorage auto-save when saved to backend
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        toast.success('Draft saved to server!', { icon: '💾' });
      } else {
        setApiError(res.message || 'Failed to save draft.');
        toast.error(res.message || 'Failed to save draft.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to save. Please try again.');
      toast.error(msg || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!data.title || !data.course) {
      toast.error('Title and course are required to publish.');
      return;
    }
    setIsSaving(true);
    setApiError(null);
    try {
      const payload = { ...data, visibility: data.visibility === 'draft' ? 'published' : data.visibility } as unknown as Record<string, unknown>;
      let res;
      if (assessmentId) {
        res = await apiUpdate(assessmentId, payload);
      } else {
        res = await apiCreate(payload);
        if (res.success && res.data?._id) setAssessmentId(res.data._id as string);
      }
      if (res.success) {
        clearAutoSave(); // Clear auto-save when published
        toast.success(
          initialAssessmentId ? 'Assessment updated!' : 'Assessment published!',
          { description: `"${data.title}" is now live.`, icon: '🚀' }
        );
        onPublished?.({ ...data, visibility: 'published' });
      } else {
        setApiError(res.message || 'Failed to publish.');
        toast.error(res.message || 'Failed to publish.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to publish. Please try again.');
      toast.error(msg || 'Failed to publish. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back</span>
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {initialAssessmentId ? 'Edit Assessment' : (data.title || 'New Assessment')}
            </h1>
            <p className="text-xs text-gray-500 capitalize">
              {data.type} · Step {step + 1} of 4
              {data.questions.length > 0 && ` · ${data.questions.length} questions · ${totalPoints} pts`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-save indicator */}
          {!initialAssessmentId && data.title && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3" />
              <span>Auto-saving...</span>
            </div>
          )}
          <button onClick={() => openAiGenerator('full')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all">
            <Bot className="w-4 h-4" />
            Generate Assessment with AI
          </button>
          <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
            {saved ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saved ? 'Saved!' : initialAssessmentId ? 'Save Changes' : 'Save Draft'}
          </button>
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{apiError}</p>
          <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-600 ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-1">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const done = idx < step;
            return (
              <button
                key={s.id}
                onClick={() => idx <= step && setStep(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  idx === step ? 'bg-indigo-600 text-white shadow-sm' :
                  done ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' :
                  'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                {s.label}
                {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 ml-1 opacity-40" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-4 space-y-6">

        {/* ── STEP 0: SETUP ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-indigo-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Saved content generator</p>
                <h2 className="text-lg font-bold text-gray-900">Generate setup, settings and questions from course content</h2>
                <p className="text-sm text-gray-500 mt-1">Uses saved transcripts, summaries, flashcards, notes and media insights already stored in the LMS.</p>
              </div>
              <button onClick={() => openAiGenerator('full')} className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
                <Bot className="w-4 h-4" />
                Generate Assessment with AI
              </button>
            </div>

            {/* Assessment Type selector */}
            <Card title="Assessment Type" icon={Zap}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ASSESSMENT_TYPES.map((at) => {
                  const Icon = at.icon;
                  const active = data.type === at.type;
                  return (
                    <label
                      key={at.type}
                      className={`flex flex-col gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all min-h-[120px] ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <input type="radio" name="atype" checked={active} onChange={() => set('type', at.type)} className="sr-only" />
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-${at.color}-100`}>
                          <Icon className={`w-5 h-5 text-${at.color}-600`} />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{at.label}</p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{at.desc}</p>
                    </label>
                  );
                })}
              </div>
            </Card>

            <Card title="Basic Information" icon={FileText}>
              <div className="space-y-5">
                <VoiceInputField label="Assessment Title" required value={data.title} onChange={(v) => set('title', v)} placeholder={`e.g. ${data.type === 'quiz' ? 'Module 3 Quiz' : data.type === 'exam' ? 'Final Examination 2026' : 'Chapter Assignment'}`} lang={globalLang} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Course <span className="text-red-500">*</span></label>
                    <select 
                      value={data.course} 
                      onChange={(e) => set('course', e.target.value)} 
                      disabled={loadingCourses}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">{loadingCourses ? 'Loading courses...' : 'Select course'}</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <VoiceInputField label="Module / Chapter" value={data.module} onChange={(v) => set('module', v)} placeholder="e.g. Module 3 — Marketing Basics" lang={globalLang} />
                </div>
                <RichTextEditor label="Description" value={data.description} onChange={(v) => set('description', v)} placeholder="Brief overview of this assessment…" height={160} lang={globalLang} showTranslate={globalLang !== 'en'} translateTargetLang="en" />
                <RichTextEditor label="Student Instructions" required value={data.instructions} onChange={(v) => set('instructions', v)} placeholder="Rules, guidelines, what students should know before starting…" height={200} lang={globalLang} showTranslate={globalLang !== 'en'} translateTargetLang="en" />
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {data.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs">
                        {t}<button onClick={() => set('tags', data.tags.filter((x) => x !== t))}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag and press Enter" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={addTag} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">Add</button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 1: SETTINGS ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <Card title="Time & Attempts" icon={Clock}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={data.timeLimit} onChange={(e) => set('timeLimit', +e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-xs text-gray-400">0 = unlimited</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attempts Allowed</label>
                  <select value={data.attemptsAllowed} onChange={(e) => set('attemptsAllowed', +e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {[1,2,3,4,5,10].map((n) => <option key={n} value={n}>{n} attempt{n !== 1 ? 's' : ''}</option>)}
                    <option value={999}>Unlimited</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (min after time up)</label>
                  <input type="number" min={0} value={data.gracePeriod} onChange={(e) => set('gracePeriod', +e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </Card>

            <Card title="Scoring & Grading" icon={Award}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} value={data.passingScore} onChange={(e) => set('passingScore', +e.target.value)} className="flex-1 accent-indigo-600" />
                    <span className="w-12 text-center font-bold text-indigo-600 text-lg">{data.passingScore}%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grading Type</label>
                  <div className="space-y-2">
                    {[
                      { v: 'auto',   label: 'Automatic',  desc: 'Auto-graded (MCQ, T/F, etc.)' },
                      { v: 'manual', label: 'Manual',      desc: 'Instructor grades each response' },
                      { v: 'hybrid', label: 'Hybrid',      desc: 'Auto + manual for essay/code' },
                    ].map((g) => (
                      <label key={g.v} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${data.gradingType === g.v ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="grading" checked={data.gradingType === g.v} onChange={() => set('gradingType', g.v as any)} className="text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{g.label}</p>
                          <p className="text-xs text-gray-500">{g.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Display & Navigation" icon={Eye}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  {[
                    { key: 'shuffleQuestions', label: 'Shuffle question order',     icon: Shuffle },
                    { key: 'shuffleOptions',   label: 'Shuffle MCQ option order',   icon: Shuffle },
                    { key: 'allowBacktrack',   label: 'Allow going back to prev questions', icon: ArrowLeft },
                    { key: 'autoSubmit',       label: 'Auto-submit when time expires', icon: Clock },
                    { key: 'showScore',        label: 'Show score after submission', icon: BarChart3 },
                    { key: 'showFeedback',     label: 'Show per-question feedback',  icon: CheckCircle2 },
                  ].map(({ key, label, icon: Icon }) => (
                    <ToggleRow key={key} label={label} icon={Icon} checked={(data as any)[key]} onChange={(v) => set(key as any, v)} />
                  ))}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Show Correct Answers</label>
                    <select value={data.showCorrectAnswers} onChange={(e) => set('showCorrectAnswers', e.target.value as ShowAnswers)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="never">Never</option>
                      <option value="immediate">Immediately after submission</option>
                      <option value="after_due">After due date passes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Questions per Page</label>
                    <select value={data.questionsPerPage} onChange={(e) => set('questionsPerPage', +e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value={1}>1 — One at a time</option>
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={0}>All at once</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Scheduling & Availability" icon={Calendar}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available From</label>
                  <input type="datetime-local" value={data.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Until</label>
                  <input type="datetime-local" value={data.availableUntil} onChange={(e) => set('availableUntil', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </Card>

            <Card title="Proctoring & Security" icon={Shield}>
              <div className="space-y-4">
                {/* Basic proctoring */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Controls</p>
                  <div className="space-y-2">
                    <ToggleRow label="Prevent tab switching (warn student on violation)" icon={Monitor} checked={data.preventTabSwitch} onChange={(v) => set('preventTabSwitch', v)} />
                    <ToggleRow label="Disable copy-paste during assessment" icon={MousePointer} checked={data.disableCopyPaste} onChange={(v) => set('disableCopyPaste', v)} />
                    <ToggleRow label="Require fullscreen mode" icon={Maximize2} checked={data.requireFullscreen} onChange={(v) => set('requireFullscreen', v)} />
                    <ToggleRow label="Show warning on tab switch (before auto-submit)" icon={Bell} checked={data.warnOnTabSwitch} onChange={(v) => set('warnOnTabSwitch', v)} />
                    <ToggleRow label="Log all suspicious activity" icon={Activity} checked={data.logSuspiciousActivity} onChange={(v) => set('logSuspiciousActivity', v)} />
                  </div>
                </div>

                {/* Violation handling */}
                {data.preventTabSwitch && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Violation Handling</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max Violations Before Action</label>
                        <select value={data.maxViolationsAllowed} onChange={(e) => set('maxViolationsAllowed', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                          <option value={1}>1 — Immediate action</option>
                          <option value={2}>2 violations</option>
                          <option value={3}>3 violations</option>
                          <option value={5}>5 violations</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <ToggleRow label="Auto-submit on max violations" icon={RefreshCw} checked={data.autoSubmitOnViolation} onChange={(v) => set('autoSubmitOnViolation', v)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced proctoring */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Advanced Monitoring (Future)</p>
                  <div className="space-y-2 opacity-80">
                    <ToggleRow label="Webcam monitoring (record during attempt)" icon={Camera} checked={data.enableWebcam} onChange={(v) => set('enableWebcam', v)} />
                    {data.enableWebcam && (
                      <ToggleRow label="Face detection (alert if face not visible)" icon={Camera} checked={data.enableFaceDetection} onChange={(v) => set('enableFaceDetection', v)} />
                    )}
                  </div>
                  {(data.enableWebcam || data.enableFaceDetection) && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Webcam & face detection require student consent and browser permission. Activity logs are stored for review.
                    </div>
                  )}
                </div>

                {/* Summary badge */}
                {(data.preventTabSwitch || data.requireFullscreen || data.disableCopyPaste) && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span>Proctoring active — {[data.preventTabSwitch && 'Tab detection', data.requireFullscreen && 'Fullscreen', data.disableCopyPaste && 'Copy-paste blocked'].filter(Boolean).join(' · ')}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ── STEP 2: QUESTIONS ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex gap-4 items-start">
            {/* ── Left: question list ── */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Toolbar */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search questions…" className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none">
                  <option value="all">All Types</option>
                  {QUESTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-gray-500">{filteredQ.length}/{data.questions.length} · {totalPoints} pts</span>
                  <button
                    onClick={() => openAiGenerator('questions')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Bot className="w-4 h-4" /> AI Add Questions
                  </button>
                  <button
                    onClick={() => setShowTypePanel((s) => !s)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${showTypePanel ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                </div>
              </div>

              {/* Question list */}
              {filteredQ.length === 0 && data.questions.length === 0 && (
                <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium text-gray-500">No questions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Pick a question type from the panel on the right</p>
                </div>
              )}

              <div className="space-y-4">
                {filteredQ.map((q) => {
                  const realIdx = data.questions.indexOf(q);
                  return (
                    <div
                      key={q.id}
                      draggable
                      onDragStart={() => handleDragStart(realIdx)}
                      onDragOver={(e) => handleDragOver(e, realIdx)}
                      onDrop={() => handleDrop(realIdx)}
                      onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                      className={`transition-all ${dragOverIdx === realIdx && draggingIdx !== realIdx ? 'border-t-2 border-indigo-400 pt-2' : ''}`}
                    >
                      <QuestionEditor
                        question={q}
                        index={realIdx}
                        globalLang={globalLang}
                        onUpdate={(patch) => updateQuestion(q.id, patch)}
                        onRemove={() => removeQuestion(q.id)}
                        onDuplicate={() => duplicateQuestion(q.id)}
                        onRegenerate={() => handleRegenerateQuestion(q)}
                        isRegenerating={regeneratingQuestionId === q.id}
                        isDragging={draggingIdx === realIdx}
                        dragHandleProps={{
                          draggable: true,
                          onDragStart: () => handleDragStart(realIdx),
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {data.questions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                    {[
                      { label: 'Total Questions', value: data.questions.length },
                      { label: 'Total Points', value: totalPoints },
                      { label: 'Easy', value: data.questions.filter((q) => q.difficulty === 'easy').length },
                      { label: 'Medium', value: data.questions.filter((q) => q.difficulty === 'medium').length },
                      { label: 'Hard', value: data.questions.filter((q) => q.difficulty === 'hard').length },
                      { label: 'Unique Types', value: new Set(data.questions.map((q) => q.type)).size },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: question type sidebar ── */}
            {showTypePanel && (
              <div className="w-56 flex-shrink-0 bg-white rounded-2xl border-2 border-indigo-200 shadow-lg sticky top-24 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100 bg-indigo-50">
                  <h3 className="font-semibold text-sm text-indigo-900">Question Types</h3>
                  <button onClick={() => setShowTypePanel(false)} className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
                  {QUESTION_TYPES.map((qt) => {
                    const Icon = qt.icon;
                    return (
                      <button
                        key={qt.type}
                        onClick={() => addQuestion(qt.type)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:border-indigo-200 hover:bg-indigo-50 transition-all group text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                          <Icon className="w-4 h-4 text-gray-600 group-hover:text-indigo-600" />
                        </div>
                        <span className="text-xs text-gray-700 group-hover:text-indigo-700 font-medium leading-tight">{qt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t border-indigo-100 bg-indigo-50">
                  <p className="text-[10px] text-indigo-500 text-center">Click to add · Drag questions to reorder</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: REVIEW & PUBLISH ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Review your assessment</h3>
              <p className="text-gray-600 text-sm">Check everything before publishing. You can edit after publishing too.</p>
              <button onClick={() => openAiGenerator('full')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                <Bot className="w-4 h-4" />
                Generate Assessment with AI
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Questions', value: data.questions.length, icon: ClipboardList, color: 'indigo' },
                { label: 'Total Points', value: totalPoints, icon: Award, color: 'purple' },
                { label: 'Time Limit', value: data.timeLimit ? `${data.timeLimit}m` : 'None', icon: Clock, color: 'yellow' },
                { label: 'Passing Score', value: `${data.passingScore}%`, icon: BarChart3, color: 'green' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-2xl p-4 flex items-center gap-3`}>
                    <Icon className={`w-6 h-6 text-${s.color}-600 flex-shrink-0`} />
                    <div>
                      <p className="text-lg font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Details table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900">Assessment Details</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Title', value: data.title || '—' },
                  { label: 'Type', value: data.type },
                  { label: 'Course', value: data.course || '—' },
                  { label: 'Module', value: data.module || '—' },
                  { label: 'Attempts Allowed', value: data.attemptsAllowed === 999 ? 'Unlimited' : String(data.attemptsAllowed) },
                  { label: 'Grading', value: data.gradingType },
                  { label: 'Shuffle Questions', value: data.shuffleQuestions ? 'Yes' : 'No' },
                  { label: 'Show Correct Answers', value: data.showCorrectAnswers.replace('_', ' ') },
                  { label: 'Available From', value: data.availableFrom || 'Immediately' },
                  { label: 'Available Until', value: data.availableUntil || 'No expiry' },
                  { label: 'Proctoring', value: [data.preventTabSwitch && 'Tab switch prevented', data.requireFullscreen && 'Fullscreen required'].filter(Boolean).join(', ') || 'None' },
                ].map((row) => (
                  <div key={row.label} className="flex px-5 py-3">
                    <span className="w-44 text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Question breakdown */}
            {data.questions.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h4 className="font-semibold text-gray-900 mb-4">Question Breakdown by Type</h4>
                <div className="space-y-2">
                  {Array.from(new Set(data.questions.map((q) => q.type))).map((type) => {
                    const qs = data.questions.filter((q) => q.type === type);
                    const pts = qs.reduce((a, q) => a + q.points, 0);
                    const info = QUESTION_TYPES.find((t) => t.type === type)!;
                    const Icon = info.icon;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-gray-500 flex items-center gap-1">
                          <Icon className="w-3 h-3" />{info.label}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(qs.length / data.questions.length) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-20 text-right">{qs.length} q · {pts} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completeness */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-4">Completeness Check</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {completenessChecks.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    {c.ok ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                    <span className={`text-sm ${c.ok ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
              {!readyToPublish && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 text-sm text-yellow-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Complete at least 5 checks before publishing.
                </div>
              )}
            </div>

            {/* Visibility + notify */}
            <Card title="Publish Settings" icon={Globe}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: 'published',  label: 'Publish Now',    desc: 'Live immediately', icon: Globe },
                    { v: 'scheduled',  label: 'Schedule',       desc: 'Go live at a set time', icon: Calendar },
                    { v: 'draft',      label: 'Save as Draft',  desc: 'Invisible to students', icon: FileText },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <label key={opt.v} className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${data.visibility === opt.v ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="vis" value={opt.v} checked={data.visibility === opt.v} onChange={() => set('visibility', opt.v as any)} className="sr-only" />
                        <Icon className="w-5 h-5 text-indigo-500 mb-2" />
                        <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </label>
                    );
                  })}
                </div>
                {data.visibility === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Date & Time</label>
                    <input type="datetime-local" value={data.scheduleAt} onChange={(e) => set('scheduleAt', e.target.value)} className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
                <ToggleRow label="Notify enrolled students when published" icon={Users} checked={data.notifyStudents} onChange={(v) => set('notifyStudents', v)} />
              </div>
            </Card>

            {/* Publish actions */}
            <div className="flex gap-4">
              {!initialAssessmentId && (
                <button onClick={handleSaveDraft} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-indigo-300 text-indigo-700 rounded-2xl font-semibold hover:bg-indigo-50 transition-all">
                  {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
                  Save as Draft
                </button>
              )}
              <button onClick={handlePublish} disabled={isSaving || !readyToPublish} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {initialAssessmentId ? 'Update Assessment' : data.visibility === 'scheduled' ? 'Schedule Assessment' : 'Publish Assessment'}
              </button>
            </div>
          </div>
        )}

        {/* Nav */}
        {step < 3 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-400">Step {step + 1} of 4</span>
            <button onClick={() => setStep((s) => Math.min(3, s + 1))} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Chatbot Assistant ──────────────────────────────────────────────── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{aiMode === 'full' ? 'Generate Assessment with AI' : 'AI Add Questions'}</h3>
                  <p className="text-sm text-gray-500">Only saved LMS content is used. No video, audio or file re-processing.</p>
                </div>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 max-h-[72vh] overflow-y-auto">
              <div className="lg:col-span-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course <span className="text-red-500">*</span></label>
                    <select value={aiForm.courseId} onChange={(e) => setAiForm((current) => ({ ...current, courseId: e.target.value, sectionId: '', lessonId: '' }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select course</option>
                      {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assessment Type</label>
                    <select value={aiForm.assessmentType} onChange={(e) => setAiForm((current) => ({ ...current, assessmentType: e.target.value as AssessmentType }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {ASSESSMENT_TYPES.map((type) => <option key={type.type} value={type.type}>{type.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module / Chapter</label>
                    <select value={aiForm.sectionId} onChange={(e) => setAiForm((current) => ({ ...current, sectionId: e.target.value, lessonId: '' }))} disabled={!selectedAiCourse?.sections?.length} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                      <option value="">Auto pick first module</option>
                      {selectedAiCourse?.sections?.map((section) => <option key={section._id} value={section._id}>{section.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lesson</label>
                    <select value={aiForm.lessonId} onChange={(e) => setAiForm((current) => ({ ...current, lessonId: e.target.value }))} disabled={!aiLessonOptions.length} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100">
                      <option value="">Auto pick first lesson</option>
                      {aiLessonOptions.map((lesson) => <option key={lesson._id} value={lesson._id}>{lesson.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Count</label>
                    <input type="number" min={1} max={50} value={aiForm.questionCount} onChange={(e) => setAiForm((current) => ({ ...current, questionCount: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select value={aiForm.difficulty} onChange={(e) => setAiForm((current) => ({ ...current, difficulty: e.target.value as AiAssessmentForm['difficulty'] }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select value={aiForm.language} onChange={(e) => setAiForm((current) => ({ ...current, language: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Hinglish</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Types</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['mcq', 'msq', 'truefalse', 'fillblank', 'shortanswer', 'longanswer', 'match', 'ordering'] as QuestionType[]).map((type) => {
                      const active = aiForm.questionTypes.includes(type);
                      const label = QUESTION_TYPES.find((item) => item.type === type)?.label || type;
                      return (
                        <button key={type} type="button" onClick={() => setAiForm((current) => ({ ...current, questionTypes: active ? current.questionTypes.filter((item) => item !== type) : [...current.questionTypes, type] }))} className={`px-3 py-2 rounded-xl border text-sm font-medium text-left transition-colors ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teacher Instruction</label>
                  <textarea value={aiForm.teacherInstruction} onChange={(e) => setAiForm((current) => ({ ...current, teacherInstruction: e.target.value }))} placeholder="Example: focus on practical questions and include scenario-based MCQs." className="w-full min-h-[110px] px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Use Saved Content</h4>
                  <div className="space-y-2">
                    {[
                      ['transcript', 'Transcript'],
                      ['summary', 'AI Summary'],
                      ['detailedSummary', 'Detailed Summary'],
                      ['revisionNotes', 'Revision Notes'],
                      ['flashcards', 'Flashcards'],
                      ['uploadedNotes', 'Uploaded Notes'],
                      ['imageAnalysis', 'Image Analysis / OCR'],
                      ['audioTranscript', 'Audio Transcript'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-white">
                        <span className="text-sm text-gray-700">{label}</span>
                        <input type="checkbox" checked={(aiForm.useContent as any)[key]} onChange={(e) => setAiForm((current) => ({ ...current, useContent: { ...current.useContent, [key]: e.target.checked } }))} className="w-4 h-4 accent-indigo-600" />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                  <h4 className="font-semibold text-indigo-950 mb-2">Flow</h4>
                  <div className="space-y-2 text-sm text-indigo-800">
                    <p>1. Pick course/module/lesson.</p>
                    <p>2. Backend builds a knowledge pack from saved DB fields.</p>
                    <p>3. AI returns strict assessment JSON.</p>
                    <p>4. Trainer reviews and saves draft or publishes.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setAiModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white">Cancel</button>
              <button onClick={handleAiGenerate} disabled={aiGenerating || !aiForm.courseId || aiForm.questionTypes.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                Generate from Saved Content
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Chat window */}
        {chatOpen && (
          <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '420px' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Assessment Assistant</p>
                <p className="text-xs text-indigo-200">Step {step + 1} of 4 — {STEPS[step].label}</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {chatMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'bot' && (
                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <Bot className="w-3 h-3 text-indigo-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Quick hints */}
            <div className="px-3 py-2 border-t border-gray-100 bg-white">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {['Time limit?', 'Proctoring?', 'Question types?', 'How to publish?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); }}
                    className="flex-shrink-0 text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={sendChat}
                className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg flex items-center justify-center hover:shadow-xl transition-all hover:scale-105 relative"
        >
          {chatOpen ? <Minimize2 className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!chatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ToggleRow({ label, icon: Icon, checked, onChange }: { label: string; icon: React.ElementType; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
