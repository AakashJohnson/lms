import {
  BookOpen, Clock, Trophy, Play, Plus, RefreshCw, LayoutGrid, List, AlertCircle,
  Radio, Star, Users, Edit2, Eye, CheckCircle2
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { CoursePlayer } from './course/CoursePlayer';
import { FilterBar } from './FilterBar';
import { CreateCourse } from './course/CreateCourse';
import { CourseBuilderErrorBoundary } from './course/CourseBuilderErrorBoundary';
import { RatingModal } from './course/RatingModal';
import {
  getCourses as fetchCoursesAPI,
  getCourse as fetchCourseAPI,
  updateCourseStatus,
  submitCourseForReview,
  deleteCourse as deleteCourseAPI,
  getMyCourses,
  enrollInCourse,
  getStudentDashboard,
  type DBCourse,
} from '../services/courseService';
import { toast } from 'sonner';
import {
  INITIAL_COURSES,
  mapDBCourse,
  isCourseActive,
  countCourseStatus,
  getLoggedTrainerName,
} from './myCourses/utils';
import { StatCard } from './myCourses/StatCard';
import { CourseTableRow } from './myCourses/CourseTableRow';
import { CourseCard } from './myCourses/CourseCard';
import { StatusBadge } from './myCourses/StatusBadge';
import { BatchCreateModal } from './myCourses/BatchCreateModal';
import { CourseInfoButton } from './myCourses/CourseInfoButton';
import { CourseInfoModal } from './myCourses/CourseInfoModal';
import { stripHtml } from './myCourses/courseInfoHelpers';
import type { Course, CourseStatus } from './myCourses/types';

interface MyCoursesProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function MyCourses({ userRole }: MyCoursesProps) {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | string | null>(null);
  const [playingCourse, setPlayingCourse] = useState<string | null>(null);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editInitialData, setEditInitialData] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [statusUpdating, setStatusUpdating] = useState<number | string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [infoCourse, setInfoCourse] = useState<Course | null>(null);
  const [infoCourseData, setInfoCourseData] = useState<Record<string, any> | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [courseInfoCache, setCourseInfoCache] = useState<Record<string, any>>({});

  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedCourseForRating, setSelectedCourseForRating] = useState<Course | null>(null);

  // Batch Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedCourseForBatch, setSelectedCourseForBatch] = useState<Course | null>(null);

  const loggedTrainerName = getLoggedTrainerName();
  const { published: publishedCount, archived: archivedCount, draft: draftCount } = countCourseStatus(courses);

  // ── Fetch DB courses on mount ──────────────────────────────────────────────
  const loadDBCourses = useCallback(async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      if (userRole === 'participant') {
        const [enrollRes, dashRes] = await Promise.all([
          getMyCourses(),
          getStudentDashboard().catch(() => ({ success: false, data: null })),

        ]);

        if (dashRes.success && dashRes.data) setDashboardStats(dashRes.data.stats);

        // Mapping enrolled courses
        if (false) {
          enrollRes.data.forEach((e: any) => {
            const courseId = typeof e.course === 'string' ? e.course : e.course?._id;
            if (courseId) enrolledMap.set(courseId, e);
          });
        }

        if (enrollRes.success && Array.isArray(enrollRes.data)) {
          const mapped = enrollRes.data.map((item: any) => {
            const enrollment = item;
            const base = mapDBCourse(item);
            if (true) {
              return {
                ...base,
                progress: enrollment.progress ?? 0,
                status: base.status === 'archived' ? 'archived' as CourseStatus : (enrollment.enrollmentStatus === 'completed' ? 'completed' as CourseStatus : 'active'),
                enrolledAt: enrollment.enrolledAt,
                isEnrolled: true,
              };
            }
            return { ...base, isEnrolled: false };
          });
          setCourses(mapped);
        }
      } else {
        const params: Record<string, string> = { limit: '100' };
        if (userRole === 'trainer') {
          params.createdBy = 'me';
        }

        const res = await fetchCoursesAPI(params);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setCourses(res.data.map(mapDBCourse));
        } else {
          setCourses([]);
        }
      }
    } catch {
      setDbError('Could not load courses from server. Showing local data.');
    } finally {
      setDbLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    loadDBCourses();
  }, [loadDBCourses]);

  useEffect(() => {
    const handleUrlCheck = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const playId = urlParams.get('playCourseId');
      if (playId) {
        setPlayingCourse(playId);
        // Clean URL query param without page reload
        const cleanSearch = window.location.search.replace(/([?&])playCourseId=[^&]+(&?)/, (_, p1, p2) => {
          return p1 === '?' && p2 ? '?' : '';
        });
        window.history.replaceState({}, '', window.location.pathname + cleanSearch);
      }
    };
    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  useEffect(() => {
    const checkEditId = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('editCourseId');
      if (editId && courses.length > 0) {
        const found = courses.find(c => String(c.id) === String(editId));
        if (found) {
          handleEditCourse(found);
        }
        const cleanSearch = window.location.search.replace(/([?&])editCourseId=[^&]+(&?)/, (_, p1, p2) => p1 === '?' && p2 ? '?' : '');
        window.history.replaceState({}, '', window.location.pathname + cleanSearch);
      }
    };
    checkEditId();
    window.addEventListener('popstate', checkEditId);
    return () => window.removeEventListener('popstate', checkEditId);
  }, [courses]);

  // ── Course Player ────────────────────────────────────────────────────────────
  if (playingCourse) {
    return (
      <CoursePlayer
        courseId={playingCourse}
        onBack={() => { setPlayingCourse(null); loadDBCourses(); }}
      />
    );
  }

  // ── Create/Edit Course ────────────────────────────────────────────────────
  if ((showCreatePage || editingCourse) && userRole !== 'participant') {
    const editData = editingCourse && typeof editingCourse.id === 'string'
      ? {
          title: editingCourse.title,
          category: editingCourse.category.toLowerCase(),
          thumbnail: editingCourse.thumbnail,
          trainer: editingCourse.trainer || loggedTrainerName,
          batches: [],
          visibility: (editingCourse.status === 'active' ? 'public' : editingCourse.status === 'archived' ? 'private' : 'draft') as 'public' | 'private' | 'draft',
        }
      : undefined;

    return (
      <CreateCourse
        userRole={userRole as 'admin' | 'trainer'}
        onBack={() => { setShowCreatePage(false); setEditingCourse(null); setEditInitialData(null); }}
        initialData={editInitialData as Parameters<typeof CreateCourse>[0]['initialData']}
        initialCourseId={editingCourse && typeof editingCourse.id === 'string' ? editingCourse.id : undefined}
        initialReviewStatus={editingCourse?.reviewStatus || editingCourse?.status}
        initialAdminReview={editingCourse?.adminReview}
        onPublished={(data) => {
          const newCourse: Course = {
            id: Date.now(),
            title: data.title || 'Untitled Course',
            category: data.category || 'General',
            progress: 0,
            enrolled: 0,
            duration: 'TBD',
            modules: data.sections.length,
            lessons: data.sections.reduce((a, s) => a + s.lessons.length, 0),
            trainer: data.trainer || loggedTrainerName,
            createdAt: new Date().toISOString().slice(0, 10),
            thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop',
            rating: 0,
            status: 'pending_review',
            reviewStatus: 'pending_review',
            price: 50,
          };
          if (editingCourse) {
            setCourses((c) => c.map((x) => x.id === editingCourse.id ? { ...x, ...newCourse, id: x.id } : x));
            toast.success('Course submitted for admin review');
          } else {
            setCourses((c) => [newCourse, ...c]);
            toast.success(`"${newCourse.title}" submitted for review`, { description: 'Admin approval is required before students can see it.' });
          }
          setShowCreatePage(false);
          setEditingCourse(null);
          setEditInitialData(null);
        }}
      />
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEnroll = async (course: Course) => {
    if (typeof course.id !== 'string') {
      toast.info('Demo course — enrollment not available');
      return;
    }
    setEnrolling(course.id);
    try {
      const res = await enrollInCourse(course.id);
      if (res.success) {
        toast.success(`Enrolled in "${course.title}"!`, { icon: '🎉' });
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isEnrolled: true, progress: 0 } as any : c));
        handleCloseCourseInfo();
        handlePreviewCourse(course);
      } else {
        if (res.message && res.message.toLowerCase().includes('already enrolled')) {
          toast.info(`You are already enrolled. Redirecting...`);
          setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isEnrolled: true } as any : c));
          handleCloseCourseInfo();
          handlePreviewCourse(course);
        } else {
          toast.error(res.message || 'Enrollment failed');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || '';
      if (errorMsg.toLowerCase().includes('already enrolled')) {
        toast.info(`You are already enrolled. Redirecting...`);
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isEnrolled: true } as any : c));
        handleCloseCourseInfo();
        handlePreviewCourse(course);
      } else {
        toast.error(errorMsg || 'Enrollment failed');
      }
    } finally {
      setEnrolling(null);
    }
  };

  const handleStatusToggle = async (course: Course) => {
    const newStatus: 'active' | 'archived' = isCourseActive(course) ? 'archived' : 'active';
    setStatusUpdating(course.id);
    try {
      if (typeof course.id === 'string') {
        if (course.status === 'archived' && userRole !== 'admin') {
          const res = await submitCourseForReview(course.id);
          if (!res.success) { toast.error(res.message || 'Failed to submit for review'); return; }

          setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: 'pending_review', reviewStatus: 'pending_review' } : c)));
          toast.success(`"${course.title}" submitted for admin review`);
          return;
        }

        const res = await updateCourseStatus(course.id, newStatus);
        if (!res.success) { toast.error(res.message || 'Failed to update status'); return; }
      }
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)));
      toast.success(`"${course.title}" ${newStatus === 'archived' ? 'archived' : 'activated'}`, { icon: newStatus === 'archived' ? '📦' : '✅' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update course status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handlePublishDraft = async (course: Course) => {
    setStatusUpdating(course.id);
    try {
      if (typeof course.id === 'string') {
        const res = await submitCourseForReview(course.id);
        if (!res.success) { toast.error(res.message || 'Failed to submit for review'); return; }
      }
      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: 'pending_review', reviewStatus: 'pending_review' } : c)));
      toast.success(`"${course.title}" submitted for admin review`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to submit course for review.');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    try {
      if (typeof course.id === 'string') await deleteCourseAPI(course.id);
    } catch { /* ignore */ }
    setCourses((c) => c.filter((x) => x.id !== course.id));
    toast.success(`"${course.title}" deleted`, { icon: '🗑️' });
  };

  const handleEditCourse = async (course: Course) => {
    if (userRole === 'trainer' && (course.reviewStatus === 'pending_review' || course.status === 'pending_review')) {
      toast.info('This course is under admin review. You can edit it only after admin requests changes or you withdraw review.');
      return;
    }

    if (userRole === 'trainer' && (course.reviewStatus === 'published' || course.status === 'published' || course.status === 'active')) {
      toast.info('Published course changes require admin approval. Direct editing is disabled for now.');
      return;
    }
    if (typeof course.id !== 'string') {
      setEditingCourse(course);
      setEditInitialData(null);
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetchCourseAPI(course.id);
      if (res.success && res.data) {
        const d = res.data;
        const fullData = {
          title: d.title || '',
          subtitle: d.subtitle || '',
          description: d.description || '',
          category: d.category || '',
          subCategory: d.subCategory || '',
          language: d.language || 'en',
          level: d.level || 'beginner',
          tags: d.tags || [],
          thumbnail: d.thumbnail || '',
          promoVideo: d.promoVideo || '',
          objectives: d.objectives?.length ? d.objectives : ['', ''],
          requirements: d.requirements?.length ? d.requirements : [''],
          targetAudience: d.targetAudience || '',
          price: d.pricing?.amount ?? 50,
          enrollType: d.enrollmentType || 'open',
          enrollStart: d.enrollStart ? String(d.enrollStart).slice(0, 10) : '',
          enrollEnd: d.enrollEnd ? String(d.enrollEnd).slice(0, 10) : '',
          departments: Array.isArray((d as any).departments) ? (d as any).departments.map((dept: any) => typeof dept === 'string' ? dept : dept._id) : [],
          batches: Array.isArray(d.batches) ? d.batches.map((batch: any) => typeof batch === 'string' ? batch : batch._id) : [],
          trainer: d.trainer || loggedTrainerName,
          maxStudents: d.maxStudents ? String(d.maxStudents) : '',
          sections: (d.sections || []).map((sec: any) => ({
            id: sec._id,
            title: sec.title,
            description: sec.description || '',
            isOpen: false,
            lessons: (sec.lessons || []).map((les: any) => ({
              id: les._id,
              title: les.title,
              type: les.type,
              content: les.content || '',
              transcript: les.transcript || '',
              summary: les.summary || '',
              videoUrl: les.videoUrl || '',
              videoDuration: les.videoDuration || '',
              lessonImage: les.lessonImage || '',
              lessonAudio: les.lessonAudio || '',
              lessonVideo: les.lessonVideo || '',
              videoAsset: les.videoAsset,
              imageAsset: les.imageAsset,
              audioAsset: les.audioAsset,
              isPreview: les.isPreview || false,
              resources: les.resources || [],
              questions: les.questions || [],
              assignment: les.assignment,
            })),
          })),
          visibility: (d.visibility || 'draft') as 'public' | 'private' | 'draft',
          enableCertificate: d.enableCertificate !== false,
          certPassScore: d.certPassScore ?? 70,
          enableDiscussion: d.enableDiscussion !== false,
          courseValidity: d.courseValidity || '365',
          welcomeMessage: d.welcomeMessage || '',
          congratsMessage: d.congratsMessage || '',
          metaTitle: d.metaTitle || '',
          metaDescription: d.metaDescription || '',
        };
        setEditInitialData(fullData);
        setEditingCourse({
          ...course,
          reviewStatus: (d as any).reviewStatus || course.reviewStatus,
          adminReview: (d as any).adminReview || course.adminReview,
          reviewHistory: (d as any).reviewHistory || course.reviewHistory,
        });
      }
    } catch { alert('Could not load course data.'); } finally { setEditLoading(false); }
  };

  const handleRateCourse = (course: Course) => {
    setSelectedCourseForRating(course);
    setShowRatingModal(true);
  };

  const handlePreviewCourse = (course: Course) => {
    if (typeof course.id === 'string') {
      if (userRole === 'participant' && course.status === 'archived') {
        toast.info('This course is archived. Your enrollment and progress are saved, but content is locked for now.');
      }
      setPlayingCourse(course.id);
    } else {
      toast.info('Preview available for published courses only');
    }
  };

  const handleOpenCourseInfo = async (course: Course) => {
    setInfoCourse(course);
    setInfoCourseData((course.rawCourse as Record<string, any>) || course);

    if (typeof course.id !== 'string') return;
    if (courseInfoCache[course.id]) {
      setInfoCourseData(courseInfoCache[course.id]);
      return;
    }

    setInfoLoading(true);
    try {
      const res = await fetchCourseAPI(course.id);
      if (res.success && res.data) {
        setInfoCourseData(res.data as Record<string, any>);
        setCourseInfoCache((prev) => ({ ...prev, [course.id as string]: res.data }));
      }
    } catch (error) {
      toast.error('Could not load course information');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleCloseCourseInfo = () => {
    setInfoCourse(null);
    setInfoCourseData(null);
    setInfoLoading(false);
  };

  const handleCreateBatches = (course: Course) => {
    setSelectedCourseForBatch(course);
    setShowBatchModal(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Helper SVG for sparklines
  const SparklineSVG = ({ trend }: { trend: string }) => (
    <svg className="w-12 h-6" viewBox="0 0 40 20" preserveAspectRatio="none">
      <path d={trend} stroke="#4F46E5" strokeWidth="1.5" fill="none" />
      <path d={trend} stroke="#4F46E5" strokeWidth="1.5" fill="url(#sparkGradient)" fillOpacity="0.1" />
      <defs>
        <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );

  const statTrends = {
    enrolled: 'M2,15 L8,12 L14,14 L20,8 L26,10 L32,6 L38,9',
    completed: 'M2,18 L8,16 L14,12 L20,8 L26,6 L32,4 L38,2',
    inProgress: 'M2,16 L8,14 L14,10 L20,8 L26,6 L32,5 L38,3',
    avgProgress: 'M2,15 L8,11 L14,13 L20,9 L26,11 L32,7 L38,8',
  };

  return (
    <div className="space-y-6">
      {/* Premium Hero Section */}
      {userRole === 'participant' && (
        <section className="relative overflow-hidden rounded-[22px] border border-indigo-100/80 bg-gradient-to-r from-[#eef1ff] via-[#f6f4ff] to-[#eff8ff] px-5 py-6 md:px-7 md:py-7 shadow-[0_30px_50px_-38px_rgba(37,99,235,0.55)]">
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.68), rgba(255,255,255,0.14))' }} />
          
          {/* Government Building SVG Illustration */}
          <svg className="absolute right-0 top-0 w-96 h-full opacity-[0.08] mr-[-80px]" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
            <g stroke="#4F46E5" strokeWidth="1.5" fill="none">
              <circle cx="200" cy="80" r="40" />
              <path d="M160,80 Q200,40 240,80" />
              <rect x="80" y="100" width="240" height="140" />
              <line x1="100" y1="100" x2="100" y2="240" strokeWidth="2" />
              <line x1="140" y1="100" x2="140" y2="240" strokeWidth="2" />
              <line x1="180" y1="100" x2="180" y2="240" strokeWidth="2" />
              <line x1="220" y1="100" x2="220" y2="240" strokeWidth="2" />
              <line x1="260" y1="100" x2="260" y2="240" strokeWidth="2" />
              <line x1="300" y1="100" x2="300" y2="240" strokeWidth="2" />
              <rect x="100" y="120" width="20" height="20" />
              <rect x="130" y="120" width="20" height="20" />
              <rect x="160" y="120" width="20" height="20" />
              <rect x="190" y="120" width="20" height="20" />
              <rect x="220" y="120" width="20" height="20" />
              <rect x="250" y="120" width="20" height="20" />
              <rect x="100" y="155" width="20" height="20" />
              <rect x="130" y="155" width="20" height="20" />
              <rect x="160" y="155" width="20" height="20" />
              <rect x="190" y="155" width="20" height="20" />
              <rect x="220" y="155" width="20" height="20" />
              <rect x="250" y="155" width="20" height="20" />
              <rect x="100" y="190" width="20" height="20" />
              <rect x="130" y="190" width="20" height="20" />
              <rect x="160" y="190" width="20" height="20" />
              <rect x="190" y="190" width="20" height="20" />
              <rect x="220" y="190" width="20" height="20" />
              <rect x="250" y="190" width="20" height="20" />
              <polyline points="200,40 210,35 210,50" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Explore Courses</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">My Courses</h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl">Explore, enroll, and master cooperative education programs designed for government ministry learning.</p>
          </div>
        </section>
      )}

      {/* Premium Header with Controls (Trainer/Admin) */}
      {userRole !== 'participant' && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {userRole === 'admin' ? 'Course Management' : 'My Courses'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">Manage, create, and track your course portfolio</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100/80 border border-slate-200/60 rounded-[12px] p-1">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <button onClick={loadDBCourses} disabled={dbLoading} className="p-2.5 border border-slate-200/60 rounded-[12px] text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowCreatePage(true)} className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white px-5 py-2.5 rounded-[12px] font-medium hover:shadow-[0_12px_28px_-28px_rgba(79,70,229,0.4)] transition-all flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Create Course
            </button>
          </div>
        </div>
      )}

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Enrolled/Total Courses */}
        <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(37,99,235,0.35)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4F46E5] to-[#2563EB]" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#4F46E5]" />
            </div>
            <SparklineSVG trend={statTrends.enrolled} />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {userRole === 'participant' ? (dashboardStats?.total ?? courses.length) : courses.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === 'participant' ? 'Enrolled Courses' : 'Total Courses'}
          </p>
        </article>

        {/* Completed/Published */}
        <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(34,197,94,0.35)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <SparklineSVG trend={statTrends.completed} />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {userRole === 'participant' 
              ? (dashboardStats?.completed ?? courses.filter((c) => (c as any).progress === 100).length) 
              : publishedCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === 'participant' ? 'Completed' : 'Published'}
          </p>
        </article>

        {/* In Progress/Total Enrolled */}
        <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(168,85,247,0.35)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center">
              <Play className="w-5 h-5 text-violet-600" />
            </div>
            <SparklineSVG trend={statTrends.inProgress} />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {userRole === 'participant' 
              ? (dashboardStats?.inProgress ?? courses.filter((c) => (c as any).progress > 0 && (c as any).progress < 100).length)
              : courses.reduce((a, c) => a + c.enrolled, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === 'participant' ? 'In Progress' : 'Total Enrolled'}
          </p>
        </article>

        {/* Avg Progress/Drafts */}
        <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(217,119,6,0.35)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <SparklineSVG trend={statTrends.avgProgress} />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {userRole === 'participant' 
              ? (dashboardStats?.avgProgress !== undefined ? `${dashboardStats.avgProgress}%` : courses.filter((c) => (c as any).progress === 0).length)
              : draftCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {userRole === 'participant' ? 'Avg Progress' : 'Drafts'}
          </p>
        </article>
      </div>

      {/* Filters */}
      {userRole === 'participant' && (
        <div className="flex items-center gap-2 border-b border-slate-200/60 px-1">
          <button className="px-5 py-3 font-medium transition-all relative text-indigo-600 border-b-2 border-indigo-600 text-sm">
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" />My Courses</div>
          </button>
        </div>
      )}

      <FilterBar onFilterChange={setActiveFilters} showProgramFilter={userRole !== 'participant'} showBatchFilter={userRole !== 'participant'} showExport={userRole !== 'participant'} />

      {/* DB error banner */}
      {dbError && (
        <div className="flex items-center gap-3 bg-amber-50/80 border border-amber-200/60 rounded-[16px] px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span className="flex-1">{dbError}</span>
          <button onClick={loadDBCourses} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-[10px] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {dbLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[20px] border border-slate-200/80 overflow-hidden animate-pulse shadow-[0_6px_20px_-30px_rgba(0,0,0,0.1)]">
              <div className="aspect-video bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                <div className="h-8 bg-slate-100 rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {!dbLoading && viewMode === 'table' && userRole !== 'participant' && (
        <div className="bg-white/90 rounded-[22px] border border-slate-200/80 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)] overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-200/60">
                  <th className="text-left px-5 py-4 font-semibold text-slate-900 min-w-[260px]">Course</th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-900">Category</th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-900 whitespace-nowrap">Trainer</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Modules</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Lessons</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Enrolled</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Rating</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Price</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900">Status</th>
                  <th className="text-center px-5 py-4 font-semibold text-slate-900 min-w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {courses.map((course) => (
                  <CourseTableRow
                    key={course.id}
                    course={course}
                    userRole={userRole}
                    onSelectCourse={setSelectedCourse}
                    onEditCourse={handleEditCourse}
                    onEditLoading={editLoading}
                    editingCourseId={editingCourse?.id ?? null}
                    onPreviewCourse={handlePreviewCourse}
                    onCreateBatches={handleCreateBatches}
                    onPublishDraft={handlePublishDraft}
                    onStatusToggle={handleStatusToggle}
                    onDeleteCourse={handleDelete}
                    statusUpdating={statusUpdating}
                  />
                ))}
              </tbody>
            </table>
            {courses.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No courses yet</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100/60 bg-gradient-to-r from-slate-50/80 to-slate-50/40 flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">{courses.length} course{courses.length !== 1 ? 's' : ''} total</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />{publishedCount} active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />{archivedCount} archived</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" />{draftCount} draft</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="text-center py-16 bg-white/90 rounded-[22px] border-2 border-dashed border-slate-200/60 backdrop-blur-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No courses yet</p>
          {userRole !== 'participant' && (
            <button onClick={() => setShowCreatePage(true)} className="mt-4 bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white px-6 py-2.5 rounded-[12px] font-medium hover:shadow-[0_12px_28px_-28px_rgba(79,70,229,0.4)] transition-all text-sm">
              Create your first course
            </button>
          )}
        </div>
      )}

      {/* Courses Grid */}
      {courses.length > 0 && (viewMode === 'grid' || userRole === 'participant') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id}>
              {/* Premium Course Card */}
              <article className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_48px_-28px_rgba(79,70,229,0.25)] hover:border-indigo-200/60 h-full flex flex-col">
                {/* Image Container */}
                <div className="relative h-52 bg-gradient-to-br from-indigo-100 to-indigo-50 overflow-hidden">
                  {course.thumbnail && !course.thumbnail.startsWith('blob:') ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
                      <BookOpen className="w-12 h-12 text-indigo-200" />
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white text-xs font-semibold shadow-[0_8px_16px_-30px_rgba(79,70,229,0.4)]">
                      {course.category}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute bottom-4 left-4">
                    <StatusBadge status={course.status} />
                  </div>

                  {/* Rating + Info */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/80 shadow-[0_8px_16px_-30px_rgba(0,0,0,0.1)]">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold text-slate-900">{course.rating || 'New'}</span>
                    </div>
                    <CourseInfoButton course={course} onClick={handleOpenCourseInfo} />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-base text-slate-900 mb-3 line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Progress Bar (for participants only) */}
                  {userRole === 'participant' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-600 font-medium">Progress</span>
                        <span className="font-black text-indigo-600">{course.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#14B8A6] transition-all duration-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Course Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-5 py-3 px-3 rounded-[12px] bg-slate-50/80 border border-slate-100/60 text-xs">
                    <div className="flex flex-col items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600 font-medium text-[11px]">{course.duration}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 border-x border-slate-200/60">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600 font-medium text-[11px]">{course.modules || 0}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-600 font-medium text-[11px]">{course.enrolled || 0}</span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  {course.description && (
                    <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                      {stripHtml(course.description)}
                    </p>
                  )}

                  {course.adminReview?.message && ['changes_requested', 'rejected'].includes(course.status) && (
                    <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 line-clamp-2">
                      Admin feedback: {course.adminReview.message}
                    </div>
                  )}

                  {userRole === 'participant' && course.status === 'archived' && (
                    <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
                      Archived: your enrollment and progress are saved. Content is locked until this course is republished.
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex gap-2 mt-auto">
                    {userRole === 'participant' ? (
                      <>
                        {(course as any).isEnrolled ? (
                          <button
                            onClick={() => handlePreviewCourse(course)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white text-sm font-medium shadow-[0_8px_16px_-30px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_24px_-30px_rgba(79,70,229,0.5)] transition-all"
                          >
                            <Play className="w-3.5 h-3.5" />
                            {course.status === 'archived' ? 'Archived' : 'Continue'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenCourseInfo(course)}

                            className="flex-1 py-2.5 rounded-[12px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium shadow-[0_8px_16px_-30px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_24px_-30px_rgba(16,185,129,0.5)] transition-all"
                          >
                            Enroll Now
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePreviewCourse(course)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] border border-indigo-200/60 text-indigo-600 text-xs font-medium hover:bg-indigo-50 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleEditCourse(course)}
                          disabled={editLoading || editingCourse?.id === course.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] border border-slate-200/60 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit

                        </button>

                        {['draft', 'changes_requested', 'rejected'].includes(course.status) && (
                          <button
                            onClick={() => handlePublishDraft(course)}
                            disabled={statusUpdating === course.id}
                            className="flex-1 min-w-[112px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60"
                          >
                            {statusUpdating === course.id ? (
                              <Radio className="w-3.5 h-3.5 animate-pulse" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            {course.status === 'draft' ? 'Submit' : 'Resubmit'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}

      <CourseInfoModal
        isOpen={!!infoCourse}
        course={infoCourse}
        courseInfo={infoCourseData}
        loading={infoLoading}
        onClose={handleCloseCourseInfo}
        onContinue={(course) => {
          handleCloseCourseInfo();
          handlePreviewCourse(course);
        }}
        onEnroll={handleEnroll}
        enrolling={enrolling === infoCourse?.id}
      />

      {/* Batch Create Modal */}
      <BatchCreateModal
        isOpen={showBatchModal}
        course={selectedCourseForBatch}
        onClose={() => { setShowBatchModal(false); setSelectedCourseForBatch(null); }}
        onSuccess={loadDBCourses}
      />

      {/* Rating Modal */}
      {showRatingModal && selectedCourseForRating && typeof selectedCourseForRating.id === 'string' && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => { setShowRatingModal(false); setSelectedCourseForRating(null); }}
          courseId={selectedCourseForRating.id}
          courseTitle={selectedCourseForRating.title}
          onSuccess={() => { if (userRole === 'participant') loadDBCourses(); }}
        />
      )}
    </div>
  );
}
