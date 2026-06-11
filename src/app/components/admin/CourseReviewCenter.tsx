import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Image,
  Link,
  Loader2,
  MessageSquareWarning,
  MoreVertical,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  ShieldX,
  UserRound,
  Video,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCourseReviewDetail,
  getCourseReviewList,
  publishCourse,
  rejectCourse,
  requestCourseChanges,
  unpublishCourse,
} from '../../services/adminCourseReviewService';
import { getAssetUrl, toAbsoluteAssetUrl } from '../../utils/fileUrl';

const statuses = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'draft', label: 'Draft' },
];

const statColorMap: Record<string, any> = {
  amber: {
    card: 'from-amber-50/80 to-white',
    icon: 'bg-amber-500 text-white shadow-amber-200',
    glow: 'bg-amber-300',
    stroke: '#f59e0b',
  },
  orange: {
    card: 'from-orange-50/80 to-white',
    icon: 'bg-orange-500 text-white shadow-orange-200',
    glow: 'bg-orange-300',
    stroke: '#f97316',
  },
  emerald: {
    card: 'from-emerald-50/80 to-white',
    icon: 'bg-emerald-500 text-white shadow-emerald-200',
    glow: 'bg-emerald-300',
    stroke: '#10b981',
  },
  rose: {
    card: 'from-rose-50/80 to-white',
    icon: 'bg-rose-500 text-white shadow-rose-200',
    glow: 'bg-rose-300',
    stroke: '#f43f5e',
  },
  blue: {
    card: 'from-blue-50/80 to-white',
    icon: 'bg-blue-600 text-white shadow-blue-200',
    glow: 'bg-blue-300',
    stroke: '#2563eb',
  },
};

const getReviewStatusBadge = (status = '') => {
  switch (status) {
    case 'pending_review':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'changes_requested':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'unpublished':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

const getReviewStatusLabel = (status = '') => {
  switch (status) {
    case 'pending_review':
      return 'Pending Review';
    case 'changes_requested':
      return 'Changes Requested';
    case 'published':
      return 'Published';
    case 'rejected':
      return 'Rejected';
    case 'unpublished':
      return 'Unpublished';
    default:
      return 'Draft';
  }
};

const formatDate = (value: any) => {
  if (!value) return 'Not submitted';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const teacherName = (course: any) => {
  const teacher = course?.trainer || course?.createdBy || {};
  return teacher.fullName || teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email || 'Teacher';
};

const teacherEmail = (course: any) => (course?.trainer || course?.createdBy)?.email || 'No email';
const teacherId = (course: any) => String((course?.trainer || course?.createdBy)?._id || '');

const initials = (value = '') => value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'T';

const lessonCount = (course: any) => (course?.sections || []).reduce((sum: number, section: any) => sum + (section.lessons?.length || 0), 0);

const decodeStoredHtml = (html = '') => {
  const value = String(html || '');
  if (!value || !/&(?:lt|gt|amp|quot|#39);/i.test(value) || typeof document === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const sanitizeHtml = (html = '') => {
  if (!html) return '';
  return DOMPurify.sanitize(decodeStoredHtml(html), {
    ADD_ATTR: ['style', 'class', 'target', 'rel'],
    ADD_TAGS: ['iframe'],
  });
};

const getCourseDescriptionHtml = (course: any) =>
  course?.description || course?.fullDescription || course?.courseDescription || course?.content || course?.subtitle || '';

function RichDescriptionPreview({ html, emptyText = 'No course description provided.' }: { html?: string; emptyText?: string }) {
  const safeHtml = sanitizeHtml(html || '');
  if (!safeHtml.trim()) {
    return <p className="text-sm font-semibold text-slate-500">{emptyText}</p>;
  }
  return (
    <div
      className="prose prose-sm max-w-none course-description-preview"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

const quizCount = (course: any) => (course?.sections || []).reduce((sum: number, section: any) => {
  return sum + (section.lessons || []).filter((lesson: any) => lesson.quiz || lesson.questions?.length || lesson.type === 'quiz').length;
}, 0);

const resourceCount = (course: any) => (course?.sections || []).reduce((sum: number, section: any) => {
  return sum + (section.lessons || []).reduce((inner: number, lesson: any) => inner + collectLessonMedia(lesson).length, 0);
}, 0);

const totalDuration = (course: any) => {
  const minutes = (course?.sections || []).reduce((sum: number, section: any) => {
    return sum + (section.lessons || []).reduce((inner: number, lesson: any) => inner + Number(lesson.duration || lesson.estimatedDuration || 0), 0);
  }, 0);
  if (!minutes) return 'N/A';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const courseCoverUrl = (course: any) => toAbsoluteAssetUrl(
  course?.thumbnail || course?.coverImage || course?.image || course?.thumbnailUrl || course?.media?.thumbnail || ''
);

const formatBytes = (bytes?: number) => {
  const value = Number(bytes || 0);
  if (!value) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const assetFileUrl = (asset: any, mode: 'view' | 'stream' | 'download' = 'view') => {
  if (!asset) return '';
  const direct = mode === 'download' ? asset.downloadUrl : mode === 'stream' ? asset.streamUrl || asset.viewUrl : asset.viewUrl || asset.streamUrl;
  if (direct) return toAbsoluteAssetUrl(direct);
  const fileId = asset.fileAssetId || asset._id;
  if (!fileId) return '';
  const action = mode === 'download' ? 'download' : mode === 'stream' ? 'stream' : 'view';
  return toAbsoluteAssetUrl(`/api/v1/files/${fileId}/${action}`);
};

const inferResourceType = (item: any) => {
  const url = String(item?.url || item?.downloadUrl || item?.viewUrl || item?.fileUrl || '').toLowerCase();
  const mime = String(item?.mimeType || '').toLowerCase();
  const type = String(item?.type || item?.resourceType || item?.assetType || item?.kind || '').toLowerCase();
  if (type && type !== 'resource') return type;
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(url)) return 'image';
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv|ogg)(\?|$)/.test(url)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|aac|m4a|ogg)(\?|$)/.test(url)) return 'audio';
  if (/\.pdf(\?|$)/.test(url)) return 'pdf';
  return 'link';
};

const collectLessonMedia = (lesson: any) => {
  const items: any[] = [];
  const push = (item: any) => {
    if (item?.url || item?.downloadUrl) items.push(item);
  };

  push({
    id: 'lesson-video',
    label: 'Lesson Video',
    type: 'video',
    title: lesson.videoAsset?.title || lesson.videoAsset?.originalName || 'Lesson video',
    url: assetFileUrl(lesson.videoAsset, 'stream') || toAbsoluteAssetUrl(lesson.lessonVideo || lesson.videoUrl || ''),
    downloadUrl: assetFileUrl(lesson.videoAsset, 'download'),
    meta: [lesson.videoAsset?.mimeType, formatBytes(lesson.videoAsset?.fileSize)].filter(Boolean).join(' - '),
  });
  push({
    id: 'lesson-image',
    label: 'Lesson Image',
    type: 'image',
    title: lesson.imageAsset?.title || lesson.imageAsset?.originalName || 'Lesson image',
    url: assetFileUrl(lesson.imageAsset, 'view') || toAbsoluteAssetUrl(lesson.lessonImage || ''),
    downloadUrl: assetFileUrl(lesson.imageAsset, 'download'),
    meta: [lesson.imageAsset?.mimeType, formatBytes(lesson.imageAsset?.fileSize)].filter(Boolean).join(' - '),
  });
  push({
    id: 'lesson-audio',
    label: 'Lesson Audio',
    type: 'audio',
    title: lesson.audioAsset?.title || lesson.audioAsset?.originalName || 'Lesson audio',
    url: assetFileUrl(lesson.audioAsset, 'stream') || toAbsoluteAssetUrl(lesson.lessonAudio || ''),
    downloadUrl: assetFileUrl(lesson.audioAsset, 'download'),
    meta: [lesson.audioAsset?.mimeType, formatBytes(lesson.audioAsset?.fileSize)].filter(Boolean).join(' - '),
  });

  (lesson.resources || []).forEach((resource: any, index: number) => {
    const url = getAssetUrl(resource, 'view') || toAbsoluteAssetUrl(resource.url || resource.link || resource.href || resource.value || '');
    push({
      id: resource._id || resource.id || `resource-${index}`,
      label: 'Resource',
      type: inferResourceType(resource),
      title: resource.title || resource.originalName || `Resource ${index + 1}`,
      url,
      downloadUrl: getAssetUrl(resource, 'download') || toAbsoluteAssetUrl(resource.downloadUrl || resource.url || ''),
      meta: [resource.mimeType, formatBytes(resource.fileSize)].filter(Boolean).join(' - '),
    });
  });

  const assignment = lesson.assignment || {};
  const assignmentAsset = assignment.attachmentAsset || assignment.attachment || {};
  push({
    id: 'assignment-attachment',
    label: 'Assignment Attachment',
    type: inferResourceType(assignmentAsset),
    title: assignmentAsset.title || assignmentAsset.originalName || assignment.attachmentUrl?.split('/').pop() || 'Assignment attachment',
    url: assetFileUrl(assignmentAsset, 'view') || toAbsoluteAssetUrl(assignment.attachmentUrl || ''),
    downloadUrl: assetFileUrl(assignmentAsset, 'download') || toAbsoluteAssetUrl(assignment.attachmentUrl || ''),
    meta: [assignmentAsset.mimeType, formatBytes(assignmentAsset.fileSize)].filter(Boolean).join(' - '),
  });

  return items;
};

function ReviewStatCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const colors = statColorMap[stat.color];

  return (
    <div className={`group relative min-h-[178px] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${colors.card}`}>
      <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-3xl ${colors.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ${colors.icon}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-700">{stat.label}</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-black leading-none text-slate-950">{stat.value || 0}</span>
              <span className="pb-0.5 text-xs font-bold text-slate-500">{stat.sublabel}</span>
            </div>
          </div>
        </div>
        <button className="rounded-xl p-1.5 text-slate-400 hover:bg-white/70 hover:text-slate-700" aria-label={`${stat.label} options`}>
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="relative mt-5">
        <div className={`inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold shadow-sm ${stat.trendType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {stat.trendType === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {stat.trend}
        </div>
      </div>
      <svg className="relative mt-4 h-8 w-full" viewBox="0 0 160 32" fill="none" aria-hidden="true">
        <path d={stat.sparkline} stroke={colors.stroke} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />
      </svg>
    </div>
  );
}

function MediaPreview({ item }: { item: any }) {
  const type = inferResourceType(item);
  const Icon = type === 'video' ? Video : type === 'audio' ? Volume2 : type === 'image' ? Image : type === 'link' ? Link : Paperclip;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">{item.title}</p>
            <p className="text-xs font-semibold text-slate-500">{item.label}{item.meta ? ` - ${item.meta}` : ''}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          )}
          {item.downloadUrl && (
            <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      </div>
      {type === 'video' && item.url && <video controls src={item.url} className="mt-3 max-h-64 w-full rounded-xl border border-slate-200 bg-slate-950" />}
      {type === 'audio' && item.url && <audio controls src={item.url} className="mt-3 w-full" />}
      {type === 'image' && item.url && <img src={item.url} alt={item.title} className="mt-3 max-h-72 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />}
      {type === 'link' && item.url && <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{item.url}</p>}
    </div>
  );
}

export function CourseReviewCenter() {
  const [courses, setCourses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [previewCourse, setPreviewCourse] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('pending_review');
  const [category, setCategory] = useState('all');
  const [teacher, setTeacher] = useState('all');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | 'publish' | 'changes' | 'reject' | 'unpublish'>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getCourseReviewList({
        status,
        search,
        category,
        teacherId: teacher,
        limit: '100',
      });
      const list = res.data || [];
      setCourses(list);
      setSummary(res.summary || {});
      if (!list.length) {
        setSelectedCourse(null);
      } else if (!selectedCourse || !list.some((course) => course._id === selectedCourse._id)) {
        selectCourse(list[0]);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load course reviews');
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course: any) => {
    setSelectedCourse(course);
    setFeedback('');
    try {
      setDetailLoading(true);
      const res = await getCourseReviewDetail(course._id);
      setSelectedCourse(res.data || course);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load course detail');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, category, teacher]);

  const categories = useMemo(() => Array.from(new Set(courses.map((course) => course.category).filter(Boolean))), [courses]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((course) => {
      const id = teacherId(course);
      if (id) map.set(id, teacherName(course));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [courses]);

  const stats = useMemo(() => [
    {
      key: 'pending',
      label: 'Pending Review',
      value: summary.pending_review,
      sublabel: 'Courses',
      trend: '+3 from last week',
      trendType: 'up',
      icon: BookOpen,
      color: 'amber',
      sparkline: 'M0,18 C20,4 35,30 55,15 C75,0 90,28 110,16 C130,5 145,24 160,12',
    },
    {
      key: 'changes',
      label: 'Changes Requested',
      value: summary.changes_requested,
      sublabel: 'Courses',
      trend: '-1 from last week',
      trendType: 'down',
      icon: MessageSquareWarning,
      color: 'orange',
      sparkline: 'M0,14 C18,22 34,7 52,17 C70,27 88,8 106,18 C125,29 142,9 160,16',
    },
    {
      key: 'published',
      label: 'Published',
      value: summary.published,
      sublabel: 'Courses',
      trend: '+6 from last week',
      trendType: 'up',
      icon: BadgeCheck,
      color: 'emerald',
      sparkline: 'M0,22 C20,17 34,20 52,12 C72,4 88,24 108,14 C128,4 142,22 160,8',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: summary.rejected,
      sublabel: 'Courses',
      trend: '-2 from last week',
      trendType: 'down',
      icon: ShieldX,
      color: 'rose',
      sparkline: 'M0,10 C20,22 35,6 55,18 C74,29 90,9 110,19 C130,28 145,7 160,16',
    },
    {
      key: 'total',
      label: 'Total Courses',
      value: summary.total,
      sublabel: 'All time',
      trend: '+11 from last week',
      trendType: 'up',
      icon: GraduationCap,
      color: 'blue',
      sparkline: 'M0,20 C20,8 36,18 54,10 C75,0 88,21 108,13 C130,4 145,24 160,9',
    },
  ], [summary]);

  const checklist = useMemo(() => {
    const lessons = lessonCount(selectedCourse);
    const resources = resourceCount(selectedCourse);
    const quizzes = quizCount(selectedCourse);
    return [
      { label: 'Course structure is complete', status: selectedCourse?.title && selectedCourse?.description && lessons > 0 ? 'done' : 'warning' },
      { label: 'Lessons have content', status: lessons > 0 ? 'done' : 'warning' },
      { label: 'Assessment added', status: quizzes > 0 ? 'done' : 'warning' },
      { label: 'Preview video available', status: resources > 0 ? 'done' : 'pending' },
      { label: 'Copyright compliance verified', status: 'pending' },
    ];
  }, [selectedCourse]);

  const executeAction = async () => {
    if (!selectedCourse || !confirmAction) return;
    if ((confirmAction === 'changes' || confirmAction === 'reject') && !feedback.trim()) {
      toast.error('Feedback is required for this action');
      return;
    }

    try {
      setActionLoading(confirmAction);
      const api =
        confirmAction === 'publish' ? publishCourse :
        confirmAction === 'changes' ? requestCourseChanges :
        confirmAction === 'reject' ? rejectCourse :
        unpublishCourse;
      const res = await api(selectedCourse._id, feedback);
      toast.success(res.message || 'Review decision saved');
      setSelectedCourse(res.data);
      setFeedback('');
      setConfirmAction(null);
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save decision');
    } finally {
      setActionLoading('');
    }
  };

  const openPreview = async (course: any) => {
    setPreviewCourse(course);
    try {
      const res = await getCourseReviewDetail(course._id);
      setPreviewCourse(res.data || course);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to open course preview');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Workspace
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Course Review Center</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Review teacher-submitted courses before publishing them to students</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm hover:bg-indigo-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <ReviewStatCard key={stat.key} stat={stat} />)}
      </div>

      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') load(); }}
                placeholder="Search by course title or teacher..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white lg:col-span-2">
            {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white lg:col-span-2">
            <option value="all">All Categories</option>
            {categories.map((item: any) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={teacher} onChange={(event) => setTeacher(event.target.value)} className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white lg:col-span-2">
            <option value="all">All Teachers</option>
            {teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button onClick={load} className="h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700 lg:col-span-1">
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-slate-500">Showing {courses.length ? `1-${courses.length}` : '0'} of {courses.length} courses</p>
              <button className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                Sort by: Latest Submitted
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl bg-slate-100" />)}
              </div>
            ) : courses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-12 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-lg font-black text-slate-900">No courses found</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Change filters or wait for teachers to submit courses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => {
                  const selected = selectedCourse?._id === course._id;
                  const cover = courseCoverUrl(course);
                  return (
                    <div
                      key={course._id}
                      onClick={() => selectCourse(course)}
                      className={`group relative cursor-pointer rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${selected ? 'border-indigo-400 bg-indigo-50/30 ring-4 ring-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <button className={`hidden h-5 w-5 shrink-0 rounded-full border-2 md:mt-14 md:block ${selected ? 'border-indigo-600 bg-indigo-600 ring-4 ring-indigo-100' : 'border-slate-300 bg-white'}`} aria-label="Select course">
                          {selected && <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-white" />}
                        </button>
                        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-100 md:h-32 md:w-44">
                          {cover ? <img src={cover} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-400"><BookOpen className="h-10 w-10" /></div>}
                          <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-bold text-white">{lessonCount(course)} Lessons</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">{course.category || 'Uncategorized'}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{course.level || 'Level N/A'}</span>
                          </div>
                          <h2 className="mt-3 line-clamp-2 text-lg font-black text-slate-950">{course.title}</h2>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{initials(teacherName(course))}</div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">{teacherName(course)}</p>
                              <p className="truncate text-xs font-semibold text-slate-500">{teacherEmail(course)}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-500">Submitted {formatDate(course.submittedForReviewAt)}</p>
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button onClick={(event) => { event.stopPropagation(); selectCourse(course); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white hover:bg-indigo-700">
                              <Eye className="h-4 w-4" />
                              Review Course
                            </button>
                            <button onClick={(event) => { event.stopPropagation(); openPreview(course); }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
                              <ExternalLink className="h-4 w-4" />
                              Quick Preview
                            </button>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-3 md:flex-col md:items-end">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getReviewStatusBadge(course.reviewStatus)}`}>{getReviewStatusLabel(course.reviewStatus)}</span>
                          <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Course actions">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit xl:sticky xl:top-24 xl:col-span-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedCourse ? (
              <>
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-indigo-600">Selected Course</p>
                    <h2 className="mt-1 line-clamp-2 text-xl font-black text-slate-950">{selectedCourse.title}</h2>
                  </div>
                  <button onClick={() => setSelectedCourse(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Clear selected course"><X className="h-4 w-4" /></button>
                </div>
                {detailLoading && <div className="mb-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading full details</div>}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">{initials(teacherName(selectedCourse))}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{teacherName(selectedCourse)}</p>
                    <p className="truncate text-xs font-semibold text-slate-500">{teacherEmail(selectedCourse)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${getReviewStatusBadge(selectedCourse.reviewStatus)}`}>{getReviewStatusLabel(selectedCourse.reviewStatus)}</span>
                  <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
                    <RichDescriptionPreview html={getCourseDescriptionHtml(selectedCourse)} />
                  </div>
                </div>
                <div className="mt-5">
                  <h3 className="text-sm font-black text-slate-950">Review Checklist</h3>
                  <div className="mt-3 space-y-2">
                    {checklist.map((item) => (
                      <div key={item.label} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        {item.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : item.status === 'warning' ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <span className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    ['Lessons', lessonCount(selectedCourse)],
                    ['Duration', totalDuration(selectedCourse)],
                    ['Quizzes', quizCount(selectedCourse)],
                    ['Resources', resourceCount(selectedCourse)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                      <p className="text-lg font-black text-indigo-700">{value}</p>
                      <p className="text-[11px] font-bold text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <label className="text-sm font-black text-slate-950">Admin Feedback</label>
                  <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={5} placeholder="Write feedback for publish, request changes, or rejection..." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50" />
                </div>
                <div className="mt-4">
                  <button onClick={() => setConfirmAction('publish')} disabled={!!actionLoading} className="h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-60">Publish Course</button>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button onClick={() => setConfirmAction('changes')} disabled={!!actionLoading} className="h-11 rounded-2xl border border-amber-300 bg-amber-50 text-sm font-black text-amber-700 hover:bg-amber-100 disabled:opacity-60">Request Changes</button>
                    <button onClick={() => setConfirmAction('reject')} disabled={!!actionLoading} className="h-11 rounded-2xl border border-rose-300 bg-rose-50 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60">Reject Course</button>
                  </div>
                  {selectedCourse.reviewStatus === 'published' && (
                    <button onClick={() => setConfirmAction('unpublish')} disabled={!!actionLoading} className="mt-3 h-11 w-full rounded-2xl border border-slate-300 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">Unpublish Course</button>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                <UserRound className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-black text-slate-900">No course selected</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Select a course from the list to review details and take action.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black text-slate-950">Confirm review decision</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">This will update the course review status and notify the teacher through the saved feedback history.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="h-11 flex-1 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={executeAction} disabled={!!actionLoading} className="h-11 flex-1 rounded-2xl bg-indigo-600 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
                {actionLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Course Quick Preview</h2>
                <p className="text-sm font-semibold text-slate-500">{previewCourse.title}</p>
              </div>
              <button onClick={() => setPreviewCourse(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close preview"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              {courseCoverUrl(previewCourse) && <img src={courseCoverUrl(previewCourse)} alt={`${previewCourse.title} thumbnail`} className="max-h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 object-contain" />}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">{previewCourse.category || 'Uncategorized'}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{teacherName(previewCourse)}</span>
                  {(previewCourse.tags || []).slice(0, 4).map((tag: string) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{tag}</span>
                  ))}
                </div>
                <RichDescriptionPreview html={getCourseDescriptionHtml(previewCourse)} />
              </div>
              {(previewCourse.sections || []).map((section: any, sIndex: number) => (
                <section key={section._id || sIndex} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-black text-slate-950">{section.title}</h3>
                  <div className="mt-3 space-y-3">
                    {(section.lessons || []).map((lesson: any, lIndex: number) => (
                      <div key={lesson._id || lIndex} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-black text-slate-900">{lesson.title}</h4>
                          <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">{lesson.type}</span>
                        </div>
                        {lesson.description && (
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <RichDescriptionPreview html={lesson.fullDescription || lesson.description} emptyText="No lesson description provided." />
                          </div>
                        )}
                        {(lesson.content || lesson.summary || lesson.transcript) && (
                          <div className="mt-3 grid gap-2">
                            {lesson.content && <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-xs font-black uppercase text-slate-600">Lesson content</summary><div className="mt-2"><RichDescriptionPreview html={lesson.content} emptyText="No lesson content provided." /></div></details>}
                            {lesson.summary && <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-xs font-black uppercase text-slate-600">Summary</summary><div className="mt-2"><RichDescriptionPreview html={lesson.summary} emptyText="No summary provided." /></div></details>}
                            {lesson.transcript && <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-xs font-black uppercase text-slate-600">Transcript</summary><p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-6 text-slate-700">{lesson.transcript}</p></details>}
                          </div>
                        )}
                        <div className="mt-4 space-y-2">
                          {collectLessonMedia(lesson).length ? collectLessonMedia(lesson).map((item) => <MediaPreview key={item.id} item={item} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">No media or links added.</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
