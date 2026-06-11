import {
  Video, Calendar, Clock, Users, ExternalLink, CheckCircle, Plus,
  X, ArrowLeft, Link, Mic, Monitor, RefreshCw, Bell, ChevronRight,
  Play, BookOpen, BarChart3, Edit2, Trash2, Copy, Loader2,
  GraduationCap, Send, ShieldCheck, Sparkles, ArrowRight, Bot, Fingerprint,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, type ElementType, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  getAllLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  joinLiveSession,
  leaveLiveSession,
  LiveSession,
  CreateSessionData
} from '../services/liveSessionService';

interface LiveSessionsProps {
  userRole: 'admin' | 'trainer' | 'participant';
}

type Platform = 'Zoom' | 'Google Meet' | 'Microsoft Teams' | 'Webex' | 'YouTube Live' | 'Custom';
type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly';

interface SessionForm {
  title: string;
  course: string;
  module: string;
  description: string;
  agenda: string;
  date: string;
  time: string;
  duration: number;
  platform: Platform;
  joinLink: string;
  meetingId: string;
  passcode: string;
  maxCapacity: number;
  recurring: RecurringType;
  recurringEnd: string;
  sendReminder: boolean;
  reminderMinutes: number;
  allowRecording: boolean;
  waitingRoom: boolean;
  requireRegistration: boolean;
  hostEmail: string;
  coHosts: string;
  materials: string;
  tags: string;
}

const EMPTY_FORM: SessionForm = {
  title: '', course: '', module: '', description: '', agenda: '',
  date: '', time: '', duration: 60, platform: 'Zoom',
  joinLink: '', meetingId: '', passcode: '',
  maxCapacity: 50, recurring: 'none', recurringEnd: '',
  sendReminder: true, reminderMinutes: 30, allowRecording: true,
  waitingRoom: false, requireRegistration: false,
  hostEmail: '', coHosts: '', materials: '', tags: '',
};

const PLATFORM_COLORS: Record<Platform, string> = {
  'Zoom': 'bg-blue-100 text-blue-700',
  'Google Meet': 'bg-green-100 text-green-700',
  'Microsoft Teams': 'bg-purple-100 text-purple-700',
  'Webex': 'bg-orange-100 text-orange-700',
  'YouTube Live': 'bg-red-100 text-red-700',
  'Custom': 'bg-gray-100 text-gray-700',
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function GovernmentIllustration() {
  return (
    <svg width="420" height="180" viewBox="0 0 420 180" fill="none" aria-hidden="true">
      <path d="M34 158H386M64 158V94H356V158M88 94V70H332V94M136 70V48H284V70" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      <path d="M186 48C186 34.745 196.745 24 210 24C223.255 24 234 34.745 234 48" stroke="#4F46E5" strokeWidth="2" />
      <path d="M206 24V12M192 30L182 18M228 30L238 18" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      {[104, 136, 168, 200, 232, 264, 296].map((x) => (
        <path key={x} d={`M${x} 158V94`} stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
      ))}
      <path d="M116 124H144M180 124H208M244 124H272M308 124H336" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DotGrid() {
  return (
    <svg width="160" height="100" viewBox="0 0 160 100" fill="none" aria-hidden="true">
      {Array.from({ length: 45 }).map((_, i) => (
        <circle key={i} cx={(i % 9) * 18 + 4} cy={Math.floor(i / 9) * 18 + 4} r="2" fill="#4F46E5" />
      ))}
    </svg>
  );
}

function DashboardWave() {
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 240" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 136C144 86 253 87 377 127C520 173 639 176 782 123C919 72 1030 66 1200 108V240H0V136Z" fill="url(#waveA)" />
      <path d="M0 96C147 142 260 154 403 117C566 75 724 72 871 118C1001 159 1094 168 1200 134" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="waveA" x1="0" y1="80" x2="1200" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" stopOpacity=".28" />
          <stop offset=".52" stopColor="#14B8A6" stopOpacity=".16" />
          <stop offset="1" stopColor="#2563EB" stopOpacity=".22" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function EmptySessionIllustration({ type }: { type: 'upcoming' | 'past' }) {
  if (type === 'past') {
    return (
      <svg className="h-32 w-56" viewBox="0 0 260 150" fill="none" aria-hidden="true">
        <ellipse cx="130" cy="130" rx="86" ry="12" fill="#E0E7FF" />
        <rect x="76" y="78" width="96" height="18" rx="6" fill="#C7D2FE" />
        <rect x="88" y="58" width="98" height="20" rx="6" fill="#DBEAFE" />
        <rect x="68" y="98" width="116" height="22" rx="7" fill="#F5D0FE" />
        <circle cx="176" cy="58" r="28" fill="white" stroke="#A5B4FC" strokeWidth="4" />
        <path d="M176 42V58L188 66" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
        <path d="M52 104C44 91 45 80 59 72C64 85 64 96 52 104Z" fill="#99F6E4" />
        <path d="M203 106C213 94 216 83 206 73C197 86 194 96 203 106Z" fill="#BFDBFE" />
      </svg>
    );
  }

  return (
    <svg className="h-36 w-56" viewBox="0 0 260 160" fill="none" aria-hidden="true">
      <ellipse cx="130" cy="137" rx="82" ry="12" fill="#E0E7FF" />
      <rect x="70" y="38" width="120" height="92" rx="16" fill="white" stroke="#C7D2FE" strokeWidth="4" />
      <path d="M70 62H190" stroke="#C7D2FE" strokeWidth="4" />
      <path d="M98 28V48M162 28V48" stroke="#7C3AED" strokeWidth="8" strokeLinecap="round" />
      <circle cx="130" cy="92" r="23" fill="#8B5CF6" />
      <path d="M124 80L146 92L124 105V80Z" fill="white" />
      <path d="M48 96H36M218 72H206M210 112L200 118M55 58L45 52" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="209" cy="42" r="4" fill="#C084FC" />
      <circle cx="50" cy="122" r="4" fill="#93C5FD" />
    </svg>
  );
}

function FloatingBackground() {
  const floatingIcons = [
    { Icon: BookOpen, className: 'right-10 top-24 rotate-12 text-indigo-300', delay: 0 },
    { Icon: Calendar, className: 'left-[48%] top-24 -rotate-6 text-blue-300', delay: 1.2 },
    { Icon: GraduationCap, className: 'left-[42%] top-44 text-indigo-300', delay: 2.1 },
    { Icon: Play, className: 'right-[13%] top-56 text-teal-300', delay: .7 },
    { Icon: Clock, className: 'left-[58%] top-[440px] text-sky-300', delay: 1.7 },
    { Icon: Send, className: 'right-[33%] top-[500px] text-pink-300', delay: 2.8 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute right-0 top-0 opacity-5"><GovernmentIllustration /></div>
      <div className="absolute left-1/2 top-20 -translate-x-1/2 opacity-5"><DotGrid /></div>
      <div className="absolute inset-x-0 top-16 h-52 opacity-10 blur-[1px]"><DashboardWave /></div>
      <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-[#4F46E5]/10 blur-3xl" />
      <div className="absolute right-8 top-72 h-80 w-80 rounded-full bg-[#14B8A6]/10 blur-3xl" />
      <div className="absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />
      {floatingIcons.map(({ Icon, className, delay }) => (
        <motion.div
          key={className}
          className={`absolute hidden lg:block ${className}`}
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 6, delay, ease: 'easeInOut' }}
        >
          <Icon className="h-9 w-9" strokeWidth={1.7} />
        </motion.div>
      ))}
    </div>
  );
}

type StatCardItem = {
  title: string;
  value: number;
  description: string;
  Icon: ElementType;
  tone: string;
  iconTone: string;
  accent: string;
};

function StatCard({ item }: { item: StatCardItem }) {
  const Icon = item.Icon;
  return (
    <article className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${item.tone} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
      <div className="absolute inset-0 bg-white/40" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-8 ring-white/70 ${item.iconTone}`}>
            <Icon className="h-7 w-7" strokeWidth={2} />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-slate-950">{item.value}</p>
            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-500">{item.description}</p>
          </div>
        </div>
        <div className="flex h-12 items-end gap-1.5 opacity-60">
          <span className={`h-3 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-5 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-2 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-6 w-1.5 rounded-full ${item.accent}`} />
          <span className={`h-4 w-1.5 rounded-full ${item.accent}`} />
        </div>
      </div>
    </article>
  );
}

function EmptyStateCard({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-6 text-center sm:p-10">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

function AverageAttendanceCard({ percentage }: { percentage: number }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-600" />
        <h4 className="font-semibold text-slate-950">Avg Attendance</h4>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-4xl font-bold tracking-tight text-indigo-700">{percentage}%</p>
          <p className="mt-1 text-sm text-slate-500">Across all past sessions</p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-indigo-100 bg-white shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white text-sm font-bold text-indigo-700">
            {percentage}%
          </div>
        </div>
      </div>
    </article>
  );
}

function BiometricSyncCard() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-indigo-600" />
        <h4 className="font-semibold text-slate-950">Biometric Attendance Sync</h4>
      </div>
      <p className="text-sm leading-6 text-slate-500">Sync attendance data with biometric devices for accurate tracking.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="inline-flex h-11 items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-sm">
          Configure Biometric Sync
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> System Active
        </div>
      </div>
    </article>
  );
}

function AssistantButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-4 py-3 text-white shadow-xl shadow-indigo-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/20">
          <Bot className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-semibold">AI Assistant</span>
          <span className="block text-xs text-slate-300">How can I help?</span>
        </span>
        <Sparkles className="hidden h-4 w-4 text-cyan-300 sm:block" />
      </button>
    </div>
  );
}

export function LiveSessions({ userRole }: LiveSessionsProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerStep, setSchedulerStep] = useState(0);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [pastSessions, setPastSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);

  const set = (key: keyof SessionForm, val: any) => setForm((f) => ({ ...f, [key]: val }));

  // Load sessions and courses on mount
  useEffect(() => {
    loadSessions();
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 Loading sessions...');
      
      // Get upcoming sessions
      const upcomingResponse = await getAllLiveSessions({ upcoming: true });
      console.log('📊 Upcoming response:', upcomingResponse);
      console.log('📊 First session data:', upcomingResponse.data?.[0]);
      console.log('📊 First session enrolled students:', upcomingResponse.data?.[0]?.enrolledStudents);
      setSessions(upcomingResponse.data || []);

      // Get past sessions
      const pastResponse = await getAllLiveSessions({ past: true });
      console.log('📊 Past response:', pastResponse);
      setPastSessions(pastResponse.data || []);

      console.log('✅ Loaded sessions:', upcomingResponse.count, 'upcoming,', pastResponse.count, 'past');
    } catch (error: any) {
      console.error('❌ Error loading sessions:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const STEPS_LABELS = ['Basic Info', 'Platform & Link', 'Settings', 'Review'];

  const handleSave = async () => {
    console.log('📝 Form data before validation:', {
      title: form.title,
      date: form.date,
      time: form.time,
      joinLink: form.joinLink,
      platform: form.platform,
      duration: form.duration
    });
    
    // Check required fields
    const missingFields = [];
    if (!form.title || form.title.trim() === '') missingFields.push('Title');
    if (!form.date || form.date.trim() === '') missingFields.push('Date');
    if (!form.time || form.time.trim() === '') missingFields.push('Start Time');
    if (!form.joinLink || form.joinLink.trim() === '') missingFields.push('Join Link');
    
    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      toast.error(`Missing required fields: ${missingFields.join(', ')}`, {
        duration: 5000,
        description: 'Please go back and fill all required fields marked with *'
      });
      
      // Navigate to first step with missing field
      if (missingFields.includes('Title') || missingFields.includes('Date') || missingFields.includes('Start Time')) {
        setSchedulerStep(0);
      } else if (missingFields.includes('Join Link')) {
        setSchedulerStep(1);
      }
      return;
    }

    console.log('✅ All required fields filled, submitting...');

    try {
      setSubmitting(true);

      const sessionData: CreateSessionData = {
        title: form.title,
        course: form.course || undefined,
        module: form.module,
        description: form.description,
        agenda: form.agenda,
        date: form.date,
        startTime: form.time,
        duration: form.duration,
        platform: form.platform,
        joinLink: form.joinLink,
        meetingId: form.meetingId,
        passcode: form.passcode,
        hostEmail: form.hostEmail,
        coHosts: form.coHosts,
        maxCapacity: form.maxCapacity,
        recurring: {
          type: form.recurring,
          endDate: form.recurringEnd || undefined
        },
        requireRegistration: form.requireRegistration,
        allowRecording: form.allowRecording,
        waitingRoom: form.waitingRoom,
        sendReminder: form.sendReminder,
        reminderMinutes: form.reminderMinutes,
        materials: form.materials,
        tags: form.tags
      };

      if (editingId) {
        // Update existing session
        await updateLiveSession(editingId, sessionData);
        toast.success('Session updated successfully!');
      } else {
        // Create new session
        await createLiveSession(sessionData);
        toast.success('Session created successfully!');
      }

      // Reload sessions
      await loadSessions();

      // Reset form
      setShowScheduler(false);
      setSchedulerStep(0);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error(error.response?.data?.message || 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await deleteLiveSession(sessionId);
      toast.success('Session deleted successfully');
      await loadSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  const handleJoinAndRedirect = async (session: LiveSession) => {
    try {
      // If not enrolled, enroll first
      if (!session.isEnrolled) {
        await joinLiveSession(session._id);
        toast.success('Successfully enrolled in session!');
      }
      
      // Open meeting link in new tab
      window.open(session.joinLink, '_blank');
      
      // Reload sessions to update enrollment status
      await loadSessions();
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast.error(error.response?.data?.message || 'Failed to join session');
    }
  };

  const handleLeave = async (sessionId: string) => {
    if (!confirm('Are you sure you want to leave this session?')) {
      return;
    }

    try {
      await leaveLiveSession(sessionId);
      toast.success('Successfully left the session');
      await loadSessions();
    } catch (error: any) {
      console.error('Error leaving session:', error);
      toast.error(error.response?.data?.message || 'Failed to leave session');
    }
  };

  // ── Scheduler full-page ──────────────────────────────────────────────────────
  if (showScheduler) {
    return (
      <div className="min-h-screen bg-[#FAFBFF]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => { setShowScheduler(false); setSchedulerStep(0); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" /><span className="font-medium">Back</span>
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Session' : 'Schedule New Session'}</h1>
              <p className="text-xs text-gray-500">Step {schedulerStep + 1} of {STEPS_LABELS.length}</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={submitting} className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Session'
            )}
          </button>
        </div>

        {/* Step bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center gap-1">
            {STEPS_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => idx <= schedulerStep && setSchedulerStep(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  idx === schedulerStep ? 'bg-indigo-600 text-white' :
                  idx < schedulerStep ? 'bg-green-100 text-green-700 cursor-pointer' :
                  'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {idx < schedulerStep && <CheckCircle className="w-4 h-4" />}
                {label}
                {idx < STEPS_LABELS.length - 1 && <ChevronRight className="w-3 h-3 ml-1 opacity-40" />}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-6 space-y-6">
          {/* Step 0: Basic Info */}
          {schedulerStep === 0 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-600" /> Session Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Title <span className="text-red-500">*</span></label>
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g., Introduction to Cooperative Governance" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                    <select value={form.course} onChange={(e) => set('course', e.target.value)} aria-label="Course" title="Course" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select course…</option>
                      {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module / Topic</label>
                    <input value={form.module} onChange={(e) => set('module', e.target.value)} placeholder="e.g., Module 3: Governance" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What will be covered in this session?" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Agenda (one item per line)</label>
                  <textarea rows={4} value={form.agenda} onChange={(e) => set('agenda', e.target.value)} placeholder={"1. Welcome & introductions\n2. Governance frameworks overview\n3. Live Q&A\n4. Wrap-up"} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                  <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="governance, live, Q&A" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-600" /> Schedule</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
                    <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} aria-label="Session date" title="Session date" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                    <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)} aria-label="Start time" title="Start time" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <select value={form.duration} onChange={(e) => set('duration', +e.target.value)} aria-label="Duration" title="Duration" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {[30,45,60,90,120,150,180,240].map((d) => <option key={d} value={d}>{d} min {d >= 60 ? `(${d/60}h)` : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recurring</label>
                    <select value={form.recurring} onChange={(e) => set('recurring', e.target.value as RecurringType)} aria-label="Recurring" title="Recurring" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  {form.recurring !== 'none' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Repeat Until</label>
                      <input type="date" value={form.recurringEnd} onChange={(e) => set('recurringEnd', e.target.value)} aria-label="Repeat until" title="Repeat until" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Platform & Link */}
          {schedulerStep === 1 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Monitor className="w-5 h-5 text-indigo-600" /> Platform</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(['Zoom','Google Meet','Microsoft Teams','Webex','YouTube Live','Custom'] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => set('platform', p)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${form.platform === p ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className="font-semibold text-sm text-gray-900">{p}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Link className="w-5 h-5 text-indigo-600" /> Meeting Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Join Link <span className="text-red-500">*</span></label>
                  <input value={form.joinLink} onChange={(e) => set('joinLink', e.target.value)} placeholder="https://zoom.us/j/..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting ID</label>
                    <input value={form.meetingId} onChange={(e) => set('meetingId', e.target.value)} placeholder="123 456 7890" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Passcode</label>
                    <input value={form.passcode} onChange={(e) => set('passcode', e.target.value)} placeholder="Optional" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Host Email</label>
                  <input type="email" value={form.hostEmail} onChange={(e) => set('hostEmail', e.target.value)} placeholder="trainer@ncui.in" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Co-hosts (comma-separated emails)</label>
                  <input value={form.coHosts} onChange={(e) => set('coHosts', e.target.value)} placeholder="cohost1@ncui.in, cohost2@ncui.in" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pre-session Materials (links, comma-separated)</label>
                  <textarea rows={2} value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {schedulerStep === 2 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Capacity & Registration</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                    <input type="number" min={1} max={1000} value={form.maxCapacity} onChange={(e) => set('maxCapacity', +e.target.value)} aria-label="Max capacity" title="Max capacity" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.requireRegistration} onChange={(e) => set('requireRegistration', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                      <span className="text-sm font-medium text-gray-700">Require pre-registration</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-indigo-600" /> Notifications & Reminders</h2>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.sendReminder} onChange={(e) => set('sendReminder', e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Send reminder to enrolled students</span>
                </label>
                {form.sendReminder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remind before session</label>
                    <select value={form.reminderMinutes} onChange={(e) => set('reminderMinutes', +e.target.value)} aria-label="Reminder timing" title="Reminder timing" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value={15}>15 minutes before</option>
                      <option value={30}>30 minutes before</option>
                      <option value={60}>1 hour before</option>
                      <option value={1440}>1 day before</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Video className="w-5 h-5 text-indigo-600" /> Session Options</h2>
                {[
                  { key: 'allowRecording', label: 'Allow session recording', desc: 'Recording will be made available after the session' },
                  { key: 'waitingRoom', label: 'Enable waiting room', desc: 'Host manually admits participants' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                    <input type="checkbox" checked={(form as any)[key]} onChange={(e) => set(key as any, e.target.checked)} className="w-5 h-5 text-indigo-600 rounded mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {schedulerStep === 3 && (
            <div className="space-y-5">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">Review & Confirm</h2>
                <p className="text-sm text-gray-600">Double-check everything before scheduling.</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                {[
                  ['Title', form.title || '—'],
                  ['Course', form.course || '—'],
                  ['Date & Time', form.date && form.time ? `${form.date} at ${form.time}` : '—'],
                  ['Duration', `${form.duration} minutes`],
                  ['Platform', form.platform],
                  ['Max Capacity', String(form.maxCapacity)],
                  ['Recurring', form.recurring === 'none' ? 'No' : `${form.recurring} until ${form.recurringEnd || '—'}`],
                  ['Recording', form.allowRecording ? 'Allowed' : 'Not allowed'],
                  ['Reminder', form.sendReminder ? `${form.reminderMinutes} min before` : 'No reminder'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Session'
                )}
              </button>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setSchedulerStep((s) => Math.max(0, s - 1))}
              disabled={schedulerStep === 0}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            {schedulerStep < STEPS_LABELS.length - 1 && (
              <button
                onClick={() => setSchedulerStep((s) => s + 1)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'participant') {
    const student = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    })();

    const attendedCount = pastSessions.filter((session) =>
      session.enrolledStudents?.some((enrollment) => {
        const enrolledStudent = enrollment.student;
        const studentId = typeof enrolledStudent === 'string' ? enrolledStudent : enrolledStudent?._id;
        return studentId === student?._id && enrollment.attended;
      })
    ).length;

    const stats = [
      { label: 'Upcoming', value: sessions.length, detail: 'Sessions to join', Icon: Calendar, accent: 'text-blue-600', iconBg: 'bg-blue-50', tone: 'from-blue-50 via-sky-50 to-white', watermark: Calendar },
      { label: 'Attended', value: attendedCount, detail: 'Sessions completed', Icon: CheckCircle, accent: 'text-emerald-600', iconBg: 'bg-emerald-50', tone: 'from-emerald-50 via-teal-50 to-white', watermark: ShieldCheck },
      { label: 'Recordings', value: pastSessions.filter((session) => session.recordingAvailable).length, detail: 'Available to watch', Icon: Video, accent: 'text-violet-600', iconBg: 'bg-violet-50', tone: 'from-violet-50 via-purple-50 to-white', watermark: Play },
      { label: 'Enrolled', value: sessions.filter((session) => session.isEnrolled).length, detail: 'Active enrollments', Icon: Users, accent: 'text-pink-600', iconBg: 'bg-pink-50', tone: 'from-pink-50 via-rose-50 to-white', watermark: Users },
    ];

    return (
      <div className="relative -m-4 min-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] bg-[#F8FAFC] text-slate-950 sm:-m-6 lg:-m-8">
        <FloatingBackground />

        <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <main className="space-y-6">
            <motion.section initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: .5, delay: .08, ease: 'easeOut' }} className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/55 px-5 py-8 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl sm:px-7">
              <div className="absolute inset-0 opacity-10 blur-[1px]"><DashboardWave /></div>
              <div className="absolute right-12 top-4 opacity-10"><GovernmentIllustration /></div>
              <motion.div className="absolute right-24 top-10 hidden text-indigo-300 lg:block" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}><GraduationCap className="h-12 w-12" strokeWidth={1.6} /></motion.div>
              <div className="relative max-w-3xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700"><Sparkles className="h-3.5 w-3.5" />AI powered interface</p>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Live Sessions</h1>
                <p className="mt-3 text-base font-medium text-slate-600">Join interactive sessions with expert trainers</p>
              </div>
            </motion.section>

            <motion.section initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: .5, delay: .16, ease: 'easeOut' }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.Icon;
                const Watermark = stat.watermark;
                return (
                  <motion.article key={stat.label} whileHover={{ y: -8, scale: 1.02 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className={`group relative overflow-hidden rounded-[24px] border border-white/80 bg-gradient-to-br ${stat.tone} p-5 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl`}>
                    <div className="absolute inset-0 bg-white/38" />
                    <Watermark className={`absolute -bottom-5 -right-4 h-24 w-24 ${stat.accent} opacity-10 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.6} />
                    <div className="relative flex items-center gap-4">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${stat.iconBg} ring-8 ring-white/45`}><Icon className={`h-8 w-8 ${stat.accent}`} strokeWidth={2.1} /></div>
                      <div><p className="text-3xl font-black tracking-tight text-slate-950">{loading ? '...' : stat.value}</p><p className="text-sm font-bold text-slate-800">{stat.label}</p><p className="mt-1 text-xs font-medium text-slate-500">{stat.detail}</p></div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.section>

            {loading ? (
              <section className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-white/80 bg-white/82 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></section>
            ) : (
              <>
                <motion.section initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: .5, delay: .24, ease: 'easeOut' }} className="rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl">
                  <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-black text-slate-950">Upcoming Sessions</h2><button className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 transition-all hover:text-indigo-700">View all sessions <ArrowRight className="h-4 w-4" /></button></div>
                  {sessions.length === 0 ? (
                    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[22px] border border-dashed border-indigo-200 bg-gradient-to-br from-white via-indigo-50/35 to-sky-50/40 px-5 py-10 text-center">
                      <EmptySessionIllustration type="upcoming" />
                      <h3 className="mt-1 text-xl font-black text-slate-950">No Upcoming Sessions</h3>
                      <p className="mt-2 max-w-md text-sm font-medium text-slate-500">There are no live sessions scheduled at the moment.</p>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: .98 }} className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:shadow-[0_18px_38px_-16px_rgba(79,70,229,.95)]">Explore Live Sessions <ArrowRight className="h-4 w-4" /></motion.button>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {sessions.map((session) => (
                        <motion.article key={session._id} whileHover={{ y: -6, scale: 1.01 }} className="rounded-[22px] border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${PLATFORM_COLORS[session.platform]}`}>{session.platform}</span>
                              <h3 className="mt-3 truncate text-lg font-black text-slate-950">{session.title}</h3>
                              <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium text-slate-600">
                                <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-500" />{new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-teal-500" />{session.startTime} - {session.duration}min</span>
                                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-pink-500" />{session.enrolledCount}/{session.maxCapacity}</span>
                              </div>
                              <p className="mt-3 text-sm text-slate-500">by {session.trainer?.name || 'Expert Trainer'}</p>
                            </div>
                            <button onClick={() => handleJoinAndRedirect(session)} disabled={session.isFull && !session.isEnrolled} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_12px_24px_-16px_rgba(20,184,166,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"><ExternalLink className="h-4 w-4" />{session.isFull && !session.isEnrolled ? 'Full' : 'Join'}</button>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  )}
                </motion.section>

                <motion.section initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: .5, delay: .32, ease: 'easeOut' }} className="rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_8px_30px_rgba(99,102,241,.06)] backdrop-blur-xl">
                  <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-lg font-black text-slate-950">Past Sessions</h2><button className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 transition-all hover:text-indigo-700">View past sessions <ArrowRight className="h-4 w-4" /></button></div>
                  {pastSessions.length === 0 ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-indigo-200 bg-gradient-to-br from-white via-violet-50/30 to-teal-50/30 px-5 py-8 text-center md:flex-row md:gap-8 md:text-left">
                      <EmptySessionIllustration type="past" />
                      <div><h3 className="text-xl font-black text-slate-950">No past sessions yet</h3><p className="mt-2 max-w-md text-sm font-medium text-slate-500">You haven't attended any sessions yet.</p><button className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-indigo-200 bg-white px-7 text-sm font-bold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-50">Browse Recordings</button></div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-[22px] border border-slate-100 bg-white/70">
                      {pastSessions.slice(0, 5).map((session) => (
                        <div key={session._id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-indigo-50/35 sm:flex-row sm:items-center sm:justify-between">
                          <div><h3 className="font-bold text-slate-950">{session.title}</h3><p className="mt-1 text-sm font-medium text-slate-500">{new Date(session.date).toLocaleDateString('en-IN')} - {session.startTime} - {session.trainer?.name || 'Expert Trainer'}</p></div>
                          {session.recordingAvailable ? <button className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-100"><Play className="h-4 w-4" /> View Recording</button> : <span className="text-sm font-semibold text-slate-400">Recording unavailable</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.section>
              </>
            )}
          </main>
        </div>

      </div>
    );
  }

  const summaryCards: StatCardItem[] = [
    {
      title: 'Upcoming',
      value: sessions.length,
      description: 'Sessions scheduled',
      Icon: Video,
      tone: 'from-blue-50 via-indigo-50 to-white',
      iconTone: 'bg-blue-100 text-blue-600',
      accent: 'bg-blue-400',
    },
    {
      title: 'Total Conducted',
      value: pastSessions.length,
      description: 'Sessions completed',
      Icon: CheckCircle,
      tone: 'from-emerald-50 via-green-50 to-white',
      iconTone: 'bg-emerald-100 text-emerald-600',
      accent: 'bg-emerald-400',
    },
    {
      title: 'Recordings',
      value: pastSessions.filter((session) => session.recordingAvailable).length,
      description: 'Available recordings',
      Icon: Play,
      tone: 'from-violet-50 via-purple-50 to-white',
      iconTone: 'bg-violet-100 text-violet-600',
      accent: 'bg-violet-400',
    },
    {
      title: 'Total Students',
      value: sessions.reduce((total, session) => total + (session.enrolledCount || 0), 0),
      description: 'Across all sessions',
      Icon: Users,
      tone: 'from-pink-50 via-rose-50 to-white',
      iconTone: 'bg-pink-100 text-pink-600',
      accent: 'bg-pink-400',
    },
  ];

  const totalEnrolled = pastSessions.reduce((sum, session) => sum + (session.enrolledCount || 0), 0);
  const totalAttended = pastSessions.reduce((sum, session) => sum + (session.enrolledStudents?.filter((entry) => entry.attended).length || 0), 0);
  const avgAttendance = totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;

  // ── Main page ────────────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-6 px-4 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Live Sessions</h2>
          <p className="mt-1 text-sm text-slate-500">Join interactive sessions with expert trainers.</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setSchedulerStep(0); setShowScheduler(true); }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Schedule New Session
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <StatCard key={item.title} item={item} />
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Upcoming Sessions</h3>
                <p className="text-sm text-slate-500">Join live sessions and keep track of schedules.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-500">{sessions.length} scheduled</span>
            </div>

            {sessions.length === 0 ? (
              <div className="p-5 sm:p-8">
                <EmptyStateCard
                  icon={
                    <div className="relative">
                      <Calendar className="absolute -left-4 -top-4 h-7 w-7 text-indigo-300" />
                      <Video className="h-10 w-10 text-indigo-600" />
                    </div>
                  }
                  title="No Upcoming Sessions"
                  description="There are no live sessions scheduled at the moment."
                  action={
                    <button
                      onClick={() => { setForm(EMPTY_FORM); setSchedulerStep(0); setShowScheduler(true); }}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                    >
                      <Plus className="h-4 w-4" /> Schedule New Session
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <motion.article key={session._id} whileHover={{ y: -4 }} className="p-5 transition-all duration-300 hover:bg-slate-50/70 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PLATFORM_COLORS[session.platform]}`}>{session.platform}</span>
                          {session.course && <span className="truncate text-sm font-medium text-indigo-600">{session.course.title}</span>}
                        </div>
                        <h4 className="text-lg font-semibold text-slate-950">{session.title}</h4>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Calendar className="h-3.5 w-3.5 text-indigo-500" />{new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Clock className="h-3.5 w-3.5 text-teal-500" />{session.startTime} · {session.duration}min</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5"><Users className="h-3.5 w-3.5 text-pink-500" />{session.enrolledCount}/{session.maxCapacity} enrolled</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-500">by {session.trainer?.name || 'Trainer'}</p>

                        {session.enrolledStudents && session.enrolledStudents.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Enrolled Students</p>
                            <div className="flex flex-wrap gap-2">
                              {session.enrolledStudents.slice(0, 5).map((enrollment, idx) => {
                                const student = enrollment.student;
                                if (!student || typeof student === 'string') return null;

                                return (
                                  <span
                                    key={student._id || idx}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                                    title={student.email}
                                  >
                                    <Users className="h-3 w-3" />
                                    {student.firstName} {student.lastName}
                                  </span>
                                );
                              })}
                              {session.enrolledStudents.length > 5 && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                                  +{session.enrolledStudents.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                        <a
                          href={session.joinLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <ExternalLink className="h-4 w-4" /> Join
                        </a>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const sessionData = {
                                ...EMPTY_FORM,
                                title: session.title,
                                course: session.course?._id || '',
                                module: session.module || '',
                                description: session.description || '',
                                agenda: session.agenda || '',
                                date: new Date(session.date).toISOString().split('T')[0],
                                time: session.startTime,
                                duration: session.duration,
                                platform: session.platform,
                                joinLink: session.joinLink,
                                meetingId: session.meetingId || '',
                                passcode: session.passcode || '',
                                hostEmail: session.hostEmail || '',
                                coHosts: session.coHosts?.join(', ') || '',
                                maxCapacity: session.maxCapacity,
                                recurring: session.recurring.type,
                                recurringEnd: session.recurring.endDate ? new Date(session.recurring.endDate).toISOString().split('T')[0] : '',
                                requireRegistration: session.requireRegistration,
                                allowRecording: session.allowRecording,
                                waitingRoom: session.waitingRoom,
                                sendReminder: session.sendReminder,
                                reminderMinutes: session.reminderMinutes,
                                materials: session.materials?.join(', ') || '',
                                tags: session.tags?.join(', ') || '',
                              };
                              setForm(sessionData);
                              setEditingId(session._id);
                              setSchedulerStep(0);
                              setShowScheduler(true);
                            }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
                            aria-label="Edit session"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(session._id)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-50"
                            aria-label="Delete session"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(session.joinLink);
                              toast.success('Join link copied!');
                            }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50"
                            title="Copy join link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <h3 className="text-lg font-semibold text-slate-950">Past Sessions</h3>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-all hover:text-indigo-700">View past sessions <ArrowRight className="h-4 w-4" /></button>
            </div>
            {pastSessions.length === 0 ? (
              <div className="p-5 sm:p-8">
                <EmptyStateCard
                  icon={<Clock className="h-10 w-10 text-slate-300" />}
                  title="No past sessions yet"
                  description="Your completed sessions will appear here."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pastSessions.map((session) => {
                  const enrollment = session.enrolledStudents.find((entry) => entry.student._id === (JSON.parse(localStorage.getItem('user') || '{}')._id || ''));
                  const attended = enrollment?.attended || false;

                  return (
                    <motion.article key={session._id} whileHover={{ x: 2 }} className="p-5 transition-all duration-300 hover:bg-slate-50/70 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PLATFORM_COLORS[session.platform]}`}>{session.platform}</span>
                          </div>
                          <h4 className="text-base font-semibold text-slate-950">{session.title}</h4>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-500" />{new Date(session.date).toLocaleDateString('en-IN')}</span>
                            <span>{session.startTime}</span>
                            <span>by {session.trainer?.name || 'Trainer'}</span>
                          </div>
                          <div className="mt-3">
                            {attended ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><CheckCircle className="h-3.5 w-3.5" /> Attended</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">Not Attended</span>
                            )}
                          </div>
                        </div>

                        {session.recordingAvailable && (
                          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                            <Play className="h-4 w-4" /> View Recording
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AverageAttendanceCard percentage={avgAttendance} />
            <BiometricSyncCard />
          </div>
        </div>
      )}

      <AssistantButton />
    </div>
  );
}
