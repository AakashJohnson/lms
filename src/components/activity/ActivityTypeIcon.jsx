import {
  Award,
  Bot,
  BookOpen,
  ClipboardCheck,
  Download,
  FileQuestion,
  Layers,
  LogIn,
  PlayCircle,
  Radio,
  Sparkles,
} from 'lucide-react';

export const ACTIVITY_TYPES = [
  { value: 'all', label: 'All activity' },
  { value: 'login', label: 'Login' },
  { value: 'course_viewed', label: 'Course viewed' },
  { value: 'lesson_opened', label: 'Lesson opened' },
  { value: 'video_progress', label: 'Video progress' },
  { value: 'video_completed', label: 'Lesson completed' },
  { value: 'assessment_completed', label: 'Assessment completed' },
  { value: 'assignment_submitted', label: 'Assignment submitted' },
  { value: 'resource_downloaded', label: 'Resource downloaded' },
  { value: 'live_class_joined', label: 'Live class' },
  { value: 'ai_tutor_used', label: 'AI tutor' },
  { value: 'flashcard_reviewed', label: 'Flashcards' },
  { value: 'certificate_downloaded', label: 'Certificate' },
];

const iconMap = {
  login: LogIn,
  course_viewed: BookOpen,
  lesson_opened: Layers,
  video_progress: PlayCircle,
  video_completed: ClipboardCheck,
  assessment_started: FileQuestion,
  assessment_completed: ClipboardCheck,
  assignment_submitted: ClipboardCheck,
  resource_downloaded: Download,
  live_class_joined: Radio,
  live_class_left: Radio,
  ai_tutor_used: Bot,
  flashcard_reviewed: Sparkles,
  certificate_downloaded: Award,
};

const toneMap = {
  login: 'bg-slate-100 text-slate-700',
  course_viewed: 'bg-emerald-100 text-emerald-700',
  lesson_opened: 'bg-blue-100 text-blue-700',
  video_progress: 'bg-indigo-100 text-indigo-700',
  video_completed: 'bg-teal-100 text-teal-700',
  assessment_completed: 'bg-amber-100 text-amber-700',
  assignment_submitted: 'bg-rose-100 text-rose-700',
  resource_downloaded: 'bg-cyan-100 text-cyan-700',
  live_class_joined: 'bg-violet-100 text-violet-700',
  live_class_left: 'bg-violet-100 text-violet-700',
  ai_tutor_used: 'bg-fuchsia-100 text-fuchsia-700',
  flashcard_reviewed: 'bg-orange-100 text-orange-700',
  certificate_downloaded: 'bg-lime-100 text-lime-700',
};

export function getActivityLabel(type) {
  return ACTIVITY_TYPES.find((item) => item.value === type)?.label || String(type || 'Activity').replace(/_/g, ' ');
}

export function ActivityTypeIcon({ type, className = '' }) {
  const Icon = iconMap[type] || BookOpen;
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${toneMap[type] || 'bg-slate-100 text-slate-700'} ${className}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}
