import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Mic, MicOff, Loader2, ChevronRight, Sparkles, Clock,
  BookOpen, MessageSquare, FileText, Zap, Brain, Video, Info,
  Award, Calendar, Users, Bot, Play, Edit3, Download, QrCode,
  Reply, Mail, UserCheck, UserX, GraduationCap, X, TrendingUp,
  BarChart2, CheckCircle,
} from 'lucide-react';
import { smartSearch } from '../services/smartSearchService';
import { voiceInputService } from '../services/voiceInputService';
import { PremiumPageShell } from './premium/PremiumPage';

// ── helpers ────────────────────────────────────────────────────────────────
const getStoredUser = (): any => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};
const getRawRole = (): string => getStoredUser()?.role || 'student';
// normalize backend role → 'student' | 'trainer' | 'administrator'
const resolveRole = (): 'student' | 'trainer' | 'administrator' => {
  const r = getRawRole();
  if (r === 'administrator' || r === 'admin') return 'administrator';
  if (r === 'trainer') return 'trainer';
  return 'student';
};

type TabKey =
  | 'courses' | 'lessons' | 'notes' | 'discussions' | 'aiNotes'
  | 'flashcards' | 'quizzes' | 'media' | 'certificates' | 'liveSessions' | 'users';

type Role = 'student' | 'trainer' | 'administrator';

const tabMeta: Record<TabKey, { label: string; icon: any; page: string; roles: Role[] }> = {
  courses:      { label: 'Courses',         icon: BookOpen,     page: 'courses',               roles: ['student','trainer','administrator'] },
  lessons:      { label: 'Lessons',         icon: FileText,     page: 'courses',               roles: ['student','trainer','administrator'] },
  notes:        { label: 'My Notes',        icon: FileText,     page: 'courses',               roles: ['student','trainer','administrator'] },
  aiNotes:      { label: 'AI Notes',        icon: Bot,          page: 'courses',               roles: ['student','trainer','administrator'] },
  discussions:  { label: 'Discussions',     icon: MessageSquare,page: 'forum',                 roles: ['student','trainer','administrator'] },
  quizzes:      { label: 'Assessments',     icon: Brain,        page: 'assessments',           roles: ['student','trainer','administrator'] },
  flashcards:   { label: 'Flashcards',      icon: Zap,          page: 'byte-size-learning',    roles: ['student','trainer','administrator'] },
  media:        { label: 'Media Library',   icon: Video,        page: 'media-library',         roles: ['student','trainer','administrator'] },
  certificates: { label: 'Certificates',    icon: Award,        page: 'certificates',          roles: ['student','trainer','administrator'] },
  liveSessions: { label: 'Live Sessions',   icon: Calendar,     page: 'live-sessions',         roles: ['student','trainer','administrator'] },
  users:        { label: 'Users',           icon: Users,        page: 'user-management',       roles: ['administrator','trainer'] },
};

const AGGREGATE_ICON: Record<string, any> = {
  Users: Users, GraduationCap: GraduationCap, BookOpen: BookOpen,
  Clock: Clock, Award: Award, Video: Video, BarChart2: BarChart2,
};

const stripHtml = (html?: any) => {
  if (!html) return '';
  const str = typeof html === 'object' ? JSON.stringify(html) : String(html);
  return str.replace(/<[^>]*>?/gm, '');
};

const renderMarkdown = (text: any) => {
  if (!text) return null;
  const str = String(text);
  const lines = str.split('\n');
  
  return lines.map((line, idx) => {
    const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
    const isNumbered = /^\d+\.\s/.test(line.trim());
    
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const lineContent = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet || isNumbered) {
      let cleanContent = lineContent;
      if (typeof cleanContent[0] === 'string') {
        cleanContent[0] = cleanContent[0].replace(/^(\* |- |\d+\.\s)/, '');
      }
      return (
        <div key={idx} className="flex items-start gap-2 mt-1.5 mb-1.5 ml-2">
          <span className="text-indigo-500 font-bold mt-0.5">{isBullet ? '•' : line.trim().match(/^(\d+\.)/)?.[1] || '•'}</span>
          <span className="flex-1">{cleanContent}</span>
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-2" />;
    }

    return (
      <p key={idx} className="mb-2">
        {lineContent}
      </p>
    );
  });
};

// CATEGORY_KEYWORDS removed – intent detection now done server-side via AI expand endpoint.

const RECENTS_KEY = 'smart_search_recents';

const readRecents = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === 'string').slice(0, 10);
  } catch {
    return [];
  }
};

const writeRecents = (items: string[]) => {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {
    // ignore
  }
};

interface SuggestedQuery {
  label: string;
  description: string;
  icon: any;
}

interface TrendingTopic {
  label: string;
  reason: string;
  category: string;
}

const getSuggestionsForRole = (r: 'student' | 'trainer' | 'administrator'): SuggestedQuery[] => {
  if (r === 'student') {
    return [
      { label: "how to play course lectures", description: "Learn how to access course contents and play lecture videos", icon: BookOpen },
      { label: "give a quick quiz on cooperatives", description: "Take a practice assessment to test your knowledge", icon: Brain },
      { label: "ai tutor chat for study help", description: "Ask the AI tutor questions, clarify concepts, or request examples", icon: Bot },
      { label: "flashcard practice session", description: "Study micro-lessons and boost key concept recall", icon: Zap },
      { label: "download my learning certificates", description: "Access and print your earned certificates", icon: Award },
      { label: "show upcoming live webinars this week", description: "Check scheduled live sessions with trainers", icon: Video }
    ];
  }
  if (r === 'trainer') {
    return [
      { label: "how many students are enrolled", description: "Check registration and enrollment numbers for your courses", icon: Users },
      { label: "create a new quiz assessment", description: "Build automated quizzes and practice tests for students", icon: Brain },
      { label: "scheduled live sessions and webinars", description: "View or set up upcoming interactive classrooms", icon: Video },
      { label: "edit my active courses and lessons", description: "Update course descriptions, lessons, and content outline", icon: Edit3 },
      { label: "view student quiz submissions and grades", description: "Monitor quiz attempts, grades, and average scores", icon: BarChart2 },
      { label: "pending student questions in forum", description: "Answer student doubts and participate in forum threads", icon: MessageSquare }
    ];
  }
  // Administrator
  return [
    { label: "pending user registration approvals", description: "Approve new users, students, or trainers to the platform", icon: UserCheck },
    { label: "view platform active user list", description: "Browse all users, change roles, or manage accounts", icon: Users },
    { label: "how many certificates have been issued", description: "Audit certificates issued to students across all courses", icon: Award },
    { label: "manage trainer assignments", description: "Assign or modify instructors for active courses", icon: GraduationCap },
    { label: "audit system logs and AI usage metrics", description: "Track NVIDIA API token usage and latency diagnostics", icon: Clock },
    { label: "list all active courses on the platform", description: "See the catalog of courses, public registry, and status", icon: BookOpen }
  ];
};

const getTrendingForRole = (r: 'student' | 'trainer' | 'administrator'): TrendingTopic[] => {
  if (r === 'student') {
    return [
      { label: "Cooperative Law & Principles", reason: "Popular course content this week", category: "Courses" },
      { label: "Active Recall Flashcards", reason: "Highly used study method", category: "Flashcards" },
      { label: "Passing Criteria for Assessments", reason: "Frequently searched question", category: "Quizzes" },
      { label: "Video Lecture Summaries", reason: "Saved AI revision notes", category: "AI Notes" },
      { label: "Discussion Board Q&A", reason: "Active community chat", category: "Forum" }
    ];
  }
  if (r === 'trainer') {
    return [
      { label: "Student Completion Analytics", reason: "Key teaching performance indicator", category: "Analytics" },
      { label: "Live Webinar Class Scheduling", reason: "High volume of scheduled sessions", category: "Live Sessions" },
      { label: "Quiz Performance Reports", reason: "Review recent grade spreads", category: "Quizzes" },
      { label: "Curriculum Update Requests", reason: "Active course syllabus editing", category: "Courses" },
      { label: "Active Peer Discussions", reason: "High forum engagement", category: "Forum" }
    ];
  }
  // Administrator
  return [
    { label: "Pending Approvals Registry", reason: "Required admin task", category: "Users" },
    { label: "System Token Consumption", reason: "Track AI service credits", category: "System" },
    { label: "Trainer Load Assignments", reason: "Update instructor course loads", category: "Courses" },
    { label: "Issued Certificates Audit", reason: "Credentials verification", category: "Certificates" },
    { label: "User Role Modifications", reason: "Security auditing", category: "Users" }
  ];
};

const SUGGESTION_ICONS: Record<string, any> = {
  BookOpen: BookOpen,
  Brain: Brain,
  Bot: Bot,
  Zap: Zap,
  Award: Award,
  Video: Video,
  Users: Users,
  Edit3: Edit3,
  BarChart2: BarChart2,
  MessageSquare: MessageSquare,
  UserCheck: UserCheck,
  GraduationCap: GraduationCap,
  Clock: Clock,
};

export default function SmartSearch() {
  const role: Role = resolveRole();

  const [query, setQuery] = useState(() => {
    try { return localStorage.getItem('smart_search_persisted_query') || ''; } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(() => {
    try {
      const raw = localStorage.getItem('smart_search_persisted_results');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [recents, setRecents] = useState<string[]>(() => readRecents());
  const [listening, setListening] = useState(false);
  const [voiceLang] = useState('en');

  // ── Modal state for in-place actions ───────────────────────────────────
  const [modal, setModal] = useState<{ type: 'qr' | 'reply'; item: any } | null>(null);
  const [replyText, setReplyText] = useState('');

  const tabOrder: TabKey[] = useMemo(
    () => ['courses','lessons','liveSessions','notes','aiNotes','discussions','quizzes','flashcards','media','certificates','users'],
    [],
  );

  // Filter tabs by role permissions
  const visibleTabs = useMemo(
    () => tabOrder.filter((t) => tabMeta[t].roles.includes(role)),
    [role, tabOrder],
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      try {
        localStorage.removeItem('smart_search_persisted_query');
        localStorage.removeItem('smart_search_persisted_results');
      } catch {}
    }
  }, [query]);

  const navigate = (page: string) => {
    window.history.pushState({}, '', `/dashboard?page=${page}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      localStorage.setItem('smart_search_persisted_query', trimmed);
      const res = await smartSearch({ query: trimmed, limit: 6 });
      if (res.success) {
        setResults(res.data);
        localStorage.setItem('smart_search_persisted_results', JSON.stringify(res.data));
        const next = [trimmed, ...recents.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
        setRecents(next);
        writeRecents(next);
      } else {
        toast.error((res as any)?.data?.message || 'Search failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => runSearch(query);

  const startVoice = async () => {
    try {
      setListening(true);
      await voiceInputService.startRecording();
      toast.info('Listening… speak now');
    } catch (e: any) {
      toast.error(e?.message || 'Could not start microphone');
      setListening(false);
    }
  };

  const stopVoiceAndSearch = async () => {
    try {
      const text = await voiceInputService.stopAndTranscribe(voiceLang);
      const trimmed = text.trim();
      if (!trimmed) { toast.error('Could not detect speech'); return; }
      setQuery(trimmed);
      await runSearch(trimmed);
    } catch (e: any) {
      toast.error(e?.message || 'Voice search failed');
    } finally { setListening(false); }
  };

  // ── Action buttons per tab per role ────────────────────────────────────
  const renderActions = (t: TabKey, it: any) => {
    const btn = (label: string, icon: any, onClick: () => void, color = 'indigo') => {
      const Icon = icon;
      const cls = {
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
        green:  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
        amber:  'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        rose:   'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
      }[color] || '';
      return (
        <button key={label} onClick={(e) => { e.stopPropagation(); onClick(); }}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${cls}`}>
          <Icon className="w-3.5 h-3.5" />{label}
        </button>
      );
    };

    const go = (page: string) => navigate(page);

    if (t === 'courses') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {role === 'student' && btn('Resume Learning', Play, () => go(`courses&playCourseId=${it.courseId || it._id || it.id}`), 'indigo')}
        {role !== 'student' && btn('Edit Course', Edit3, () => go(`courses&editCourseId=${it.courseId || it._id || it.id}`), 'amber')}
        {role === 'administrator' && btn('Analytics', TrendingUp, () => go('analytics'), 'green')}
      </div>
    );

    if (t === 'lessons') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('Open Lesson', Play, () => go(`courses&playCourseId=${it.courseId || it._id}`), 'indigo')}
      </div>
    );

    if (t === 'quizzes') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {role === 'student' && btn('Start Assessment', Play, () => go(`assessments&takeAssessmentId=${it.id || it._id}`), 'indigo')}
        {role !== 'student' && btn('View Submissions', BarChart2, () => go(`assessments&viewSubmissionsId=${it.id || it._id}&viewSubmissionsTitle=${encodeURIComponent(it.title || '')}`), 'green')}
        {role !== 'student' && btn('Edit Questions', Edit3, () => go(`assessments&editAssessmentId=${it.id || it._id}`), 'amber')}
      </div>
    );

    if (t === 'certificates') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('View QR Code', QrCode, () => {
          const item = it._isDummy 
            ? { 
                certificateId: 'CERT-2026-DEMO89X', 
                metadata: { courseName: 'Introduction to Cooperative Management', studentName: 'Student Singh' }, 
                qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=CERT-2026-DEMO89X' 
              } 
            : it;
          setModal({ type: 'qr', item });
        }, 'indigo')}
        {btn('Download PDF', Download, () => go('certificates'), 'green')}
      </div>
    );

    if (t === 'discussions') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('Reply', Reply, () => {
          const item = it._isDummy 
            ? { question: 'How can I enroll in the upcoming Advanced Financial Literacy course?' } 
            : it;
          setModal({ type: 'reply', item });
        }, 'indigo')}
        {btn('Open Thread', ChevronRight, () => go('forum'), 'amber')}
      </div>
    );

    if (t === 'users' && role !== 'student') {
      const email = it.email || '';
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {email && btn('Send Email', Mail, () => { window.location.href = `mailto:${email}`; }, 'indigo')}
          {role === 'administrator' && btn('Approve', UserCheck, () => go('user-management'), 'green')}
          {role === 'administrator' && btn('Deactivate', UserX, () => go('user-management'), 'rose')}
        </div>
      );
    }

    if (t === 'liveSessions') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('Join Session', Play, () => go('live-sessions'), 'green')}
        {role !== 'student' && btn('Manage', Edit3, () => go('live-sessions'), 'amber')}
      </div>
    );

    if (t === 'media') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('Open Library', Play, () => go('media-library'), 'indigo')}
      </div>
    );

    if (t === 'flashcards') return (
      <div className="flex flex-wrap gap-2 mt-3">
        {btn('Practice Now', Zap, () => go('byte-size-learning'), 'indigo')}
      </div>
    );

    return null;
  };

  // ── Card content per tab ──────────────────────────────────────────────
  const renderCardBody = (t: TabKey, it: any) => {
    if (t === 'courses')      return <><p className="text-base font-bold text-slate-900">{it.title}</p><p className="text-sm text-slate-500 mt-1 line-clamp-2">{stripHtml(it.description)}</p></>;
    if (t === 'lessons')      return <><p className="text-base font-bold text-slate-900">{it.title}</p><p className="text-sm text-slate-500 mt-1">{it.courseTitle} · <span className="uppercase text-xs">{it.type}</span></p></>;
    if (t === 'notes')        return <><p className="text-base font-bold text-slate-900">Note · {it.courseTitle}</p><p className="text-sm text-slate-500 mt-1 line-clamp-3">{stripHtml(it.content)}</p></>;
    if (t === 'aiNotes')      return <><p className="text-base font-bold text-slate-900">AI Note · {it.lesson}</p><p className="text-sm text-slate-500 mt-1 line-clamp-3">{stripHtml(it.generated?.summary || it.summary)}</p></>;
    if (t === 'discussions')  return <><p className="text-base font-bold text-slate-900">{it.question}</p><p className="text-sm text-slate-500 mt-1">{it.courseTitle} · {it.status}</p></>;
    if (t === 'quizzes')      return <><p className="text-base font-bold text-slate-900">{it.title}</p><p className="text-sm text-slate-500 mt-1 line-clamp-2">{stripHtml(it.description)}</p></>;
    if (t === 'flashcards')   return <><p className="text-base font-bold text-slate-900">{it.front}</p><p className="text-sm text-slate-500 mt-1">Difficulty: {it.difficulty}</p></>;
    if (t === 'media')        return <><p className="text-base font-bold text-slate-900">{it.title}</p><p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{it.type}</p></>;
    if (t === 'certificates') return <><p className="text-base font-bold text-slate-900">{it.certificateId}</p><p className="text-sm text-slate-500 mt-1">{it.metadata?.courseName} · {it.metadata?.studentName}</p></>;
    if (t === 'liveSessions') return <><p className="text-base font-bold text-slate-900">{it.title}</p><p className="text-sm text-slate-500 mt-1 line-clamp-2">{stripHtml(it.description)}</p></>;
    if (t === 'users')        return <><p className="text-base font-bold text-slate-900">{it.firstName} {it.lastName}</p><p className="text-xs font-bold text-slate-400 mt-1 uppercase">{it.role} · <span className="lowercase font-normal">{it.email}</span></p></>;
    return null;
  };

  const intentCategory = results?.intentCategory as TabKey | null;

  const hasAnyResults = useMemo(() => {
    if (!results) return false;
    if (results.aggregates) return true;
    return visibleTabs.some((t) => {
      const dbItems = results.results?.[t] || [];
      const isIntentMatch = intentCategory === t;
      return dbItems.length > 0 || isIntentMatch;
    });
  }, [results, visibleTabs, intentCategory]);

  return (
    <PremiumPageShell>

      {/* ── In-place Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)} aria-label="Close modal" title="Close" className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>

            {modal.type === 'qr' && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><QrCode className="w-5 h-5 text-indigo-600" /></div>
                  <h3 className="text-lg font-black text-slate-900">Certificate QR Code</h3>
                </div>
                <p className="text-sm text-slate-500 mb-2">Certificate ID: <span className="font-bold text-slate-800">{modal.item?.certificateId}</span></p>
                <p className="text-sm text-slate-500">Course: <span className="font-semibold text-slate-700">{modal.item?.metadata?.courseName}</span></p>
                {(() => {
                  const qrUrl = modal.item?.qrCode || (modal.item?.certificateId ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(modal.item.certificateId)}` : null);
                  return qrUrl ? (
                    <img src={qrUrl} alt="QR Code" className="mt-4 w-40 h-40 mx-auto rounded-2xl border border-slate-200 shadow-md animate-fade-in" />
                  ) : (
                    <div className="mt-4 w-40 h-40 mx-auto rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">QR not available</div>
                  );
                })()}
                <button onClick={() => navigate('certificates')} className="mt-5 w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">Go to Certificates</button>
              </>
            )}

            {modal.type === 'reply' && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><Reply className="w-5 h-5 text-indigo-600" /></div>
                  <h3 className="text-lg font-black text-slate-900">Reply to Discussion</h3>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-3 line-clamp-3">{modal.item?.question}</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Type your reply…"
                  className="w-full border border-slate-200 rounded-2xl p-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { toast.info('Opening discussion thread…'); navigate('forum'); setModal(null); }}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">Open Thread</button>
                  <button onClick={() => setModal(null)} className="px-5 py-3 border border-slate-200 rounded-2xl font-semibold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Smart Search Hero ── */}
      <div className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-8 shadow-[0_12px_40px_rgba(79,70,229,.08)] lg:p-10">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.12)_1px,transparent_0)]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-200/60">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Smart Search</h2>
              <p className="text-sm text-slate-600">Search across your entire learning platform · AI-powered · Role-aware</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white/95 pl-12 pr-20 text-[15px] font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                placeholder="Search anything..."
              />
              <button
                type="button"
                onClick={() => listening ? stopVoiceAndSearch() : startVoice()}
                className={`absolute right-3 top-1/2 flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all ${
                  listening
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200/60'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Voice search"
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="hidden sm:inline">Voice</span>
              </button>
            </div>
            <button
              onClick={handleSearchSubmit}
              disabled={loading || !query.trim()}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Search
            </button>
          </div>

          {recents.length > 0 && !results && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Recent</span>
              {recents.slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); runSearch(s); }}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Results Area ── */}
      <div className="space-y-4">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-600" />
            <p className="font-medium">AI is searching across all modules…</p>
          </div>
        )}

        {!loading && results && (
          <div className="space-y-4">

            {/* Query Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Query</p>
                  <p className="text-2xl font-bold text-slate-900">{results.query}</p>
                  {results.originalQuery && results.originalQuery.toLowerCase() !== results.query.toLowerCase() && (
                    <p className="mt-1 text-xs text-indigo-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Auto-corrected from "{results.originalQuery}"
                    </p>
                  )}
                </div>
                {intentCategory && tabMeta[intentCategory] && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <TrendingUp className="h-3.5 w-3.5" /> Top Intent: {tabMeta[intentCategory].label}
                  </span>
                )}
              </div>

              {((results.suggestions && results.suggestions.length > 0) || (results.trending && results.trending.length > 0)) && (
                <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
                  {results.suggestions && results.suggestions.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Related AI Queries
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {results.suggestions.map((s: any, idx: number) => {
                          const label = typeof s === 'object' && s !== null ? s.label || s.text || s.topic || '' : String(s);
                          if (!label) return null;
                          return (
                            <button
                              key={`${label}-${idx}`}
                              onClick={() => { setQuery(label); runSearch(label); }}
                              className="rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="hidden h-full w-px bg-slate-100 md:block" />
                  {results.trending && results.trending.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Trending Topics
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {results.trending.map((s: any, idx: number) => {
                          const label = typeof s === 'object' && s !== null ? s.label || s.text || s.topic || '' : String(s);
                          if (!label) return null;
                          return (
                            <button
                              key={`${label}-${idx}`}
                              onClick={() => { setQuery(label); runSearch(label); }}
                              className="rounded-full border border-emerald-100 bg-emerald-50/60 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Aggregate metric widget (admin only) */}
            {results.aggregates && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 flex items-center gap-5 shadow-lg shadow-emerald-100">
                {(() => { const Icon = AGGREGATE_ICON[results.aggregates.icon] || BarChart2; return <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center"><Icon className="w-7 h-7 text-white" /></div>; })()}
                <div>
                  <p className="text-white/80 text-sm font-semibold">{results.aggregates.label}</p>
                  <p className="text-white text-4xl font-black tracking-tight">{results.aggregates.count?.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Special Feature Quick-Action Link */}
            {results.featureIntent && !(results.featureIntent.key === 'aiTutor' && role !== 'student') && (
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 border border-indigo-500/20 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-200 shrink-0 mt-0.5">
                    {(() => {
                      const key = results.featureIntent.key;
                      if (key === 'aiTutor') return <Bot className="w-6 h-6" />;
                      if (key === 'byteLearning') return <Zap className="w-6 h-6" />;
                      return <Calendar className="w-6 h-6" />;
                    })()}
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300/80 bg-indigo-500/20 px-2 py-0.5 rounded-md">Feature Quick Action</span>
                    <h3 className="text-lg font-bold text-white mt-1">{results.featureIntent.label}</h3>
                    <p className="text-sm text-indigo-200/80 mt-1 max-w-md">{results.featureIntent.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(results.featureIntent.page)}
                  className="self-start sm:self-center px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
                >
                  <span>{results.featureIntent.actionLabel}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* AI Overview */}
            {results.aiAnswer && (
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-500 to-cyan-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-200/60">
                      <Bot className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">AI Overview</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-8">
                    <div>
                      {(() => {
                        const ans = stripHtml(results.aiAnswer);
                        const isFallback = ans.toLowerCase().includes("couldn't find") || ans.toLowerCase().includes('however,');
                        if (isFallback) {
                          const idx = ans.toLowerCase().indexOf('however');
                          const failMsg = idx !== -1 ? ans.substring(0, idx).trim() : 'No direct context found.';
                          const genMsg = idx !== -1 ? ans.substring(idx).trim() : ans;
                          return (
                            <div className="space-y-4">
                              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 p-4 text-sm font-semibold text-amber-900 flex items-start gap-3">
                                <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                                <p>{failMsg.replace(/^based on.*?, /i, '') || 'Context unavailable.'}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-[15px] text-slate-700 leading-relaxed">
                                <span className="mb-2 flex items-center gap-2 font-bold text-emerald-600"><Bot className="h-4 w-4" />General AI Knowledge</span>
                                {renderMarkdown(genMsg.replace(/^However,\s*(here is|here's|in general).*?:?\s*/i, '').trim())}
                              </div>
                            </div>
                          );
                        }
                        return <div className="text-[16px] text-slate-700 leading-relaxed">{renderMarkdown(ans)}</div>;
                      })()}
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                      <h4 className="text-sm font-bold text-slate-900 mb-3">Additional Tips</h4>
                      <ul className="space-y-2 text-sm text-slate-600">
                        {[
                          'Make sure you have the necessary software or plugins installed to play the lecture format.',
                          'Check the course settings or instructor instructions for restrictions on playing lectures.',
                          'If you experience errors while playing the lecture, contact the LMS support team or instructor.',
                          'If LMS context is empty, provide general information and ask for clarification.',
                        ].map((tip) => (
                          <li key={tip} className="flex items-start gap-2">
                            <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                              <CheckCircle className="h-3 w-3" />
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category result cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {visibleTabs.map((t) => {
                const dbItems: any[] = results.results?.[t] || [];
                const isIntentMatch = intentCategory === t;
                const items = dbItems.length === 0 && isIntentMatch ? [{ _isDummy: true }] : dbItems;
                if (!items.length) return null;
                const meta = tabMeta[t];
                const Icon = meta.icon;
                return (
                  <div key={t} className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${intentCategory === t ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{meta.label}</h3>
                        {intentCategory === t && <span className="text-xs font-semibold text-indigo-600">Top Match</span>}
                      </div>
                      <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{dbItems.length} found</span>
                    </div>
                    <div className="grid gap-4 p-5">
                      {items.map((it: any, idx: number) => {
                        if (it._isDummy) return (
                          <div key={`dummy-${t}`} onClick={() => navigate(meta.page)}
                            className="group p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/40 cursor-pointer transition-all">
                            <p className="font-bold text-slate-900 group-hover:text-indigo-700">Go to {meta.label}</p>
                            <p className="text-sm text-slate-500 mt-1">Click to open the {meta.label} module</p>
                          </div>
                        );
                        return (
                          <div key={it._id || idx}
                            onClick={() => navigate(meta.page)}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/30 cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <div className="relative z-10">
                              {renderCardBody(t, it)}
                              {renderActions(t, it)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {!hasAnyResults && (
              <div className="mx-auto max-w-lg rounded-[2rem] border border-slate-200/80 bg-white p-10 text-center text-slate-500 shadow-md animate-fade-in">
                <Search className="mx-auto mb-3 h-12 w-12 text-indigo-400" />
                <p className="text-lg font-black text-slate-900">No results found</p>
                <p className="mt-2 text-sm text-slate-400">Try a different keyword or check your filters.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {getSuggestionsForRole(role).slice(0, 3).map((s) => (
                    <button key={s.label} onClick={() => { setQuery(s.label); runSearch(s.label); }}
                      className="rounded-xl border border-indigo-100/60 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
 
        {!loading && !results && (
          <div className="space-y-6 animate-fade-in">
            {/* Role Personalized Welcome Banner */}
            <div className="bg-gradient-to-r from-sky-100/60 via-blue-50/50 to-indigo-100/60 rounded-[2rem] p-6 text-blue-950 border border-blue-200/40 shadow-md overflow-hidden relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-lg transition-all duration-300">
              <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                  role === 'student' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
                  role === 'trainer' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                  'bg-emerald-100 border-emerald-200 text-emerald-600'
                }`}>
                  {role === 'student' ? <GraduationCap className="w-7 h-7" /> :
                   role === 'trainer' ? <Users className="w-7 h-7" /> :
                   <UserCheck className="w-7 h-7" />}
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    role === 'student' ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700' :
                    role === 'trainer' ? 'bg-amber-50 border-amber-200/60 text-amber-700' :
                    'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                  }`}>
                    {role === 'student' ? 'Student Workspace' : role === 'trainer' ? 'Trainer Console' : 'Administrator Control'}
                  </span>
                  <h3 className="text-xl font-black mt-1 tracking-tight text-blue-950">Tailored Search Suggestions</h3>
                  <p className="text-sm text-blue-800/80 mt-0.5 font-medium">Quick-access recommendations computed specifically for your role access level.</p>
                </div>
              </div>
            </div>

            {/* Suggestions & Trending Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Suggested Queries Card */}
              <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center"><Sparkles className="w-4.5 h-4.5 text-indigo-600" /></div>
                    Suggested Queries
                  </h4>
                  <span className="text-xs font-semibold text-slate-400">Click to run query</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  {getSuggestionsForRole(role).map((s) => {
                    const Icon = s.icon;
                    return (
                      <button key={s.label} onClick={() => { setQuery(s.label); runSearch(s.label); }}
                        className="group text-left p-4 bg-slate-50/50 hover:bg-indigo-50/40 border border-slate-100 hover:border-indigo-150 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100/20 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-500 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-950 transition-colors line-clamp-1">{s.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 group-hover:text-indigo-600/80 transition-colors font-medium leading-relaxed line-clamp-2">{s.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trending Topics Card */}
              <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4.5 h-4.5 text-emerald-600" /></div>
                    Trending Topics
                  </h4>
                  <span className="text-xs font-semibold text-slate-400">Live topics</span>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {getTrendingForRole(role).map((t) => (
                    <button key={t.label} onClick={() => { setQuery(t.label); runSearch(t.label); }}
                      className="group text-left p-3.5 bg-slate-50/50 hover:bg-emerald-50/30 border border-slate-100 hover:border-emerald-150 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/20 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping group-hover:bg-emerald-500" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-950 transition-colors">{t.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{t.reason}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-500 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors shrink-0">
                        {t.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-4 py-3 text-white shadow-xl shadow-indigo-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Bot className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-sm font-semibold">AI Assistant</span>
            <span className="block text-xs text-slate-300">Open chatbot</span>
          </span>
        </button>
      </div>
    </PremiumPageShell>
  );
}
