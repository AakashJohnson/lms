import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronRight,
  Play, FileText, ClipboardList, Radio, Loader2, AlertCircle,
  BookOpen, Clock, Menu, X, Send, Award, Lock, Download, Star,
  Flame, RotateCcw, Target, Trophy, Zap, Sparkles, Brain, BookMarked, Timer, Medal, TrendingUp,
  Users, Globe, ArrowRight, BadgeCheck
} from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { LessonNotes } from './LessonNotes';
import { RatingModal } from './RatingModal';
import { TopicQuestionWidget, InVideoQuestionOverlay } from './TopicQuestionWidget';
import { RichCourseContent } from './RichCourseContent';
import { LessonDescriptionCard, getResolvedLessonDescription } from './LessonDescriptionCard';
import { getCourse, getCourseProgress, updateLessonProgress, resetCourseProgress } from '../../services/courseService';
import { getMyCertificates, downloadCertificate } from '../../services/certificateService';
import { getLessonAssignment, submitLessonAssignment } from '../../services/assignmentService';
import { getAssetUrl, toAbsoluteAssetUrl } from '../../utils/fileUrl';
import { toast } from 'sonner';
import { LessonResourcesSlider } from './LessonResourcesSlider';

interface CoursePlayerProps {
  courseId: string;
  onBack: () => void;
}

const LESSON_ICONS: Record<string, React.ElementType> = {
  video: Play,
  article: FileText,
  quiz: ClipboardList,
  assignment: ClipboardList,
  live: Radio,
};

const getCourseDescriptionHtml = (course: any): string => {
  if (!course) return '';
  return String(
    course.fullDescription
    || course.description
    || course.courseDescription
    || course.overview
    || ''
  );
};

export function CoursePlayer({ courseId, onBack }: CoursePlayerProps) {
  const [course, setCourse] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePrimaryTab, setActivePrimaryTab] = useState<'description' | 'lesson'>('lesson');
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressSaveRef = useRef<{ lessonId: string; position: number; at: number } | null>(null);

  const [showCertificateTab, setShowCertificateTab] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [loadingCertificate, setLoadingCertificate] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certificateRetryCount, setCertificateRetryCount] = useState(0);

  const userRole = (() => {
    try { return localStorage.getItem('role') || 'participant'; } catch { return 'participant'; }
  })();
  const isTrainerPreview = userRole === 'trainer';

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const currentStreak = progress?.currentStreak || 0;
  const totalWatchTime = progress?.totalWatchTime || 0;

  const handleResetProgress = async () => {
    try {
      setResetting(true);
      const res = await resetCourseProgress(courseId);
      if (res.success) {
        toast.success('Progress has been reset');
        loadCourse();
        setShowResetModal(false);
      } else {
        toast.error(res.message || 'Failed to reset progress');
      }
    } catch (error) {
      toast.error('Failed to reset progress');
    } finally {
      setResetting(false);
    }
  };

  const [showRatingModal, setShowRatingModal] = useState(false);

  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoSeekTo, setVideoSeekTo] = useState<number | null>(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [lessonAssignment, setLessonAssignment] = useState<any | null>(null);
  const [assignmentSubmission, setAssignmentSubmission] = useState<any | null>(null);
  const [assignmentAnswer, setAssignmentAnswer] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const loadCertificate = useCallback(async () => {
    try {
      setLoadingCertificate(true);
      const response = await getMyCertificates();
      if (response.success && response.data) {
        const courseCert = response.data.find((cert: any) => {
          const certCourseId = typeof cert.course === 'string' ? cert.course : cert.course?._id;
          return certCourseId === courseId || String(certCourseId) === String(courseId);
        });
        setCertificate(courseCert || null);
      }
    } catch (error) {
      console.error('Error loading certificate:', error);
    } finally {
      setLoadingCertificate(false);
    }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [courseId]);

  useEffect(() => {
    if (courseId) {
      loadCertificate();
      setTimeout(loadCertificate, 1000);
    }
  }, [courseId, loadCertificate]);

  useEffect(() => {
    if (showCertificateTab && !certificate && !loadingCertificate) {
      let retryCount = 0;
      const pollInterval = setInterval(() => {
        retryCount++;
        setCertificateRetryCount(retryCount);
        loadCertificate();
      }, 5000);
      const timeout = setTimeout(() => clearInterval(pollInterval), 30000);
      return () => { clearInterval(pollInterval); clearTimeout(timeout); };
    }
  }, [showCertificateTab, certificate, loadingCertificate, loadCertificate]);

  const handleDownloadCertificate = async () => {
    if (!certificate) return;
    try {
      setDownloadingCert(true);
      await downloadCertificate(certificate.certificateId);
      toast.success('Certificate downloaded!');
    } catch (error) {
      toast.error('Failed to download certificate');
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleManualGenerateCertificate = async () => {
    try {
      setLoadingCertificate(true);
      const { generateCertificate } = await import('../../services/certificateService');
      const response = await generateCertificate(courseId);
      if (response.success) {
        toast.success('Certificate generated!');
        setCertificate(response.data);
      } else {
        toast.error(response.message || 'Failed to generate');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate');
    } finally {
      setLoadingCertificate(false);
    }
  };

  const loadCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [courseRes, progressRes] = await Promise.all([
        getCourse(courseId),
        getCourseProgress(courseId),
      ]);
      if (!courseRes.success || !courseRes.data) {
        setError(courseRes.message || 'Failed to load course');
        return;
      }
      setCourse(courseRes.data);
      setProgress(progressRes.data);

      if (progressRes.data?.currentSectionId && progressRes.data?.currentLessonId) {
        const sections = courseRes.data.sections || [];
        const sIdx = sections.findIndex((s: any) => s._id === progressRes.data.currentSectionId);
        if (sIdx !== -1) {
          const lIdx = sections[sIdx].lessons?.findIndex((l: any) => l._id === progressRes.data.currentLessonId) ?? 0;
          setActiveSectionIdx(sIdx);
          setActiveLessonIdx(lIdx >= 0 ? lIdx : 0);
          setExpandedSections(new Set([sIdx]));
        }
      }

      const hasVisited = localStorage.getItem(`course_${courseId}_visited`);
      if (!courseRes.data.archivedAccess && !hasVisited && progressRes.data?.progressPercent === 0) {
        setShowWelcomeOverlay(true);
        localStorage.setItem(`course_${courseId}_visited`, 'true');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (progress?.progressPercent !== undefined) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress.progressPercent);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress?.progressPercent]);

  const currentSection = course?.sections?.[activeSectionIdx];
  const currentLesson = currentSection?.lessons?.[activeLessonIdx];
  const courseDescriptionHtml = useMemo(() => getCourseDescriptionHtml(course), [course]);
  const currentLessonDescriptionHtml = useMemo(
    () => getResolvedLessonDescription(course, currentSection, currentLesson),
    [course, currentSection, currentLesson],
  );

  const lessonResources = useMemo(() => {
    if (!currentLesson) return [];
    const list: any[] = [];
    
    // 1. If there's a lesson image, add it as a resource
    if (currentLesson.lessonImage) {
      list.push({
        id: 'lesson-image',
        title: currentLesson.imageAsset?.title?.trim() || currentLesson.imageAsset?.originalName?.trim() || 'Image Resource',
        url: getAssetUrl(currentLesson, 'view'),
        downloadUrl: getAssetUrl(currentLesson, 'download'),
        type: 'image',
        mimeType: currentLesson.imageAsset?.mimeType || 'image/jpeg',
        fileSize: currentLesson.imageAsset?.fileSize,
        originalName: currentLesson.imageAsset?.originalName || 'lesson-visual.jpg',
      });
    }
    
    // 2. If there's a lesson audio (and the lesson type is video, or if we want it as a resource), add it
    if (currentLesson.lessonAudio && currentLesson.type === 'video') {
      list.push({
        id: 'lesson-audio',
        title: currentLesson.audioAsset?.title?.trim() || currentLesson.audioAsset?.originalName?.trim() || 'Audio Resource',
        url: getAssetUrl(currentLesson, 'stream'),
        downloadUrl: getAssetUrl(currentLesson, 'download'),
        type: 'audio',
        mimeType: currentLesson.audioAsset?.mimeType || 'audio/mpeg',
        fileSize: currentLesson.audioAsset?.fileSize,
        originalName: currentLesson.audioAsset?.originalName || 'lesson-audio.mp3',
      });
    }

    // 2.5 If there's a lesson video and the lesson type is not video, add it as a resource
    if (currentLesson.lessonVideo && currentLesson.type !== 'video') {
      list.push({
        id: 'lesson-video',
        title: currentLesson.videoAsset?.title?.trim() || currentLesson.videoAsset?.originalName?.trim() || 'Video Resource',
        url: getAssetUrl(currentLesson, 'stream'),
        downloadUrl: getAssetUrl(currentLesson, 'download'),
        type: 'video',
        mimeType: currentLesson.videoAsset?.mimeType || 'video/mp4',
        fileSize: currentLesson.videoAsset?.fileSize,
        originalName: currentLesson.videoAsset?.originalName || 'lesson-video.mp4',
      });
    }

    // 3. Add all regular lesson resources
    if (currentLesson.resources && Array.isArray(currentLesson.resources)) {
      currentLesson.resources.forEach((r: any, idx: number) => {
        const fileUrl = getAssetUrl(r, 'view') || r.viewUrl || r.url || '';
        const fileDownloadUrl = getAssetUrl(r, 'download') || r.downloadUrl || r.url || '';
        const ext = r.originalName?.split('.').pop()?.toLowerCase() || '';
        
        let fileType = r.type || r.resourceType || r.assetType || r.kind || 'link';
        const mime = r.mimeType || '';
        if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
          fileType = 'image';
        } else if (mime.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mkv', 'mov'].includes(ext)) {
          fileType = 'video';
        } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'aac', 'ogg'].includes(ext)) {
          fileType = 'audio';
        } else if (mime === 'application/pdf' || ext === 'pdf') {
          fileType = 'pdf';
        } else if (['doc', 'docx', 'odt'].includes(ext)) {
          fileType = 'doc';
        } else if (['xls', 'xlsx'].includes(ext)) {
          fileType = 'xls';
        } else if (['ppt', 'pptx'].includes(ext)) {
          fileType = 'ppt';
        } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
          fileType = 'zip';
        }
        
        list.push({
          id: r._id || `resource-${idx}`,
          title: r.title || r.originalName || 'Resource Document',
          url: fileUrl,
          downloadUrl: fileDownloadUrl,
          type: fileType,
          resourceType: r.resourceType || r.type,
          assetType: r.assetType,
          kind: r.kind,
          link: r.link,
          href: r.href,
          value: r.value,
          mimeType: r.mimeType,
          fileSize: r.fileSize,
          originalName: r.originalName || r.title || '',
          extension: ext,
        });
      });
    }
    
    return list;
  }, [currentLesson]);

  useEffect(() => {
    setVideoDuration(0);
    setCurrentVideoTime(0);
    setVideoPaused(false);
    lastProgressSaveRef.current = null;
  }, [currentLesson?._id]);

  useEffect(() => {
    const fallbackAssignment = normalizeLessonAssignment(currentLesson?.assignment);
    setLessonAssignment(fallbackAssignment);
    setAssignmentSubmission(null);
    setAssignmentAnswer('');
    setAssignmentFile(null);

    if (!currentLesson?._id || !fallbackAssignment || isTrainerPreview) return;

    let cancelled = false;
    setAssignmentLoading(true);
    getLessonAssignment(courseId, currentLesson._id)
      .then((res) => {
        if (cancelled) return;
        setLessonAssignment(res.data.assignment || fallbackAssignment);
        setAssignmentSubmission(res.data.submission || null);
        setAssignmentAnswer(res.data.submission?.answerText || '');
      })
      .catch(() => {
        if (!cancelled) setLessonAssignment(fallbackAssignment);
      })
      .finally(() => {
        if (!cancelled) setAssignmentLoading(false);
      });

    return () => { cancelled = true; };
  }, [courseId, currentLesson?._id, currentLesson?.assignment, isTrainerPreview]);

  useEffect(() => {
    return () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
    };
  }, []);

  const getLessonProgress = (lessonId: string) => {
    const lessonProg = progress?.lessonProgress?.find((lp: any) => lp.lessonId === lessonId);
    return lessonProg;
  };

  const isLessonCompleted = (lessonId: string) => getLessonProgress(lessonId)?.completed ?? false;

  const getLastPosition = (lessonId: string) => getLessonProgress(lessonId)?.lastPosition ?? 0;

  const handleVideoProgress = useCallback(async (currentTime: number, dur: number, watchedSecs: number) => {
    const lessonId = currentLesson?._id;
    const sectionId = currentSection?._id;
    if (!lessonId || !sectionId) return;

    const position = Math.floor(currentTime || 0);
    const watched = Math.floor(watchedSecs || 0);
    const totalDuration = Math.floor(dur || 0);
    if (!Number.isFinite(position) || position <= 0) return;

    const now = Date.now();
    const lastSave = lastProgressSaveRef.current;
    if (
      lastSave?.lessonId === lessonId &&
      Math.abs(position - lastSave.position) < 5 &&
      now - lastSave.at < 8000
    ) {
      return;
    }
    lastProgressSaveRef.current = { lessonId, position, at: now };

    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(async () => {
      try {
        const res = await updateLessonProgress(courseId, {
          lessonId,
          sectionId,
          lastPosition: position,
          watchedSeconds: watched,
          totalDuration,
          completed: false,
        });
        if (res.success) setProgress((prev: any) => ({ ...prev, ...res.data }));
      } catch { /* silent */ }
    }, 1000);
  }, [courseId, currentLesson?._id, currentSection?._id]);

  const handlePlayerTimeUpdate = useCallback((time: number) => {
    setCurrentVideoTime(prev => (Math.abs(prev - time) >= 1 ? time : prev));
  }, []);

  const handlePlayerProgress = useCallback((currentTime: number, dur: number, watchedSecs: number) => {
    if (dur > 0) setVideoDuration(dur);
    handleVideoProgress(currentTime, dur, watchedSecs);
  }, [handleVideoProgress]);

  const handleJumpToTimestamp = useCallback((seconds: number) => {
    setVideoSeekTo(null);
    window.requestAnimationFrame(() => {
      setVideoSeekTo(Math.max(0, seconds));
      setCurrentVideoTime(Math.max(0, seconds));
    });
  }, []);

  const handleLessonComplete = useCallback(async () => {
    if (!currentLesson || !currentSection) return;
    try {
      const res = await updateLessonProgress(courseId, {
        lessonId: currentLesson._id,
        sectionId: currentSection._id,
        completed: true,
      });
      if (res.success) {
        setProgress((prev: any) => ({ ...prev, ...res.data }));
        toast.success('Lesson completed!', { icon: '🎉', duration: 2000 });
      }
    } catch { /* silent */ }
  }, [courseId, currentLesson, currentSection]);

  const handleAssignmentSubmit = async () => {
    if (!currentLesson?._id || !lessonAssignment) return;
    if (!assignmentAnswer.trim() && !assignmentFile) {
      toast.error('Write an answer or upload a file before submitting');
      return;
    }
    try {
      setAssignmentSubmitting(true);
      const formData = new FormData();
      formData.append('answerText', assignmentAnswer);
      if (assignmentFile) formData.append('file', assignmentFile);
      const res = await submitLessonAssignment(courseId, currentLesson._id, formData);
      if (res.success) {
        setAssignmentSubmission(res.data);
        setAssignmentAnswer(res.data.answerText || assignmentAnswer);
        setAssignmentFile(null);
        toast.success(assignmentSubmission ? 'Assignment resubmitted' : 'Assignment submitted');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const goToLesson = (sIdx: number, lIdx: number) => {
    setActivePrimaryTab('lesson');
    setActiveSectionIdx(sIdx);
    setActiveLessonIdx(lIdx);
    setExpandedSections(prev => new Set([...prev, sIdx]));
  };

  const goNext = () => {
    const sections = course?.sections || [];
    const lessons = sections[activeSectionIdx]?.lessons || [];
    if (activeLessonIdx < lessons.length - 1) {
      goToLesson(activeSectionIdx, activeLessonIdx + 1);
    } else if (activeSectionIdx < sections.length - 1) {
      goToLesson(activeSectionIdx + 1, 0);
    }
  };

  const goPrev = () => {
    if (activeLessonIdx > 0) {
      goToLesson(activeSectionIdx, activeLessonIdx - 1);
    } else if (activeSectionIdx > 0) {
      const prevSection = course?.sections?.[activeSectionIdx - 1];
      goToLesson(activeSectionIdx - 1, (prevSection?.lessons?.length ?? 1) - 1);
    }
  };

  const handleVideoQuestionAnswer = (questionId: string, answer: string) => {
    const question = currentLesson?.questions?.find((q: any) => q._id === questionId || q.id === questionId);
    if (!question) { toast.error('Question not found'); return; }
    let isCorrect = false;
    let correctAnswer = '';
    if (question.questionType === 'multiple-choice' || question.questionType === 'true-false') {
      const selectedOption = question.options?.find((opt: any) => opt.text === answer);
      isCorrect = selectedOption?.isCorrect === true;
      const correctOption = question.options?.find((opt: any) => opt.isCorrect === true);
      correctAnswer = correctOption?.text || '';
    } else if (question.questionType === 'short-answer') {
      isCorrect = answer.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      correctAnswer = question.correctAnswer || '';
    }
    if (isCorrect) toast.success('Correct! 🎯', { icon: '🎯' });
    else toast.error(`Wrong! Answer: ${correctAnswer}`, { icon: '❌' });
  };

  const totalLessons = (course?.sections || []).reduce((s: number, sec: any) => s + (sec.lessons?.length || 0), 0);
  const completedLessons = (progress?.lessonProgress || []).filter((lp: any) => lp.completed).length;
  const progressPct = progress?.progressPercent ?? 0;
  const isCourseCompleted = progress?.status === 'completed' && progressPct === 100;
  const showCertificateSection = isCourseCompleted || certificate !== null;

  const formatWatchTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const totalEstimatedMinutes = useMemo(() => {
    const lessons = (course?.sections || []).flatMap((sec: any) => sec.lessons || []);
    const totalSeconds = lessons.reduce((sum: number, lesson: any) => {
      const duration = String(lesson?.videoDuration || '').trim();
      if (!duration) return sum;
      const parts = duration.split(':').map((p) => Number(p));
      if (parts.some((n) => Number.isNaN(n))) return sum;
      if (parts.length === 2) return sum + (parts[0] * 60) + parts[1];
      if (parts.length === 3) return sum + (parts[0] * 3600) + (parts[1] * 60) + parts[2];
      return sum;
    }, 0);
    return Math.max(1, Math.round(totalSeconds / 60));
  }, [course]);

  const courseSubtitle = String(course?.subtitle || '').trim();
  const courseObjectives = Array.isArray(course?.objectives) ? course.objectives.filter((item: any) => String(item || '').trim()) : [];
  const courseRequirements = Array.isArray(course?.requirements) ? course.requirements.filter((item: any) => String(item || '').trim()) : [];
  const lastUpdatedLabel = course?.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : '';
  const isArchivedCourse = course?.archivedAccess || course?.status === 'archived';

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-xl">
            <BookOpen className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="absolute inset-0 w-24 h-24">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-2xl" />
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-2xl border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Course</h3>
        <p className="text-gray-500">Preparing your learning experience...</p>
        <div className="mt-6 flex justify-center gap-1">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );

  if (error || !course) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center shadow-lg">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={onBack} className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
          Go Back
        </button>
      </div>
    </div>
  );

  if (isArchivedCourse) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-indigo-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-orange-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
          <Lock className="h-8 w-8" />
        </div>
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
          Archived Course
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">{course.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          {course.archiveMessage || 'This course is archived. Your enrollment and progress are saved, but content is locked until the course is republished.'}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Progress</p>
            <p className="mt-1 text-xl font-extrabold text-slate-950">{progressPct}%</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Status</p>
            <p className="mt-1 text-sm font-bold capitalize text-slate-950">{progress?.status || 'enrolled'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Participation</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">Saved</p>
          </div>
        </div>
        <button onClick={onBack} className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">
          <ArrowLeft className="h-4 w-4" />
          Back to My Courses
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30 flex flex-col">
      {showWelcomeOverlay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowWelcomeOverlay(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl transform animate-bounce-in border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-3 hover:rotate-6 transition-transform">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Welcome to {course.title}!</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">You're about to start an exciting learning journey. Let's get started!</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setShowWelcomeOverlay(false)} className="group w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-[1.02] transition-all bg-[length:200%_100%]">
                  <span className="flex items-center justify-center gap-2">
                    Start Learning <Play className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button onClick={() => setShowWelcomeOverlay(false)} className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Maybe later</button>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex justify-center gap-6 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {totalLessons} Lessons
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4" /> Self-paced
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isTrainerPreview && (
        <div className="bg-gradient-to-r from-purple-600 to-violet-700 px-4 py-2 flex items-center justify-center gap-2 text-white text-sm font-medium flex-shrink-0 shadow-md">
          <Play className="w-4 h-4" />
          <span>Preview Mode - Student View</span>
          <span className="text-purple-200 text-xs ml-2">(Trainer Preview)</span>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-xl border-b border-slate-200/70 px-3 py-2.5 flex items-center justify-between flex-shrink-0 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        {/* Left: Back button */}
        <button onClick={onBack} className="group flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 transition-all px-2.5 py-1.5 rounded-xl hover:bg-indigo-50">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-semibold hidden sm:block">Back</span>
        </button>

        {/* Center: Lesson Topic - Clickable to show lecture info */}
        <div className="flex-1 text-center px-2">
          <button onClick={() => setSidebarOpen(true)} className="group inline-flex flex-col items-center gap-0 max-w-full">
            <h1 className="text-slate-900 font-bold text-xs sm:text-sm truncate group-hover:text-indigo-600 transition-colors">
              {activePrimaryTab === 'description' ? 'Course Description' : (currentLesson?.title || course.title)}
            </h1>
            <span className="text-[10px] text-slate-500 truncate max-w-full">
              {activePrimaryTab === 'description'
                ? 'Course overview'
                : `${currentSection?.title || 'Course Content'} • Lecture ${activeLessonIdx + 1} of ${totalLessons}`}
            </span>
          </button>
          {isCourseCompleted && (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-emerald-500 to-green-500 text-white px-2.5 py-1 rounded-full shadow-sm">
              <CheckCircle2 className="w-2.5 h-2.5" /> Completed
            </span>
          )}
        </div>

        {/* Right: Stats + Section */}
        <div className="flex items-center gap-1">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-600 border border-orange-200/60">
              <Flame className="w-3 h-3 animate-pulse" /> {currentStreak}
            </div>
          )}
          {totalWatchTime > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-600 border border-blue-200/60">
              <Timer className="w-3 h-3" /> {formatWatchTime(totalWatchTime)}
            </div>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/70">
            <BookOpen className="w-3 h-3" /> {completedLessons}/{totalLessons}
          </div>
          {!isTrainerPreview && progressPct > 0 && (
            <button onClick={() => setShowResetModal(true)} className="text-gray-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50" title="Reset Progress">
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl transform animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg mb-2">Reset Progress?</h3>
              <p className="text-gray-500 text-sm mb-6">This will reset all your progress, streak, and certificates for this course.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleResetProgress} disabled={resetting} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative flex-row-reverse">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 relative">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-indigo-200/20 blur-3xl" />
            <div className="absolute bottom-10 left-8 h-48 w-48 rounded-full bg-violet-200/20 blur-3xl" />
          </div>
          <div className="relative max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
            {activePrimaryTab === 'description' ? (
              <div className="space-y-5">
                <section className="rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur p-5 sm:p-6 lg:p-7">
                  <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                          <BookMarked className="w-3.5 h-3.5" />
                          Course Description
                        </span>
                        {isCourseCompleted && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{course.title}</h1>
                        {courseSubtitle && <p className="mt-1.5 text-slate-600 text-sm sm:text-base">{courseSubtitle}</p>}
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-sm grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Target className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Level</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{course.level || 'Beginner'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Duration</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{totalLessons} Lesson{totalLessons === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Language</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{String(course.language || 'en').toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Participants</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{course.currentEnrollments ?? 0} enrolled</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Award className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">Certificate</p>
                            <p className="text-xs font-semibold text-slate-800 truncate">{course.enableCertificate ? 'Available' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50 p-4 sm:p-5 shadow-inner relative overflow-hidden">
                      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-200/30" />
                      <div className="absolute -left-8 bottom-2 h-16 w-16 rounded-full bg-violet-200/30" />

                      <div className="relative rounded-2xl border border-white/80 bg-white/80 backdrop-blur p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Learning Snapshot</p>
                            <p className="text-xs text-slate-500">Track your course journey</p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                            <TrendingUp className="w-3 h-3" />
                            {progressPct}%
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">{completedLessons}/{totalLessons} lessons completed</p>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2">
                            <p className="text-[10px] text-slate-500">Watch Time</p>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{formatWatchTime(totalWatchTime || 0)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2">
                            <p className="text-[10px] text-slate-500">Streak</p>
                            <p className="text-xs font-bold text-slate-900 mt-0.5">{currentStreak} day{currentStreak === 1 ? '' : 's'}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setActivePrimaryTab('lesson')}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.30)] hover:shadow-[0_12px_24px_rgba(79,70,229,0.35)] transition-all"
                          >
                            Continue
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!showCertificateSection) return;
                              setShowCertificateTab(true);
                              if (!certificate) loadCertificate();
                            }}
                            disabled={!showCertificateSection}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            <Award className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                  <h2 className="text-lg font-bold text-slate-900 mb-4">About this course</h2>
                  <RichCourseContent html={courseDescriptionHtml} />
                </section>

                {(courseObjectives.length > 0 || courseRequirements.length > 0) && (
                  <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)] grid gap-5 md:grid-cols-2">
                    {courseObjectives.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                          <Zap className="w-4 h-4 text-indigo-500" />
                          Learning Outcomes
                        </h3>
                        <ul className="space-y-2">
                          {courseObjectives.map((item: string, idx: number) => (
                            <li key={`objective-${idx}`} className="text-sm text-slate-700 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {courseRequirements.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                          <Brain className="w-4 h-4 text-indigo-500" />
                          Course Requirements
                        </h3>
                        <ul className="space-y-2">
                          {courseRequirements.map((item: string, idx: number) => (
                            <li key={`req-${idx}`} className="text-sm text-slate-700 flex items-start gap-2">
                              <ChevronRight className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>
                )}

                <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-5 sm:p-6 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                  <h3 className="flex items-center gap-2 text-slate-900 font-bold mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Course at a glance
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <p className="text-[11px] text-slate-500">Lessons</p>
                      <p className="text-sm font-bold text-slate-900">{totalLessons}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <p className="text-[11px] text-slate-500">Duration</p>
                      <p className="text-sm font-bold text-slate-900">~ {totalEstimatedMinutes} mins</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                      <p className="text-[11px] text-slate-500">Certificate</p>
                      <p className="text-sm font-bold text-slate-900">{course.enableCertificate ? 'Yes' : 'No'}</p>
                    </div>
                    {lastUpdatedLabel && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                        <p className="text-[11px] text-slate-500">Last Updated</p>
                        <p className="text-sm font-bold text-slate-900">{lastUpdatedLabel}</p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[20px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm">
                  <button
                    onClick={onBack}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setActivePrimaryTab('lesson')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.35)] hover:shadow-[0_16px_30px_rgba(79,70,229,0.4)] transition-all"
                  >
                    Continue to Lesson
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
            {currentLesson?.type === 'video' && getAssetUrl(currentLesson, 'stream') ? (
              <div className="space-y-4">
                <div className="relative group rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200/50">
                  <VideoPlayer
                    src={getAssetUrl(currentLesson, 'stream')}
                    title={currentLesson.title}
                    lastPosition={getLastPosition(currentLesson._id)}
                    onTimeUpdate={handlePlayerTimeUpdate}
                    onProgress={handlePlayerProgress}
                    onComplete={handleLessonComplete}
                    paused={videoPaused}
                    seekTo={videoSeekTo}
                    chapters={currentLesson.chapters || []}
                  />
                  {currentLesson.questions && currentLesson.questions.length > 0 && userRole === 'participant' && (
                    <InVideoQuestionOverlay
                      questions={currentLesson.questions}
                      currentTime={currentVideoTime}
                      videoDuration={videoDuration}
                      onAnswer={(questionId, answer) => handleVideoQuestionAnswer(questionId, answer)}
                      onPause={() => setVideoPaused(true)}
                      onPlay={() => setVideoPaused(false)}
                    />
                  )}
                </div>
              </div>
            ) : currentLesson?.lessonVideo ? (
              <div className="relative group rounded-2xl overflow-hidden shadow-2xl ring-1 ring-gray-200/50">
                <VideoPlayer
                  src={getAssetUrl(currentLesson, 'stream')}
                  title={currentLesson.title}
                  lastPosition={getLastPosition(currentLesson._id)}
                  onTimeUpdate={handlePlayerTimeUpdate}
                  onProgress={handlePlayerProgress}
                  onComplete={handleLessonComplete}
                  paused={videoPaused}
                  seekTo={videoSeekTo}
                />
                {currentLesson.questions && currentLesson.questions.length > 0 && userRole === 'participant' && (
                  <InVideoQuestionOverlay
                    questions={currentLesson.questions}
                    currentTime={currentVideoTime}
                    videoDuration={videoDuration}
                    onAnswer={(questionId, answer) => handleVideoQuestionAnswer(questionId, answer)}
                    onPause={() => setVideoPaused(true)}
                    onPlay={() => setVideoPaused(false)}
                  />
                )}
              </div>
            ) : (currentLesson?.lessonImage || currentLesson?.lessonAudio) ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <div className="p-6">
                  {currentLesson.lessonAudio && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-indigo-700 font-semibold">Audio Content</span>
                      </div>
                      <audio controls className="w-full h-10 rounded-lg" src={getAssetUrl(currentLesson, 'stream')} onEnded={handleLessonComplete} onTimeUpdate={(e) => handlePlayerTimeUpdate(e.currentTarget.currentTime)} />
                    </div>
                  )}
                  {currentLesson.content && (
                    <div className="prose prose-sm max-w-none text-gray-600 mb-6" dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  )}
                  <button onClick={handleLessonComplete} className="group flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all">
                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Mark as Complete
                  </button>
                </div>
              </div>
            ) : currentLesson?.type === 'article' ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-indigo-700 text-sm font-bold uppercase tracking-wide">Article</span>
                    <p className="text-indigo-400 text-xs">Reading material</p>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: currentLesson.content || '<p>No content available.</p>' }} />
                <button onClick={handleLessonComplete} className="group mt-6 flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-[1.02] transition-all">
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Mark as Complete
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xl">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <BookOpen className="w-10 h-10 text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-500 font-medium text-lg">{currentLesson ? `${currentLesson.type} content` : 'Select a lesson to begin'}</p>
              </div>
            )}

            {currentLesson && (
              <LessonResourcesSlider resources={lessonResources} />
            )}

            {currentLesson && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1.5 rounded-lg shadow-sm">
                        Section {activeSectionIdx + 1} · Lesson {activeLessonIdx + 1}
                      </span>
                      {isLessonCompleted(currentLesson._id) && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                    <h2 className="text-gray-900 text-xl font-extrabold tracking-tight leading-tight">{currentLesson.title}</h2>
                    {currentLesson.content && currentLesson.type !== 'article' && (
                      <p className="text-gray-500 text-sm mt-3 line-clamp-2 leading-relaxed">{currentLesson.content}</p>
                    )}
                  </div>
                  {!isLessonCompleted(currentLesson._id) && currentLesson.type !== 'video' && (
                    <button onClick={handleLessonComplete} className="group flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Mark Complete
                    </button>
                  )}
                </div>
              </div>
            )}

            {currentLesson && (
              <LessonDescriptionCard descriptionHtml={currentLessonDescriptionHtml} />
            )}

            {currentLesson && currentSection && (
              <LessonNotes
                courseId={courseId}
                sectionId={currentSection._id}
                lessonId={currentLesson._id}
                currentTimestamp={currentVideoTime}
                onJumpToTimestamp={handleJumpToTimestamp}
              />
            )}

            <div className="flex items-center gap-3">
                <button onClick={goPrev} disabled={activeSectionIdx === 0 && activeLessonIdx === 0} className="group flex items-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Previous
                </button>
                <button onClick={goNext} disabled={activeSectionIdx === (course.sections?.length ?? 1) - 1 && activeLessonIdx === (currentSection?.lessons?.length ?? 1) - 1} className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[length:200%_100%]">
                  Next <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            {currentLesson && lessonAssignment && (
              <LessonAssignmentCard
                assignment={lessonAssignment}
                submission={assignmentSubmission}
                loading={assignmentLoading}
                answer={assignmentAnswer}
                setAnswer={setAssignmentAnswer}
                selectedFile={assignmentFile}
                setSelectedFile={setAssignmentFile}
                submitting={assignmentSubmitting}
                onSubmit={handleAssignmentSubmit}
              />
            )}
              </>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <div className="w-80 md:w-[340px] bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0 md:block fixed md:relative inset-y-0 right-0 z-20 md:z-auto shadow-2xl md:shadow-none">
            <div className="p-4 sm:p-5">
              <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white p-4 shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-indigo-100">Course Progress</p>
                      <p className="text-4xl leading-none font-extrabold mt-1">{progressPct}%</p>
                      <p className="text-xs text-indigo-100 mt-3">{completedLessons} of {totalLessons} lessons completed</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isCourseCompleted ? 'bg-emerald-400/90' : 'bg-white/25'}`}>
                      {isCourseCompleted ? <CheckCircle2 className="w-7 h-7" /> : <TrendingUp className="w-6 h-6" />}
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
                    <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200/70 overflow-hidden bg-white">
                <button
                  onClick={() => setActivePrimaryTab('description')}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all border-l-4 ${
                    activePrimaryTab === 'description'
                        ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-500 shadow-sm'
                        : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    activePrimaryTab === 'description'
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                  }`}>
                        <BookMarked className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                      activePrimaryTab === 'description' ? 'text-indigo-700' : 'text-slate-800'
                    }`}>
                      Course Description
                    </p>
                        <p className="text-xs text-slate-500">Overview</p>
                  </div>
                      {isCourseCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                </button>

              {(course.sections || []).map((section: any, sIdx: number) => {
                const isExpanded = expandedSections.has(sIdx);
                const sectionLessons = section.lessons || [];
                const sectionCompleted = sectionLessons.filter((l: any) => isLessonCompleted(l._id)).length;
                const sectionProgress = sectionLessons.length > 0 ? Math.round((sectionCompleted / sectionLessons.length) * 100) : 0;
                const isSectionComplete = sectionCompleted === sectionLessons.length;

                return (
                  <div key={section._id || sIdx}>
                        <button onClick={() => setExpandedSections(prev => { const next = new Set(prev); if (next.has(sIdx)) next.delete(sIdx); else next.add(sIdx); return next; })} className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-slate-50 transition-all text-left group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isSectionComplete ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${activePrimaryTab === 'lesson' && activeSectionIdx === sIdx ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 group-hover:border-indigo-400'}`} />
                          )}
                              <p className="text-slate-800 text-sm font-semibold truncate group-hover:text-indigo-700 transition-colors">{section.title}</p>
                        </div>
                            <div className="flex items-center gap-2 mt-1.5 ml-7">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                            <div className={`h-full rounded-full transition-all ${isSectionComplete ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-purple-500'}`} style={{ width: `${sectionProgress}%` }} />
                          </div>
                              <span className="text-xs text-slate-500 font-medium">{sectionCompleted}/{sectionLessons.length} completed</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-500 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />}
                    </button>

                    {isExpanded && (
                          <div className="bg-gradient-to-b from-slate-50 to-white">
                        {sectionLessons.map((lesson: any, lIdx: number) => {
                          const isActive = activePrimaryTab === 'lesson' && activeSectionIdx === sIdx && activeLessonIdx === lIdx;
                          const isDone = isLessonCompleted(lesson._id);
                          const lessonProgress = progress?.lessonProgress?.find((lp: any) => lp.lessonId === lesson._id);
                          const Icon = LESSON_ICONS[lesson.type] ?? Play;

                          return (
                                <button key={lesson._id || lIdx} onClick={() => goToLesson(sIdx, lIdx)} className={`w-full flex items-start gap-3 px-3.5 py-3 text-left transition-all group border-l-4 ${isActive ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-500' : 'border-transparent hover:bg-white'}`}>
                              <div className={`relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md ${isDone ? 'bg-gradient-to-r from-green-500 to-emerald-500' : isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                                {isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-3.5 h-3.5 text-white" />}
                                {!isDone && lessonProgress?.watchedSeconds > 0 && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-400 rounded-full border-2 border-white animate-pulse" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-700' : isDone ? 'text-slate-500' : 'text-slate-700'}`}>{lesson.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{lesson.type}</span>
                                    {lesson.videoDuration && <span className="text-slate-400 text-xs flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{lesson.videoDuration}</span>}
                                </div>
                              </div>
                                {!isDone && <span className="ml-auto text-[10px] font-semibold text-slate-400">{sectionProgress}%</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200/70 overflow-hidden bg-white">
              <button onClick={() => { setShowCertificateTab(!showCertificateTab); if (!showCertificateTab) loadCertificate(); }} disabled={!showCertificateSection} className={`w-full flex items-center justify-between px-4 py-4 transition-all text-left group ${showCertificateSection ? 'hover:bg-indigo-50/50' : 'opacity-60 cursor-not-allowed'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${showCertificateSection ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gray-300'}`}>
                    {showCertificateSection ? <Award className="w-5 h-5 text-white" /> : <Lock className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div>
                      <p className="text-slate-800 text-sm font-bold">Certificate</p>
                      <p className="text-slate-500 text-xs font-medium">{showCertificateSection ? 'Available' : 'Complete to unlock'}</p>
                  </div>
                </div>
                {showCertificateSection && (showCertificateTab ? <ChevronDown className="w-5 h-5 text-indigo-500" /> : <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />)}
              </button>

              {showCertificateTab && showCertificateSection && (
                <div className="px-4 pb-4">
                  {loadingCertificate ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-500 text-sm font-medium">Loading certificate...</p>
                    </div>
                  ) : certificate ? (
                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Awarded to</p>
                        <p className="text-gray-900 font-bold text-lg">{certificate.metadata?.studentName || certificate.student?.firstName + ' ' + certificate.student?.lastName}</p>
                        <p className="text-gray-500 text-sm">{certificate.metadata?.studentEmail || certificate.student?.email}</p>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-4">
                            <Award className="w-6 h-6" />
                            <span className="font-bold text-lg">Certificate of Completion</span>
                          </div>
                          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">Course</p>
                          <p className="font-semibold mb-4 text-white">{certificate.metadata?.courseName || certificate.course?.title}</p>
                          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">Certificate ID</p>
                          <p className="text-xs font-mono bg-white/20 px-3 py-2 rounded-lg inline-block">{certificate.certificateId}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
                        <span>Completed: {new Date(certificate.completionDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                      </div>
                      <div className="space-y-2">
                        <button onClick={handleDownloadCertificate} disabled={downloadingCert} className="group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3.5 rounded-xl font-bold hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50">
                          {downloadingCert ? <><Loader2 className="w-5 h-5 animate-spin" />Downloading...</> : <><Download className="w-5 h-5 group-hover:scale-110 transition-transform" />Download Certificate</>}
                        </button>
                        {!isTrainerPreview && (
                          <button onClick={() => setShowRatingModal(true)} className="group w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all">
                            <Star className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Rate This Course
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Award className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-4">Certificate is being generated...</p>
                      <button onClick={loadCertificate} disabled={loadingCertificate} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 mx-auto">
                        {loadingCertificate && <Loader2 className="w-4 h-4 animate-spin" />}
                        Check Again
                      </button>
                      {certificateRetryCount >= 3 && (
                        <button onClick={handleManualGenerateCertificate} disabled={loadingCertificate} className="mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
                          Generate Manually
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
                </div>

                {isCourseCompleted && (
                  <div className="mt-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-indigo-50/40 p-4 text-center">
                    <p className="text-slate-900 font-bold">Great job!</p>
                    <p className="text-xs text-slate-500 mt-1">You've completed all lessons in this course.</p>
                    <button
                      onClick={() => {
                        if (!showCertificateTab) {
                          setShowCertificateTab(true);
                          loadCertificate();
                        }
                      }}
                      className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-all"
                    >
                      <Award className="w-4 h-4" />
                      View Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showRatingModal && course && (
        <RatingModal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)} courseId={courseId} courseTitle={course.title} onSuccess={() => toast.success('Thank you for rating!')} />
      )}
    </div>
  );
}

function normalizeLessonAssignment(assignment: any) {
  if (!assignment || assignment.enabled === false) return null;
  const attachment = assignment.attachment || assignment.attachmentAsset || {};
  const fileId = attachment.fileId || attachment.fileAssetId || '';
  const url = attachment.url || attachment.downloadUrl || assignment.attachmentUrl || '';
  const hasContent = assignment.title || assignment.description || assignment.instructions || assignment.dueDate || url || fileId;
  if (!hasContent) return null;
  return {
    enabled: true,
    title: assignment.title || 'Lesson Assignment',
    description: assignment.description || assignment.instructions || '',
    instructions: assignment.instructions || assignment.description || '',
    dueDate: assignment.dueDate || '',
    maxScore: assignment.maxScore || 100,
    attachment: {
      fileId,
      url,
      originalName: attachment.originalName || attachment.filename || url?.split('/').pop() || '',
      mimetype: attachment.mimeType || attachment.mimetype || '',
      size: attachment.fileSize || attachment.size || 0,
    },
  };
}

function getAssignmentAttachmentUrl(assignment: any) {
  const fileId = assignment?.attachment?.fileId;
  if (fileId) return toAbsoluteAssetUrl(`/api/v1/files/${fileId}/download`);
  return toAbsoluteAssetUrl(assignment?.attachment?.url || '');
}

function formatAssignmentDate(value: any) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAssignmentStatus(assignment: any, submission: any) {
  if (submission?.status === 'graded') return { label: 'Graded', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (submission?.status === 'needs_resubmission') return { label: 'Needs Resubmission', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (submission?.status === 'rejected') return { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (submission?.status === 'resubmitted') return { label: 'Resubmitted', className: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (submission) return { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' };
  const due = assignment?.dueDate ? new Date(assignment.dueDate) : null;
  if (due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
    return { label: 'Overdue', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' };
}

function getTeacherResponseAttachmentUrl(submission: any) {
  const attachment = submission?.teacherFeedback?.attachment;
  if (attachment?.fileId) return toAbsoluteAssetUrl(`/api/v1/files/${attachment.fileId}/download`);
  return toAbsoluteAssetUrl(attachment?.url || '');
}

function LessonAssignmentCard({
  assignment,
  submission,
  loading,
  answer,
  setAnswer,
  selectedFile,
  setSelectedFile,
  submitting,
  onSubmit,
}: any) {
  const status = getAssignmentStatus(assignment, submission);
  const attachmentUrl = getAssignmentAttachmentUrl(assignment);
  const submissionAttachmentUrl = submission?.attachment?.fileId
    ? toAbsoluteAssetUrl(`/api/v1/files/${submission.attachment.fileId}/download`)
    : toAbsoluteAssetUrl(submission?.attachment?.url || '');
  const teacherAttachmentUrl = getTeacherResponseAttachmentUrl(submission);
  const hasTeacherResponse = Boolean(
    submission?.teacherFeedback?.text ||
    submission?.teacherFeedback?.reviewedAt ||
    submission?.status === 'graded' ||
    submission?.status === 'needs_resubmission' ||
    submission?.status === 'rejected'
  );
  const grade = submission?.grade || {};
  const gradeScore = grade.score ?? submission?.score;
  const gradeMaxScore = grade.maxScore || assignment.maxScore || 100;
  const canSubmit = !submission || !['graded', 'rejected'].includes(submission.status);

  return (
    <section className="rounded-[24px] border border-indigo-100 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-950">Assignment</h2>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Submit your work for this lesson.</p>
          </div>
        </div>
        {loading && (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading
          </span>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <h3 className="text-base font-extrabold text-slate-950">{assignment.title}</h3>
        {(assignment.instructions || assignment.description) && (
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{assignment.instructions || assignment.description}</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due Date</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatAssignmentDate(assignment.dueDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Max Score</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{assignment.maxScore || 100}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Attachment</p>
            {attachmentUrl ? (
              <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                <Download className="h-4 w-4" />
                Download Attachment
              </a>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-400">No file</p>
            )}
          </div>
        </div>
      </div>

      {submission && (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-blue-950">Your submission</p>
            <span className="text-xs font-semibold text-blue-700">Submitted {formatAssignmentDate(submission.submittedAt)}</span>
          </div>
          {submission.answerText && <p className="mt-2 whitespace-pre-line text-sm text-blue-900">{submission.answerText}</p>}
          {submissionAttachmentUrl && (
            <a href={submissionAttachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50">
              <Download className="h-4 w-4" />
              Download Submitted File
            </a>
          )}
        </div>
      )}

      {hasTeacherResponse && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-700" />
              <p className="font-bold text-emerald-950">Teacher Response</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {submission?.status === 'graded' && (
              <>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Marks</p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-700">{gradeScore ?? 0}/{gradeMaxScore}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Percentage</p>
                  <p className="mt-1 text-sm font-extrabold text-emerald-700">{grade.percentage ?? Math.round(((Number(gradeScore) || 0) / Number(gradeMaxScore || 100)) * 100)}%</p>
                </div>
              </>
            )}
            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Reviewed</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatAssignmentDate(submission?.teacherFeedback?.reviewedAt)}</p>
            </div>
          </div>
          {(submission?.teacherFeedback?.text || submission?.feedback) && (
            <p className="mt-3 whitespace-pre-line rounded-xl bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-emerald-100">
              {submission.teacherFeedback?.text || submission.feedback}
            </p>
          )}
          {teacherAttachmentUrl && (
            <a href={teacherAttachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-50">
              <Download className="h-4 w-4" />
              Download Teacher Attachment
            </a>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer..."
          disabled={!canSubmit}
          rows={4}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 ${canSubmit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <FileText className="h-4 w-4" />
            {selectedFile ? selectedFile.name : 'Upload answer file'}
            <input type="file" className="hidden" disabled={!canSubmit} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          </label>
          <button
            onClick={onSubmit}
            disabled={submitting || !canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,70,229,0.28)] transition hover:shadow-[0_14px_28px_rgba(79,70,229,0.36)] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {!canSubmit ? 'Response Finalized' : submission ? 'Resubmit' : 'Submit Assignment'}
          </button>
        </div>
      </div>
    </section>
  );
}
