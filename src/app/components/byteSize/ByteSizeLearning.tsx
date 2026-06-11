import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Flame,
  Gamepad2,
  Gift,
  Lock,
  MessageCircle,
  Rocket,
  Shield,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Users,
  Zap,
  Edit,
  Trash2,
  Plus,
  Eye,
  Upload,
  Loader2,
  Check,
  X,
  PlusCircle,
  Save,
  FileText,
  LayoutDashboard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getLeaderboard,
  getRecommendations,
  getUserStats,
  LeaderboardEntry,
  MicroLesson,
  Recommendation,
  UserStats,
  QuizQuestion,
  Flashcard,
  updateMicroLesson,
  deleteMicroLesson,
  analyzeContent,
  uploadTutorAttachment,
  getCourseMicroLessons,
  getTeacherCourseBytes,
} from '../../services/byteSizeService';
import {
  getMyEnrollments,
  updateLessonProgress,
  getCourses,
  getCourse,
  getCourseEnrollments,
  DBCourse,
} from '../../services/courseService';
import { getStreakStats, recordActivity, recordDailyLogin } from '../../services/streakService';
import FocusMode from './FocusMode';

type StudentTabType = 'mission' | 'journey' | 'arena' | 'rewards' | 'leaderboard';
type TrainerTabType = 'builder' | 'review' | 'insights' | 'leaderboard';

interface ByteSizeLearningProps {
  userRole: 'admin' | 'trainer' | 'participant';
  onNavigate?: (page: string) => void;
}

const levelTitles = ['Beginner', 'Explorer', 'Achiever', 'Master', 'Legend'];

const fallbackStats = {
  totalXP: 0,
  level: 1,
  levelTitle: 'Beginner',
  xpToNextLevel: 800,
  currentStreak: 0,
  totalLessonsCompleted: 0,
  weeklyStats: {
    lessonsCompleted: 0,
    xpEarned: 0,
    quizzesPassed: 0,
    minutesLearned: 0,
  },
  achievements: [],
  availableAchievements: [],
};

const fallbackLeaders: LeaderboardEntry[] = [
  { userId: '1', name: 'Aarav', avatar: 'A', xp: 4920, level: 9, rank: 1, streak: 14, weeklyXP: 120, levelTitle: 'Explorer' },
  { userId: '2', name: 'Diya', avatar: 'D', xp: 4510, level: 8, rank: 2, streak: 11, weeklyXP: 100, levelTitle: 'Explorer' },
  { userId: '3', name: 'Kabir', avatar: 'K', xp: 3980, level: 7, rank: 3, streak: 9, weeklyXP: 80, levelTitle: 'Beginner' },
];

const badgeCatalog = [
  { title: '7-Day Streak', rarity: 'Rare', icon: Flame, color: 'from-orange-400 to-red-500' },
  { title: 'Quiz Master', rarity: 'Epic', icon: Trophy, color: 'from-amber-300 to-yellow-600' },
  { title: 'Fast Learner', rarity: 'Rare', icon: Rocket, color: 'from-sky-300 to-cyan-600' },
  { title: 'Night Owl', rarity: 'Hidden', icon: Sparkles, color: 'from-indigo-300 to-slate-700' },
  { title: 'Perfect Score', rarity: 'Legendary', icon: Award, color: 'from-fuchsia-400 to-rose-600' },
  { title: 'AI Explorer', rarity: 'Epic', icon: Bot, color: 'from-emerald-300 to-teal-600' },
];

const challengeTypes = {
  quiz: 'Speed Quiz',
  flashcard: 'Flashcards',
  coding: 'Code Arena',
  voice: 'Voice Response',
  scenario: 'Scenario Challenge',
  poll: 'Quick Poll',
};

export default function ByteSizeLearning({ userRole, onNavigate }: ByteSizeLearningProps) {
  // Common states
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(fallbackLeaders);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [reward, setReward] = useState<string | null>(null);

  // Student specific states
  const [studentActiveTab, setStudentActiveTab] = useState<StudentTabType>('mission');
  const [stats, setStats] = useState<any>(fallbackStats);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [studentCourseBytes, setStudentCourseBytes] = useState<Record<string, MicroLesson[]>>({});
  const [selectedStudentCourseId, setSelectedStudentCourseId] = useState<string>('all');
  const [focusMode, setFocusMode] = useState<MicroLesson | null>(null);

  // Trainer specific states
  const [trainerActiveTab, setTrainerActiveTab] = useState<TrainerTabType>('builder');
  const [trainerCourses, setTrainerCourses] = useState<DBCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<DBCourse | null>(null);
  const [microLessons, setMicroLessons] = useState<MicroLesson[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  
  // Generation & Uploader states
  const [contentSourceType, setContentSourceType] = useState<'curriculum' | 'external'>('curriculum');
  const [selectedCurriculumLesson, setSelectedCurriculumLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [externalPastedText, setExternalPastedText] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isGeneratingBytes, setIsGeneratingBytes] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Edit modal state
  const [editingLesson, setEditingLesson] = useState<MicroLesson | null>(null);

  useEffect(() => {
    if (userRole === 'admin') {
      setIsLoading(false);
      return;
    }
    loadData();
  }, [userRole]);

  // Handle selected course change for trainer
  useEffect(() => {
    if (userRole === 'trainer' && selectedCourseId) {
      loadCourseContext(selectedCourseId);
    }
  }, [selectedCourseId, userRole]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get gamification leaderboard (common to both student and trainer)
      const leaderRes = await getLeaderboard();
      if (leaderRes.success) {
        setLeaderboard(leaderRes.data.leaders?.length ? leaderRes.data.leaders : fallbackLeaders);
        setCurrentUserRank(leaderRes.data.currentUserRank || 7);
      }

      if (userRole === 'participant') {
        // Load student-specific metrics
        const [statsRes, recsRes, streakRes, enrollRes] = await Promise.allSettled([
          getUserStats(),
          getRecommendations(),
          recordDailyLogin().then(() => getStreakStats()),
          getMyEnrollments(),
        ]);

        let nextStats = { ...fallbackStats };
        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
          nextStats = { ...nextStats, ...(statsRes.value.data as UserStats) };
        }
        if (streakRes.status === 'fulfilled' && streakRes.value.success && streakRes.value.data) {
          nextStats = {
            ...nextStats,
            currentStreak: streakRes.value.data.currentStreak,
            longestStreak: streakRes.value.data.longestStreak,
            totalPoints: streakRes.value.data.totalPoints,
          };
        }
        setStats(nextStats);

        if (recsRes.status === 'fulfilled' && recsRes.value.success) {
          setRecommendations(recsRes.value.data);
        }
        if (enrollRes.status === 'fulfilled' && enrollRes.value.success) {
          const enrollments = enrollRes.value.data || [];
          setStudentEnrollments(enrollments);
          const firstCourseId = enrollments.find((item: any) => item?.course?._id)?.course?._id;
          setSelectedStudentCourseId((current) => current || firstCourseId || 'all');

          const byteEntries = await Promise.all(
            enrollments
              .map((item: any) => item?.course?._id)
              .filter(Boolean)
              .map(async (courseId: string) => {
                try {
                  const res = await getCourseMicroLessons(courseId);
                  return [courseId, res.success ? (res.data || []) : []] as const;
                } catch (error) {
                  console.error('Could not load course bytes:', courseId, error);
                  return [courseId, []] as const;
                }
              })
          );
          setStudentCourseBytes(Object.fromEntries(byteEntries));
        }
      } else if (userRole === 'trainer') {
        // Load trainer-specific metrics (courses list)
        const coursesRes = await getCourses();
        if (coursesRes.success && coursesRes.data) {
          setTrainerCourses(coursesRes.data);
          if (coursesRes.data.length > 0) {
            setSelectedCourseId(coursesRes.data[0]._id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading Byte Learning data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourseContext = async (courseId: string) => {
    try {
      // Fetch full details of course (curriculum structure)
      const detailRes = await getCourse(courseId);
      if (detailRes.success && detailRes.data) {
        setSelectedCourseDetail(detailRes.data);
        // Default to first lesson of first section if available
        const firstSection = detailRes.data.sections?.[0];
        const firstLesson = firstSection?.lessons?.[0];
        if (firstSection && firstLesson) {
          setSelectedCurriculumLesson({
            sectionId: firstSection._id,
            lessonId: firstLesson._id,
          });
        } else {
          setSelectedCurriculumLesson(null);
        }
      }

      // Fetch existing micro lessons for this course
      setLessonsLoading(true);
      try {
        const lessonsRes = userRole === 'trainer'
          ? await getTeacherCourseBytes(courseId)
          : await getCourseMicroLessons(courseId);
        if (lessonsRes.success && lessonsRes.data) {
          const bytes = Array.isArray(lessonsRes.data) ? lessonsRes.data : (lessonsRes.data as any).bytes;
          setMicroLessons(bytes || []);
        }
      } finally {
        setLessonsLoading(false);
      }

      // Fetch student enrollments for insights
      setInsightsLoading(true);
      try {
        const enrollmentsRes = await getCourseEnrollments(courseId);
        if (enrollmentsRes.success && enrollmentsRes.data) {
          setCourseEnrollments(enrollmentsRes.data);
        }
      } finally {
        setInsightsLoading(false);
      }
    } catch (err) {
      console.error('Error loading trainer course context:', err);
    }
  };

  // Student action triggers
  const studentCourseSummaries = useMemo(
    () => buildStudentCourseSummaries(studentEnrollments, studentCourseBytes),
    [studentEnrollments, studentCourseBytes]
  );
  const selectedCourseSummary = studentCourseSummaries.find((course) => course.id === selectedStudentCourseId) || null;
  const missionBytes = useMemo(
    () => buildMissionBytes(recommendations, studentEnrollments, studentCourseBytes, selectedStudentCourseId),
    [recommendations, studentEnrollments, studentCourseBytes, selectedStudentCourseId]
  );
  const publishedByteCount = studentCourseSummaries.reduce((sum, course) => sum + course.totalBytes, 0);
  const xpToNext = Number(stats?.xpToNextLevel || 800);
  const currentXp = Number(stats?.totalXP || 0);
  const levelProgress = Math.min(100, Math.round((currentXp / (currentXp + xpToNext)) * 100));
  const learnerLevel = stats?.levelTitle || levelTitles[Math.min(Number(stats?.level || 1) - 1, levelTitles.length - 1)] || 'Explorer';
  const energy = Math.min(100, 35 + Number(stats?.currentStreak || 0) * 8 + Number(stats?.weeklyStats?.lessonsCompleted || 0) * 3);

  const celebrate = (label: string) => {
    setReward(label);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 } });
    window.setTimeout(() => setReward(null), 2600);
  };

  const completeByte = async (byte: any) => {
    if (byte.lesson) {
      setFocusMode(byte.lesson);
      return;
    }

    if (!byte.courseId || !byte.sectionId || !byte.lessonId) {
      celebrate(`${byte.title} started`);
      return;
    }

    try {
      await updateLessonProgress(byte.courseId, {
        sectionId: byte.sectionId,
        lessonId: byte.lessonId,
        completed: true,
        watchedSeconds: Math.max(60, byte.minutes * 60),
        totalDuration: Math.max(60, byte.minutes * 60),
      });
      await recordActivity('lesson_complete', {
        courseId: byte.courseId,
        lessonId: byte.lessonId,
      });
      celebrate(`Byte completed: ${byte.title} +${byte.xp} XP`);
      loadData();
    } catch (error) {
      console.error('Could not complete byte:', error);
      celebrate('Could not save progress. Please try again.');
    }
  };

  const claimDailyChallenge = async (label = 'Daily challenge') => {
    await recordActivity('note_create', { source: 'byte-learning', label });
    celebrate(`${label} reward unlocked`);
    loadData();
  };

  // Trainer action triggers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const res = await uploadTutorAttachment({
        file,
        courseId: selectedCourseId,
      });

      if (res.success && res.data.attachment.extractedText) {
        setExternalPastedText(res.data.attachment.extractedText);
        celebrate(`Extracted text from ${file.name}`);
      } else {
        alert('Failed to extract text from document.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Error processing file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleGenerateBytes = async () => {
    if (!selectedCourseId) {
      alert('Please select a course context first.');
      return;
    }

    let contentString = '';
    let options: any = {};

    if (contentSourceType === 'curriculum') {
      if (!selectedCurriculumLesson) {
        alert('Please select a lesson from the curriculum.');
        return;
      }
      const section = selectedCourseDetail?.sections?.find(s => s._id === selectedCurriculumLesson.sectionId);
      const lesson = section?.lessons?.find(l => l._id === selectedCurriculumLesson.lessonId);
      if (!lesson) {
        alert('Lesson details not found.');
        return;
      }
      const lessonVideoUrl = lesson.videoUrl || lesson.lessonVideo || lesson.videoAsset?.streamUrl || '';

      contentString = `Lesson Title: ${lesson.title}
Video Description: ${lesson.description || ''}
Transcript: ${lesson.transcript || ''}
Summary: ${lesson.summary || ''}
Content: ${lesson.content || ''}`;

      options = {
        section: section?.title || 'General',
        sectionId: selectedCurriculumLesson.sectionId,
        lessonId: selectedCurriculumLesson.lessonId,
        sourceVideoUrl: lessonVideoUrl,
        sourceVideoDuration: lesson.videoDuration || '',
      };
    } else {
      if (!externalPastedText.trim()) {
        alert('Please paste some text content or upload a document.');
        return;
      }
      contentString = externalPastedText;
      options = { section: 'External Bytes' };
    }

    setIsGeneratingBytes(true);
    setGenerationError(null);

    // Run dynamic loader text updates
    const steps = [
      'Reading content source & parsing structure...',
      'Extracting core educational concepts...',
      'Synthesizing simplified notes & analogies...',
      'Formulating interactive flashcards...',
      'Drafting adaptive speed quiz questions...',
      'Finalizing gamified rewards & publishing packages...'
    ];

    let currentStep = 0;
    setGenerationStep(steps[currentStep]);
    const stepInterval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setGenerationStep(steps[currentStep]);
      }
    }, 2800);

    try {
      const res = await analyzeContent({
        courseId: selectedCourseId,
        content: contentString,
        options,
      });

      clearInterval(stepInterval);
      if (res.success) {
        celebrate('Micro-learning bytes generated successfully!');
        setExternalPastedText('');
        // Reload trainer context
        loadCourseContext(selectedCourseId);
        // Switch to Review Tab
        setTrainerActiveTab('review');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      setGenerationError(err.response?.data?.message || 'AI generation failed. Please try again.');
    } finally {
      setIsGeneratingBytes(false);
    }
  };

  const handleTogglePublish = async (lesson: MicroLesson) => {
    try {
      const updated = await updateMicroLesson(lesson._id, {
        isPublished: !lesson.isPublished,
      });
      if (updated.success) {
        celebrate(updated.data.isPublished ? 'Byte published to students!' : 'Byte reverted to draft.');
        loadCourseContext(selectedCourseId);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to update publishing state.');
    }
  };

  const handleDeleteByte = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this learning byte? This cannot be undone.')) return;
    try {
      const res = await deleteMicroLesson(lessonId);
      if (res.success) {
        celebrate('Learning byte deleted successfully.');
        loadCourseContext(selectedCourseId);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete byte.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLesson) return;
    try {
      const res = await updateMicroLesson(editingLesson._id, editingLesson);
      if (res.success) {
        celebrate('Learning byte saved.');
        setEditingLesson(null);
        loadCourseContext(selectedCourseId);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to save changes.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] grid place-items-center rounded-[2rem] border border-slate-200 bg-white text-slate-900 shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-5 h-12 w-12 text-indigo-600 animate-spin" />
          <p className="font-semibold tracking-wide text-slate-700">Loading Byte Learning missions...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN ACCESS DENIED SCREEN
  // ----------------------------------------------------
  if (userRole === 'admin') {
    return (
      <div className="relative min-h-[80vh] flex items-center justify-center p-6 bg-gradient-to-br from-[#FAFBFC] via-[#EEF2FF] to-[#F0F4FF] rounded-[2rem] border border-slate-200 overflow-hidden">
        {/* Decorative blur blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/20 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-45 -right-45 w-96 h-96 rounded-full bg-gradient-to-tl from-pink-200/20 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-md w-full bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-[32px] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
          <div className="mx-auto w-20 h-20 rounded-[24px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mb-6">
            🔒
          </div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Access Restricted</h2>
          <p className="mt-4 text-slate-600 leading-relaxed text-sm">
            Byte Learning is a premium micro-learning experience for Students and Trainers. Administrators do not participate directly.
          </p>
          <p className="mt-2 text-slate-500 text-xs">
            Please log in as a Student/Participant or Trainer to view.
          </p>
          <button 
            onClick={() => onNavigate?.('dashboard')}
            className="mt-8 w-full py-3.5 px-6 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden rounded-[2rem] border border-slate-200/60 bg-[#FAFBFC] text-slate-900 shadow-sm">
      {/* PREMIUM BACKGROUND DESIGN */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#EEF2FF] to-[#F0F4FF]" />
      
      {/* Large blur blobs */}
      <div className="absolute -top-96 -left-96 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-96 -right-96 w-96 h-96 rounded-full bg-gradient-to-tl from-teal-200/12 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 rounded-full bg-gradient-to-r from-purple-200/8 via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* Floating abstract waves */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 200 Q 300 50, 600 200 T 1200 200" stroke="#4F46E5" strokeWidth="2" fill="none" />
        <path d="M0 250 Q 300 100, 600 250 T 1200 250" stroke="#14B8A6" strokeWidth="1.5" fill="none" />
        <path d="M0 150 Q 300 80, 600 150 T 1200 150" stroke="#7C3AED" strokeWidth="1" fill="none" />
      </svg>

      <div className="relative z-10 p-5 lg:p-8">
        
        {/* ====================================================
            TRAINER / TEACHER PORTAL
            ==================================================== */}
        {userRole === 'trainer' ? (
          <div>
            {/* Header Area */}
            <header className="mb-8 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-purple-700">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                    Trainer Studio
                  </div>
                  <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                    Byte Learning <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">Builder</span>
                  </h1>
                  <p className="mt-2 text-slate-600 text-sm max-w-xl">
                    Create micro-lessons, configure instant feedback quizzes, flashcards, and track your students' gamified accomplishments.
                  </p>
                </div>

                {/* Course Selector Dropdown */}
                <div className="min-w-[280px]">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Active Course context</label>
                  <div className="relative">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-sm shadow-sm focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      {trainerCourses.length === 0 ? (
                        <option value="">No courses available</option>
                      ) : (
                        trainerCourses.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.title}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Course Quick Stats */}
              {selectedCourseDetail && (
                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Total Enrolled</p>
                    <p className="text-2xl font-black text-slate-950 mt-1">{courseEnrollments.length} Students</p>
                  </div>
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Bytes Generated</p>
                    <p className="text-2xl font-black text-slate-950 mt-1">{microLessons.length}</p>
                  </div>
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Published Bytes</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{microLessons.filter(m => m.isPublished).length}</p>
                  </div>
                  <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase">Drafts</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">{microLessons.filter(m => !m.isPublished).length}</p>
                  </div>
                </div>
              )}
            </header>

            {/* Trainer Navigation Tabs */}
            <nav className="mb-8 flex gap-2 overflow-x-auto rounded-[20px] border border-slate-200/60 bg-white/80 p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.03)] backdrop-blur-xl">
              {[
                ['builder', Brain, 'AI Byte Builder'],
                ['review', Edit, 'Byte Review & Publish'],
                ['insights', Users, 'Student Insights'],
                ['leaderboard', Trophy, 'Gamification Leaderboard'],
              ].map(([id, Icon, label]) => (
                <button
                  key={String(id)}
                  onClick={() => setTrainerActiveTab(id as TrainerTabType)}
                  className={`group flex shrink-0 items-center gap-2 rounded-[14px] px-4 py-2.5 font-bold text-sm transition duration-300 ${
                    trainerActiveTab === id
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{String(label)}</span>
                </button>
              ))}
            </nav>

            {/* Trainer Sub views */}
            <AnimatePresence mode="wait">
              {/* TAB 1: AI BYTE BUILDER */}
              {trainerActiveTab === 'builder' && (
                <motion.section 
                  key="builder" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="grid gap-6 xl:grid-cols-3"
                >
                  {/* Generation Setup Form */}
                  <div className="xl:col-span-2 rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8 flex flex-col gap-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-950">AI Content Generator</h2>
                      <p className="text-slate-500 text-sm mt-1">Select your curriculum lesson or paste external content to generate customized gamified bytes.</p>
                    </div>

                    {/* Source Selector */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Content source</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setContentSourceType('curriculum')}
                          className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl border font-bold text-sm transition-all ${
                            contentSourceType === 'curriculum'
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          Curriculum Lesson
                        </button>
                        <button
                          onClick={() => setContentSourceType('external')}
                          className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl border font-bold text-sm transition-all ${
                            contentSourceType === 'external'
                              ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          External Text / PDF
                        </button>
                      </div>
                    </div>

                    {/* Curriculum selection fields */}
                    {contentSourceType === 'curriculum' && (
                      <div className="space-y-4">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Select lesson to convert</label>
                        {!selectedCourseDetail || !selectedCourseDetail.sections || selectedCourseDetail.sections.length === 0 ? (
                          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm bg-slate-50">
                            No sections or lessons available in this course curriculum. Go to Course Studio to build modules first.
                          </div>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl p-2 space-y-1 bg-slate-50/30">
                            {selectedCourseDetail.sections.map((section) => (
                              <div key={section._id} className="p-2">
                                <h4 className="text-xs font-black text-slate-500 uppercase px-2 mb-1">{section.title}</h4>
                                <div className="space-y-1">
                                  {section.lessons?.map((lesson) => {
                                    const isSelected = selectedCurriculumLesson?.lessonId === lesson._id;
                                    return (
                                      <button
                                        key={lesson._id}
                                        onClick={() => setSelectedCurriculumLesson({ sectionId: section._id, lessonId: lesson._id })}
                                        className={`w-full text-left p-3 rounded-xl font-medium text-sm flex items-center justify-between transition ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'hover:bg-slate-100 bg-white border border-slate-100 text-slate-700'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs opacity-70">
                                            {lesson.type === 'video' ? '🎥' : '📄'}
                                          </span>
                                          <span className="font-bold truncate">{lesson.title}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* External content fields */}
                    {contentSourceType === 'external' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Paste material content</label>
                          <span className="text-xs text-slate-400">{externalPastedText.length} characters</span>
                        </div>

                        {/* PDF / File Uploader */}
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 text-center transition cursor-pointer">
                          <input
                            type="file"
                            accept=".txt,.md,.pdf,.docx"
                            onChange={handleFileUpload}
                            disabled={isUploadingFile}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          {isUploadingFile ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                              <p className="text-sm font-bold text-slate-700">Uploading and extracting text...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Upload className="w-8 h-8 text-slate-400" />
                              <p className="text-sm font-bold text-slate-700">Upload PDF, DOCX, TXT or MD file</p>
                              <p className="text-xs text-slate-400">We will automatically extract the text contents for generation</p>
                            </div>
                          )}
                        </div>

                        {/* Text Editor area */}
                        <textarea
                          rows={6}
                          placeholder="Paste study material, definitions, reference text, transcripts or summaries here..."
                          value={externalPastedText}
                          onChange={(e) => setExternalPastedText(e.target.value)}
                          className="w-full p-4 rounded-2xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900 shadow-inner"
                        />
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      onClick={handleGenerateBytes}
                      disabled={isGeneratingBytes}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 font-bold text-base shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isGeneratingBytes ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Generating AI Lessons...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Generate Learning Bytes</span>
                        </>
                      )}
                    </button>

                    {generationError && (
                      <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3 text-red-800 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-bold">Generation Failed</p>
                          <p className="mt-1 text-xs opacity-90">{generationError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Generation Guide */}
                  <aside className="rounded-[24px] border border-indigo-200/50 bg-gradient-to-br from-white to-indigo-50/20 p-6 shadow-sm flex flex-col gap-6">
                    <h3 className="font-black text-indigo-950 flex items-center gap-2">
                      <span className="text-2xl">⚡</span>
                      Generation Blueprint
                    </h3>

                    <div className="space-y-4">
                      {[
                        { num: '1', title: 'Content Analysis', desc: 'The AI parses curriculum lessons, transcripts, or uploaded materials to identify core educational topics.' },
                        { num: '2', title: 'Gamified Conversion', desc: 'Content is broken into bites, creating key takeaways, interactive notes, and clear real-world examples.' },
                        { num: '3', title: 'Active Retrieval', desc: 'AI creates 5-8 flashcard pairs and adaptive multiple choice quizzes with detailed explanations.' },
                        { num: '4', title: 'Review & Live Publish', desc: 'You review drafts, tweak question choices, preview the layout, and release it live to students.' },
                      ].map((step) => (
                        <div key={step.num} className="flex gap-4">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-black flex items-center justify-center flex-shrink-0">
                            {step.num}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </motion.section>
              )}

              {/* TAB 2: REVIEW & PUBLISH */}
              {trainerActiveTab === 'review' && (
                <motion.section 
                  key="review" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  <div className="rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-slate-950">Draft & Published Bytes</h2>
                        <p className="text-slate-500 text-sm mt-1">Review AI generated content, toggle student visibility, and run preview test drives.</p>
                      </div>
                      <button 
                        onClick={() => loadCourseContext(selectedCourseId)}
                        className="self-start inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-white text-slate-700 font-bold text-xs shadow-sm transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reload List
                      </button>
                    </div>

                    {lessonsLoading ? (
                      <div className="py-20 text-center text-slate-500 font-bold">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                        Loading course micro lessons...
                      </div>
                    ) : microLessons.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                        <div className="text-4xl mb-4">📚</div>
                        <h3 className="text-lg font-bold text-slate-950">No Bytes Generated Yet</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                          This course does not have any micro-learning bytes. Switch to the AI Byte Builder tab to create some.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {microLessons.map((lesson, index) => {
                          const pub = lesson.isPublished;
                          return (
                            <div
                              key={lesson._id}
                              className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                                pub ? 'border-emerald-200' : 'border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">
                                    Byte {index + 1}
                                  </span>
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                    pub ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}>
                                    {pub ? 'Published' : 'Draft'}
                                  </span>
                                </div>
                                <h3 className="font-bold text-slate-950 text-lg line-clamp-1">{lesson.title}</h3>
                                <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">{stripMediaUrls(lesson.description)}</p>
                                
                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1 font-semibold">
                                    <Clock className="w-3 h-3" /> {lesson.duration} min
                                  </span>
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1 font-semibold">
                                    <Award className="w-3 h-3" /> {lesson.difficulty}
                                  </span>
                                  <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1 font-semibold">
                                    <Zap className="w-3 h-3 text-amber-500" /> +{lesson.xpReward} XP
                                  </span>
                                </div>
                              </div>

                              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setEditingLesson(lesson)}
                                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition"
                                    title="Edit Byte"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteByte(lesson._id)}
                                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition"
                                    title="Delete Byte"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setFocusMode(lesson)}
                                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition flex items-center gap-1 font-bold text-xs"
                                    title="Preview Student View"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>Preview</span>
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleTogglePublish(lesson)}
                                  className={`px-3 py-2 rounded-xl font-bold text-xs shadow-sm transition ${
                                    pub 
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200' 
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  {pub ? 'Unpublish' : 'Publish'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.section>
              )}

              {/* TAB 3: STUDENT INSIGHTS */}
              {trainerActiveTab === 'insights' && (
                <motion.section 
                  key="insights" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                  className="grid gap-6"
                >
                  <div className="rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-950">Student Engagement Insights</h2>
                      <p className="text-slate-500 text-sm mt-1">Monitor study completion rates, streaks, and gamification benchmarks for your enrolled students.</p>
                    </div>

                    {insightsLoading ? (
                      <div className="py-20 text-center text-slate-500 font-bold">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                        Loading enrollment analytics...
                      </div>
                    ) : courseEnrollments.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center mt-6">
                        <div className="text-4xl mb-4">👥</div>
                        <h3 className="text-lg font-bold text-slate-950">No Enrolled Students</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                          No students have enrolled in this course yet.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-8 overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-black uppercase text-slate-400">
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Streak</th>
                              <th className="py-3 px-4">Progress</th>
                              <th className="py-3 px-4">Enrolled date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {courseEnrollments.map((enr) => {
                              const student = enr.user || {};
                              const name = student.fullName || `${student.firstName || 'Student'} ${student.lastName || ''}`;
                              return (
                                <tr key={enr._id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-4 px-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                                      {name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-950">{name}</p>
                                      <p className="text-slate-400 text-xs">{student.email}</p>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                      enr.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : enr.status === 'in-progress'
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                          : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {enr.status}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 font-bold text-orange-600 flex items-center gap-1">
                                    <Flame className="w-4 h-4 fill-current" />
                                    {enr.currentStreak || 0} days
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="w-full max-w-[140px] space-y-1.5">
                                      <div className="flex justify-between text-xs font-bold text-slate-500">
                                        <span>{enr.progressPercent || 0}%</span>
                                      </div>
                                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                          className="h-full bg-indigo-600 rounded-full"
                                          style={{ width: `${enr.progressPercent || 0}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-xs text-slate-400">
                                    {new Date(enr.enrolledAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.section>
              )}

              {/* TAB 4: LEADERBOARD */}
              {trainerActiveTab === 'leaderboard' && (
                <motion.section 
                  key="leaderboard" 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -15 }}
                >
                  <LeaderboardPanel leaders={leaderboard} currentUserRank={currentUserRank} />
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        ) : (
          
          // ====================================================
          // STUDENT / PARTICIPANT PORTAL
          // ====================================================
          <div>
            <header className="mb-8 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-lg lg:p-8">
              {/* Glossy header top bar */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
              
              <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
                {/* Left: Badge + Headings */}
                <div className="max-w-4xl">
                  <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-transparent px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                    AI Powered Gamified LMS
                  </div>
                  
                  <h1 className="mt-4 text-5xl md:text-6xl font-black tracking-tight text-slate-950">
                    Byte <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500">Learning</span>
                    <br />
                    Experience
                  </h1>
                  
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                    Your enrolled courses become trainer-published <span className="font-semibold text-slate-900">Learning Bytes</span>, quick retrieval practice, AI answers, streaks, rewards, and a course-wise progress map.
                  </p>
                </div>

                {/* Right: 4 Metric Cards in 2x2 grid */}
                <div className="grid min-w-[360px] grid-cols-2 gap-3">
                  <MetricCard icon={Zap} label="XP" value={currentXp.toLocaleString()} tone="cyan" highlight />
                  <MetricCard icon={Flame} label="Streak" value={`${stats?.currentStreak || 0} days`} tone="orange" highlight />
                  <MetricCard icon={BookOpen} label="Bytes" value={String(publishedByteCount)} tone="amber" />
                  <MetricCard icon={Trophy} label="Rank" value={`#${currentUserRank || 7}`} tone="pink" />
                </div>
              </div>

              {/* Progress bars section below */}
              <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                {/* Current Level Progress */}
                <div className="group rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-50/50 p-5 hover:border-indigo-200/40 transition">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Level</p>
                      <h2 className="text-3xl font-black text-slate-950 mt-1">{learnerLevel}</h2>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700">
                      <Target className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                      <p className="px-3 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-full">{xpToNext} XP to next</p>
                      <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200/60 shadow-inner">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-400 shadow-lg shadow-indigo-500/30"
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Knowledge Energy */}
                <div className="group rounded-[20px] border border-slate-200/60 bg-gradient-to-br from-sky-50 to-slate-50/50 p-5 hover:border-sky-200/40 transition">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Knowledge</p>
                      <h2 className="text-3xl font-black text-slate-950 mt-1">{energy}%</h2>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-50 text-sky-700">
                      <Brain className="h-7 w-7" />
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200/60 shadow-inner">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${energy}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">Keep learning to trigger the 2x XP multiplier.</p>
                </div>
              </div>
            </header>

            <StudentCourseSwitcher
              courses={studentCourseSummaries}
              selectedCourseId={selectedStudentCourseId}
              onSelect={setSelectedStudentCourseId}
              onBrowseCourses={() => onNavigate?.('courses')}
            />

            {/* Student Navigation */}
            <nav className="mb-8 flex gap-2 overflow-x-auto rounded-[20px] border border-slate-200/60 bg-white/80 p-1.5 shadow-[0_8px_16px_rgba(0,0,0,0.03)] backdrop-blur-xl">
              {[
                ['mission', Gamepad2, 'Mission Control'],
                ['journey', Rocket, 'Journey Map'],
                ['arena', Swords, 'Challenge Arena'],
                ['rewards', Gift, 'Rewards'],
                ['leaderboard', Users, 'Leaderboard'],
              ].map(([id, Icon, label]) => (
                <button
                  key={String(id)}
                  onClick={() => setStudentActiveTab(id as StudentTabType)}
                  className={`group flex shrink-0 items-center gap-2 rounded-[14px] px-4 py-2.5 font-bold text-sm transition duration-300 ${
                    studentActiveTab === id
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{String(label)}</span>
                </button>
              ))}
            </nav>

            {/* Student Navigation Views */}
            <AnimatePresence mode="wait">
              {studentActiveTab === 'mission' && (
                <motion.section key="mission" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
                  <div className="space-y-6">
                    <MissionPanel bytes={missionBytes} selectedCourse={selectedCourseSummary} onStart={completeByte} onBrowseCourses={() => onNavigate?.('courses')} />
                    <DailyChallengePanel onClaim={claimDailyChallenge} completedBytes={selectedCourseSummary?.completedBytes || 0} totalBytes={selectedCourseSummary?.totalBytes || missionBytes.length} />
                  </div>
                  <aside className="space-y-6">
                    <FocusBattleCard onStart={async () => {
                      await recordActivity('video_watch', { minutes: 15, source: 'focus-battle' });
                      celebrate('Focus Battle complete: 15 minutes logged');
                      loadData();
                    }} />
                  </aside>
                </motion.section>
              )}

              {studentActiveTab === 'journey' && (
                <motion.section key="journey" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <JourneyMap bytes={missionBytes} courses={studentCourseSummaries} selectedCourse={selectedCourseSummary} onStart={completeByte} />
                </motion.section>
              )}

              {studentActiveTab === 'arena' && (
                <motion.section key="arena" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="grid gap-5 lg:grid-cols-3">
                  <ArenaCard icon={Timer} title="Speed Quiz" subtitle="Combo points, speed bonus, instant explanations." onClick={() => celebrate('Speed Quiz queued')} />
                  <ArenaCard icon={Swords} title="Boss Battle" subtitle="Module-end challenge with survival mode." locked onClick={() => {}} />
                  <ArenaCard icon={Bot} title="AI Code Arena" subtitle="Coding battle with AI reviewer and rank boost." onClick={() => celebrate('AI Code Arena opened')} />
                </motion.section>
              )}

              {studentActiveTab === 'rewards' && (
                <motion.section key="rewards" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <RewardsGrid onClaim={celebrate} />
                </motion.section>
              )}

              {studentActiveTab === 'leaderboard' && (
                <motion.section key="leaderboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                  <LeaderboardPanel leaders={leaderboard} currentUserRank={currentUserRank} />
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <RewardPopup label={reward} />

      {/* Overlays / Popups */}
      <AnimatePresence>
        {/* Focus Mode overlay */}
        {focusMode && (
          <FocusMode 
            lesson={focusMode} 
            onClose={() => setFocusMode(null)} 
            darkMode={false} 
            userRole={userRole} 
          />
        )}

        {/* Dynamic AI Content Processing Loader */}
        {isGeneratingBytes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
          >
            <div className="max-w-md w-full p-8 text-center bg-white/10 border border-white/20 rounded-[32px] shadow-2xl flex flex-col items-center">
              <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                {/* Pulsating circles */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-indigo-500/40 animate-pulse" />
                <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl shadow-lg">
                  🧠
                </div>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">AI Byte Builder</h3>
              <p className="mt-2 text-indigo-200 text-xs font-bold uppercase tracking-widest">{generationStep}</p>
              
              {/* Fake progress loader list */}
              <div className="w-full mt-8 space-y-2.5 text-left border-t border-white/10 pt-6">
                {[
                  'Extracting core takeaways & examples',
                  'Drafting 5-8 flashcard study aids',
                  'Synthesizing multiple choice quiz questions',
                  'Structuring difficulty & experience index'
                ].map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs text-white/60">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Byte Editor Modal Popup */}
        {editingLesson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 lg:p-8 shadow-2xl flex flex-col justify-between"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Edit Learning Byte</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Customize AI generated study content, flashcards, and quizzes</p>
                </div>
                <button
                  onClick={() => setEditingLesson(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Content */}
              <div className="space-y-6 flex-1 pr-1">
                {/* Meta details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Byte Title</label>
                    <input
                      type="text"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Short Description</label>
                    <input
                      type="text"
                      value={editingLesson.description}
                      onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Duration (mins)</label>
                    <input
                      type="number"
                      value={editingLesson.duration}
                      onChange={(e) => setEditingLesson({ ...editingLesson, duration: parseInt(e.target.value) || 5 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                    <select
                      value={editingLesson.difficulty}
                      onChange={(e) => setEditingLesson({ ...editingLesson, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">XP Reward</label>
                    <input
                      type="number"
                      value={editingLesson.xpReward}
                      onChange={(e) => setEditingLesson({ ...editingLesson, xpReward: parseInt(e.target.value) || 100 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                    />
                  </div>
                </div>

                {/* Lesson Main Content */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Main Content</label>
                  <textarea
                    rows={4}
                    value={editingLesson.content}
                    onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                    className="w-full p-4 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:outline-none bg-white text-slate-900"
                  />
                </div>

                {/* AI generated Notes section */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <h4 className="font-black text-slate-950 text-sm">AI Study Assistant Notes</h4>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Easy Explanation</label>
                    <textarea
                      rows={3}
                      value={editingLesson.aiContent?.simpleExplanation || ''}
                      onChange={(e) => setEditingLesson({
                        ...editingLesson,
                        aiContent: { ...editingLesson.aiContent, simpleExplanation: e.target.value }
                      })}
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Key takeaways */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Key Takeaways</label>
                      <div className="space-y-2">
                        {editingLesson.aiContent?.keyTakeaways?.map((takeaway, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={takeaway}
                              onChange={(e) => {
                                const list = [...(editingLesson.aiContent.keyTakeaways || [])];
                                list[idx] = e.target.value;
                                setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, keyTakeaways: list } });
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                            />
                            <button
                              onClick={() => {
                                const list = editingLesson.aiContent.keyTakeaways.filter((_, i) => i !== idx);
                                setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, keyTakeaways: list } });
                              }}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const list = [...(editingLesson.aiContent?.keyTakeaways || []), ''];
                            setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, keyTakeaways: list } });
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add takeaway
                        </button>
                      </div>
                    </div>

                    {/* Examples */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Examples</label>
                      <div className="space-y-2">
                        {editingLesson.aiContent?.examples?.map((ex, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={ex}
                              onChange={(e) => {
                                const list = [...(editingLesson.aiContent.examples || [])];
                                list[idx] = e.target.value;
                                setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, examples: list } });
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                            />
                            <button
                              onClick={() => {
                                const list = editingLesson.aiContent.examples.filter((_, i) => i !== idx);
                                setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, examples: list } });
                              }}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const list = [...(editingLesson.aiContent?.examples || []), ''];
                            setEditingLesson({ ...editingLesson, aiContent: { ...editingLesson.aiContent, examples: list } });
                          }}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                        >
                          <Plus className="w-3 h-3" /> Add example
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flashcards Editor */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-950 text-sm">Interactive Flashcards</h4>
                    <span className="text-xs text-slate-400">({editingLesson.flashcards?.length || 0} cards)</span>
                  </div>
                  <div className="space-y-3">
                    {editingLesson.flashcards?.map((card, idx) => (
                      <div key={idx} className="grid gap-2 md:grid-cols-2 items-center bg-white p-3 rounded-xl border border-slate-100 relative pr-10">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Front (Term)</label>
                          <input
                            type="text"
                            value={card.front}
                            onChange={(e) => {
                              const list = [...editingLesson.flashcards];
                              list[idx] = { ...card, front: e.target.value };
                              setEditingLesson({ ...editingLesson, flashcards: list });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Back (Definition)</label>
                          <input
                            type="text"
                            value={card.back}
                            onChange={(e) => {
                              const list = [...editingLesson.flashcards];
                              list[idx] = { ...card, back: e.target.value };
                              setEditingLesson({ ...editingLesson, flashcards: list });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-900"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const list = editingLesson.flashcards.filter((_, i) => i !== idx);
                            setEditingLesson({ ...editingLesson, flashcards: list });
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const list = [...(editingLesson.flashcards || []), { front: '', back: '', topic: 'general' }];
                        setEditingLesson({ ...editingLesson, flashcards: list });
                      }}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add flashcard
                    </button>
                  </div>
                </div>

                {/* Quiz Editor */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-950 text-sm">Interactive Quiz Questions</h4>
                    <span className="text-xs text-slate-400">({editingLesson.quiz?.questions?.length || 0} questions)</span>
                  </div>
                  <div className="space-y-4">
                    {editingLesson.quiz?.questions?.map((q, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 relative space-y-3 pr-10">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Question {idx + 1}</label>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const list = [...editingLesson.quiz.questions];
                              list[idx] = { ...q, question: e.target.value };
                              setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900"
                          />
                        </div>

                        {/* Options editor */}
                        <div className="grid gap-2 md:grid-cols-2">
                          {q.options?.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">Opt {oIdx + 1}</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...q.options];
                                  opts[oIdx] = e.target.value;
                                  const list = [...editingLesson.quiz.questions];
                                  list[idx] = { ...q, options: opts };
                                  setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                                }}
                                className="flex-1 px-2.5 py-1 border border-slate-200 rounded text-xs bg-white text-slate-900"
                              />
                            </div>
                          ))}
                        </div>

                        {/* Correct answer choice & Explanation */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Correct Option index</label>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => {
                                const list = [...editingLesson.quiz.questions];
                                list[idx] = { ...q, correctAnswer: parseInt(e.target.value) || 0 };
                                setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white text-slate-900"
                            >
                              {q.options?.map((_, oIdx) => (
                                <option key={oIdx} value={oIdx}>Option {oIdx + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Explanation</label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => {
                                const list = [...editingLesson.quiz.questions];
                                list[idx] = { ...q, explanation: e.target.value };
                                setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                              }}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white text-slate-900"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const list = editingLesson.quiz.questions.filter((_, i) => i !== idx);
                            setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                          }}
                          className="absolute right-2 top-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const list = [...(editingLesson.quiz?.questions || []), { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }];
                        setEditingLesson({ ...editingLesson, quiz: { ...editingLesson.quiz, questions: list } });
                      }}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Add question
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditingLesson(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB COMPONENTS
// ----------------------------------------------------------------------

type StudentCourseSummary = {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  totalBytes: number;
  completedBytes: number;
  activeBytes: number;
};

function buildStudentCourseSummaries(enrollments: any[] = [], courseBytes: Record<string, MicroLesson[]> = {}): StudentCourseSummary[] {
  return enrollments
    .map((enrollment) => {
      const course = enrollment.course || {};
      const id = course._id;
      if (!id) return null;
      const bytes = courseBytes[id] || [];
      const completedBytes = bytes.filter((byte) => byte.userProgress?.isCompleted).length;
      const progressFromBytes = bytes.length ? Math.round((completedBytes / bytes.length) * 100) : 0;

      return {
        id,
        title: course.title || 'Untitled course',
        subtitle: course.subtitle || course.category || enrollment.status || 'Enrolled course',
        progress: Math.max(0, Math.min(100, progressFromBytes)),
        totalBytes: bytes.length,
        completedBytes,
        activeBytes: Math.max(0, bytes.length - completedBytes),
      };
    })
    .filter(Boolean) as StudentCourseSummary[];
}

const stripMediaUrls = (value = '') => String(value || '')
  .replace(/https?:\/\/\S+/gi, '')
  .replace(/\bVideo URL:\s*/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

function lessonToMissionByte(lesson: MicroLesson, index: number, courseTitle?: string): any {
  const completed = Boolean(lesson.userProgress?.isCompleted);
  const started = Number(lesson.userProgress?.completionPercentage || lesson.userProgress?.watchedTime || 0) > 0;
  const description = stripMediaUrls(lesson.description || lesson.aiContent?.summary || 'Trainer-published learning byte.');
  return {
    id: lesson._id,
    title: stripMediaUrls(lesson.title),
    subtitle: `${courseTitle ? `${courseTitle} - ` : ''}${description}`,
    minutes: lesson.duration || 5,
    xp: lesson.xpReward || 80 + index * 10,
    coins: 20 + Math.round((lesson.xpReward || 80) / 8),
    status: completed ? 'completed' : index === 0 || started ? 'active' : 'locked',
    type: (lesson.quiz?.questions?.length ? 'quiz' : lesson.flashcards?.length ? 'flashcard' : 'scenario') as any,
    lesson,
    courseId: String(lesson.course || lesson.courseId || ''),
    courseTitle,
    sectionTitle: lesson.section,
    progress: lesson.userProgress?.completionPercentage || 0,
  };
}

function buildMissionBytes(
  _recommendations: Recommendation | null,
  enrollments: any[] = [],
  courseBytes: Record<string, MicroLesson[]> = {},
  selectedCourseId = 'all'
): any[] {
  const generatedFromCourses = enrollments.flatMap((enrollment) => {
    const course = enrollment.course || {};
    if (!course._id || (selectedCourseId !== 'all' && selectedCourseId !== course._id)) return [];
    return (courseBytes[course._id] || []).map((lesson, index) => lessonToMissionByte(lesson, index, course.title));
  });

  if (generatedFromCourses.length) {
    let activeAssigned = false;
    return generatedFromCourses.slice(0, 18).map((byte) => {
      if (byte.status === 'completed') return byte;
      if (!activeAssigned) {
        activeAssigned = true;
        return { ...byte, status: 'active' };
      }
      return { ...byte, status: byte.status === 'active' ? 'locked' : byte.status };
    });
  }

  return [];
}

function StudentCourseSwitcher({
  courses,
  selectedCourseId,
  onSelect,
  onBrowseCourses,
}: {
  courses: StudentCourseSummary[];
  selectedCourseId: string;
  onSelect: (courseId: string) => void;
  onBrowseCourses: () => void;
}) {
  if (!courses.length) {
    return (
      <div className="mb-8 rounded-[22px] border border-dashed border-indigo-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-950">No active course selected</h2>
              <p className="mt-1 text-sm text-slate-600">Enroll in a course to unlock course-wise Byte Learning missions.</p>
            </div>
          </div>
          <button onClick={onBrowseCourses} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700">
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-8 rounded-[22px] border border-slate-200/70 bg-white/90 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect('all')}
          className={`flex min-w-[180px] shrink-0 items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
            selectedCourseId === 'all'
              ? 'border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm'
              : 'border-transparent text-slate-600 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <div>
            <p className="text-sm font-black">All Courses</p>
            <p className="text-xs text-slate-500">{courses.reduce((sum, course) => sum + course.totalBytes, 0)} published bytes</p>
          </div>
        </button>

        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => onSelect(course.id)}
            className={`min-w-[260px] shrink-0 rounded-[18px] border px-4 py-3 text-left transition ${
              selectedCourseId === course.id
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm'
                : 'border-transparent text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{course.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{course.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                {course.totalBytes} bytes
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500" style={{ width: `${course.progress}%` }} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, tone, highlight }: { icon: any; label: string; value: string; tone: string; highlight?: boolean }) {
  const tones: Record<string, { bg: string; border: string; icon: string }> = {
    cyan: { bg: 'bg-gradient-to-br from-sky-50 to-cyan-50', border: 'border-cyan-200/50', icon: 'text-cyan-600' },
    orange: { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-200/50', icon: 'text-orange-600' },
    amber: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-50', border: 'border-amber-200/50', icon: 'text-amber-600' },
    pink: { bg: 'bg-gradient-to-br from-rose-50 to-pink-50', border: 'border-pink-200/50', icon: 'text-pink-600' },
  };
  const tone_style = tones[tone] || tones.cyan;
  
  return (
    <div className={`group rounded-[18px] border ${tone_style.border} ${tone_style.bg} p-4 transition hover:shadow-lg hover:border-opacity-100 ${highlight ? 'shadow-md border-opacity-100' : 'shadow-sm border-opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone_style.bg} ${tone_style.icon} group-hover:scale-110 transition`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MissionPanel({
  bytes,
  selectedCourse,
  onStart,
  onBrowseCourses,
}: {
  bytes: any[];
  selectedCourse: StudentCourseSummary | null;
  onStart: (byte: any) => void;
  onBrowseCourses?: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-950">{selectedCourse?.title || "Today's Mission Path"}</h2>
          <p className="mt-2 text-base text-slate-600">Learning Bytes are focused 3-10 minute chunks with quiz and flashcard retrieval.</p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-[16px] border border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 font-bold text-emerald-700">
          <Zap className="h-4 w-4" />
          2x XP ready
        </div>
      </div>
      
      {!bytes.length && (
        <div className="rounded-[24px] border-2 border-dashed border-indigo-200/60 bg-gradient-to-br from-indigo-50/40 to-purple-50/20 p-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="font-black text-2xl text-slate-950">No Learning Bytes yet</h3>
          <p className="mx-auto mt-3 max-w-md text-slate-600 leading-relaxed">
            No trainer-published Learning Bytes are available for this course yet. Ask your trainer to publish bytes from the Byte Review & Publish tab.
          </p>
          {onBrowseCourses && (
            <button onClick={onBrowseCourses} className="mt-6 rounded-[16px] bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl transition">
              Browse Courses
            </button>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {bytes.map((byte, index) => (
          <motion.button
            key={byte.id}
            whileHover={{ y: byte.status !== 'locked' ? -2 : 0 }}
            onClick={() => byte.status !== 'locked' && onStart(byte)}
            className={`group w-full rounded-[20px] border p-4 text-left transition duration-300 ${
              byte.status === 'locked'
                ? 'border-slate-200/40 bg-slate-50/60 opacity-65 cursor-not-allowed'
                : byte.status === 'completed'
                  ? 'border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-white hover:shadow-md'
                  : 'border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-white hover:shadow-lg hover:border-indigo-300/60'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] font-bold text-lg ${
                byte.status === 'locked' ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30'
              }`}>
                {byte.status === 'locked' ? <Lock className="h-5 w-5" /> : byte.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-950 truncate">{byte.title}</h3>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {challengeTypes[byte.type as keyof typeof challengeTypes] || 'Challenge'}
                  </span>
                </div>
                <p className="line-clamp-1 text-sm text-slate-600">{byte.subtitle}</p>
                {byte.progress > 0 && byte.status !== 'completed' && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, Math.round(byte.progress))}%` }} />
                  </div>
                )}
                
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                    <Clock className="h-3.5 w-3.5" /> {byte.minutes} min
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-amber-800 shadow-sm">
                    <Zap className="h-3.5 w-3.5" /> +{byte.xp} XP
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1.5 text-yellow-800 shadow-sm">
                    <Coins className="h-3.5 w-3.5" /> +{byte.coins}
                  </span>
                </div>
              </div>
              
              <ChevronRight className={`h-5 w-5 transition ${byte.status === 'locked' ? 'text-slate-300' : 'text-indigo-600 group-hover:translate-x-1'}`} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function DailyChallengePanel({
  onClaim,
  completedBytes,
  totalBytes,
}: {
  onClaim: (label: string) => void;
  completedBytes: number;
  totalBytes: number;
}) {
  const byteProgress = totalBytes ? Math.min(100, Math.round((completedBytes / Math.max(1, totalBytes)) * 100)) : 0;
  const challenges = [
    { label: 'Finish course bytes', progress: byteProgress, reward: '50 XP, 20 Coins', icon: BookOpen },
    { label: 'Score 90% in one quiz', progress: Math.min(100, completedBytes * 25), reward: '75 XP, 30 Coins', icon: Target },
    { label: 'Ask AI for one answer', progress: 0, reward: '40 XP, 15 Coins', icon: Bot },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {challenges.map((challenge, idx) => (
        <motion.button 
          key={challenge.label}
          whileHover={{ y: -4 }}
          onClick={() => onClaim(challenge.label)} 
          className="rounded-[20px] border border-slate-200/60 bg-white p-5 text-left shadow-sm hover:shadow-md transition group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <challenge.icon className="h-5 w-5" />
            </div>
            <Target className="h-4 w-4 text-indigo-600 opacity-60 group-hover:opacity-100 transition" />
          </div>
          <p className="font-bold text-slate-900 text-sm mb-3">{challenge.label}</p>
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500" 
                initial={{ width: 0 }}
                animate={{ width: `${challenge.progress}%` }}
                transition={{ delay: idx * 0.1 }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{challenge.progress}% complete</span>
              <span className="text-xs font-semibold text-emerald-700">Reward: {challenge.reward}</span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function FocusBattleCard({ onStart }: { onStart: () => void }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="rounded-[24px] border border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/20 p-6 shadow-[0_8px_24px_rgba(16,185,129,0.08)]"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-black text-slate-950">🎖️ Focus Battle</h3>
          <p className="mt-1 text-sm text-slate-600">15-min sprint sprint, no distractions, bonus XP.</p>
        </div>
        <Shield className="h-8 w-8 text-emerald-600 opacity-80" />
      </div>
      
      <div className="mb-4 rounded-[14px] bg-emerald-50 border border-emerald-200/60 px-4 py-3">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Reward</p>
        <p className="text-sm font-bold text-emerald-900 mt-1">+150 XP • 2x Streak Protection</p>
      </div>
      
      <button 
        onClick={onStart} 
        className="w-full rounded-[16px] border-2 border-emerald-600 bg-gradient-to-r from-emerald-50 to-emerald-50 px-4 py-3 font-bold text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-emerald-100 transition"
      >
        ▶️ Start Sprint
      </button>
    </motion.div>
  );
}

function JourneyMap({
  bytes,
  courses,
  selectedCourse,
  onStart,
}: {
  bytes: any[];
  courses: StudentCourseSummary[];
  selectedCourse: StudentCourseSummary | null;
  onStart: (byte: any) => void;
}) {
  const totalBytes = selectedCourse?.totalBytes || courses.reduce((sum, course) => sum + course.totalBytes, 0);
  const completedBytes = selectedCourse?.completedBytes || courses.reduce((sum, course) => sum + course.completedBytes, 0);
  return (
    <div className="rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-950">Learning Journey Map</h2>
        <p className="mt-2 text-slate-600">{completedBytes}/{totalBytes || bytes.length} published bytes completed across the selected learning path.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {bytes.map((byte, index) => (
          <motion.button 
            key={byte.id}
            whileHover={{ y: -4 }}
            onClick={() => byte.status !== 'locked' && onStart(byte)} 
            className={`rounded-[20px] border p-5 text-left transition ${
              byte.status === 'locked' 
                ? 'border-slate-200/40 bg-slate-50 opacity-60 cursor-not-allowed'
                : 'border-slate-200/60 bg-white hover:shadow-lg hover:border-indigo-300/60'
            }`}
          >
            <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-[14px] font-bold text-lg ${
              byte.status === 'locked' 
                ? 'bg-slate-300 text-slate-500' 
                : 'bg-gradient-to-br from-indigo-600 to-emerald-600 text-white shadow-lg shadow-indigo-500/30'
            }`}>
              {byte.status === 'locked' ? <Lock className="h-5 w-5" /> : <BadgeCheck className="h-6 w-6" />}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Checkpoint {index + 1}</p>
            <h3 className="mt-2 font-bold text-slate-950">{byte.title}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {byte.status === 'locked' ? '🔒 Locked' : `✓ ${challengeTypes[byte.type as keyof typeof challengeTypes] || 'Challenge'}`}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ArenaCard({ icon: Icon, title, subtitle, locked, onClick }: { icon: any; title: string; subtitle: string; locked?: boolean; onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ y: locked ? 0 : -4 }}
      onClick={onClick} 
      disabled={locked} 
      className={`group rounded-[20px] border p-6 text-left shadow-sm transition ${
        locked 
          ? 'border-slate-200/40 bg-slate-50 opacity-60 cursor-not-allowed' 
          : 'border-slate-200/60 bg-white hover:shadow-lg hover:border-indigo-300/60'
      }`}
    >
      <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[14px] transition ${
        locked
          ? 'bg-slate-300 text-slate-500'
          : 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 group-hover:scale-110'
      }`}>
        {locked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </motion.button>
  );
}

function RewardsGrid({ onClaim }: { onClaim: (label: string) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {badgeCatalog.map((badge) => (
        <motion.button 
          key={badge.title}
          whileHover={{ y: -4 }}
          onClick={() => onClaim(`${badge.title} badge unlocked`)} 
          className="rounded-[20px] border border-slate-200/60 bg-white p-5 text-left shadow-sm hover:shadow-lg transition group"
        >
          <div className={`mb-5 inline-flex h-16 w-16 items-center justify-center rounded-[14px] bg-gradient-to-br ${badge.color} text-white shadow-lg group-hover:scale-110 transition`}>
            <badge.icon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-950">{badge.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{badge.rarity} achievement. Redeem for cosmetics & boosters.</p>
        </motion.button>
      ))}
    </div>
  );
}

function LeaderboardPanel({ leaders, currentUserRank }: { leaders: LeaderboardEntry[]; currentUserRank: number | null }) {
  return (
    <div className="rounded-[24px] border border-slate-200/60 bg-white/95 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] lg:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-950">🏆 Leaderboard</h2>
          <p className="mt-2 text-slate-600">Daily, weekly, monthly, all-time modes are ready for expansion.</p>
        </div>
        <div className="rounded-[16px] border border-indigo-200/60 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 font-bold text-indigo-700">
          Your Rank: <span className="text-xl">#{currentUserRank || '-'}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {leaders.map((leader, index) => (
          <motion.div 
            key={leader.userId || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 rounded-[18px] border border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-50/30 p-4 hover:from-slate-100 hover:to-slate-50 transition"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] font-black text-white ${
              index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
              index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
              'bg-gradient-to-br from-orange-300 to-orange-400'
            }`}>
              #{leader.rank || index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-950">{leader.name}</h3>
              <p className="text-sm text-slate-500 mt-0.5">Level {leader.level} • {leader.streak || 0}-day streak 🔥</p>
            </div>
            
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-amber-600">{leader.xp?.toLocaleString?.() || leader.xp}</p>
              <p className="text-xs text-slate-500">XP</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RewardPopup({ label }: { label: string | null }) {
  return (
    <AnimatePresence>
      {label && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="fixed bottom-8 left-1/2 z-50 w-[min(90vw,540px)] -translate-x-1/2 rounded-[24px] border border-amber-200/60 bg-white p-6 shadow-2xl shadow-amber-500/25 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-amber-300 to-orange-500 text-2xl shadow-lg shadow-amber-500/30">
              🎉
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Reward Unlocked!</p>
              <h3 className="text-lg font-black text-slate-950 mt-1 line-clamp-2">{label}</h3>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
