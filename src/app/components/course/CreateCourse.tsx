import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Sparkles,
  Target,
  IndianRupee,
  LayoutList,
  Settings,
  Eye,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Image,
  Video,
  FileText,
  ClipboardList,
  Radio,
  GripVertical,
  Tag,
  X,
  CheckCircle2,
  Upload,
  Globe,
  Lock,
  Clock,
  Users,
  Award,
  MessageSquare,
  Mic,
  Loader2,
  HelpCircle,
  AlertCircle,
  Paperclip,
  UploadCloud,
} from 'lucide-react';
import { VoiceInputField } from './VoiceInputField';
import { RichTextEditor } from './RichTextEditor';
import { SUPPORTED_LANGUAGES, voiceInputService } from '../../services/voiceInputService';
import { createCourse, saveCourseLesson, submitCourseForReview, updateCourse } from '../../services/courseService';
import { getVideoSummary, regenerateVideoSummary } from '../../services/aiLessonNoteService';
import { uploadFile } from '../../services/mediaService';
import { buildLessonAssetPatch, toAbsoluteAssetUrl } from '../../utils/fileUrl';
import { getDepartments, type Department } from '../../services/departmentService';
import { getBatches, type Batch } from '../../services/batchService';
// @ts-ignore - axiosConfig is a .js file
import axiosInstance from '../../../utils/axiosConfig';
import { toast } from 'sonner';

const formatBytes = (bytes?: number, decimals = 2) => {
  if (!bytes) return '';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const transcriptText = (value: any) => typeof value === 'object' ? (value?.text || '') : (value || '');

const mapSavedCourseToFormData = (d: any): CourseFormData => {
  return {
    title: d.title || '',
    subtitle: d.subtitle || '',
    description: d.description || '',
    overview: d.overview || '',
    category: d.category || '',
    subCategory: d.subCategory || '',
    language: d.language || 'en',
    level: d.level || 'beginner',
    tags: d.tags || [],
    thumbnail: d.thumbnail || '',
    promoVideo: d.promoVideo || '',
    objectives: d.objectives || ['', ''],
    requirements: d.requirements || [''],
    targetAudience: d.targetAudience || '',
    price: d.pricing?.amount ?? 50,
    enrollType: d.enrollmentType || 'open',
    enrollStart: d.enrollStart ? String(d.enrollStart).slice(0, 10) : '',
    enrollEnd: d.enrollEnd ? String(d.enrollEnd).slice(0, 10) : '',
    departments: Array.isArray(d.departments) ? d.departments.map((dept: any) => typeof dept === 'string' ? dept : dept._id) : [],
    batches: Array.isArray(d.batches) ? d.batches.map((batch: any) => typeof batch === 'string' ? batch : batch._id) : [],
    trainer: typeof d.trainer === 'string' ? d.trainer : d.trainer?._id || '',
    maxStudents: d.maxStudents ? String(d.maxStudents) : '',
    sections: (d.sections || []).map((sec: any, si: number) => ({
      id: sec._id,
      title: sec.title || (si === 0 ? 'Introduction' : 'Untitled Section'),
      description: sec.description || '',
      isOpen: false,
      lessons: (sec.lessons || []).map((les: any, li: number) => ({
        id: les._id,
        title: les.title || (si === 0 && li === 0 ? 'Welcome to the course' : 'Untitled Lesson'),
        type: les.type,
        order: les.order ?? li + 1,
        content: les.content || '',
        description: les.description || '',
        videoDescription: les.videoDescription || les.description || '',
        transcript: transcriptText(les.transcript || les.videoSummary?.transcript || les.videoSummary?.rawTranscript),
        manualTranscript: les.manualTranscript || '',
        generatedTranscript: les.generatedTranscript || les.videoSummary?.generated?.transcript || les.videoSummary?.rawTranscript || '',
        summary: les.summary || '',
        notes: les.notes || '',
        videoUrl: les.videoUrl || '',
        videoDuration: les.videoDuration || '',
        duration: les.duration || '',
        languageMode: les.languageMode || 'auto',
        transcriptionMode: les.transcriptionMode || 'balanced',
        lessonImage: les.lessonImage || '',
        lessonAudio: les.lessonAudio || '',
        lessonVideo: les.lessonVideo || '',
        videoAsset: les.videoAsset,
        imageAsset: les.imageAsset,
        audioAsset: les.audioAsset,
        mediaAssets: les.mediaAssets || [],
        attachments: les.attachments || [],
        videoSummary: les.videoSummary,
        isPreview: les.isPreview || false,
        resources: les.resources || [],
        assignments: les.assignments || [],
        knowledgeChecks: les.knowledgeChecks || les.questions || [],
        requiredChecklist: les.requiredChecklist || [],
        questions: les.questions || [],
        assignment: les.assignment,
        updatedAt: les.updatedAt,
      })),
    })),
    visibility: (d.visibility || 'draft') as Visibility,
    enableCertificate: d.enableCertificate !== false,
    certPassScore: d.certPassScore ?? 70,
    enableDiscussion: d.enableDiscussion !== false,
    courseValidity: d.courseValidity || '365',
    welcomeMessage: d.welcomeMessage || '',
    congratsMessage: d.congratsMessage || '',
    metaTitle: d.metaTitle || '',
    metaDescription: d.metaDescription || '',
  };
};

// ─── Types ───────────────────────────────────────────────────────────────────

type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all';
type EnrollType = 'open' | 'approval' | 'invite';
type Visibility = 'public' | 'private' | 'draft';
type LessonType = 'video' | 'article' | 'quiz' | 'assignment' | 'live';

interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'doc' | 'link' | 'zip';
  storageProvider?: 'gridfs' | 'local' | 's3' | 'cloudinary';
  fileAssetId?: string;
  gridfsFileId?: string;
  streamUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  mimeType?: string;
  fileSize?: number;
  originalName?: string;
}

interface LessonAsset {
  title?: string;
  storageProvider?: 'gridfs' | 'local' | 's3' | 'cloudinary';
  fileAssetId?: string;
  gridfsFileId?: string;
  bucketName?: string;
  streamUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

interface TopicQuestion {
  id: string;
  question: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer';
  options: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  explanation: string;
  position: 'start' | 'middle' | 'end'; // Where in the lesson the question appears
  timestamp?: number; // For video lessons - at what second
}

interface CourseLesson {
  id: string;
  title: string;
  type: LessonType;
  order?: number;
  content: string;
  description?: string;
  videoDescription?: string;
  fullDescription?: string;
  overview?: string;
  transcript: string;
  manualTranscript?: string;
  generatedTranscript?: string;
  summary: string;
  notes?: string;
  videoUrl: string;
  videoDuration: string;
  duration?: string | number;
  languageMode?: string;
  transcriptionMode?: string;
  lessonImage?: string;
  lessonAudio?: string;
  lessonVideo?: string;
  videoAsset?: LessonAsset;
  imageAsset?: LessonAsset;
  audioAsset?: LessonAsset;
  mediaAssets?: any[];
  attachments?: LessonResource[];
  videoSummary?: Record<string, any>;
  isPreview: boolean;
  resources: LessonResource[];
  assignments?: Array<Record<string, any>>;
  knowledgeChecks?: Array<Record<string, any>>;
  requiredChecklist?: Array<Record<string, any>>;
  questions: TopicQuestion[]; // Questions for this lesson
  updatedAt?: string;
  // Assignment fields
  assignment?: {
    title: string;
    description: string;
    dueDate: string;
    attachmentUrl: string;
    attachmentAsset?: LessonAsset;
    maxScore: number;
  };
}

interface CourseSection {
  id: string;
  title: string;
  description: string;
  fullDescription?: string;
  isOpen: boolean;
  lessons: CourseLesson[];
}

interface CourseFormData {
  // Step 1
  title: string;
  subtitle: string;
  description: string;
  fullDescription?: string;
  overview?: string;
  category: string;
  subCategory: string;
  language: string;
  level: CourseLevel;
  tags: string[];
  thumbnail: string;
  promoVideo: string;
  // Step 2
  objectives: string[];
  requirements: string[];
  targetAudience: string;
  // Step 3
  price: number;
  enrollType: EnrollType;
  enrollStart: string;
  enrollEnd: string;
  departments: string[];
  batches: string[];
  trainer: string;
  maxStudents: string;
  // Step 4
  sections: CourseSection[];
  // Step 5
  visibility: Visibility;
  enableCertificate: boolean;
  certPassScore: number;
  enableDiscussion: boolean;
  courseValidity: string;
  welcomeMessage: string;
  congratsMessage: string;
  metaTitle: string;
  metaDescription: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'management', label: 'Cooperative Management' },
  { value: 'finance', label: 'Finance & Accounting' },
  { value: 'marketing', label: 'Digital Marketing' },
  { value: 'legal', label: 'Legal Compliance' },
  { value: 'technology', label: 'Technology' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'healthcare', label: 'Healthcare' },
];

const DESCRIPTION_IMAGE_SRC_REGEX = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;

const hasTemporaryDescriptionImages = (html = '') => {
  const source = String(html || '');
  let match;
  while ((match = DESCRIPTION_IMAGE_SRC_REGEX.exec(source)) !== null) {
    const src = String(match[1] || '').trim().toLowerCase();
    if (src.startsWith('blob:')) {
      DESCRIPTION_IMAGE_SRC_REGEX.lastIndex = 0;
      return true;
    }
  }
  DESCRIPTION_IMAGE_SRC_REGEX.lastIndex = 0;
  return false;
};

const STEPS = [
  { id: 0, label: 'Basic Info', icon: BookOpen },
  { id: 1, label: 'Objectives', icon: Target },
  { id: 2, label: 'Pricing', icon: IndianRupee },
  { id: 3, label: 'Content', icon: LayoutList },
  { id: 4, label: 'Settings', icon: Settings },
  { id: 5, label: 'Review', icon: Eye },
];

// Note: TRAINERS will be fetched dynamically from backend

const LESSON_ICONS: Record<LessonType, typeof Video> = {
  video: Video,
  article: FileText,
  quiz: ClipboardList,
  assignment: ClipboardList,
  live: Radio,
};

const mkId = () => Math.random().toString(36).slice(2, 9);
const isMongoId = (value?: string | null) => /^[a-f\d]{24}$/i.test(String(value || ''));
const isSameId = (a: any, b: any) => String(a?._id || a?.tempId || a?.id || a || '') === String(b?._id || b?.tempId || b?.id || b || '');

const freshLesson = (overrides: Partial<CourseLesson> = {}): CourseLesson => ({
  id: `temp-lesson-${Date.now()}-${mkId()}`,
  title: 'New Lesson',
  type: 'video',
  content: '',
  description: '',
  videoDescription: '',
  transcript: '',
  manualTranscript: '',
  generatedTranscript: '',
  summary: '',
  notes: '',
  videoUrl: '',
  videoDuration: '',
  duration: '',
  lessonImage: '',
  lessonAudio: '',
  lessonVideo: '',
  videoAsset: undefined,
  imageAsset: undefined,
  audioAsset: undefined,
  mediaAssets: [],
  attachments: [],
  videoSummary: { status: 'idle', generated: {}, error: null },
  isPreview: false,
  resources: [],
  assignments: [],
  knowledgeChecks: [],
  requiredChecklist: [],
  questions: [],
  ...overrides,
});

const lessonPayload = (lesson: CourseLesson, order: number) => ({
  ...(isMongoId(lesson.id) ? { _id: lesson.id } : { tempId: lesson.id }),
  title: lesson.title || 'Untitled Lesson',
  type: lesson.type || 'video',
  description: lesson.description || '',
  content: lesson.content || '',
  order,
  duration: lesson.duration ?? '',
  videoDuration: lesson.videoDuration || '',
  videoUrl: lesson.videoUrl || '',
  lessonImage: lesson.lessonImage || '',
  lessonAudio: lesson.lessonAudio || '',
  lessonVideo: lesson.lessonVideo || '',
  videoAsset: lesson.videoAsset || null,
  imageAsset: lesson.imageAsset || null,
  audioAsset: lesson.audioAsset || null,
  mediaAssets: Array.isArray(lesson.mediaAssets) ? lesson.mediaAssets : [],
  transcript: lesson.transcript || '',
  manualTranscript: lesson.manualTranscript || '',
  generatedTranscript: lesson.generatedTranscript || '',
  videoDescription: lesson.videoDescription || '',
  summary: lesson.summary || '',
  notes: lesson.notes || '',
  attachments: Array.isArray(lesson.attachments) ? lesson.attachments : [],
  resources: Array.isArray(lesson.resources) ? lesson.resources : [],
  assignments: Array.isArray(lesson.assignments) ? lesson.assignments : [],
  knowledgeChecks: Array.isArray(lesson.knowledgeChecks) && lesson.knowledgeChecks.length ? lesson.knowledgeChecks : (lesson.questions || []),
  questions: Array.isArray(lesson.questions) ? lesson.questions : [],
  requiredChecklist: Array.isArray(lesson.requiredChecklist) ? lesson.requiredChecklist : [],
  languageMode: (lesson as any).languageMode || 'auto',
  transcriptionMode: (lesson as any).transcriptionMode || 'balanced',
  videoSummary: lesson.videoSummary || { status: 'idle', generated: {}, error: null },
  isPreview: Boolean(lesson.isPreview),
  assignment: lesson.assignment,
});

const coursePayload = (course: CourseFormData, visibility: Visibility = 'draft') => ({
  ...course,
  visibility,
  sections: course.sections.map((section, sectionIndex) => ({
    ...(isMongoId(section.id) ? { _id: section.id } : { tempId: section.id }),
    title: section.title || 'Untitled Section',
    description: section.description || '',
    fullDescription: section.fullDescription || '',
    order: sectionIndex,
    lessons: section.lessons.map((lesson, lessonIndex) => lessonPayload(lesson, lessonIndex)),
  })),
});

const DEFAULT_DATA: CourseFormData = {
  title: '',
  subtitle: '',
  description: '',
  category: '',
  subCategory: '',
  language: 'en',
  level: 'beginner',
  tags: [],
  thumbnail: '',
  promoVideo: '',
  objectives: ['', ''],
  requirements: [''],
  targetAudience: '',
  price: 50,
  enrollType: 'open',
  enrollStart: '',
  enrollEnd: '',
  departments: [],
  batches: [],
  trainer: '',
  maxStudents: '',
  sections: [
    {
      id: mkId(),
      title: 'Introduction',
      description: '',
      isOpen: true,
      lessons: [
        freshLesson({ id: mkId(), title: 'Welcome to the course', isPreview: true }),
      ],
    },
  ],
  visibility: 'draft',
  enableCertificate: true,
  certPassScore: 70,
  enableDiscussion: true,
  courseValidity: '365',
  welcomeMessage: '',
  congratsMessage: '',
  metaTitle: '',
  metaDescription: '',
};

interface CreateCourseProps {
  userRole: 'admin' | 'trainer';
  onBack: () => void;
  onPublished?: (data: CourseFormData) => void;
  initialData?: Partial<CourseFormData>;
  initialCourseId?: string;
  initialReviewStatus?: string;
  initialAdminReview?: { message?: string; decision?: string | null };
}

export function CreateCourse({ userRole, onBack, onPublished, initialData, initialCourseId, initialReviewStatus, initialAdminReview }: CreateCourseProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CourseFormData>(() =>
    initialData ? { ...DEFAULT_DATA, ...initialData } : DEFAULT_DATA
  );
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [globalLang, setGlobalLang] = useState('en');
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(initialCourseId ?? null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainers, setTrainers] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  const set = useCallback(<K extends keyof CourseFormData>(key: K, val: CourseFormData[K]) => {
    setData((d) => ({ ...d, [key]: val }));
  }, []);

  useEffect(() => {
    if (userRole === 'trainer' && !initialData?.trainer) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user._id) set('trainer', user._id);
      } catch (error) {
        console.error('Error getting user data:', error);
      }
    }
  }, [userRole, initialData, set]);

  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      try {
        const response = await getDepartments({ isActive: true });
        setDepartments(response.data || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchTrainers = async () => {
      if (userRole !== 'admin') return;
      setLoadingTrainers(true);
      try {
        const response = await axiosInstance.get('/users?role=trainer');
        if (response.data.success && response.data.data) {
          setTrainers(response.data.data.map((user: any) => ({
            _id: user._id,
            fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          })));
        }
      } catch (error) {
        console.error('Error fetching trainers:', error);
        toast.error('Failed to load trainers');
      } finally {
        setLoadingTrainers(false);
      }
    };
    fetchTrainers();
  }, [userRole]);

  useEffect(() => {
    const fetchBatches = async () => {
      if (!data.departments || data.departments.length === 0) {
        setBatches([]);
        return;
      }
      setLoadingBatches(true);
      try {
        const response = await getBatches({ isActive: true });
        const filteredBatches = (response.data || []).filter((batch: Batch) =>
          data.departments.includes(batch.department._id)
        );
        setBatches(filteredBatches);
      } catch (error) {
        console.error('Error fetching batches:', error);
        toast.error('Failed to load batches');
      } finally {
        setLoadingBatches(false);
      }
    };
    fetchBatches();
  }, [data.departments]);
  // ── Step helpers ────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !data.tags.includes(t)) set('tags', [...data.tags, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => set('tags', data.tags.filter((x) => x !== t));

  const addObjective = () => set('objectives', [...data.objectives, '']);
  const removeObjective = (i: number) =>
    set('objectives', data.objectives.filter((_, idx) => idx !== i));
  const setObjective = (i: number, v: string) =>
    set('objectives', data.objectives.map((o, idx) => (idx === i ? v : o)));

  const addRequirement = () => set('requirements', [...data.requirements, '']);
  const removeRequirement = (i: number) =>
    set('requirements', data.requirements.filter((_, idx) => idx !== i));
  const setRequirement = (i: number, v: string) =>
    set('requirements', data.requirements.map((r, idx) => (idx === i ? v : r)));

  // Sections
  const addSection = () =>
    setData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: `temp-section-${Date.now()}-${mkId()}`, title: 'New Section', description: '', isOpen: true, lessons: [] },
      ],
    }));

  const removeSection = (sid: string) =>
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => !isSameId(s.id, sid)),
    }));

  const updateSection = (sid: string, patch: Partial<CourseSection>) =>
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (isSameId(s.id, sid) ? { ...s, ...patch } : s)),
    }));

  const updateSectionTitle = (sectionId: string, newTitle: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        isSameId(section.id, sectionId)
          ? { ...section, title: newTitle.trim() || 'Untitled Section' }
          : section
      ),
    }));
  };

  const updateLessonTitle = (sectionId: string, lessonId: string, newTitle: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        isSameId(section.id, sectionId)
          ? {
              ...section,
              lessons: section.lessons.map((lesson) =>
                isSameId(lesson.id, lessonId)
                  ? { ...lesson, title: newTitle.trim() || 'Untitled Lesson', updatedAt: new Date().toISOString() }
                  : lesson
              ),
            }
          : section
      ),
    }));
  };

  const toggleSection = (sid: string) =>
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        isSameId(section.id, sid) ? { ...section, isOpen: !section.isOpen } : section
      ),
    }));

  const addLesson = (sid: string) =>
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        isSameId(section.id, sid)
          ? {
              ...section,
              lessons: [
                ...section.lessons,
                freshLesson({ order: section.lessons.length + 1 } as any),
              ],
            }
          : section
      ),
    }));

  const removeLesson = (sid: string, lid: string) =>
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        isSameId(section.id, sid)
          ? { ...section, lessons: section.lessons.filter((lesson) => !isSameId(lesson.id, lid)) }
          : section
      ),
    }));

  const updateLesson = (sid: string, lid: string, patch: Partial<CourseLesson>) => {
    if (import.meta.env.DEV) {
      console.log('[LESSON FIELD CHANGE]', {
        sectionId: sid,
        lessonId: lid,
        field: Object.keys(patch).join(','),
        valueLength: Object.values(patch).map((value) => typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : value ? 1 : 0),
      });
    }
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (!isSameId(section.id, sid)) return section;
        return {
          ...section,
          lessons: section.lessons.map((lesson) => {
            if (!isSameId(lesson.id, lid)) return lesson;
            return {
              ...lesson,
              ...patch,
              questions: patch.questions !== undefined ? patch.questions : (lesson.questions || []),
              knowledgeChecks: patch.questions !== undefined ? patch.questions as any : (patch.knowledgeChecks ?? lesson.knowledgeChecks ?? []),
            };
          }),
        };
      }),
    }));
  };

  // BujjiChuti – translate all text fields
  const handleTranslateAll = async () => {
    if (globalLang === 'en') return;
    setIsTranslatingAll(true);
    try {
      const tr = (t: string) => voiceInputService.translate(t, globalLang, 'en');
      const [title, subtitle, targetAudience] = await Promise.all([
        tr(data.title),
        tr(data.subtitle),
        tr(data.targetAudience),
      ]);
      const objectives = await Promise.all(data.objectives.map(tr));
      const requirements = await Promise.all(data.requirements.map(tr));
      setData((d) => ({ ...d, title, subtitle, targetAudience, objectives, requirements }));
    } finally {
      setIsTranslatingAll(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setApiError(null);
    try {
      if (hasTemporaryDescriptionImages(data.description)) {
        setApiError('Description contains temporary image URLs. Re-upload the images before saving.');
        return;
      }

      const payload = coursePayload(data, 'draft');
      if (import.meta.env.DEV) {
        console.log('[DRAFT SAVE PAYLOAD]', {
          sections: payload.sections.length,
          lessonKeys: payload.sections.map((section: any) => section.lessons.map((lesson: any) => Object.keys(lesson))),
        });
      }
      let res;
      if (courseId) {
        res = await updateCourse(courseId, payload as unknown as Record<string, unknown>);
      } else {
        // Need at least a title to save
        if (!data.title) {
          setApiError('Please enter a course title before saving.');
          return;
        }
        // Provide minimal required fields for draft
        const draftPayload = {
          ...payload,
          description: data.description || 'Draft',
          category: data.category || 'management',
        };
        res = await createCourse(draftPayload as unknown as Record<string, unknown>);
        if (res.success && res.data?._id) {
          setCourseId(res.data._id as string);
        }
      }
      if (res.success) {
        if (res.data) {
          setData(mapSavedCourseToFormData(res.data));
          if (res.data._id) setCourseId(res.data._id as string);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setApiError(res.message || 'Failed to save draft.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSaveDraft = async (localSectionId: string, localLessonId: string) => {
    if (hasTemporaryDescriptionImages(data.description)) {
      throw new Error('Description contains temporary image URLs. Re-upload the images before saving.');
    }

    const currentTitle = data.title || 'Untitled Course Draft';
    const payload = { ...coursePayload(data, 'draft'), title: currentTitle };

    let res;
    if (courseId) {
      res = await updateCourse(courseId, payload as unknown as Record<string, unknown>);
    } else {
      const draftPayload = {
        ...payload,
        description: data.description || 'Draft',
        category: data.category || 'management',
      };
      res = await createCourse(draftPayload as unknown as Record<string, unknown>);
    }

    if (!res.success) {
      throw new Error(res.message || 'Failed to save draft.');
    }

    const savedCourseData = res.data;
    const newCourseId = savedCourseData._id;

    // Set courseId state in parent
    setCourseId(newCourseId);

    // Map the saved course back to local formData state so client and DB IDs match
    const mappedFormData = mapSavedCourseToFormData(savedCourseData);
    setData(mappedFormData);

    const sIdx = data.sections.findIndex(s => isSameId(s.id, localSectionId));
    if (sIdx === -1) {
      throw new Error('SECTION_NOT_FOUND');
    }

    const lIdx = data.sections[sIdx].lessons.findIndex(l => isSameId(l.id, localLessonId));
    if (lIdx === -1) {
      throw new Error('LESSON_NOT_FOUND');
    }

    const savedSection = savedCourseData.sections[sIdx];
    const savedLesson = savedSection?.lessons[lIdx];

    if (!savedSection?._id || !savedLesson?._id) {
      throw new Error('IDS_NOT_FOUND_AFTER_SAVE');
    }

    return {
      courseId: newCourseId,
      sectionId: savedSection._id,
      lessonId: savedLesson._id,
    };
  };

  const handleSaveLesson = async (localSectionId: string, localLessonId: string) => {
    const section = data.sections.find((item) => isSameId(item.id, localSectionId));
    const lesson = section?.lessons.find((item) => isSameId(item.id, localLessonId));
    if (!section || !lesson) throw new Error('Lesson not found in current draft state');
    const lessonIndex = section.lessons.findIndex((item) => isSameId(item.id, localLessonId));
    const payloadLesson = lessonPayload(lesson, lessonIndex);

    if (import.meta.env.DEV) {
      console.log('[LESSON SAVE PAYLOAD]', { sectionId: localSectionId, lessonId: localLessonId, keys: Object.keys(payloadLesson) });
    }

    const needsDraftSave = !courseId || !isMongoId(localSectionId) || !isMongoId(localLessonId);
    if (needsDraftSave) {
      return handleAutoSaveDraft(localSectionId, localLessonId);
    }

    const res = await saveCourseLesson(courseId, localSectionId, localLessonId, {
      section: {
        title: section.title,
        description: section.description,
        order: data.sections.findIndex((item) => isSameId(item.id, localSectionId)),
      },
      lesson: payloadLesson,
    } as unknown as Record<string, unknown>);

    if (!res.success) throw new Error(res.message || 'Lesson save failed');
    const responseData = res.data as any;
    if (responseData?.lesson) {
      const savedLesson = responseData.lesson;
      setData((prev) => ({
        ...prev,
        sections: prev.sections.map((currentSection) => {
          if (!isSameId(currentSection.id, responseData?.sectionId || localSectionId)) return currentSection;
          return {
            ...currentSection,
            id: responseData?.sectionId || currentSection.id,
            lessons: currentSection.lessons.map((currentLesson) => {
              if (!isSameId(currentLesson.id, responseData?.lessonId || localLessonId)) return currentLesson;
              return {
                ...currentLesson,
                id: responseData?.lessonId || savedLesson._id || currentLesson.id,
                title: savedLesson.title ?? currentLesson.title,
                type: savedLesson.type ?? currentLesson.type,
                content: savedLesson.content ?? currentLesson.content,
                description: savedLesson.description ?? currentLesson.description,
                videoDescription: savedLesson.videoDescription ?? currentLesson.videoDescription,
                transcript: transcriptText(savedLesson.transcript ?? currentLesson.transcript),
                manualTranscript: savedLesson.manualTranscript ?? currentLesson.manualTranscript,
                generatedTranscript: savedLesson.generatedTranscript ?? currentLesson.generatedTranscript,
                summary: savedLesson.summary ?? currentLesson.summary,
                notes: savedLesson.notes ?? currentLesson.notes,
                videoUrl: savedLesson.videoUrl ?? currentLesson.videoUrl,
                videoDuration: savedLesson.videoDuration ?? currentLesson.videoDuration,
                duration: savedLesson.duration ?? currentLesson.duration,
                lessonImage: savedLesson.lessonImage ?? currentLesson.lessonImage,
                lessonAudio: savedLesson.lessonAudio ?? currentLesson.lessonAudio,
                lessonVideo: savedLesson.lessonVideo ?? currentLesson.lessonVideo,
                videoAsset: savedLesson.videoAsset ?? currentLesson.videoAsset,
                imageAsset: savedLesson.imageAsset ?? currentLesson.imageAsset,
                audioAsset: savedLesson.audioAsset ?? currentLesson.audioAsset,
                mediaAssets: savedLesson.mediaAssets ?? currentLesson.mediaAssets,
                attachments: savedLesson.attachments ?? currentLesson.attachments,
                resources: savedLesson.resources ?? currentLesson.resources,
                assignments: savedLesson.assignments ?? currentLesson.assignments,
                knowledgeChecks: savedLesson.knowledgeChecks ?? currentLesson.knowledgeChecks,
                requiredChecklist: savedLesson.requiredChecklist ?? currentLesson.requiredChecklist,
                questions: savedLesson.questions ?? currentLesson.questions,
                assignment: savedLesson.assignment ?? currentLesson.assignment,
                videoSummary: savedLesson.videoSummary ?? currentLesson.videoSummary,
              };
            }),
          };
        }),
      }));
    }
    if (import.meta.env.DEV) {
      console.log('[LESSON SAVE] success', { sectionId: responseData?.sectionId || localSectionId, lessonId: responseData?.lessonId || localLessonId });
    }
    return {
      courseId,
      sectionId: responseData?.sectionId || localSectionId,
      lessonId: responseData?.lessonId || localLessonId,
    };
  };

  // Validate questions - ensure all have correct answers set
  const validateQuestions = () => {
    const issues: string[] = [];
    data.sections.forEach((section, sIdx) => {
      section.lessons.forEach((lesson, lIdx) => {
        (lesson.questions || []).forEach((q, qIdx) => {
          const qNum = `${sIdx + 1}.${lIdx + 1}.${qIdx + 1}`;
          if (!q.question?.trim()) {
            issues.push(`Question ${qNum}: Question text is empty`);
          }
          if (q.questionType === 'multiple-choice') {
            const hasCorrect = q.options?.some(o => o.isCorrect);
            const hasOptions = q.options?.some(o => o.text?.trim());
            if (!hasCorrect) issues.push(`Question ${qNum}: No correct answer selected`);
            if (!hasOptions) issues.push(`Question ${qNum}: No options provided`);
          } else if (q.questionType === 'true-false') {
            if (!q.correctAnswer) issues.push(`Question ${qNum}: No correct answer selected (True/False)`);
          } else if (q.questionType === 'short-answer') {
            if (!q.correctAnswer?.trim()) issues.push(`Question ${qNum}: No correct answer provided`);
          }
        });
      });
    });
    return issues;
  };

  const handlePublish = async () => {
    if (!data.title || !data.category || !data.description) {
      setApiError('Title, category and description are required to submit for review.');
      return;
    }

    if (hasTemporaryDescriptionImages(data.description)) {
      setApiError('Description contains temporary image URLs. Re-upload the images before submitting for review.');
      return;
    }

    // Validate questions before publishing
    const questionIssues = validateQuestions();
    if (questionIssues.length > 0) {
      setApiError(`Please fix the following questions before submitting:\n${questionIssues.slice(0, 3).join('\n')}${questionIssues.length > 3 ? `\n...and ${questionIssues.length - 3} more` : ''}`);
      return;
    }

    setIsSaving(true);
    setApiError(null);
    try {
      const payload = coursePayload(data, 'draft');
      if (import.meta.env.DEV) {
        console.log('[DRAFT SAVE PAYLOAD]', {
          sections: payload.sections.length,
          lessonKeys: payload.sections.map((section: any) => section.lessons.map((lesson: any) => Object.keys(lesson))),
        });
      }
      let res;
      let activeCourseId = courseId;
      if (courseId) {
        res = await updateCourse(courseId, payload as unknown as Record<string, unknown>);
      } else {
        res = await createCourse(payload as unknown as Record<string, unknown>);
        if (res.success && res.data?._id) {
          activeCourseId = res.data._id as string;
          setCourseId(activeCourseId);
        }
      }
      if (res.success) {
        const targetCourseId = activeCourseId || (res.data?._id as string);
        if (!targetCourseId) {
          setApiError('Course saved, but review submission could not find the course id.');
          return;
        }
        const submitRes = await submitCourseForReview(targetCourseId);
        if (!submitRes.success) {
          setApiError(submitRes.message || 'Failed to submit course for review.');
          return;
        }
        toast.success('Course submitted for admin review');
        onPublished?.({ ...data, visibility: 'draft' });
      } else {
        setApiError(res.message || 'Failed to save course before review submission.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to submit course for review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalLessons = data.sections.reduce((a, s) => a + s.lessons.length, 0);
  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const welcomeMessageCount = stripHtml(data.welcomeMessage).length;
  const congratsMessageCount = stripHtml(data.congratsMessage).length;
  const metaDescriptionCount = data.metaDescription.trim().length;
  const visibilityOptions = [
    {
      value: 'public' as Visibility,
      label: 'Published',
      desc: 'Visible to all enrolled students',
      icon: Globe,
      accent: 'emerald',
    },
    {
      value: 'private' as Visibility,
      label: 'Private',
      desc: 'Only accessible via direct link',
      icon: Lock,
      accent: 'amber',
    },
    {
      value: 'draft' as Visibility,
      label: 'Draft',
      desc: 'Not visible to students yet',
      icon: FileText,
      accent: 'violet',
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF7FF] text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-96 w-96 rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="absolute right-[-5rem] top-36 h-[26rem] w-[26rem] rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="absolute left-1/2 top-[18rem] h-[34rem] w-[34rem] -translate-x-1/2 rounded-[5rem] bg-white/60 blur-3xl" />
        <div className="absolute left-14 bottom-6 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-blue-100/30 blur-3xl" />
        <div className="absolute inset-y-0 right-10 hidden w-[34rem] bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.07),transparent_60%),repeating-linear-gradient(180deg,rgba(15,23,42,0.035)_0,rgba(15,23,42,0.035)_1px,transparent_1px,transparent_22px)] opacity-50 lg:block" />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/92 shadow-[0_10px_35px_rgba(15,23,42,0.05)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <button
                onClick={onBack}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="h-8 w-px bg-slate-200/80" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-950 lg:text-[1.7rem]">
                  {initialCourseId ? 'Edit Course' : 'Create New Course'}
                </h1>
                <p className="text-xs font-medium text-slate-500 md:text-sm">
                  {data.title || 'Untitled course'} · Step {step + 1} of 6
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-slate-700 lg:flex">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Voice Language:
                <select
                  value={globalLang}
                  onChange={(e) => setGlobalLang(e.target.value)}
                  title="Voice language"
                  aria-label="Voice language"
                  className="border-0 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saved ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saved ? 'Saved!' : initialCourseId ? 'Save Changes' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>

      {/* API error banner */}
      {apiError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{apiError}</p>
          <button onClick={() => setApiError(null)} title="Dismiss error" aria-label="Dismiss error" className="text-red-400 hover:text-red-600 ml-4">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

        {/* Step indicator */}
        <div className="sticky top-[73px] z-20 border-b border-slate-200/80 bg-white/82 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const done = idx < step;
                const active = idx === step;
                return (
                  <button
                    key={s.id}
                    onClick={() => idx <= step && setStep(idx)}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                      active
                        ? 'border-transparent bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] text-white shadow-[0_16px_32px_rgba(91,75,255,0.30)]'
                        : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:-translate-y-0.5 hover:bg-emerald-100'
                        : 'border-slate-200/80 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {active ? (
                      <Settings className="h-4 w-4" />
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    {s.label}
                    {idx < STEPS.length - 1 && <ChevronRight className="ml-1 h-3 w-3 opacity-40" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      {/* Step content */}
      <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 pb-40 md:px-6 lg:px-8">

        {/* ── STEP 0: Basic Info ─────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <SectionCard title="Course Identity" icon={BookOpen}>
              <div className="grid gap-5">
                <VoiceInputField
                  label="Course Title"
                  required
                  value={data.title}
                  onChange={(v) => set('title', v)}
                  placeholder="e.g. Cooperative Management Fundamentals"
                  lang={globalLang}
                  helpText="Make it clear and compelling — this is the first thing learners see"
                />
                <VoiceInputField
                  label="Course Subtitle"
                  value={data.subtitle}
                  onChange={(v) => set('subtitle', v)}
                  placeholder="One-line hook that sells the course"
                  lang={globalLang}
                />
                <RichTextEditor
                  label="Full Description"
                  required
                  value={data.description}
                  onChange={(v) => set('description', v)}
                  placeholder="Describe what students will learn, what makes this course unique, and who it's for…"
                  height={300}
                  lang={globalLang}
                  showTranslate={globalLang !== 'en'}
                  translateTargetLang="en"
                />
              </div>
            </SectionCard>

            <SectionCard title="Classification" icon={Tag}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={data.category}
                        onChange={(e) => set('category', e.target.value)}
                        title="Category"
                        aria-label="Category"
                        className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="">Select category</option>
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Virtual Keyboard</p>
                      <p className="text-xs text-slate-500">Currently off</p>
                    </div>
                    <button
                      type="button"
                      title="Toggle virtual keyboard"
                      aria-label="Toggle virtual keyboard"
                      className="relative h-6 w-11 rounded-full bg-slate-200 transition-all after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Content Language
                    </label>
                    <div className="relative">
                      <select
                        value={data.language}
                        onChange={(e) => set('language', e.target.value)}
                        title="Content language"
                        aria-label="Content language"
                        className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Tags</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Type a tag and press Enter"
                        className="flex-1 rounded-xl border border-slate-200/80 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                      <button
                        onClick={addTag}
                        className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                          {t}
                          <button onClick={() => removeTag(t)} title={`Remove tag ${t}`} aria-label={`Remove tag ${t}`} className="text-indigo-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      Translation Reference (For Transliterate)
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value="https://translation.aicte-india.org/translation-independent/transliterate/"
                        readOnly
                        title="Translation reference"
                        aria-label="Translation reference"
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-600 outline-none"
                      />
                      <button
                        type="button"
                        title="Open translation reference"
                        aria-label="Open translation reference"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-all hover:bg-white hover:text-indigo-600"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Level</label>
                    <div className="relative">
                      <select
                        value={data.level}
                        onChange={(e) => set('level', e.target.value as CourseLevel)}
                        title="Level"
                        aria-label="Level"
                        className="w-full appearance-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="all">All Levels</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Promo Video URL</label>
                    <div className="relative">
                      <input
                        type="url"
                        value={data.promoVideo}
                        onChange={(e) => set('promoVideo', e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                      <Video className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Thumbnail */}
            <SectionCard title="Course Thumbnail" icon={Image}>
              <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                <div
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/90 bg-slate-50/70 p-8 text-center transition-all hover:border-indigo-300 hover:bg-indigo-50/40"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      // Compress to max 800×450 @ 0.75 quality before storing as base64
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const img = new window.Image();
                        img.onload = () => {
                          const MAX_W = 800, MAX_H = 450;
                          let { width, height } = img;
                          if (width > MAX_W) { height = Math.round(height * MAX_W / width); width = MAX_W; }
                          if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H; }
                          const canvas = document.createElement('canvas');
                          canvas.width = width; canvas.height = height;
                          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                          set('thumbnail', canvas.toDataURL('image/jpeg', 0.75));
                        };
                        img.src = reader.result as string;
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="mb-3 h-10 w-10 text-slate-300 transition-colors group-hover:text-indigo-500" />
                  <p className="font-semibold text-slate-700 transition-colors group-hover:text-indigo-700">
                    Click to upload thumbnail
                  </p>
                  <p className="mt-1 text-xs text-slate-500">PNG, JPG · 1280×720 recommended</p>
                </div>
                {data.thumbnail ? (
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <img
                      src={data.thumbnail}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => set('thumbnail', '')}
                      title="Remove thumbnail"
                      aria-label="Remove thumbnail"
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50 text-slate-400 shadow-inner">
                    <p className="text-sm font-medium">Preview will appear here</p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Or paste an image URL:
              </p>
              <input
                type="url"
                value={data.thumbnail.startsWith('data:') ? '' : data.thumbnail}
                onChange={(e) => set('thumbnail', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1 w-full rounded-xl border border-slate-200/80 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </SectionCard>
          </div>
        )}

        {/* ── STEP 1: Objectives ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <SectionCard title="What Will Students Learn?" icon={Target}>
              <p className="text-sm text-gray-500 mb-4">
                Add at least 4 clear learning outcomes. Speak directly to what students will be
                able to do after completing the course.
              </p>
              <div className="space-y-3">
                {data.objectives.map((obj, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold mt-3 flex-shrink-0">
                      {i + 1}
                    </span>
                    <VoiceInputField
                      value={obj}
                      onChange={(v) => setObjective(i, v)}
                      placeholder={`Learning outcome ${i + 1}`}
                      lang={globalLang}
                      className="flex-1"
                    />
                    {data.objectives.length > 1 && (
                      <button
                        onClick={() => removeObjective(i)}
                        title={`Remove learning outcome ${i + 1}`}
                        aria-label={`Remove learning outcome ${i + 1}`}
                        className="mt-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addObjective}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-2 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add learning outcome
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Requirements & Prerequisites" icon={ClipboardList}>
              <p className="text-sm text-gray-500 mb-4">
                List any skills, tools, or experience students need before starting.
              </p>
              <div className="space-y-3">
                {data.requirements.map((req, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <VoiceInputField
                      value={req}
                      onChange={(v) => setRequirement(i, v)}
                      placeholder={`Prerequisite ${i + 1}`}
                      lang={globalLang}
                      className="flex-1"
                    />
                    {data.requirements.length > 1 && (
                      <button
                        onClick={() => removeRequirement(i)}
                        title={`Remove prerequisite ${i + 1}`}
                        aria-label={`Remove prerequisite ${i + 1}`}
                        className="mt-3 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addRequirement}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium mt-2 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add prerequisite
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Target Audience" icon={Users}>
              <RichTextEditor
                label="Who is this course for?"
                value={data.targetAudience}
                onChange={(v) => set('targetAudience', v)}
                placeholder="Describe the ideal learner — their role, experience level, what problems this course solves for them…"
                height={200}
                lang={globalLang}
                showTranslate={globalLang !== 'en'}
                translateTargetLang="en"
              />
            </SectionCard>
          </div>
        )}

        {/* ── STEP 2: Pricing & Enrolment ──────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Pricing card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <IndianRupee className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Course Price</p>
                  <p className="text-indigo-200 text-sm">Standardised cooperative learning fee</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-4xl font-bold">₹50</p>
                  <p className="text-indigo-200 text-sm">per learner</p>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-200" />
                <p className="text-sm text-indigo-100">
                  Price is fixed at ₹50 for all cooperative LMS courses. Contact admin to change.
                </p>
              </div>
            </div>

            <SectionCard title="Enrollment Settings" icon={Users}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enrollment Type
                  </label>
                  <div className="space-y-2">
                    {[
                      { v: 'open', label: 'Open Enrollment', desc: 'Anyone can enroll immediately' },
                      { v: 'approval', label: 'Requires Approval', desc: 'Admin must approve each student' },
                      { v: 'invite', label: 'Invite Only', desc: 'Only invited students can enroll' },
                    ].map((opt) => (
                      <label
                        key={opt.v}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          data.enrollType === opt.v
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="enrollType"
                          value={opt.v}
                          checked={data.enrollType === opt.v}
                          onChange={() => set('enrollType', opt.v as EnrollType)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Opens
                    </label>
                    <input
                      type="date"
                      value={data.enrollStart}
                      onChange={(e) => set('enrollStart', e.target.value)}
                      title="Enrollment opens"
                      aria-label="Enrollment opens"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Closes
                    </label>
                    <input
                      type="date"
                      value={data.enrollEnd}
                      onChange={(e) => set('enrollEnd', e.target.value)}
                      title="Enrollment closes"
                      aria-label="Enrollment closes"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Students (leave blank for unlimited)
                    </label>
                    <input
                      type="number"
                      value={data.maxStudents}
                      onChange={(e) => set('maxStudents', e.target.value)}
                      placeholder="e.g. 200"
                      title="Max students"
                      aria-label="Max students"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Assignment" icon={Users}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {userRole === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign Trainer
                    </label>
                    {loadingTrainers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                      </div>
                    ) : (
                      <select
                        value={data.trainer}
                        onChange={(e) => set('trainer', e.target.value)}
                        title="Assign trainer"
                        aria-label="Assign trainer"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select trainer</option>
                        {trainers.map((t) => (
                          <option key={t._id} value={t._id}>{t.fullName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {userRole === 'trainer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trainer
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700">
                      You (Course Creator)
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Departments
                  </label>
                  {loadingDepts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    </div>
                  ) : departments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic py-4">No departments available</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                      {departments.map((dept) => (
                        <label key={dept._id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={data.departments?.includes(dept._id) || false}
                            onChange={(e) =>
                              set(
                                'departments',
                                e.target.checked
                                  ? [...(data.departments || []), dept._id]
                                  : (data.departments || []).filter((x) => x !== dept._id)
                              )
                            }
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm text-gray-800">{dept.name} ({dept.code})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Batches
                </label>
                {!data.departments || data.departments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4 bg-gray-50 rounded-xl px-4">
                    Please select departments first to see available batches
                  </p>
                ) : loadingBatches ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                ) : batches.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4 bg-gray-50 rounded-xl px-4">
                    No batches available for selected departments
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-3">
                    {batches.map((batch) => (
                      <label key={batch._id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.batches?.includes(batch._id) || false}
                          onChange={(e) =>
                            set(
                              'batches',
                              e.target.checked
                                ? [...(data.batches || []), batch._id]
                                : (data.batches || []).filter((x) => x !== batch._id)
                            )
                          }
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-800 font-medium">{batch.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({batch.code})</span>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {batch.department.name} · {batch.currentStudents}/{batch.maxStudents || '∞'} students
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 3: Course Content ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="relative space-y-6">
            <div className="pointer-events-none absolute -left-8 top-2 h-56 w-56 rounded-[40px] bg-indigo-200/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 top-8 h-64 w-64 rounded-[44px] bg-cyan-200/20 blur-3xl" />
            <div className="pointer-events-none absolute right-10 top-2 h-24 w-40 opacity-30 [background-image:radial-gradient(circle,rgba(99,102,241,0.35)_1px,transparent_1px)] [background-size:10px_10px]" />

            <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/70 via-transparent to-cyan-50/60 opacity-80" />
              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                    <LayoutList className="h-3.5 w-3.5" />
                    Step 4 · Content Builder
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Course Curriculum</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">
                    Build structured lessons with videos, resources, quizzes, assignments and AI-powered learning material.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      `${data.sections.length} section${data.sections.length === 1 ? '' : 's'}`,
                      `${totalLessons} lesson${totalLessons === 1 ? '' : 's'}`,
                      'AI enabled',
                      'Media supported',
                    ].map((chip) => (
                      <span key={chip} className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(91,75,255,0.28)] transition-all hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Section
                </button>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6">
              <div className="space-y-6">
                {data.sections.map((section, si) => (
                  <div
                    key={section.id}
                    className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 p-4">
                      <GripVertical className="h-5 w-5 text-slate-300" />
                      <button type="button" onClick={() => toggleSection(section.id)} title="Toggle section" aria-label="Toggle section" className="mr-1">
                        {section.isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                      </button>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">
                        Section {si + 1}
                      </span>
                      <InlineEdit
                        value={section.title}
                        onSave={(newTitle) => updateSectionTitle(section.id, newTitle)}
                        placeholder="Untitled Section"
                        fallback="Untitled Section"
                        className="flex-1"
                        inputClassName="flex-1 text-sm font-semibold text-slate-900"
                      />
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}
                      </span>
                      <button type="button" onClick={() => removeSection(section.id)} title="Remove section" aria-label="Remove section" className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {section.isOpen && (
                      <div className="space-y-4 p-4">
                        <input
                          type="text"
                          value={section.description}
                          onChange={(e) => updateSection(section.id, { description: e.target.value })}
                          placeholder="Section overview (optional)"
                          className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />

                        {section.lessons.map((lesson, li) => (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            index={li}
                            courseId={courseId}
                            sectionId={section.id}
                            globalLang={globalLang}
                            onUpdate={(patch) => updateLesson(section.id, lesson.id, patch)}
                            onUpdateTitle={(newTitle) => updateLessonTitle(section.id, lesson.id, newTitle)}
                            onRemove={() => removeLesson(section.id, lesson.id)}
                            onAutoSaveDraft={handleAutoSaveDraft}
                            onSaveLesson={handleSaveLesson}
                          />
                        ))}

                        <button
                          type="button"
                          onClick={() => addLesson(section.id)}
                          className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300/70 bg-gradient-to-r from-indigo-50/60 via-white to-cyan-50/60 px-4 py-3 text-sm font-semibold text-indigo-700 transition-all hover:border-indigo-400 hover:shadow-[0_10px_25px_rgba(99,102,241,0.18)]"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] text-white">
                            <Plus className="h-3.5 w-3.5" />
                          </span>
                          Add Lesson
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {data.sections.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
                    <LayoutList className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="font-medium text-gray-500">No sections yet</p>
                    <p className="mt-1 text-sm text-gray-400">Click "Add Section" to start building your curriculum</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Settings ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <SectionCard title="Visibility" icon={Globe}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    v: 'public',
                    label: 'Published',
                    desc: 'Visible to all enrolled students',
                    icon: Globe,
                    color: 'green',
                  },
                  {
                    v: 'private',
                    label: 'Private',
                    desc: 'Only accessible via direct link',
                    icon: Lock,
                    color: 'yellow',
                  },
                  {
                    v: 'draft',
                    label: 'Draft',
                    desc: 'Not visible to students yet',
                    icon: FileText,
                    color: 'gray',
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.v}
                      className={`flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        data.visibility === opt.v
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.v}
                        checked={data.visibility === opt.v}
                        onChange={() => set('visibility', opt.v as Visibility)}
                        className="sr-only"
                      />
                      <Icon
                        className={`w-6 h-6 mb-2 ${
                          opt.color === 'green'
                            ? 'text-green-600'
                            : opt.color === 'yellow'
                            ? 'text-yellow-600'
                            : 'text-gray-500'
                        }`}
                      />
                      <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                    </label>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Certificate & Completion" icon={Award}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Completion Certificate</p>
                      <p className="text-xs text-gray-500">Issue certificate upon course completion</p>
                    </div>
                  </div>
                  <button
                    onClick={() => set('enableCertificate', !data.enableCertificate)}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      data.enableCertificate ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        data.enableCertificate ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {data.enableCertificate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Passing Score (%) to earn certificate
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={data.certPassScore}
                        onChange={(e) => set('certPassScore', +e.target.value)}
                        title="Passing score"
                        aria-label="Passing score"
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="w-12 text-center font-bold text-indigo-600">
                        {data.certPassScore}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Discussion Forum</p>
                      <p className="text-xs text-gray-500">Allow students to ask questions and discuss</p>
                    </div>
                  </div>
                  <button
                    onClick={() => set('enableDiscussion', !data.enableDiscussion)}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      data.enableDiscussion ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        data.enableDiscussion ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course Validity (days from enrollment, leave blank = forever)
                  </label>
                  <input
                    type="number"
                    value={data.courseValidity}
                    onChange={(e) => set('courseValidity', e.target.value)}
                    placeholder="e.g. 365"
                    className="w-48 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Messaging" icon={MessageSquare}>
              <div className="space-y-5">
                <RichTextEditor
                  label="Welcome Message"
                  value={data.welcomeMessage}
                  onChange={(v) => set('welcomeMessage', v)}
                  placeholder="Message shown to students when they first enroll…"
                  height={180}
                  lang={globalLang}
                  showTranslate={globalLang !== 'en'}
                  translateTargetLang="en"
                />
                <RichTextEditor
                  label="Congratulations Message"
                  value={data.congratsMessage}
                  onChange={(v) => set('congratsMessage', v)}
                  placeholder="Message shown when students complete the course…"
                  height={180}
                  lang={globalLang}
                  showTranslate={globalLang !== 'en'}
                  translateTargetLang="en"
                />
              </div>
            </SectionCard>

            <SectionCard title="SEO Settings" icon={Globe}>
              <div className="space-y-4">
                <VoiceInputField
                  label="Meta Title"
                  value={data.metaTitle}
                  onChange={(v) => set('metaTitle', v)}
                  placeholder="SEO title (defaults to course title)"
                  lang={globalLang}
                />
                <VoiceInputField
                  label="Meta Description"
                  value={data.metaDescription}
                  onChange={(v) => set('metaDescription', v)}
                  placeholder="Brief description for search engines (150-160 characters)"
                  multiline
                  rows={3}
                  lang={globalLang}
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── STEP 5: Review & Publish ──────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            {initialAdminReview?.message && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600" />
                  <div>
                    <h3 className="font-bold text-orange-950">Admin feedback</h3>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-orange-800">{initialAdminReview.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h3 className="font-bold text-gray-900 text-lg mb-1">Almost there!</h3>
              <p className="text-gray-600 text-sm">
                Review your course details before sending it to admin. Students will see it only after admin approval.
              </p>
            </div>

            {/* Course card preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden max-w-sm">
              <div className="aspect-video bg-gradient-to-br from-indigo-400 to-purple-600 relative overflow-hidden">
                {data.thumbnail ? (
                  <img src={data.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-white/50" />
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {CATEGORIES.find((c) => c.value === data.category)?.label || 'Uncategorized'}
                </span>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-gray-900">{data.title || 'Untitled Course'}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{data.subtitle}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-indigo-600">₹50</span>
                  <span className="text-xs text-gray-400">{totalLessons} lessons</span>
                </div>
              </div>
            </div>

            {/* Summary table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-900">Course Summary</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Title', value: data.title || '—' },
                  { label: 'Category', value: CATEGORIES.find((c) => c.value === data.category)?.label || '—' },
                  { label: 'Level', value: data.level },
                  { label: 'Language', value: SUPPORTED_LANGUAGES.find((l) => l.code === data.language)?.label || '—' },
                  { label: 'Price', value: '₹50 (fixed)' },
                  { label: 'Enrollment', value: data.enrollType },
                  { label: 'Departments', value: data.departments?.length ? `${data.departments.length} selected` : 'None assigned' },
                  { label: 'Batches', value: data.batches?.length ? `${data.batches.length} selected` : 'None assigned' },
                  { 
                    label: 'Trainer', 
                    value: typeof data.trainer === 'string' 
                      ? data.trainer 
                      : (data.trainer as any)?.fullName || (data.trainer as any)?.name || (userRole === 'trainer' ? 'You' : '—')
                  },
                  { label: 'Sections', value: `${data.sections.length} sections · ${totalLessons} lessons` },
                  { label: 'Certificate', value: data.enableCertificate ? `Yes (pass ${data.certPassScore}%)` : 'No' },
                  { label: 'Discussion', value: data.enableDiscussion ? 'Enabled' : 'Disabled' },
                  { label: 'Visibility', value: data.visibility },
                ].map((row) => (
                  <div key={row.label} className="flex px-6 py-3">
                    <span className="w-36 text-sm text-gray-500">{row.label}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completeness checks */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-900 mb-4">Completeness Check</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Course title', ok: !!data.title },
                  { label: 'Description', ok: !!data.description },
                  { label: 'Category selected', ok: !!data.category },
                  { label: 'At least 1 learning objective', ok: data.objectives.some((o) => !!o) },
                  { label: 'Trainer assigned', ok: !!data.trainer || userRole === 'trainer' },
                  { label: 'At least 1 lesson', ok: totalLessons > 0 },
                  { label: 'Thumbnail uploaded', ok: !!data.thumbnail },
                  { label: 'Departments assigned', ok: (data.departments?.length || 0) > 0 },
                  { label: 'Batches assigned', ok: (data.batches?.length || 0) > 0 },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${c.ok ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Draft / review actions */}
            <div className="flex gap-4 pt-2">
              {(!initialCourseId || ['draft', 'changes_requested', 'rejected'].includes(initialReviewStatus || 'draft')) && (
                <button
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-indigo-300 text-indigo-700 rounded-2xl font-semibold hover:bg-indigo-50 transition-all"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Save as Draft
                </button>
              )}
              <button
                onClick={handlePublish}
                disabled={isSaving || !data.title || !data.category}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {initialReviewStatus === 'changes_requested' || initialReviewStatus === 'rejected'
                  ? 'Resubmit for Review'
                  : 'Submit for Admin Review'}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="sticky bottom-4 z-30 mx-auto mt-2 flex max-w-6xl items-center justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl md:px-6 lg:px-8">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#5B4BFF] to-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(91,75,255,0.30)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(91,75,255,0.34)]"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      </div>
      <div className="fixed bottom-6 right-6 z-40">
        <button className="group flex items-center gap-3 rounded-full border border-slate-800/10 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 px-4 py-3 text-white shadow-[0_20px_45px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(15,23,42,0.34)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-white shadow-[0_12px_24px_rgba(16,185,129,0.25)]">
            <Bot className="h-5 w-5" />
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-semibold">AI Assistant</span>
            <span className="block text-xs text-slate-300">Open chatbot</span>
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-slate-200/70 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EEF4FF] to-[#F5F3FF] text-indigo-600 shadow-[0_10px_20px_rgba(91,75,255,0.10)]">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-slate-900 md:text-[0.95rem]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function AIProgressLoader({
  status,
  progress,
  message,
  error,
}: {
  status: string;
  progress: number;
  message: string;
  error?: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const isFailed = status === 'failed' || status === 'transcript_failed';
  const isCompleted = status === 'completed';

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
            isFailed ? 'bg-rose-100 text-rose-700' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {isFailed ? <AlertCircle className="h-3.5 w-3.5" /> : isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {isFailed ? 'AI generation failed' : isCompleted ? 'AI generation completed' : 'Generating AI content'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{message || 'Please wait while AI processes your video.'}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-slate-900">{safeProgress}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFailed ? 'bg-rose-500' : isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  placeholder = '',
  className = '',
  textClassName = '',
  inputClassName = '',
  fallback = '',
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  fallback?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setTempValue(value);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, value]);

  const handleSave = () => {
    const trimmed = tempValue.trim();
    onSave(trimmed || fallback);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`rounded-lg border border-indigo-400 bg-white px-2 py-0.5 text-sm font-semibold text-slate-900 outline-none ring-4 ring-indigo-50 transition-all ${inputClassName}`}
      />
    );
  }

  const displayText = value.trim() || fallback || placeholder;

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-0.5 border border-dashed border-transparent hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200 ${className}`}
    >
      <span className={`text-sm font-semibold select-none truncate ${value.trim() ? 'text-slate-900 group-hover:text-indigo-900' : 'text-slate-400 italic'} ${textClassName}`}>
        {displayText}
      </span>
      <span className="text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-indigo-600 transition-all duration-200 flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </span>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  courseId,
  sectionId,
  globalLang,
  onUpdate,
  onUpdateTitle,
  onRemove,
  onAutoSaveDraft,
  onSaveLesson,
}: {
  lesson: CourseLesson;
  index: number;
  courseId: string | null;
  sectionId: string;
  globalLang: string;
  onUpdate: (patch: Partial<CourseLesson>) => void;
  onUpdateTitle: (newTitle: string) => void;
  onRemove: () => void;
  onAutoSaveDraft: (localSectionId: string, localLessonId: string) => Promise<{ courseId: string; sectionId: string; lessonId: string }>;
  onSaveLesson: (localSectionId: string, localLessonId: string) => Promise<{ courseId: string; sectionId: string; lessonId: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [recordingType, setRecordingType] = useState<'audio' | 'video' | null>(null);
  const [uploading, setUploading] = useState<'image' | 'audio' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [languageHint, setLanguageHint] = useState<string>('auto');
  const [asrMode, setAsrMode] = useState<string>('Balanced');
  const [aiJobProgress, setAiJobProgress] = useState<{
    target: 'transcript' | 'summary' | null;
    status: string;
    progress: number;
    message: string;
    error: string;
  }>({ target: null, status: 'not_started', progress: 0, message: '', error: '' });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const LIcon = LESSON_ICONS[lesson.type];

  useEffect(() => {
    if (import.meta.env.DEV) console.log('[LESSON CARD MOUNT]', { lessonId: lesson.id, sectionId });
    return () => {
      if (import.meta.env.DEV) console.log('[LESSON CARD UNMOUNT]', { lessonId: lesson.id, sectionId });
    };
  }, [lesson.id, sectionId]);

  const parseDurationToSeconds = (duration = ''): number => {
    const clean = String(duration || '').trim();
    if (!clean) return 0;
    const parts = clean.split(':').map((p) => Number(p));
    if (parts.some((n) => Number.isNaN(n))) return 0;
    if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
    if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    return 0;
  };

  const formatSecondsToDuration = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const getVideoDurationFromSource = async (source: Blob | File): Promise<number> => {
    const objectUrl = URL.createObjectURL(source);
    try {
      const duration = await new Promise<number>((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve(Number(video.duration) || 0);
        video.onerror = () => resolve(0);
        video.src = objectUrl;
      });
      return Math.max(0, Math.floor(duration));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadMedia = async (kind: 'image' | 'audio' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Upload to backend FIRST (don't set local preview)
      setUploading(kind);
      setUploadProgress(0);
      
      try {
        const res = await uploadFile(file, {
          title: lesson.title || file.name,
          category: 'educational',
          usageType: 'lesson_asset',
          source: 'lesson',
          module: 'lesson_content',
          accessLevel: 'enrolled',
          onProgress: (pct) => setUploadProgress(pct),
        });

        if (res.success && res.data?.fileUrl) {
          const permanentUrl = res.data.fileUrl;
          console.log(`✅ ${kind} uploaded successfully:`, permanentUrl);
          
          try {
            // Set the permanent URL from backend
            if (kind === 'image') onUpdate(buildLessonAssetPatch(res.data, 'image'));
            if (kind === 'audio') onUpdate(buildLessonAssetPatch(res.data, 'audio'));
            if (kind === 'video') {
              const detectedSeconds = await getVideoDurationFromSource(file);
              onUpdate({ 
                ...buildLessonAssetPatch(res.data, 'video'),
                videoDuration: detectedSeconds > 0 ? formatSecondsToDuration(detectedSeconds) : (lesson.videoDuration || ''),
                ...(res.data.transcript ? { transcript: res.data.transcript } : {}),
                videoSummary: {
                  ...(lesson.videoSummary || {}),
                  status: res.data.transcript ? 'transcript_completed' : 'uploaded',
                  generated: {
                    ...(lesson.videoSummary?.generated || {}),
                    ...(res.data.transcript ? { transcript: res.data.transcript, rawTranscript: res.data.transcript } : {}),
                  },
                },
              });
              if (res.data.transcriptStatus === 'pending' || res.data.transcriptStatus === 'processing') {
                toast.info('Transcript auto-generation started for this video.');
              }
            }
            toast.success(`${kind.charAt(0).toUpperCase() + kind.slice(1)} uploaded successfully`);
          } catch (patchErr) {
            console.error('[UPLOAD UI] Failed to apply upload asset patch:', patchErr);
            toast.error('File uploaded, but failed to link it to the lesson.');
          }
        } else {
          toast.error(res.message || 'Upload failed');
        }
      } catch (err: any) {
        console.error(`❌ ${kind} upload failed:`, err);
        toast.error(err.response?.data?.message || 'Upload failed');
      } finally {
        setUploading(null);
        setUploadProgress(0);
      }
    };
    input.click();
  };

  const startRecording = async (kind: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'audio' ? { audio: true } : { audio: true, video: true }
      );
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: kind === 'audio' ? 'audio/webm' : 'video/webm',
        });
        
        stream.getTracks().forEach((track) => track.stop());
        setRecordingType(null);

        // Upload to backend FIRST (no local preview)
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: kind === 'audio' ? 'audio/webm' : 'video/webm',
        });
        setUploading(kind);
        
        try {
          const res = await uploadFile(file, {
            title: lesson.title || `Recorded ${kind}`,
            category: 'educational',
            usageType: 'lesson_asset',
            source: 'lesson',
            module: 'lesson_content',
            accessLevel: 'enrolled',
            onProgress: (pct) => setUploadProgress(pct),
          });
          
          if (res.success && res.data?.fileUrl) {
            console.log(`✅ Recorded ${kind} uploaded:`, res.data.fileUrl);
            
            try {
              if (kind === 'audio') onUpdate(buildLessonAssetPatch(res.data, 'audio'));
              if (kind === 'video') {
                const detectedSeconds = await getVideoDurationFromSource(blob);
                onUpdate({ 
                  ...buildLessonAssetPatch(res.data, 'video'),
                  videoDuration: detectedSeconds > 0 ? formatSecondsToDuration(detectedSeconds) : (lesson.videoDuration || ''),
                  ...(res.data.transcript ? { transcript: res.data.transcript } : {}),
                  videoSummary: {
                    ...(lesson.videoSummary || {}),
                    status: res.data.transcript ? 'transcript_completed' : 'uploaded',
                    generated: {
                      ...(lesson.videoSummary?.generated || {}),
                      ...(res.data.transcript ? { transcript: res.data.transcript, rawTranscript: res.data.transcript } : {}),
                    },
                  },
                });
                if (res.data.transcriptStatus === 'pending' || res.data.transcriptStatus === 'processing') {
                  toast.info('Transcript auto-generation started for this video.');
                }
              }
              toast.success(`Recorded ${kind} uploaded successfully`);
            } catch (patchErr) {
              console.error('[UPLOAD UI] Failed to apply recording asset patch:', patchErr);
              toast.error('File uploaded, but failed to link it to the lesson.');
            }
          } else {
            toast.error('Upload failed');
          }
        } catch (err) {
          console.error(`❌ Recording upload failed:`, err);
          toast.error('Upload failed');
        } finally {
          setUploading(null);
          setUploadProgress(0);
        }
      };
      recorder.start();
      setRecordingType(kind);
    } catch {
      alert('Could not access microphone/camera. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const getLessonVideoSource = () => (
    lesson.videoUrl
    || lesson.lessonVideo
    || lesson.videoAsset?.fileAssetId
    || lesson.videoAsset?.streamUrl
    || lesson.videoAsset?.viewUrl
    || ''
  );

  const textToEditorHtml = (text = '') => {
    const escaped = String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const blocks = escaped
      .split(/\n{2,}/)
      .map((block) => block.trim().replace(/\n/g, '<br />'))
      .filter(Boolean);

    return blocks.length ? blocks.map((block) => `<p>${block}</p>`).join('') : '';
  };

  const pollVideoAiJob = async (
    target: 'transcript' | 'summary',
    activeCourseId: string,
    activeSectionId: string,
    activeLessonId: string
  ) => {
    let latest: any = null;
    for (let attempt = 0; attempt < 150; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await getVideoSummary(activeCourseId, activeSectionId, activeLessonId, 'short');
      latest = status.data || null;
      const progress = Math.max(0, Math.min(100, Number(latest?.progress ?? latest?.aiProcessingProgress ?? 0)));
      const nextStatus = latest?.status || 'processing';

      setAiJobProgress({
        target,
        status: nextStatus,
        progress,
        message: latest?.message || latest?.stage || 'Generating AI content...',
        error: latest?.warning || latest?.error || latest?.aiProcessingError || '',
      });

      if (nextStatus === 'failed' || nextStatus === 'transcript_failed') {
        if (latest?.transcript || latest?.rawTranscript) return latest;
        throw new Error(latest?.warning || latest?.error || latest?.aiProcessingError || 'AI generation failed');
      }
      if (nextStatus === 'completed' || nextStatus === 'transcript_completed' || nextStatus === 'summary_completed') return latest;
    }
    return latest;
  };

  const getTranscriptButtonLabel = () => {
    if (isGeneratingTranscript) {
      if (aiJobProgress.target === 'transcript') {
        if (aiJobProgress.status === 'saving_draft') return 'Saving draft...';
        if (aiJobProgress.status === 'queued') return 'Starting transcript...';
      }
      return 'Generating transcript...';
    }
    
    // Check if not saved
    const isUnsaved = !courseId || !sectionId || !lesson.id || sectionId.startsWith('sec-') || lesson.id.startsWith('les-') || !isNaN(Number(sectionId)) || !isNaN(Number(lesson.id));
    if (isUnsaved) {
      return 'Save & Generate Transcript';
    }
    
    return 'Generate AI Transcript';
  };

  const isTranscriptButtonDisabled = () => {
    if (isGeneratingTranscript) return true;
    if (uploading === 'video') return true;
    if (!getLessonVideoSource()) return true;
    return false;
  };

  const startVideoAiJob = async (target: 'transcript' | 'summary') => {
    const videoSource = getLessonVideoSource();
    if (!videoSource) {
      toast.error(target === 'transcript' ? 'Please upload a lesson video before generating transcript.' : 'Please upload or add a video before generating summary.');
      return;
    }

    if (uploading === 'video') {
      toast.info('Please wait, video is still uploading.');
      return;
    }

    if (target === 'transcript') setIsGeneratingTranscript(true);
    if (target === 'summary') setIsGeneratingSummary(true);
    setAiJobProgress({
      target,
      status: 'queued',
      progress: 0,
      message: target === 'transcript' ? 'Starting AI transcript...' : 'Starting AI summary...',
      error: '',
    });

    try {
      let activeCourseId = courseId;
      let activeSectionId = sectionId;
      let activeLessonId = lesson.id;

      const isUnsaved = !activeCourseId || !activeSectionId || !activeLessonId || activeSectionId.startsWith('sec-') || activeLessonId.startsWith('les-') || !isNaN(Number(activeSectionId)) || !isNaN(Number(activeLessonId));
      if (isUnsaved) {
        if (target === 'transcript') {
          setAiJobProgress((prev) => ({ ...prev, status: 'saving_draft', message: 'Saving course draft before transcript generation...' }));
          toast.info('Saving course draft before transcript generation...');
        }
        
        try {
          const ids = await onSaveLesson(sectionId, lesson.id);
          activeCourseId = ids.courseId;
          activeSectionId = ids.sectionId;
          activeLessonId = ids.lessonId;
          toast.success('Course draft saved. Starting transcript generation...');
        } catch (saveErr: any) {
          console.error('[AI TRANSCRIPT] Auto-save failed:', saveErr);
          throw new Error('COURSE_SAVE_FAILED');
        }
      }

      setAiJobProgress({
        target,
        status: 'queued',
        progress: 0,
        message: 'Starting AI job...',
        error: '',
      });

      const queued = await regenerateVideoSummary({
        courseId: activeCourseId!,
        sectionId: activeSectionId,
        lessonId: activeLessonId,
        summaryType: 'short',
        forceRegenerate: true,
        languageHint,
        asrMode,
        onlyTranscript: target === 'transcript',
        persist: true,
        previewOnly: false,
      });

      if (queued.success && (queued.status === 'pending' || queued.status === 'queued' || queued.status === 'processing' || queued.message?.includes('already running'))) {
        toast.info('Transcript generation is already running for this lesson.');
      } else if (!queued.success) {
        if (queued.code === 'LESSON_NOT_SAVED') {
          throw new Error('LESSON_ID_NOT_FOUND_AFTER_SAVE');
        }
        toast.error(queued.message || 'AI generation failed');
        return;
      }

      toast.info(target === 'transcript' ? 'Generating transcript...' : 'Generating summary...');
      const completed = queued.data?.status === 'completed' ? queued.data : await pollVideoAiJob(target, activeCourseId!, activeSectionId, activeLessonId);
      const latestTranscript = completed?.transcript || completed?.rawTranscript || '';
      const generatedSummary = completed?.summary || completed?.generated?.summary || completed?.generated?.detailedSummary || '';

      if (target === 'transcript' && latestTranscript) {
        onUpdate({
          transcript: latestTranscript,
          generatedTranscript: latestTranscript,
          videoSummary: {
            ...(lesson.videoSummary || {}),
            status: 'transcript_completed',
            generated: {
              ...(lesson.videoSummary?.generated || {}),
              transcript: latestTranscript,
              rawTranscript: latestTranscript,
            },
            updatedAt: new Date().toISOString(),
          },
        });
        if (completed?.status === 'failed' || completed?.status === 'transcript_failed') {
          toast.warning(completed?.warning || completed?.error || 'Transcript generated, but summary could not be created from it.');
        } else {
          toast.success('Transcript generated');
        }
      } else if (target === 'summary' && generatedSummary) {
        onUpdate({ summary: textToEditorHtml(generatedSummary) });
        toast.success('Summary generated');
      } else {
        const message = completed?.warning || completed?.error || 'AI generation is still running. Check again after a moment.';
        if (completed?.status === 'failed' || completed?.status === 'transcript_failed') toast.error(message);
        else toast.info(message);
      }
    } catch (err: any) {
      console.error('[AI JOB ERROR]', err);
      let message = err?.response?.data?.message || err?.message || 'AI generation failed';
      if (err.message === 'COURSE_SAVE_FAILED') {
        message = 'Could not save the course draft. Please fix required fields and try again.';
      } else if (err.message === 'LESSON_ID_NOT_FOUND_AFTER_SAVE') {
        message = 'Course saved, but lesson ID was not found. Please refresh and try again.';
      }
      setAiJobProgress((prev) => ({ ...prev, status: 'failed', error: message, message }));
      toast.error(message);
    } finally {
      if (target === 'transcript') setIsGeneratingTranscript(false);
      if (target === 'summary') setIsGeneratingSummary(false);
    }
  };

  const handleGenerateTranscript = async () => {
    await startVideoAiJob('transcript');
  };

  const handleGenerateSummary = async () => {
    await startVideoAiJob('summary');
  };

  const handleSaveLesson = async () => {
    setIsSavingLesson(true);
    try {
      await onSaveLesson(sectionId, lesson.id);
      toast.success('Lesson saved successfully');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Lesson save failed';
      toast.error(message);
    } finally {
      setIsSavingLesson(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      {/* Lesson header row */}
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white via-slate-50 to-indigo-50/30 p-3 transition-colors">
        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
        <button type="button" onClick={() => setExpanded((e) => !e)} title={expanded ? 'Collapse lesson' : 'Expand lesson'} aria-label={expanded ? 'Collapse lesson' : 'Expand lesson'} className="text-gray-400">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <LIcon className="w-4 h-4" />
        </div>
        <InlineEdit
          value={lesson.title}
          onSave={onUpdateTitle}
          placeholder={`Lesson ${index + 1} title`}
          fallback="Untitled Lesson"
          className="flex-1"
          inputClassName="flex-1 text-sm font-semibold text-slate-900"
        />
        <select
          value={lesson.type}
          onChange={(e) => onUpdate({ type: e.target.value as LessonType })}
          title="Lesson type"
          aria-label="Lesson type"
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="video">Video</option>
          <option value="article">Article</option>
          <option value="quiz">Quiz</option>
          <option value="assignment">Assignment</option>
          <option value="live">Live Session</option>
        </select>
        <label className="flex cursor-pointer select-none items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <input
            type="checkbox"
            checked={lesson.isPreview}
            onChange={(e) => onUpdate({ isPreview: e.target.checked })}
            className="w-3 h-3"
          />
          Preview
        </label>
        <button
          type="button"
          onClick={handleSaveLesson}
          disabled={isSavingLesson}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-60"
        >
          {isSavingLesson ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Save Lesson
        </button>
        {lesson.type === 'video' && getLessonVideoSource() && (
          <button
            type="button"
            onClick={handleGenerateTranscript}
            disabled={isTranscriptButtonDisabled()}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-60"
          >
            {isGeneratingTranscript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Transcript
          </button>
        )}
        <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 sm:inline-flex">
          {(lesson.videoSummary?.status || 'idle').replace(/_/g, ' ')}
        </span>
        <button
          type="button"
          onClick={onRemove}
          title="Remove lesson"
          aria-label="Remove lesson"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-gradient-to-b from-slate-50/40 to-white px-4 pb-4 pt-3">
          {lesson.type === 'video' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-700">
                    Video URL
                  </label>
                  <input
                    type="text"
                    value={lesson.videoUrl || ''}
                    readOnly
                    aria-readonly="true"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Duration (mm:ss)
                  </label>
                  <input
                    type="text"
                    value={lesson.videoDuration}
                    readOnly
                    aria-readonly="true"
                    placeholder="e.g. 12:30"
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-2 text-sm text-slate-600 outline-none"
                  />
                  <Clock className="pointer-events-none absolute right-3 top-[35px] h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          )}


          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700"><UploadCloud className="h-4 w-4 text-indigo-600" />Lesson Media Assets</p>

            {/* Upload progress bar */}
                {uploading && (
                  <div className="mb-3 rounded-lg bg-indigo-50 p-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-indigo-700">
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading {uploading}... {uploadProgress}%
                      </span>
                    </div>
                    <progress
                      value={uploadProgress}
                      max={100}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-200 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-indigo-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-600"
                    />
                  </div>
                )}

            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <button
                type="button"
                onClick={() => uploadMedia('image')}
                disabled={!!uploading}
                className="rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading === 'image' ? <span className="flex items-center gap-1 justify-center"><Loader2 className="w-3 h-3 animate-spin" />Uploading...</span> : 'Upload Image'}
              </button>
              <button
                type="button"
                onClick={() => uploadMedia('audio')}
                disabled={!!uploading}
                className="rounded-xl border border-cyan-200/70 bg-gradient-to-r from-cyan-50 to-sky-50 px-3 py-2 text-xs font-semibold text-cyan-700 transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading === 'audio' ? <span className="flex items-center gap-1 justify-center"><Loader2 className="w-3 h-3 animate-spin" />Uploading...</span> : 'Upload Audio'}
              </button>
              <button
                type="button"
                onClick={() => uploadMedia('video')}
                disabled={!!uploading}
                className="rounded-xl border border-blue-200/70 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading === 'video' ? <span className="flex items-center gap-1 justify-center"><Loader2 className="w-3 h-3 animate-spin" />Uploading...</span> : 'Upload Video'}
              </button>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {recordingType === 'audio' ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Stop Audio Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRecording('audio')}
                  className="rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-cyan-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <span className="inline-flex items-center gap-1"><Mic className="h-3.5 w-3.5" />Record Audio</span>
                </button>
              )}
              {recordingType === 'video' ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Stop Video Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startRecording('video')}
                  className="rounded-xl border border-violet-200/70 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5" />Record Video</span>
                </button>
              )}
            </div>
            <div className="space-y-3 mt-2">
              {lesson.lessonImage && (
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                  <button
                    type="button"
                    onClick={() => onUpdate({ lessonImage: '', imageAsset: undefined })}
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                      <img src={lesson.lessonImage} alt="Lesson media" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md border bg-purple-50 border-purple-100 text-purple-600 font-bold uppercase tracking-wider">
                          IMAGE
                        </span>
                        {lesson.imageAsset?.fileSize && (
                          <span className="text-[10px] text-slate-400 font-medium ml-2">
                            {formatBytes(lesson.imageAsset.fileSize)}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Resource Title</label>
                        <input
                          type="text"
                          placeholder="Enter image title"
                          value={lesson.imageAsset?.title ?? lesson.imageAsset?.originalName ?? ''}
                          onChange={(e) => {
                            const updated = { ...lesson.imageAsset, title: e.target.value };
                            onUpdate({ imageAsset: updated });
                          }}
                          className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">This name will be shown to students in Lesson Resources.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lesson.lessonAudio && (
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                  <button
                    type="button"
                    onClick={() => onUpdate({ lessonAudio: '', audioAsset: undefined })}
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove audio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4 items-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-100 text-emerald-600 font-bold uppercase tracking-wider">
                        AUDIO
                      </span>
                      {lesson.audioAsset?.fileSize && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatBytes(lesson.audioAsset.fileSize)}
                        </span>
                      )}
                    </div>
                    <audio controls src={lesson.lessonAudio} className="w-full h-8" />
                    <div className="mt-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Resource Title</label>
                      <input
                        type="text"
                        placeholder="Enter audio title"
                        value={lesson.audioAsset?.title ?? lesson.audioAsset?.originalName ?? ''}
                        onChange={(e) => {
                          const updated = { ...lesson.audioAsset, title: e.target.value };
                          onUpdate({ audioAsset: updated });
                        }}
                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">This name will be shown to students in Lesson Resources.</p>
                    </div>
                  </div>
                </div>
              )}

              {lesson.lessonVideo && (
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                  <button
                    type="button"
                    onClick={() => onUpdate({ lessonVideo: '', videoAsset: undefined })}
                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4 items-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-md border bg-indigo-50 border-indigo-100 text-indigo-600 font-bold uppercase tracking-wider">
                        VIDEO
                      </span>
                      {lesson.videoAsset?.fileSize && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatBytes(lesson.videoAsset.fileSize)}
                        </span>
                      )}
                    </div>
                    <video controls src={toAbsoluteAssetUrl(lesson.lessonVideo || '')} className="w-full max-h-40 rounded-xl border border-slate-200" />
                    <div className="mt-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Resource Title</label>
                      <input
                        type="text"
                        placeholder="Enter video title"
                        value={lesson.videoAsset?.title ?? lesson.videoAsset?.originalName ?? ''}
                        onChange={(e) => {
                          const updated = { ...lesson.videoAsset, title: e.target.value };
                          onUpdate({ videoAsset: updated });
                        }}
                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">This name will be shown to students in Lesson Resources.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {lesson.type === 'video' && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
                <div className="flex flex-1 min-w-[120px] flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Language Model Hint</label>
                  <select
                    value={languageHint}
                    onChange={(e) => setLanguageHint(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="auto">Auto Detect Language</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="en">English (English)</option>
                    <option value="hinglish">Hinglish (Hindi+English)</option>
                    <option value="bn">Bengali (বাংলা)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="mr">Marathi (मराठी)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="gu">Gujarati (ગુજરાતી)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                    <option value="or">Odia (ଓଡ଼ିଆ)</option>
                    <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                    <option value="ur">Urdu (اردو)</option>
                    <option value="as">Assamese (অসমীয়া)</option>
                  </select>
                </div>
                <div className="flex flex-1 min-w-[120px] flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transcription Mode</label>
                  <select
                    value={asrMode}
                    onChange={(e) => setAsrMode(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Balanced">Balanced (Conformer Primary, Whisper Fallback)</option>
                    <option value="Accuracy">Accuracy (Whisper Large V3 - Multilingual)</option>
                    <option value="Speed">Speed (Whisper Turbo - Faster)</option>
                  </select>
                </div>
              </div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Transcript
                </label>
                <button
                  type="button"
                  onClick={handleGenerateTranscript}
                  disabled={isTranscriptButtonDisabled()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/70 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingTranscript ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {getTranscriptButtonLabel()}
                </button>
              </div>
              <textarea
                value={lesson.transcript || ''}
                onChange={(e) => onUpdate({ transcript: e.target.value, manualTranscript: e.target.value })}
                placeholder="Paste, edit, or generate the transcript for this lesson."
                rows={5}
                className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm leading-6 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
              {aiJobProgress.target === 'transcript' && (
                <div className="mt-3">
                  <AIProgressLoader
                    status={aiJobProgress.status}
                    progress={aiJobProgress.progress}
                    message={aiJobProgress.message}
                    error={aiJobProgress.error}
                  />
                </div>
              )}
            </div>
          )}

          <RichTextEditor
            label={lesson.type === 'article' ? 'Article Content' : 'Video Description'}
            value={lesson.type === 'article' ? lesson.content : (lesson.videoDescription || lesson.description || lesson.content || '')}
            onChange={(v) => lesson.type === 'article'
              ? onUpdate({ content: v })
              : onUpdate({ videoDescription: v, description: v })}
            placeholder={
              lesson.type === 'article'
                ? 'Write your article content here...'
                : 'What will students learn in this video?'
            }
            height={lesson.type === 'article' ? 320 : 180}
            lang={globalLang}
            showTranslate={globalLang !== 'en'}
            translateTargetLang="en"
          />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">Summary</label>
            </div>
            <RichTextEditor
              value={lesson.summary || ''}
              onChange={(v) => onUpdate({ summary: v })}
              placeholder="Add or generate a concise summary for this lesson."
              height={180}
              lang={globalLang}
              showTranslate={globalLang !== 'en'}
              translateTargetLang="en"
            />
            {aiJobProgress.target === 'summary' && (
              <AIProgressLoader
                status={aiJobProgress.status}
                progress={aiJobProgress.progress}
                message={aiJobProgress.message}
                error={aiJobProgress.error}
              />
            )}
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><Paperclip className="h-3.5 w-3.5 text-indigo-600" />Attachments / Resources</label>
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    resources: [
                      ...lesson.resources,
                      { id: mkId(), title: '', url: '', type: 'link' },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/70 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100"
              >
                <Plus className="w-3 h-3" />
                Add resource
              </button>
            </div>
            {lesson.resources.map((res, ri) => (
              <div key={res.id} className="flex gap-2 items-center mb-2">
                <select
                  value={res.type}
                  onChange={(e) => {
                    const updated = lesson.resources.map((r, i) =>
                      i === ri ? { ...r, type: e.target.value as LessonResource['type'] } : r
                    );
                    onUpdate({ resources: updated });
                  }}
                  title="Resource type"
                  aria-label="Resource type"
                  className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none"
                >
                  <option value="link">Link</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">Doc</option>
                  <option value="zip">Zip</option>
                </select>
                <input
                  type="text"
                  value={res.title}
                  onChange={(e) => {
                    const updated = lesson.resources.map((r, i) =>
                      i === ri ? { ...r, title: e.target.value } : r
                    );
                    onUpdate({ resources: updated });
                  }}
                  placeholder="Title"
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                />
                <input
                  type="url"
                  value={res.url}
                  onChange={(e) => {
                    const updated = lesson.resources.map((r, i) =>
                      i === ri ? { ...r, url: e.target.value } : r
                    );
                    onUpdate({ resources: updated });
                  }}
                  placeholder="URL"
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      resources: lesson.resources.filter((_, i) => i !== ri),
                    })
                  }
                  title="Remove resource"
                  aria-label="Remove resource"
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Questions Section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <label className="text-xs font-semibold text-slate-700">Knowledge Check Questions</label>
                <span className="text-xs text-slate-400">({(lesson.questions && lesson.questions.length) || 0})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdate({
                    questions: [
                      ...(lesson.questions || []),
                      {
                        id: mkId(),
                        question: '',
                        questionType: 'multiple-choice',
                        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
                        correctAnswer: '',
                        explanation: '',
                        position: 'end',
                        timestamp: 30,
                      },
                    ],
                  });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200/70 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100"
              >
                <Plus className="w-3 h-3" />
                Add Question
              </button>
            </div>

            {(lesson.questions || []).map((q, qi) => (
              <div key={q.id} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-500">Q{qi + 1}</span>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => {
                      const updated = lesson.questions!.map((ques, i) =>
                        i === qi ? { ...ques, question: e.target.value } : ques
                      );
                      onUpdate({ questions: updated });
                    }}
                    placeholder="Enter your question..."
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({
                        questions: lesson.questions!.filter((_, i) => i !== qi),
                      });
                    }}
                    title="Remove question"
                    aria-label="Remove question"
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Question Type & Position */}
                <div className="flex gap-2 mb-2">
                  <select
                    value={q.questionType}
                    onChange={(e) => {
                      const updated = lesson.questions!.map((ques, i) =>
                        i === qi ? { ...ques, questionType: e.target.value as any } : ques
                      );
                      onUpdate({ questions: updated });
                    }}
                    title="Question type"
                    aria-label="Question type"
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True/False</option>
                    <option value="short-answer">Short Answer</option>
                  </select>

                  <select
                    value={q.position}
                    onChange={(e) => {
                      const nextPosition = e.target.value as 'start' | 'middle' | 'end';
                      const durationSeconds = parseDurationToSeconds(lesson.videoDuration || '');
                      const updated = lesson.questions!.map((ques, i) =>
                        i === qi
                          ? {
                              ...ques,
                              position: nextPosition,
                              timestamp:
                                nextPosition === 'start'
                                  ? 0
                                  : nextPosition === 'end'
                                    ? Math.max(0, durationSeconds > 0 ? durationSeconds - 30 : 0)
                                    : (typeof ques.timestamp === 'number' ? ques.timestamp : 30),
                            }
                          : ques
                      );
                      onUpdate({ questions: updated });
                    }}
                    title="Question position"
                    aria-label="Question position"
                    className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
                  >
                    <option value="start">At Start</option>
                    <option value="middle">In Between</option>
                    <option value="end">At End</option>
                  </select>

                  {lesson.type === 'video' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={q.position === 'middle' ? (q.timestamp !== undefined ? formatSecondsToDuration(q.timestamp) : '') : 'Auto'}
                        disabled={q.position !== 'middle'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const secs = parseDurationToSeconds(val);
                          const updated = lesson.questions!.map((ques, i) =>
                            i === qi ? { ...ques, timestamp: secs } : ques
                          );
                          onUpdate({ questions: updated });
                        }}
                        placeholder={q.position === 'middle' ? 'MM:SS' : 'Auto'}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg w-20 disabled:bg-gray-100 disabled:text-gray-500 font-mono text-center"
                        title={q.position === 'middle' ? "Format: MM:SS or seconds" : "Auto-timed"}
                      />
                      {q.position === 'middle' && typeof q.timestamp === 'number' && q.timestamp > 0 && (
                        <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                          ({q.timestamp}s)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {lesson.type === 'video' && (q.position === 'start' || q.position === 'end') && (
                  <p className="text-[11px] text-gray-500 mb-2">
                    {q.position === 'start'
                      ? 'At Start is auto-timed to the beginning of the video (0s).'
                      : 'At End is auto-timed using video length (30s before end).'}
                  </p>
                )}

                {/* Options for Multiple Choice */}
                {q.questionType === 'multiple-choice' && (
                  <div className="ml-4 space-y-1">
                    <div className="text-xs text-gray-500 mb-1">Mark the correct answer:</div>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = lesson.questions!.map((ques, i) =>
                              i === qi
                                ? {
                                    ...ques,
                                    options: ques.options.map((o, oo) => ({
                                      ...o,
                                      isCorrect: oo === oi,
                                    })),
                                  }
                                : ques
                            );
                            onUpdate({ questions: updated });
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            opt.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {opt.isCorrect && <div className="w-2 h-2 bg-white rounded-full" />}
                        </button>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const updated = lesson.questions!.map((ques, i) =>
                              i === qi
                                ? {
                                    ...ques,
                                    options: ques.options.map((o, oo) =>
                                      oo === oi ? { ...o, text: e.target.value } : o
                                    ),
                                  }
                                : ques
                            );
                            onUpdate({ questions: updated });
                          }}
                          placeholder={`Option ${oi + 1}${opt.isCorrect ? ' (Correct)' : ''}`}
                          className={`flex-1 px-2 py-1 border rounded text-xs ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        />
                        {q.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = lesson.questions!.map((ques, i) =>
                                i === qi
                                  ? { ...ques, options: ques.options.filter((_, oo) => oo !== oi) }
                                  : ques
                              );
                              onUpdate({ questions: updated });
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = lesson.questions!.map((ques, i) =>
                          i === qi
                            ? { ...ques, options: [...ques.options, { text: '', isCorrect: false }] }
                            : ques
                        );
                        onUpdate({ questions: updated });
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {/* True/False */}
                {q.questionType === 'true-false' && (
                  <div className="ml-4">
                    <div className="text-xs text-gray-500 mb-1">Select correct answer:</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = lesson.questions!.map((ques, i) =>
                            i === qi ? { ...ques, correctAnswer: 'True' } : ques
                          );
                          onUpdate({ questions: updated });
                        }}
                        className={`px-4 py-2 rounded text-xs font-medium border ${
                          q.correctAnswer === 'True' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        ✓ True
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = lesson.questions!.map((ques, i) =>
                            i === qi ? { ...ques, correctAnswer: 'False' } : ques
                          );
                          onUpdate({ questions: updated });
                        }}
                        className={`px-4 py-2 rounded text-xs font-medium border ${
                          q.correctAnswer === 'False' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        ✓ False
                      </button>
                    </div>
                  </div>
                )}

                {/* Short Answer */}
                {q.questionType === 'short-answer' && (
                  <div className="ml-4">
                    <div className="text-xs text-gray-500 mb-1">Enter correct answer:</div>
                    <input
                      type="text"
                      value={q.correctAnswer || ''}
                      onChange={(e) => {
                        const updated = lesson.questions!.map((ques, i) =>
                          i === qi ? { ...ques, correctAnswer: e.target.value } : ques
                        );
                        onUpdate({ questions: updated });
                      }}
                      placeholder="Type the correct answer"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    />
                  </div>
                )}

                {/* Explanation */}
                <div className="mt-2">
                  <label className="text-xs text-gray-500">Explanation (shown to students):</label>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => {
                      const updated = lesson.questions!.map((ques, i) =>
                        i === qi ? { ...ques, explanation: e.target.value } : ques
                      );
                      onUpdate({ questions: updated });
                    }}
                    placeholder="Explain why this is the correct answer..."
                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs mt-1"
                  />
                </div>
              </div>
            ))}

            {(lesson.questions || []).length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200/80 bg-slate-50/70 p-3 text-center text-xs text-slate-500">
                No questions yet. Add questions to test student understanding during this lesson.
              </div>
            )}
          </div>

          {/* Assignment Section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <label className="text-xs font-semibold text-slate-700">Assignment (Optional)</label>
              </div>
             <button
                type="button"
                onClick={() => {
                  onUpdate({
                    assignment: lesson.assignment || {
                      title: '',
                      description: '',
                      dueDate: '',
                      attachmentUrl: '',
                      maxScore: 100
                    }
                  });
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${lesson.assignment ? 'border border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-700' : 'border border-indigo-200/70 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
              >
                {lesson.assignment ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Assignment Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    Add Assignment
                  </>
                )}
              </button>
            </div>

            {lesson.assignment && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={lesson.assignment.title}
                    onChange={(e) => {
                      onUpdate({
                        assignment: { ...lesson.assignment, title: e.target.value }
                      });
                    }}
                    placeholder="Assignment title..."
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {lesson.assignment.title && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdate({ assignment: undefined });
                      }}
                      title="Remove assignment"
                      aria-label="Remove assignment"
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <textarea
                  value={lesson.assignment.description}
                  onChange={(e) => {
                    onUpdate({
                      assignment: { ...lesson.assignment, description: e.target.value }
                    });
                  }}
                  placeholder="Assignment instructions / questions for students..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Due Date (Optional)</label>
                    <input
                      type="datetime-local"
                      value={lesson.assignment.dueDate}
                      onChange={(e) => {
                        onUpdate({
                          assignment: { ...lesson.assignment, dueDate: e.target.value }
                        });
                      }}
                      title="Assignment due date"
                      aria-label="Assignment due date"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Max Score</label>
                    <input
                      type="number"
                      value={lesson.assignment.maxScore}
                      onChange={(e) => {
                        onUpdate({
                          assignment: { ...lesson.assignment, maxScore: parseInt(e.target.value) || 100 }
                        });
                      }}
                      title="Assignment max score"
                      aria-label="Assignment max score"
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Attachment (Optional)</label>
                  {lesson.assignment.attachmentUrl ? (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <a
                        href={lesson.assignment.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline truncate"
                      >
                        {lesson.assignment.attachmentUrl.split('/').pop() || 'View Attachment'}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdate({
                            assignment: { ...lesson.assignment, attachmentUrl: '' }
                          });
                        }}
                        title="Remove attachment"
                        aria-label="Remove attachment"
                        className="text-gray-400 hover:text-red-500 ml-auto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          setUploading('image');
                          try {
                            const res = await uploadFile(file, {
                              title: file.name,
                              category: 'assignment',
                              usageType: 'lesson_asset',
                              source: 'lesson',
                              module: 'lesson_content',
                              accessLevel: 'enrolled',
                            });

                            if (res.success && res.data?.fileUrl) {
                              const attachmentAsset = buildLessonAssetPatch(res.data, 'image').imageAsset;
                              onUpdate({
                                assignment: {
                                  ...lesson.assignment,
                                  attachmentUrl: res.data.downloadUrl || res.data.viewUrl || res.data.fileUrl,
                                  attachmentAsset,
                                }
                              });
                              toast.success('Assignment file uploaded');
                            } else {
                              toast.error('Upload failed');
                            }
                          } catch (err) {
                            toast.error('Upload failed');
                          } finally {
                            setUploading(null);
                          }
                        };
                        input.click();
                      }}
                      disabled={!!uploading}
                      className="w-full px-3 py-2 border border-dashed border-amber-300 rounded-lg text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : '+ Upload assignment file (PDF, DOC, ZIP, etc.)'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
