import {
  ClipboardList, CheckCircle2, XCircle, Clock, Award, Plus, BarChart3,
  Users, TrendingUp, TrendingDown, Edit2, Trash2, Eye, Play,
  RotateCcw, Lock, Zap, FileText, BookOpen, Target, Star,
  ArrowUpRight, Search, ChevronDown, Filter, Download,
  RefreshCw, AlertCircle, Copy, Globe,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { AssessmentTakingWrapper } from './AssessmentTakingWrapper';
import { AssessmentResults } from './AssessmentResults';
import { AssessmentSubmissions } from './AssessmentSubmissions';
import { StudentSubmissions } from './StudentSubmissions';
import { FilterBar } from './FilterBar';
import { CreateAssessment } from './assessment/CreateAssessment';
import {
  getAssessments as fetchAssessmentsAPI,
  getAssessment as fetchAssessmentAPI,
  updateAssessmentStatus,
  deleteAssessment as deleteAssessmentAPI,
  duplicateAssessment as duplicateAssessmentAPI,
  getMyAttempts,
  type DBAssessment,
} from '../services/assessmentService';
import { toast } from 'sonner';
import { PremiumHero, PremiumPageShell } from './premium/PremiumPage';

interface AssessmentsProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const ASSESSMENT_LIST = [
  {
    id: 1,
    title: 'Final Assessment — Module 1–4',
    type: 'exam',
    course: 'Cooperative Management Fundamentals',
    questions: 25,
    duration: 45,
    passingScore: 60,
    totalPoints: 100,
    status: 'completed',
    score: 88,
    attemptDate: '2026-04-20',
    attemptsLeft: 2,
    attemptsUsed: 1,
    submissions: 132,
    passRate: 74,
    avgScore: 72,
    published: true,
    createdAt: '2026-03-10',
  },
  {
    id: 2,
    title: 'Midterm Exam',
    type: 'exam',
    course: 'Financial Literacy & Accounting',
    questions: 30,
    duration: 60,
    passingScore: 70,
    totalPoints: 120,
    status: 'completed',
    score: 92,
    attemptDate: '2026-04-22',
    attemptsLeft: 2,
    attemptsUsed: 1,
    submissions: 98,
    passRate: 81,
    avgScore: 79,
    published: true,
    createdAt: '2026-03-15',
  },
  {
    id: 3,
    title: 'Module 3 Quiz',
    type: 'quiz',
    course: 'Digital Marketing for Cooperatives',
    questions: 15,
    duration: 30,
    passingScore: 60,
    totalPoints: 50,
    status: 'available',
    attemptsLeft: 3,
    attemptsUsed: 0,
    submissions: 210,
    passRate: 68,
    avgScore: 64,
    published: true,
    createdAt: '2026-04-01',
  },
  {
    id: 4,
    title: 'Chapter Assessment',
    type: 'quiz',
    course: 'Legal Compliance for Cooperatives',
    questions: 20,
    duration: 40,
    passingScore: 65,
    totalPoints: 80,
    status: 'locked',
    requirement: 'Complete 80% of course',
    attemptsLeft: 3,
    attemptsUsed: 0,
    submissions: 45,
    passRate: 56,
    avgScore: 58,
    published: true,
    createdAt: '2026-04-05',
  },
  {
    id: 5,
    title: 'Pre-Course Survey',
    type: 'survey',
    course: 'Cooperative Management Fundamentals',
    questions: 10,
    duration: 15,
    passingScore: 0,
    totalPoints: 0,
    status: 'available',
    attemptsLeft: 1,
    attemptsUsed: 0,
    submissions: 176,
    passRate: 100,
    avgScore: 0,
    published: true,
    createdAt: '2026-02-20',
  },
  {
    id: 6,
    title: 'Coding Assignment — Unit 2',
    type: 'assignment',
    course: 'Financial Literacy & Accounting',
    questions: 3,
    duration: 0,
    passingScore: 50,
    totalPoints: 30,
    status: 'available',
    attemptsLeft: 1,
    attemptsUsed: 0,
    submissions: 88,
    passRate: 90,
    avgScore: 85,
    published: false,
    createdAt: '2026-04-18',
  },
];

const QUESTION_TYPE_STATS = [
  { type: 'MCQ', count: 186, pct: 48 },
  { type: 'True/False', count: 58, pct: 15 },
  { type: 'Fill in Blank', count: 42, pct: 11 },
  { type: 'Short Answer', count: 38, pct: 10 },
  { type: 'Match', count: 28, pct: 7 },
  { type: 'Essay', count: 18, pct: 5 },
  { type: 'Other', count: 15, pct: 4 },
];

const COURSE_STATS = [
  { course: 'Cooperative Management', assessments: 3, submissions: 456, passRate: 74, avgScore: 72, trend: 'up' },
  { course: 'Financial Literacy',     assessments: 4, submissions: 389, passRate: 81, avgScore: 79, trend: 'up' },
  { course: 'Digital Marketing',      assessments: 2, submissions: 234, passRate: 68, avgScore: 64, trend: 'down' },
  { course: 'Legal Compliance',       assessments: 3, submissions: 168, passRate: 56, avgScore: 58, trend: 'down' },
];

const RECENT_SUBMISSIONS = [
  { student: 'Rahul Sharma',   assessment: 'Module 3 Quiz',     score: 88, passed: true,  time: '14 min', date: '2026-04-28' },
  { student: 'Priya Patel',    assessment: 'Midterm Exam',      score: 64, passed: false, time: '58 min', date: '2026-04-28' },
  { student: 'Amit Singh',     assessment: 'Module 3 Quiz',     score: 92, passed: true,  time: '11 min', date: '2026-04-27' },
  { student: 'Neha Gupta',     assessment: 'Chapter Assessment',score: 72, passed: true,  time: '35 min', date: '2026-04-27' },
  { student: 'Vikram Nair',    assessment: 'Midterm Exam',      score: 55, passed: false, time: '52 min', date: '2026-04-26' },
];

const TOP_PERFORMERS = [
  { name: 'Amit Singh',    score: 96, assessments: 4, rank: 1 },
  { name: 'Rahul Sharma',  score: 91, assessments: 3, rank: 2 },
  { name: 'Neha Gupta',    score: 87, assessments: 4, rank: 3 },
  { name: 'Priya Patel',   score: 82, assessments: 2, rank: 4 },
  { name: 'Kavya Reddy',   score: 79, assessments: 5, rank: 5 },
];

const WEAK_QUESTIONS = [
  { q: 'What is the primary governance structure of a cooperative?', wrongPct: 68, type: 'MCQ' },
  { q: 'Calculate the debt-to-equity ratio for the given balance sheet.', wrongPct: 61, type: 'Short Answer' },
  { q: 'Match the cooperative acts to their respective states.', wrongPct: 55, type: 'Match' },
];

const TYPE_ICONS: Record<string, React.ElementType> = {
  quiz: Zap, exam: ClipboardList, assignment: FileText,
  survey: BarChart3, practice: BookOpen, poll: Users,
};

const TYPE_COLORS: Record<string, string> = {
  quiz: 'bg-indigo-100 text-indigo-700',
  exam: 'bg-red-100 text-red-700',
  assignment: 'bg-purple-100 text-purple-700',
  survey: 'bg-teal-100 text-teal-700',
  practice: 'bg-green-100 text-green-700',
  poll: 'bg-yellow-100 text-yellow-700',
};

// ─── Component ────────────────────────────────────────────────────────────────

// Map DB assessment → local display shape
function mapDB(a: DBAssessment) {
  // Determine student-facing status
  let status: string = 'available';
  if (a.visibility !== 'published') status = 'draft';

  // Extract trainer name from populated createdBy
  let trainerName = '';
  if (a.createdBy) {
    if (typeof a.createdBy === 'object' && a.createdBy !== null) {
      const creator = a.createdBy as any;
      trainerName = `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 
                    creator.email || 
                    '';
    }
  }

  return {
    id: a._id,
    title: a.title,
    type: a.type || 'quiz',
    course: a.course || '—',
    questions: a.totalQuestions ?? (a.questions?.length ?? 0),
    duration: a.timeLimit ?? 0,
    passingScore: a.passingScore ?? 60,
    totalPoints: a.totalPoints ?? 0,
    status,
    attemptsLeft: a.attemptsAllowed ?? 3,
    attemptsUsed: 0,
    submissions: a.submissions ?? 0,
    passRate: a.passRate ?? 0,
    avgScore: a.avgScore ?? 0,
    published: a.isPublished ?? false,
    visibility: a.visibility ?? 'draft',
    createdAt: a.createdAt?.slice(0, 10) ?? '',
    trainer: trainerName,
  };
}

export function Assessments({ userRole }: AssessmentsProps) {
  const [takingAssessment, setTakingAssessment] = useState<number | null>(null);
  const [viewingResults, setViewingResults] = useState<{ assessmentId: string; attemptId: string } | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<{ assessmentId: string; title: string } | null>(null);
  const [viewingMySubmissions, setViewingMySubmissions] = useState<{ assessmentId: string; title: string; attemptsAllowed: number } | null>(null);
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<ReturnType<typeof mapDB> | null>(null);
  const [editInitialData, setEditInitialData] = useState<Record<string, unknown> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [assessments, setAssessments] = useState(ASSESSMENT_LIST as ReturnType<typeof mapDB>[]);
  const [myAttempts, setMyAttempts] = useState<Record<string, any[]>>({});
  const [dbLoading, setDbLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [searchQ, setSearchQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statsTab, setStatsTab] = useState<'overview' | 'courses' | 'questions' | 'students'>('overview');
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // ── Fetch from DB ──────────────────────────────────────────────────────────
  const loadAssessments = useCallback(async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const res = await fetchAssessmentsAPI({ limit: '100' });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const dbItems = res.data.map(mapDB);

        if (userRole === 'participant') {
          // For participants: fetch attempt data to determine completed status
          const itemsWithStatus = await Promise.all(
            dbItems.map(async (item) => {
              try {
                const attemptsRes = await getMyAttempts(String(item.id));
                if (attemptsRes.success && attemptsRes.data?.length > 0) {
                  const submitted = attemptsRes.data.filter(
                    (a: any) => a.status === 'submitted' || a.status === 'evaluated'
                  );
                  if (submitted.length > 0) {
                    // Sort newest first
                    const sorted = [...submitted].sort(
                      (a: any, b: any) =>
                        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                    );
                    const latest = sorted[0];
                    const best = submitted.reduce((b: any, a: any) =>
                      (a.score?.percentage || 0) > (b.score?.percentage || 0) ? a : b
                    );
                    const attemptsUsed = submitted.length;
                    const attemptsLeft = Math.max(0, (item.attemptsLeft) - attemptsUsed);
                    return {
                      ...item,
                      status: 'completed',
                      score: best.score?.percentage ?? 0,
                      attemptDate: latest.submittedAt?.slice(0, 10) ?? '',
                      attemptsLeft,
                      attemptsUsed,
                    };
                  }
                }
              } catch {
                // ignore per-assessment errors
              }
              return item;
            })
          );

          const demoParticipant = (ASSESSMENT_LIST as ReturnType<typeof mapDB>[]).filter(
            (a) => (a as unknown as { published: boolean }).published
          );
          setAssessments([...itemsWithStatus, ...demoParticipant]);
        } else {
          setAssessments([...dbItems, ...(ASSESSMENT_LIST as ReturnType<typeof mapDB>[])]);
        }
      }
    } catch {
      setDbError('Could not load assessments from server.');
    } finally {
      setDbLoading(false);
    }
  }, [userRole]);

  useEffect(() => { loadAssessments(); }, [loadAssessments]);

  useEffect(() => {
    const handleUrlCheck = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const takeId = urlParams.get('takeAssessmentId');
      if (takeId) {
        setTakingAssessment(takeId as any);
        const cleanSearch = window.location.search.replace(/([?&])takeAssessmentId=[^&]+(&?)/, (_, p1, p2) => p1 === '?' && p2 ? '?' : '');
        window.history.replaceState({}, '', window.location.pathname + cleanSearch);
        return;
      }

      const viewSubsId = urlParams.get('viewSubmissionsId');
      const viewSubsTitle = urlParams.get('viewSubmissionsTitle');
      if (viewSubsId) {
        setViewingSubmissions({ assessmentId: viewSubsId, title: decodeURIComponent(viewSubsTitle || 'Assessment Submissions') });
        const cleanSearch = window.location.search.replace(/([?&])viewSubmissionsId=[^&]+(&?)/, (_, p1, p2) => p1 === '?' && p2 ? '?' : '')
                                                 .replace(/([?&])viewSubmissionsTitle=[^&]+(&?)/, (_, p1, p2) => p1 === '?' && p2 ? '?' : '');
        window.history.replaceState({}, '', window.location.pathname + cleanSearch);
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editAssessmentId');
    if (editId && assessments.length > 0) {
      const found = assessments.find(a => String(a.id) === String(editId));
      if (found) {
        handleEdit(found);
      }
      const cleanSearch = window.location.search.replace(/([?&])editAssessmentId=[^&]+(&?)/, (_, p1, p2) => p1 === '?' && p2 ? '?' : '');
      window.history.replaceState({}, '', window.location.pathname + cleanSearch);
    }
  }, [assessments]);

  // ── Edit: fetch full assessment ────────────────────────────────────────────
  const handleEdit = async (a: ReturnType<typeof mapDB>) => {
    if (typeof a.id !== 'string') {
      setEditingAssessment(a);
      setEditInitialData(null);
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetchAssessmentAPI(a.id);
      if (res.success && res.data) {
        const d = res.data;
        setEditInitialData({
          title: d.title || '',
          type: d.type || 'quiz',
          course: d.course || '',
          module: d.module || '',
          description: d.description || '',
          instructions: d.instructions || '',
          tags: d.tags || [],
          timeLimit: d.timeLimit ?? 30,
          attemptsAllowed: d.attemptsAllowed ?? 3,
          passingScore: d.passingScore ?? 60,
          gracePeriod: d.gracePeriod ?? 5,
          gradingType: d.gradingType || 'auto',
          shuffleQuestions: d.shuffleQuestions !== false,
          shuffleOptions: d.shuffleOptions !== false,
          showScore: d.showScore !== false,
          showFeedback: d.showFeedback !== false,
          showCorrectAnswers: d.showCorrectAnswers || 'immediate',
          questionsPerPage: d.questionsPerPage ?? 1,
          allowBacktrack: d.allowBacktrack !== false,
          autoSubmit: d.autoSubmit !== false,
          availableFrom: d.availableFrom ? String(d.availableFrom).slice(0, 16) : '',
          availableUntil: d.availableUntil ? String(d.availableUntil).slice(0, 16) : '',
          preventTabSwitch: !!d.preventTabSwitch,
          requireFullscreen: !!d.requireFullscreen,
          questions: Array.isArray(d.questions) ? d.questions.map((q: Record<string, unknown>) => ({
            id: String(q._id || Math.random().toString(36).slice(2)),
            ...q,
          })) : [],
          visibility: d.visibility || 'draft',
          notifyStudents: d.notifyStudents !== false,
          scheduleAt: d.scheduleAt ? String(d.scheduleAt).slice(0, 16) : '',
        });
        setEditingAssessment(a);
      }
    } catch {
      toast.error('Could not load assessment data.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Status toggle ──────────────────────────────────────────────────────────
  const handleStatusToggle = async (a: ReturnType<typeof mapDB>) => {
    if (typeof a.id !== 'string') return;
    const newVis: 'published' | 'draft' = a.published ? 'draft' : 'published';
    setStatusUpdating(a.id);
    try {
      const res = await updateAssessmentStatus(a.id, newVis);
      if (res.success) {
        setAssessments((prev) => prev.map((x) =>
          x.id === a.id ? { ...x, published: newVis === 'published', visibility: newVis, status: newVis === 'published' ? 'available' : 'draft' } : x
        ));
        toast.success(newVis === 'published' ? `"${a.title}" published!` : `"${a.title}" unpublished`, {
          icon: newVis === 'published' ? '🚀' : '📦',
        });
      } else {
        toast.error(res.message || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (a: ReturnType<typeof mapDB>) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      if (typeof a.id === 'string') await deleteAssessmentAPI(a.id);
    } catch { /* fall through */ }
    setAssessments((prev) => prev.filter((x) => x.id !== a.id));
    toast.success(`"${a.title}" deleted`, { icon: '🗑️' });
  };

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = async (a: ReturnType<typeof mapDB>) => {
    if (typeof a.id !== 'string') return;
    try {
      const res = await duplicateAssessmentAPI(a.id);
      if (res.success && res.data) {
        setAssessments((prev) => [mapDB(res.data!), ...prev]);
        toast.success(`"${a.title}" duplicated`, { icon: '📋' });
      }
    } catch {
      toast.error('Failed to duplicate assessment');
    }
  };

  // ── View Results (Student) ────────────────────────────────────────────────
  if (viewingResults) {
    return (
      <AssessmentResults
        assessmentId={viewingResults.assessmentId}
        attemptId={viewingResults.attemptId}
        onBack={() => {
          // If came from my submissions, go back there
          if (viewingMySubmissions) {
            setViewingResults(null);
          } else {
            setViewingResults(null);
          }
        }}
        userRole={userRole}
      />
    );
  }

  // ── Student: My Submission History ───────────────────────────────────────
  if (viewingMySubmissions) {
    return (
      <StudentSubmissions
        assessmentId={viewingMySubmissions.assessmentId}
        assessmentTitle={viewingMySubmissions.title}
        attemptsAllowed={viewingMySubmissions.attemptsAllowed}
        onBack={() => setViewingMySubmissions(null)}
        onViewAttempt={(attemptId) => {
          setViewingResults({
            assessmentId: viewingMySubmissions.assessmentId,
            attemptId,
          });
        }}
        onRetake={() => {
          setViewingMySubmissions(null);
          setTakingAssessment(viewingMySubmissions.assessmentId as any);
        }}
      />
    );
  }

  // ── View All Submissions (Trainer/Admin) ──────────────────────────────────
  if (viewingSubmissions) {
    return (
      <AssessmentSubmissions
        assessmentId={viewingSubmissions.assessmentId}
        assessmentTitle={viewingSubmissions.title}
        onBack={() => setViewingSubmissions(null)}
        onViewSubmission={(attemptId) => {
          setViewingResults({
            assessmentId: viewingSubmissions.assessmentId,
            attemptId
          });
          setViewingSubmissions(null);
        }}
      />
    );
  }

  if (takingAssessment) {
    const isPreviewMode = userRole !== 'participant';
    return (
      <AssessmentTakingWrapper
        assessmentId={takingAssessment}
        onBack={() => {
          setTakingAssessment(null);
          loadAssessments(); // Reload to get updated submission counts
        }}
        isPreview={isPreviewMode}
        userRole={userRole}
      />
    );
  }
  if ((showCreatePage || editingAssessment) && userRole !== 'participant') {
    return (
      <CreateAssessment
        userRole={userRole as 'admin' | 'trainer'}
        onBack={() => { setShowCreatePage(false); setEditingAssessment(null); setEditInitialData(null); }}
        initialData={editInitialData as Parameters<typeof CreateAssessment>[0]['initialData']}
        initialAssessmentId={editingAssessment && typeof editingAssessment.id === 'string' ? editingAssessment.id : undefined}
        onPublished={(data) => {
          const newA = {
            id: Date.now(),
            title: data.title,
            type: data.type,
            course: data.course,
            questions: data.questions.length,
            duration: data.timeLimit,
            passingScore: data.passingScore,
            totalPoints: data.questions.reduce((a, q) => a + q.points, 0),
            status: 'available' as const,
            attemptsLeft: data.attemptsAllowed,
            attemptsUsed: 0,
            submissions: 0,
            passRate: 0,
            avgScore: 0,
            published: data.visibility === 'published',
            visibility: data.visibility,
            createdAt: new Date().toISOString().split('T')[0],
          };
          if (editingAssessment) {
            setAssessments((a) => a.map((x) => x.id === editingAssessment.id ? { ...x, ...newA, id: x.id } : x));
            toast.success('Assessment updated!', { icon: '✏️' });
          } else {
            setAssessments((a) => [newA as ReturnType<typeof mapDB>, ...a]);
          }
          setShowCreatePage(false);
          setEditingAssessment(null);
          setEditInitialData(null);
        }}
      />
    );
  }

  const totalSubmissions = assessments.reduce((a, x) => a + x.submissions, 0);
  const avgPassRate = Math.round(assessments.reduce((a, x) => a + x.passRate, 0) / assessments.length);
  const avgScore = Math.round(assessments.reduce((a, x) => a + x.avgScore, 0) / assessments.filter((x) => x.avgScore > 0).length);
  const totalQuestions = assessments.reduce((a, x) => a + x.questions, 0);

  const filteredAssessments = assessments.filter((a) => {
    const matchSearch = !searchQ || a.title.toLowerCase().includes(searchQ.toLowerCase()) || a.course.toLowerCase().includes(searchQ.toLowerCase());
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    // Participants only see published assessments
    const matchRole = userRole !== 'participant' || a.published || a.status === 'available' || a.status === 'completed' || a.status === 'locked';
    return matchSearch && matchType && matchRole;
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PremiumPageShell>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PremiumHero
        title={userRole === 'participant' ? 'My Assessments' : 'Assessments'}
        subtitle={userRole === 'participant' ? 'Attempt quizzes, exams and assignments assigned to your courses.' : 'Build, manage and analyse assessments across CEAS-LMS.'}
        eyebrow="Assessment center"
        icon={ClipboardList}
        action={userRole !== 'participant' ? (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAssessments}
              disabled={dbLoading}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:bg-indigo-50">
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button
              onClick={() => setShowCreatePage(true)}
              className="flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Plus className="w-5 h-5" /> Create Assessment
            </button>
          </div>
        ) : (
          <button
            onClick={loadAssessments}
            disabled={dbLoading}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      />

      {/* ── Student Stats ───────────────────────────────────────────────────── */}
      {userRole === 'participant' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Available', value: filteredAssessments.filter((a) => a.status === 'available').length, icon: Play, desc: 'Ready to attempt', card: 'from-indigo-50 to-white', iconBg: 'from-indigo-600 to-blue-600', text: 'text-indigo-700', spark: 'stroke-indigo-500' },
            { label: 'Completed', value: filteredAssessments.filter((a) => a.status === 'completed').length, icon: CheckCircle2, desc: 'Submitted', card: 'from-emerald-50 to-white', iconBg: 'from-emerald-600 to-teal-600', text: 'text-emerald-700', spark: 'stroke-emerald-500' },
            { label: 'Locked', value: filteredAssessments.filter((a) => a.status === 'locked').length, icon: Lock, desc: 'Complete course first', card: 'from-amber-50 to-white', iconBg: 'from-amber-500 to-orange-500', text: 'text-amber-700', spark: 'stroke-amber-500' },
            { label: 'Total', value: filteredAssessments.length, icon: ClipboardList, desc: 'Assigned to you', card: 'from-violet-50 to-white', iconBg: 'from-violet-600 to-fuchsia-600', text: 'text-violet-700', spark: 'stroke-violet-500' },
          ].map((s) => {
            const Icon = s.icon as any;
            return (
              <div key={s.label} className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${s.card} p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}>
                <div className={`absolute right-3 top-3 h-20 w-20 rounded-full bg-gradient-to-br ${s.iconBg} opacity-10 blur-2xl`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${s.iconBg} shadow-[0_10px_20px_-10px_rgba(15,23,42,0.45)]`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Live
                  </span>
                </div>
                <div className="relative mt-4">
                  <p className="text-3xl font-black text-slate-900">{s.value}</p>
                  <p className={`mt-1 text-xs font-bold uppercase tracking-[0.18em] ${s.text}`}>{s.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
                </div>
                <svg viewBox="0 0 120 26" className="relative mt-4 h-6 w-full" fill="none" aria-hidden="true">
                  <path d="M0 18C12 18 12 8 24 8C36 8 36 20 48 20C60 20 60 6 72 6C84 6 84 16 96 16C108 16 108 10 120 10" className={`${s.spark}`} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M0 18C12 18 12 8 24 8C36 8 36 20 48 20C60 20 60 6 72 6C84 6 84 16 96 16C108 16 108 10 120 10" className="stroke-slate-200/70" strokeWidth="2.5" strokeLinecap="round" opacity="0.22" />
                </svg>
              </div>
            );
          })}
        </div>
      )}

      {/* DB error banner */}
      {dbError && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          <span className="flex-1">{dbError}</span>
          <button onClick={loadAssessments} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* ── Stats (admin/trainer only) ──────────────────────────────────────── */}
      {userRole !== 'participant' && (
        <div className="space-y-5">
          {/* Overview KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Assessments Created', value: assessments.length, icon: ClipboardList, sub: `${assessments.filter((a) => a.published).length} published`, bg: 'from-indigo-50 to-white', iconBg: 'bg-indigo-100', text: 'text-indigo-700', arrow: 'text-indigo-400' },
              { label: 'Total Questions', value: totalQuestions, icon: Target, sub: `${QUESTION_TYPE_STATS.length} types used`, bg: 'from-violet-50 to-white', iconBg: 'bg-violet-100', text: 'text-violet-700', arrow: 'text-violet-400' },
              { label: 'Total Submissions', value: totalSubmissions.toLocaleString(), icon: Users, sub: 'across all assessments', bg: 'from-blue-50 to-white', iconBg: 'bg-blue-100', text: 'text-blue-700', arrow: 'text-blue-400' },
              { label: 'Avg Pass Rate', value: `${avgPassRate}%`, icon: CheckCircle2, sub: 'students who passed', bg: 'from-emerald-50 to-white', iconBg: 'bg-emerald-100', text: 'text-emerald-700', arrow: 'text-emerald-400' },
              { label: 'Avg Score', value: `${avgScore}%`, icon: Award, sub: 'mean across all tests', bg: 'from-amber-50 to-white', iconBg: 'bg-amber-100', text: 'text-amber-700', arrow: 'text-amber-400' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${s.bg} p-5 shadow-sm`}>
                  <div className="mb-2 flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                      <Icon className={`w-5 h-5 ${s.text}`} />
                    </div>
                    <ArrowUpRight className={`w-4 h-4 ${s.arrow}`} />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className={`text-xs font-medium ${s.text}`}>{s.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Stats tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 px-5 overflow-x-auto">
              {[
                { id: 'overview',  label: 'Overview' },
                { id: 'courses',   label: 'By Course' },
                { id: 'questions', label: 'Question Analysis' },
                { id: 'students',  label: 'Student Performance' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setStatsTab(t.id as any)}
                  className={`px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    statsTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* Overview tab */}
              {statsTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* By assessment type */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Assessments by Type</h4>
                    <div className="space-y-2">
                      {(['quiz','exam','assignment','survey','practice','poll'] as const).map((t) => {
                        const count = assessments.filter((a) => a.type === t).length;
                        const Icon = TYPE_ICONS[t];
                        return (
                          <div key={t} className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[t]}`}>
                              <Icon className="w-3 h-3" />{t}
                            </span>
                            <progress className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" max={100} value={assessments.length ? (count / assessments.length) * 100 : 0} />
                            <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pass / fail chart */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Overall Pass vs Fail Rate</h4>
                    <div className="relative">
                      <div className="space-y-2">
                        <progress className="h-3 w-full overflow-hidden rounded-full bg-slate-100" max={100} value={avgPassRate} />
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="text-emerald-600">{avgPassRate}% Pass</span>
                          <span className="text-rose-500">{100 - avgPassRate}% Fail</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      <StatRow label="Highest Pass Rate" value={`${Math.max(...assessments.map((a) => a.passRate))}%`} icon={TrendingUp} color="green" />
                      <StatRow label="Lowest Pass Rate"  value={`${Math.min(...assessments.filter((a) => a.passRate > 0).map((a) => a.passRate))}%`} icon={TrendingDown} color="red" />
                      <StatRow label="Highest Avg Score" value={`${Math.max(...assessments.map((a) => a.avgScore))}%`} icon={Star} color="yellow" />
                    </div>
                  </div>

                  {/* Recent submissions */}
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-gray-900 mb-4">Recent Submissions</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {['Student','Assessment','Score','Status','Time Taken','Date'].map((h) => (
                              <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {RECENT_SUBMISSIONS.map((sub, i) => (
                            <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {sub.student.split(' ').map((n) => n[0]).join('')}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">{sub.student}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-sm text-gray-600">{sub.assessment}</td>
                              <td className="py-2.5 px-3">
                                <span className={`text-sm font-bold ${sub.passed ? 'text-green-600' : 'text-red-500'}`}>{sub.score}%</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sub.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {sub.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {sub.passed ? 'Passed' : 'Failed'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-sm text-gray-500">{sub.time}</td>
                              <td className="py-2.5 px-3 text-xs text-gray-400">{new Date(sub.date).toLocaleDateString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* By Course tab */}
              {statsTab === 'courses' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {['Course','Assessments','Submissions','Pass Rate','Avg Score','Trend'].map((h) => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {COURSE_STATS.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{row.course}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-sm text-gray-700">{row.assessments}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-700">{row.submissions.toLocaleString()}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <progress className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" max={100} value={row.passRate} />
                                <span className={`text-sm font-semibold ${row.passRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>{row.passRate}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`text-sm font-bold ${row.avgScore >= 70 ? 'text-green-600' : 'text-red-500'}`}>{row.avgScore}%</span>
                            </td>
                            <td className="py-3.5 px-4">
                              {row.trend === 'up'
                                ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><TrendingUp className="w-3.5 h-3.5" /> Improving</span>
                                : <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><TrendingDown className="w-3.5 h-3.5" /> Declining</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Question Analysis tab */}
              {statsTab === 'questions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Questions by Type</h4>
                    <div className="space-y-3">
                      {QUESTION_TYPE_STATS.map((s) => (
                        <div key={s.type} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-28">{s.type}</span>
                          <progress className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100" max={100} value={s.pct} />
                          <span className="text-xs font-semibold text-gray-700 w-20 text-right">{s.count} ({s.pct}%)</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {[
                        { label: 'Easy', value: `${Math.round(totalQuestions * 0.38)}`, color: 'green' },
                        { label: 'Medium', value: `${Math.round(totalQuestions * 0.44)}`, color: 'yellow' },
                        { label: 'Hard', value: `${Math.round(totalQuestions * 0.18)}`, color: 'red' },
                      ].map((d) => (
                        <div key={d.label} className={`bg-${d.color}-50 border border-${d.color}-100 rounded-xl p-3 text-center`}>
                          <p className={`text-xl font-bold text-${d.color}-700`}>{d.value}</p>
                          <p className="text-xs text-gray-500">{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Most Challenging Questions</h4>
                    <div className="space-y-3">
                      {WEAK_QUESTIONS.map((q, i) => (
                        <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm text-gray-700 line-clamp-2">{q.q}</p>
                            <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">{q.wrongPct}% wrong</span>
                          </div>
                          <span className="text-xs text-gray-400">{q.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Student Performance tab */}
              {statsTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Top Performers</h4>
                    <div className="space-y-2">
                      {TOP_PERFORMERS.map((s) => (
                        <div key={s.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.rank === 1 ? 'bg-yellow-100 text-yellow-700' : s.rank === 2 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-700'}`}>
                            {s.rank}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.assessments} assessments taken</p>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">{s.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Score Distribution</h4>
                    <div className="space-y-2">
                      {[
                        { range: '90–100%', count: 87,  color: 'green' },
                        { range: '80–89%',  count: 203, color: 'blue' },
                        { range: '70–79%',  count: 298, color: 'indigo' },
                        { range: '60–69%',  count: 412, color: 'yellow' },
                        { range: 'Below 60%',count: 247,color: 'red' },
                      ].map((row) => {
                        const total = 87 + 203 + 298 + 412 + 247;
                        return (
                          <div key={row.range} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-20">{row.range}</span>
                            <progress className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100" max={100} value={(row.count / total) * 100} />
                            <span className="text-xs font-semibold text-gray-700 w-10 text-right">{row.count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
                      <p className="text-xs text-indigo-700">
                        <strong>1,247 total attempts</strong> · {avgPassRate}% overall pass rate · {avgScore}% mean score
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Participant quick stats ─────────────────────────────────────────── */}
      {userRole === 'participant' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Passed',    value: assessments.filter((a) => a.status === 'completed' && (a as any).score >= a.passingScore).length, icon: CheckCircle2, color: 'green' },
            { label: 'Available', value: assessments.filter((a) => a.status === 'available').length, icon: ClipboardList, color: 'blue' },
            { label: 'Locked',    value: assessments.filter((a) => a.status === 'locked').length,    icon: Lock,         color: 'yellow' },
            { label: 'Avg Score', value: `${avgScore}%`, icon: Award, color: 'purple' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`bg-gradient-to-br from-${s.color}-100 to-${s.color}-50 rounded-2xl p-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/70 rounded-xl flex items-center justify-center">
                    <Icon className={`w-5 h-5 text-${s.color}-600`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-600">{s.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <FilterBar onFilterChange={setActiveFilters} showCourseFilter showBatchFilter={userRole !== 'participant'} showExport={false} />

      {/* ── Search + type filter ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search assessments…" className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} title="Filter by assessment type" aria-label="Filter by assessment type" className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Types</option>
          <option value="quiz">Quiz</option>
          <option value="exam">Exam</option>
          <option value="assignment">Assignment</option>
          <option value="survey">Survey</option>
          <option value="practice">Practice</option>
          <option value="poll">Poll</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Assessment List ─────────────────────────────────────────────────── */}

      {/* Loading skeleton */}
      {dbLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
                <div className="h-5 w-32 bg-gray-100 rounded-full" />
              </div>
              <div className="h-6 w-2/3 bg-gray-200 rounded-lg mb-3" />
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map((j) => <div key={j} className="h-4 bg-gray-100 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!dbLoading && (
      <div className="space-y-4">
        {filteredAssessments.map((assessment) => {
          const TypeIcon = TYPE_ICONS[assessment.type] ?? ClipboardList;
          const typeColor = TYPE_COLORS[assessment.type] ?? 'bg-gray-100 text-gray-600';
          const score = (assessment as any).score;

          return (
            <div key={assessment.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${typeColor}`}>
                      <TypeIcon className="w-3 h-3" />{assessment.type}
                    </span>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-3 py-0.5 rounded-full">
                      {assessment.course}
                    </span>
                    {!assessment.published && (
                      <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Draft</span>
                    )}
                    {assessment.status === 'completed' && score !== undefined && (
                      <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${score >= assessment.passingScore ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        Score: {score}%
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-lg text-gray-900 mb-3">{assessment.title}</h3>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4" />{assessment.questions} questions</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{assessment.duration ? `${assessment.duration} min` : 'No limit'}</span>
                    <span className="flex items-center gap-1.5"><Award className="w-4 h-4" />Pass: {assessment.passingScore}%</span>
                    <span className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4" />{assessment.attemptsLeft} attempts left</span>
                    {userRole !== 'participant' && (
                      <>
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-400" />{assessment.submissions} submissions</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-400" />{assessment.passRate}% pass rate</span>
                        <span className="flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-purple-400" />{assessment.avgScore}% avg score</span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">Created {new Date(assessment.createdAt).toLocaleDateString('en-IN')}</span>
                      </>
                    )}
                    {(assessment as any).trainer && (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-400">By:</span>
                        <span className="font-medium text-indigo-600">{(assessment as any).trainer}</span>
                      </span>
                    )}
                  </div>

                  {/* Completion date / lock message */}
                  {assessment.status === 'completed' && (assessment as any).attemptDate && (
                    <p className="text-sm text-gray-400">
                      Completed {new Date((assessment as any).attemptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {assessment.status === 'locked' && (assessment as any).requirement && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 mt-2">
                      <p className="text-sm text-yellow-800">
                        <Lock className="w-3.5 h-3.5 inline mr-1" />
                        <strong>Requirement:</strong> {(assessment as any).requirement}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {userRole === 'participant' ? (
                    <>
                      {assessment.status === 'completed' && (
                        <>
                          <button
                            onClick={() => {
                              if (typeof assessment.id === 'string') {
                                setViewingMySubmissions({
                                  assessmentId: assessment.id,
                                  title: assessment.title,
                                  attemptsAllowed: assessment.attemptsLeft + (assessment.attemptsUsed ?? 0),
                                });
                              } else {
                                // Demo data fallback — show mock result
                                toast.info('Results available for real assessments only');
                              }
                            }}
                            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition-all"
                          >
                            <Eye className="w-4 h-4" />View Results
                          </button>
                          {assessment.attemptsLeft > 0 && (
                            <button
                              onClick={() => {
                                if (typeof assessment.id !== 'string') {
                                  toast.info('This is demo data — only real assessments can be retaken');
                                  return;
                                }
                                setTakingAssessment(assessment.id);
                              }}
                              className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-200 transition-all"
                            >
                              <RotateCcw className="w-4 h-4" />Retake
                            </button>
                          )}
                        </>
                      )}
                      {assessment.status === 'available' && (
                        <button
                          onClick={() => {
                            if (typeof assessment.id !== 'string') {
                              toast.info('This is demo data — only real assessments can be taken');
                              return;
                            }
                            setTakingAssessment(assessment.id);
                          }}
                          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:shadow-lg transition-all"
                        >
                          <Play className="w-4 h-4" />Start
                        </button>
                      )}
                      {assessment.status === 'locked' && (
                        <button disabled className="flex items-center gap-1.5 bg-gray-200 text-gray-400 px-5 py-2.5 rounded-xl font-medium text-sm cursor-not-allowed">
                          <Lock className="w-4 h-4" />Locked
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setTakingAssessment(assessment.id as number)} className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-200 transition-all">
                        <Eye className="w-4 h-4" />Preview
                      </button>
                      {typeof assessment.id === 'string' && (
                        <button
                          onClick={() => setViewingSubmissions({
                            assessmentId: assessment.id as string,
                            title: assessment.title
                          })}
                          className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-purple-200 transition-all"
                          title="View all student submissions"
                        >
                          <Users className="w-4 h-4" />
                          Submissions {assessment.submissions > 0 ? `(${assessment.submissions})` : ''}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(assessment)}
                        disabled={editLoading}
                        className="p-2.5 border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(assessment)}
                        className="p-2.5 border border-gray-200 text-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {typeof assessment.id === 'string' && (
                        <button
                          onClick={() => handleStatusToggle(assessment)}
                          disabled={statusUpdating === assessment.id}
                          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50 ${
                            assessment.published
                              ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                          }`}
                          title={assessment.published ? 'Unpublish' : 'Publish'}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {assessment.published ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(assessment)}
                        className="p-2.5 border border-red-100 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {filteredAssessments.length === 0 && !dbLoading && (
        <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {userRole === 'participant' ? 'No assessments assigned to you yet' : 'No assessments found'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {userRole === 'participant' ? 'Your trainer will assign assessments to your enrolled courses.' : ''}
          </p>
          {userRole !== 'participant' && (
            <button onClick={() => setShowCreatePage(true)} className="mt-4 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
              Create your first assessment
            </button>
          )}
        </div>
      )}

      {/* Guidelines */}
      {userRole === 'participant' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-semibold mb-2 text-blue-900">Assessment Guidelines</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Questions are automatically numbered starting from Q1</li>
                <li>You can attempt each assessment up to 3 times (24-hour gap between retakes)</li>
                <li>Submit button appears only after answering all required questions</li>
                <li>Instant score and feedback shown upon submission</li>
                <li>Time warnings appear at 10 min and 5 min remaining</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </PremiumPageShell>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function StatRow({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Icon className={`w-4 h-4 text-${color}-500`} />
        {label}
      </div>
      <span className={`text-sm font-bold text-${color}-600`}>{value}</span>
    </div>
  );
}
