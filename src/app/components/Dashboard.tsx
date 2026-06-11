import { StatCard } from './StatCard';
import { Users, BookOpen, CheckCircle2, GraduationCap, Award, Clock, Video, TrendingUp, Target, Loader2, Play, Star, BarChart3, Calendar, ChevronRight, Flame, Hourglass, Trophy, UserPlus, Plus, FileText, ArrowUpRight, LayoutGrid } from 'lucide-react';
import { FilterBar } from './FilterBar';
import { useState, useEffect } from 'react';
import { getStudentDashboard, getCourses, getLearningStats } from '../services/courseService';
import { getAllLiveSessions } from '../services/liveSessionService';
import { getTrainerDashboard, getAdminDashboard } from '../services/dashboardService';
import { getStreakStats, recordDailyLogin } from '../services/streakService';
import { PremiumCard, PremiumHero, PremiumPageShell, PremiumStatCard as PremiumStatCard } from './premium/PremiumPage';

interface DashboardProps {
  userRole: 'admin' | 'trainer' | 'participant';
  onOpenAdminUsers?: () => void;
  onOpenTrainerDetail?: (detailPage: 'courses' | 'reports' | 'assessments' | 'live-sessions' | 'my-students') => void;
  onNavigate?: (page: string) => void;
}

const roleColors = {
  admin: { primary: '#7c3aed', secondary: '#a78bfa', bg: '#f5f3ff', name: 'Admin' },
  trainer: { primary: '#2563eb', secondary: '#60a5fa', bg: '#eff6ff', name: 'Trainer' },
  participant: { primary: '#059669', secondary: '#34d399', bg: '#ecfdf5', name: 'Student' },
};

export function Dashboard({ userRole, onOpenAdminUsers, onOpenTrainerDetail, onNavigate }: DashboardProps) {
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [studentData, setStudentData] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [trainerCourses, setTrainerCourses] = useState<any[]>([]);
  const [loadingTrainer, setLoadingTrainer] = useState(false);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [trainerDashboardData, setTrainerDashboardData] = useState<any>(null);
  const [loadingTrainerDashboard, setLoadingTrainerDashboard] = useState(false);
  const [adminDashboardData, setAdminDashboardData] = useState<any>(null);
  const [loadingAdminDashboard, setLoadingAdminDashboard] = useState(false);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [loadingLearningStats, setLoadingLearningStats] = useState(false);

  const colors = roleColors[userRole];

  useEffect(() => {
    if (userRole === 'participant') {
      setLoadingStudent(true);
      getStudentDashboard()
        .then(res => { if (res.success && res.data) setStudentData(res.data); })
        .catch(() => {})
        .finally(() => setLoadingStudent(false));

      setLoadingLearningStats(true);
      Promise.allSettled([
        getLearningStats(),
        recordDailyLogin().then(() => getStreakStats()),
      ])
        .then(([learningRes, streakRes]) => {
          const nextStats: any = {};

          if (learningRes.status === 'fulfilled' && learningRes.value.success && learningRes.value.data) {
            Object.assign(nextStats, learningRes.value.data);
          }

          if (streakRes.status === 'fulfilled' && streakRes.value.success && streakRes.value.data) {
            Object.assign(nextStats, {
              currentStreak: streakRes.value.data.currentStreak ?? nextStats.currentStreak,
              longestStreak: streakRes.value.data.longestStreak ?? nextStats.longestStreak,
              totalLearningDays: streakRes.value.data.totalDaysActive ?? nextStats.totalLearningDays,
              totalPoints: streakRes.value.data.totalPoints ?? nextStats.totalPoints,
            });
          }

          setLearningStats(nextStats);
        })
        .catch(() => {})
        .finally(() => setLoadingLearningStats(false));
    } else if (userRole === 'trainer') {
      setLoadingTrainerDashboard(true);
      getTrainerDashboard()
        .then(res => { if (res.success && res.data) setTrainerDashboardData(res.data); })
        .catch(() => {})
        .finally(() => setLoadingTrainerDashboard(false));

      setLoadingTrainer(true);
      getCourses({ limit: '10', status: 'active', createdBy: 'me' })
        .then(res => { if (res.success && res.data) setTrainerCourses(res.data.slice(0, 3)); })
        .catch(() => {})
        .finally(() => setLoadingTrainer(false));

      setLoadingSessions(true);
      getAllLiveSessions({ upcoming: true })
        .then(res => { if (res.success && res.data) setUpcomingSessions(res.data.slice(0, 3)); })
        .catch(() => {})
        .finally(() => setLoadingSessions(false));
    } else if (userRole === 'admin') {
      setLoadingAdminDashboard(true);
      getAdminDashboard()
        .then(res => { if (res.success && res.data) setAdminDashboardData(res.data); })
        .catch(() => {})
        .finally(() => setLoadingAdminDashboard(false));
    }
  }, [userRole]);

  const ad = adminDashboardData;
  const adminStats = [
    {
      label: 'Total Users',
      value: loadingAdminDashboard ? '—' : String(ad?.users?.total || 0),
      icon: Users,
      color: 'purple' as const,
      trend: ad?.users?.pendingApprovals ? `${ad.users.pendingApprovals} pending` : '+12% growth',
      tone: 'from-violet-500/10 via-purple-500/5 to-transparent',
      shadowColor: 'rgba(124, 58, 237, 0.08)',
      sparkline: "M0 30 Q 15 15, 30 22 T 60 8 T 90 4",
      accent: '#7c3aed',
    },
    {
      label: 'Enrollments',
      value: loadingAdminDashboard ? '—' : String(ad?.enrollments?.total || 0),
      icon: GraduationCap,
      color: 'blue' as const,
      trend: ad?.enrollments?.completed ? `${ad.enrollments.completed} done` : 'Steady growth',
      tone: 'from-blue-500/10 via-cyan-500/5 to-transparent',
      shadowColor: 'rgba(37, 99, 235, 0.08)',
      sparkline: "M0 25 Q 20 22, 40 8 T 80 4",
      accent: '#2563eb',
    },
    {
      label: 'Total Courses',
      value: loadingAdminDashboard ? '—' : String(ad?.courses?.total || 0),
      icon: BookOpen,
      color: 'yellow' as const,
      trend: ad?.courses?.published ? `${ad.courses.published} live` : '+3 new',
      tone: 'from-amber-500/10 via-orange-500/5 to-transparent',
      shadowColor: 'rgba(245, 158, 11, 0.08)',
      sparkline: "M0 20 Q 30 20, 60 10 T 90 8",
      accent: '#d97706',
    },
    {
      label: 'Completed',
      value: loadingAdminDashboard ? '—' : String(ad?.enrollments?.completed || 0),
      icon: CheckCircle2,
      color: 'green' as const,
      trend: '94% success rate',
      tone: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      shadowColor: 'rgba(5, 150, 105, 0.08)',
      sparkline: "M0 30 L 30 12 L 60 16 L 90 4",
      accent: '#059669',
    },
    {
      label: 'Certificates',
      value: loadingAdminDashboard ? '—' : String(ad?.certificates?.total || 0),
      icon: Award,
      color: 'pink' as const,
      trend: 'Verifiable',
      tone: 'from-pink-500/10 via-rose-500/5 to-transparent',
      shadowColor: 'rgba(219, 39, 119, 0.08)',
      sparkline: "M0 35 Q 25 30, 50 12 T 90 6",
      accent: '#db2777',
    },
  ];

  const td = trainerDashboardData;
  const trainerStats = [
    { detailPage: 'courses' as const, label: 'My Courses', value: loadingTrainerDashboard ? '—' : String(td?.summary?.totalCourses || 0), icon: BookOpen, color: 'blue' as const, trend: '' },
    { detailPage: 'my-students' as const, label: 'Total Students', value: loadingTrainerDashboard ? '—' : String(td?.summary?.totalStudents || 0), icon: Users, color: 'purple' as const, trend: '' },
    { detailPage: 'reports' as const, label: 'Active Batches', value: '5', icon: GraduationCap, color: 'yellow' as const, trend: '' },
    { detailPage: 'assessments' as const, label: 'Pending', value: '32', icon: Clock, color: 'pink' as const, trend: '' },
    { detailPage: 'live-sessions' as const, label: 'Live Sessions', value: String(upcomingSessions.length || 0), icon: Video, color: 'green' as const, trend: '' },
  ];

  const s = studentData?.stats;
  const ls = learningStats;

  // Enhanced student stats
  const participantStats = [
    { label: 'Enrolled', value: s ? String(s.total) : '—', icon: BookOpen, color: 'blue' as const, trend: s?.inProgress ? `${s.inProgress} in progress` : '' },
    { label: 'Completed', value: s ? String(s.completed) : '—', icon: CheckCircle2, color: 'green' as const, trend: s?.total ? `${Math.round((s.completed / s.total) * 100)}% rate` : '' },
    { label: 'In Progress', value: s ? String(s.inProgress) : '—', icon: TrendingUp, color: 'purple' as const, trend: '' },
    { label: 'Hours Learned', value: ls ? `${ls.learningHours || 0}` : '—', icon: Hourglass, color: 'yellow' as const, trend: 'Total hours' },
    { label: 'Streak', value: ls ? `${ls.currentStreak || 0}` : '—', icon: Flame, color: 'pink' as const, trend: ls?.longestStreak ? `Best: ${ls.longestStreak} days` : 'days' },
  ];

  // Calculate overall progress
  const overallProgress = s?.total ? Math.round(((s.completed || 0) / s.total) * 100) : 0;

  const stats = userRole === 'admin' ? adminStats : userRole === 'trainer' ? trainerStats : participantStats;

  if ((userRole as string) === 'participant') {
    const participantCourses = studentData?.recentCourses?.slice(0, 3) || [];
    const timelineSessions = [
      { title: 'Cooperative Governance Workshop', date: 'May 2', trainer: 'Dr. Rajesh Kumar' },
      { title: 'Member Engagement Strategies', date: 'May 5', trainer: 'Prof. Anita Sharma' },
      { title: 'Financial Planning Clinic', date: 'May 7', trainer: 'Dr. Neha Jain' },
    ];
    const continueCourse = studentData?.recentCourses?.find((c: any) => c.progressPercent > 0 && c.progressPercent < 100);
    const statCards = [
      {
        label: 'Enrolled Courses',
        value: s ? String(s.total) : '0',
        icon: BookOpen,
        tone: 'from-blue-50 via-indigo-50 to-white',
        accent: '#2563EB',
        spark: 'M2 28 C 12 18, 20 22, 30 13 C 40 8, 50 10, 58 6',
      },
      {
        label: 'Completed',
        value: s ? String(s.completed) : '0',
        icon: CheckCircle2,
        tone: 'from-emerald-50 via-teal-50 to-white',
        accent: '#14B8A6',
        spark: 'M2 25 C 11 21, 19 14, 28 12 C 37 10, 47 8, 58 6',
      },
      {
        label: 'In Progress',
        value: s ? String(s.inProgress) : '0',
        icon: TrendingUp,
        tone: 'from-violet-50 via-fuchsia-50 to-white',
        accent: '#7C3AED',
        spark: 'M2 29 C 13 26, 21 16, 31 20 C 40 23, 49 12, 58 8',
      },
      {
        label: 'Hours Learned',
        value: ls ? `${ls.learningHours || 0}` : '0',
        icon: Hourglass,
        tone: 'from-amber-50 via-orange-50 to-white',
        accent: '#D97706',
        spark: 'M2 22 C 10 20, 19 18, 29 18 C 40 18, 49 12, 58 10',
      },
      {
        label: 'Current Streak',
        value: ls ? `${ls.currentStreak || 0}` : '0',
        icon: Flame,
        tone: 'from-rose-50 via-pink-50 to-white',
        accent: '#E11D48',
        spark: 'M2 26 C 12 22, 20 24, 29 17 C 39 10, 48 8, 58 5',
      },
    ];

    return (
      <div className="relative space-y-6 lg:space-y-7 premium-fade-in">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute -top-16 -right-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.12),transparent_68%)]" />
          <div className="absolute top-1/4 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.10),transparent_70%)]" />
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(rgba(79,70,229,0.10) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
        </div>

        <section className="relative overflow-hidden rounded-[22px] border border-indigo-100/80 bg-gradient-to-r from-[#eef1ff] via-[#f6f4ff] to-[#eff8ff] px-5 py-6 md:px-7 md:py-7 shadow-[0_30px_50px_-38px_rgba(37,99,235,0.55)]">
          <div className="absolute inset-0 opacity-45" style={{ backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0.68), rgba(255,255,255,0.14))' }} />
          <div className="absolute right-4 top-2 hidden md:block opacity-10">
            <svg width="250" height="130" viewBox="0 0 250 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 110H240" stroke="#1E3A8A" strokeWidth="2" />
              <path d="M28 110V74H222V110" stroke="#1E3A8A" strokeWidth="2" />
              <path d="M44 74V56H206V74" stroke="#1E3A8A" strokeWidth="2" />
              <path d="M84 56V38H166V56" stroke="#1E3A8A" strokeWidth="2" />
              <circle cx="125" cy="28" r="8" stroke="#1E3A8A" strokeWidth="2" />
              <path d="M58 110V74M82 110V74M106 110V74M130 110V74M154 110V74M178 110V74M202 110V74" stroke="#1E3A8A" strokeWidth="2" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-1 text-xs font-semibold text-indigo-700 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Government Learning Mission
              </div>
              <h2 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Welcome back, {studentData?.name || 'Student'} Singh!</h2>
              <p className="mt-2 max-w-2xl text-sm md:text-base text-slate-600">Continue your cooperative learning journey with structured courses, certified progress, and upcoming ministry-led sessions.</p>
            </div>

            <button
              onClick={() => onNavigate?.('courses')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              Continue Learning
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="group relative overflow-hidden rounded-[20px] border border-slate-200/85 bg-white/86 p-4 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.45)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-[0_24px_44px_-26px_rgba(37,99,235,0.35)]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.tone}`} />
                <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.13),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                    <Icon className="w-5 h-5" style={{ color: card.accent }} />
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: card.accent }} />
                </div>

                <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{card.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{card.label}</p>

                <svg className="mt-3 h-8 w-full opacity-80" viewBox="0 0 60 32" fill="none" aria-hidden="true">
                  <path d={card.spark} stroke={card.accent} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-5">
          <article className="rounded-[20px] border border-slate-200/80 bg-white/90 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)] overflow-hidden">
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">My Courses</h3>
                    <p className="text-xs text-slate-500">Continue where you left off</p>
                  </div>
                </div>
                <button onClick={() => onNavigate?.('courses')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
              </header>

              <div className="p-4 space-y-3">
                {participantCourses.length > 0 ? (
                  participantCourses.map((course: any, idx: number) => (
                    <div key={`${course.title}-${idx}`} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 transition-all hover:-translate-y-1 hover:shadow-md">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: 'linear-gradient(180deg,#4F46E5,#14B8A6)' }} />
                      <div className="flex items-center gap-3 pl-4">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
                          {course.title?.[0] || 'C'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{course.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{course.completedLessons}/{course.totalLessons} lessons • <span className="font-medium">{course.trainer || 'Trainer'}</span></p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">{course.progressPercent}%</span>
                          <button onClick={() => onNavigate?.('courses')} className="text-xs text-indigo-600 font-semibold hover:underline">Open</button>
                        </div>
                      </div>

                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full" style={{ width: `${course.progressPercent}%`, background: 'linear-gradient(90deg,#4F46E5,#14B8A6)' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">No courses started yet</p>
                )}
              </div>
          </article>

          <article className="rounded-[20px] border border-slate-200/80 bg-white/90 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)] overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upcoming Sessions</h3>
                  <p className="text-xs text-slate-500">Live classes and scheduled events</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.('live-sessions')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</button>
            </header>
            <div className="p-4 space-y-3">
              {timelineSessions.map((session, idx) => (
                <div key={`${session.title}-${idx}`} className="relative rounded-2xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3 hover:shadow-sm transition">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                      {session.title?.[0] || 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{session.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">by {session.trainer}</p>
                      <p className="text-xs text-slate-400 mt-1">{session.date} • {idx === 0 ? 'Starts soon' : 'Scheduled'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate?.('live-sessions')} className="text-xs font-semibold text-indigo-600 hover:underline">Details</button>
                    <button className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">Join</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-[20px] border border-slate-200/80 bg-white/90 p-4 md:p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
          <h3 className="text-base font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Browse Courses', BookOpen, 'Explore courses', 'courses'],
              ['Take Assessment', CheckCircle2, 'Test your knowledge', 'assessments'],
              ['My Certificates', Award, 'View your certificates', 'certificates'],
              ['Join Session', Video, 'Check schedule', 'live-sessions'],
            ].map(([title, Icon, subtitle, page]) => (
              <button
                key={title as string}
                onClick={() => onNavigate?.(page as string)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:border-indigo-200"
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 text-indigo-600">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-900">{title as string}</p>
                <p className="text-xs text-slate-500 mt-1">{subtitle as string}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <article className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              Your Progress
            </h3>
            <div className="flex items-center justify-center">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="url(#progressGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${overallProgress * 2.76} 276`} />
                  <defs>
                    <linearGradient id="progressGradient" x1="0" x2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-black text-slate-900">{overallProgress}%</p>
                  <p className="text-xs text-slate-500">Complete</p>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-slate-600 mt-3">{s?.completed || 0} of {s?.total || 0} courses completed</p>
          </article>

          <article className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-600" />
              Continue Learning
            </h3>
            {continueCourse ? (
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4">
                <p className="text-sm font-semibold text-slate-900">{continueCourse.title}</p>
                <p className="text-xs text-slate-500 mt-1">{continueCourse.completedLessons}/{continueCourse.totalLessons} lessons</p>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${continueCourse.progressPercent}%` }} />
                </div>
                <button
                  onClick={() => onNavigate?.('courses')}
                  className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Resume Course
                </button>
              </div>
            ) : (
              <div className="py-10 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No course in progress</p>
              </div>
            )}
          </article>

          <article className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              Achievements
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-3">
                <Flame className="w-5 h-5 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Learning Streak</p>
                  <p className="text-xs text-slate-500">{ls?.currentStreak || 0} day current</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-3">
                <Award className="w-5 h-5 text-violet-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Certificates</p>
                  <p className="text-xs text-slate-500">{ls?.certificatesEarned || 0} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-3">
                <Hourglass className="w-5 h-5 text-sky-700" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">Hours Learned</p>
                  <p className="text-xs text-slate-500">{ls?.learningHours || 0} total hours</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-[20px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.4)]">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            Learning Analytics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Current Streak</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{ls?.currentStreak || 0}</p>
              <p className="text-xs text-slate-500">days</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Longest Streak</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{ls?.longestStreak || 0}</p>
              <p className="text-xs text-slate-500">days</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Total Hours</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{ls?.learningHours || 0}</p>
              <p className="text-xs text-slate-500">hours</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Certificates</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{ls?.certificatesEarned || 0}</p>
              <p className="text-xs text-slate-500">earned</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
            <span className="text-slate-500">Total Learning Days</span>
            <span className="font-semibold text-slate-900">{ls?.totalLearningDays || 0} days</span>
          </div>
        </section>
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div className="space-y-6">
        {/* Breathtaking Welcome Banner */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          {/* Ambient background blur circles */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          
          {/* Interactive Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/20">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-indigo-300">Admin!</span> 👋
                </h2>
                <p className="text-indigo-200/70 mt-1 text-sm md:text-base font-medium">
                  LMS Control Center is fully operational. Real-time telemetry monitoring is active.
                </p>
              </div>
            </div>

            {/* Server Live Telemetry Pill */}
            <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Operational
              </div>
              <div className="text-xs text-indigo-200 font-semibold flex items-center gap-1.5 border-l border-white/10 pl-3">
                <span className="text-indigo-400 font-bold">Latency:</span> 42ms
              </div>
              <div className="text-xs text-indigo-200 font-semibold flex items-center gap-1.5 border-l border-white/10 pl-3">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </section>

        {/* Premium Glowing Metrics Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          {adminStats.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                onClick={() => {
                  if (card.label === 'Total Users') onOpenAdminUsers?.();
                  else if (card.label === 'Total Courses') onNavigate?.('courses');
                  else if (card.label === 'Enrollments') onNavigate?.('student-management');
                  else if (card.label === 'Completed') onNavigate?.('courses');
                  else if (card.label === 'Certificates') onNavigate?.('reports');
                }}
                className="relative group rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer overflow-hidden text-left"
                style={{
                  boxShadow: `0 4px 20px -2px ${card.shadowColor}`,
                }}
              >
                {/* Decorative background gradient glow */}
                <div
                  className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.tone} opacity-10 group-hover:scale-150 transition-transform duration-500 blur-xl`}
                />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6" style={{ color: card.accent }} />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    +15%
                  </span>
                </div>

                <div className="relative z-10">
                  <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">{card.label}</p>
                </div>

                {/* SVG Sparkline Curve */}
                <div className="mt-4 h-10 w-full overflow-hidden opacity-30 group-hover:opacity-75 transition-opacity duration-300">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d={card.sparkline}
                      fill="none"
                      stroke={card.accent}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/80 text-[10px] text-slate-400 font-semibold relative z-10">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Live sync active
                  </span>
                  <span className="text-emerald-500 font-bold">{card.trend}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Interactive Operations Center (Quick Actions) */}
        <section className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 shadow-sm backdrop-blur-md">
          <h3 className="text-indigo-950 font-extrabold text-lg mb-4 flex items-center gap-2">
            <span className="p-1 bg-indigo-50 rounded-lg text-indigo-600">⚡</span>
            Platform Operations Center
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
            {[
              ['Add Users', UserPlus, 'bulk-import', 'border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/20', '#6366f1', 'Bulk CSV Import & Sync'],
              ['Create Course', Plus, 'courses', 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/20', '#3b82f6', 'Author modules & sections'],
              ['New Batch', GraduationCap, 'batches', 'border-green-100 hover:border-green-300 hover:bg-green-50/20', '#10b981', 'Cohort assignments'],
              ['Create Test', FileText, 'courses', 'border-yellow-100 hover:border-yellow-300 hover:bg-yellow-50/20', '#f59e0b', 'Grade & assessment files'],
              ['View Reports', BarChart3, 'reports', 'border-purple-100 hover:border-purple-300 hover:bg-purple-50/20', '#8b5cf6', 'Growth & query stats'],
              ['Go Live', Video, 'live-sessions', 'border-pink-100 hover:border-pink-300 hover:bg-pink-50/20', '#ec4899', 'Instant classroom streams'],
            ].map(([label, Icon, target, hoverStyle, iconColor, desc]) => (
              <button
                key={label as string}
                onClick={() => onNavigate?.(target as string)}
                className={`group rounded-2xl border bg-white p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${hoverStyle}`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300 mb-3">
                  <Icon className="w-5 h-5" style={{ color: iconColor }} />
                </div>
                <p className="text-sm font-bold text-slate-800 tracking-tight">{label as string}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-normal">{desc as string}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Real-Time Platform Analytics Area Chart Widget */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          {/* Mesh Gradient Glow */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 relative z-10">
            <div>
              <h3 className="text-indigo-950 font-extrabold text-xl tracking-tight flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">📈</span>
                Platform Activity & Cohort Analytics
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">Real-time telemetry of user registrations vs course completions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-slate-600">Active Registrations</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-slate-600">Course Completions</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
            {/* Left Telemetry Column */}
            <div className="flex flex-col justify-between gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50">
                <p className="text-xs font-bold text-indigo-700/80 uppercase tracking-wider text-left">Average Learning Time</p>
                <p className="text-2xl font-black text-slate-900 mt-1 text-left">48.6 min</p>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                  <span>▲ +8.2%</span>
                  <span className="text-slate-400 font-normal">vs last month</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-100/50">
                <p className="text-xs font-bold text-cyan-700/80 uppercase tracking-wider text-left">Peak Active Concurrency</p>
                <p className="text-2xl font-black text-slate-900 mt-1 text-left">1,420</p>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                  <span>▲ +14.5%</span>
                  <span className="text-slate-400 font-normal">system peak</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/50">
                <p className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider text-left">Database Sync Status</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-1.5 justify-start">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Operational & Synced
                </p>
                <p className="text-[10px] text-slate-400 mt-1 text-left">Auto-sync active every 4 hr</p>
              </div>
            </div>

            {/* Area Chart Drawing */}
            <div className="lg:col-span-3 h-64 bg-slate-50/40 rounded-2xl border border-slate-100 p-4 relative flex flex-col justify-between">
              {/* Horizontal Guide Lines */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="w-full border-t border-slate-200" />
                <div className="w-full border-t border-slate-200" />
                <div className="w-full border-t border-slate-200" />
                <div className="w-full border-t border-slate-200" />
              </div>

              {/* Vector Paths SVG */}
              <div className="flex-1 w-full relative z-10 min-h-0">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradientIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="chartGradientCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Chart Fills */}
                  <path
                    d="M0 120 Q 50 110, 100 80 T 200 60 T 300 40 T 400 15 L 400 150 L 0 150 Z"
                    fill="url(#chartGradientIndigo)"
                  />
                  <path
                    d="M0 140 Q 50 120, 100 110 T 200 95 T 300 60 T 400 35 L 400 150 L 0 150 Z"
                    fill="url(#chartGradientCyan)"
                  />

                  {/* Line strokes */}
                  <path
                    d="M0 120 Q 50 110, 100 80 T 200 60 T 300 40 T 400 15"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 140 Q 50 120, 100 110 T 200 95 T 300 60 T 400 35"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="2 2"
                  />

                  {/* Grid Points */}
                  <circle cx="100" cy="80" r="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="200" cy="60" r="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="300" cy="40" r="4" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="400" cy="15" r="5" fill="#7c3aed" stroke="#ffffff" strokeWidth="2" className="animate-pulse" />

                  <circle cx="300" cy="60" r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="400" cy="35" r="3.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                </svg>

                {/* Dynamic Tooltip Marker */}
                <div className="absolute top-2 right-12 bg-slate-900 text-white rounded-xl px-2.5 py-1 text-[10px] font-semibold shadow-lg border border-slate-800 flex items-center gap-1.5 select-none pointer-events-none animate-bounce">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Peak Load: 1,420 Users
                </div>
              </div>

              {/* Timetable Axes */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2 px-1 relative z-10">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May (Live)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Grid Layout for Registrations & Ratings */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Registrations Redesign */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-indigo-950 font-extrabold text-lg flex items-center gap-2">
                <span className="p-1 bg-indigo-50 rounded-lg text-indigo-600">👥</span>
                Recent Registrations
              </h3>
              <button
                onClick={() => onNavigate?.('user-management')}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
              >
                Manage Users
              </button>
            </div>
            
            <div className="space-y-3">
              {loadingAdminDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : ad?.recentRegistrations?.length > 0 ? (
                ad.recentRegistrations.slice(0, 4).map((user: any, idx: number) => {
                  const gradientPalette = [
                    'from-purple-600 to-indigo-600',
                    'from-blue-600 to-cyan-600',
                    'from-emerald-600 to-teal-600',
                    'from-pink-600 to-rose-600'
                  ];
                  const grad = gradientPalette[idx % gradientPalette.length];
                  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'U';
                  
                  return (
                    <div key={idx} className="p-3 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-slate-500 font-semibold">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Just joined</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 font-medium">No registrations logged today</div>
              )}
            </div>
          </div>

          {/* Recent Ratings Redesign */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-indigo-950 font-extrabold text-lg flex items-center gap-2">
                <span className="p-1 bg-amber-50 rounded-lg text-amber-500">⭐</span>
                Recent Ratings & Reviews
              </h3>
              <button
                onClick={() => onNavigate?.('reports')}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
              >
                View All Reviews
              </button>
            </div>

            <div className="space-y-3">
              {loadingAdminDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : ad?.recentRatings?.length > 0 ? (
                ad.recentRatings.slice(0, 4).map((rating: any, idx: number) => (
                  <div key={idx} className="p-3 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-amber-500 text-sm">
                        ★
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{rating.student?.firstName} {rating.student?.lastName}</p>
                        <p className="text-xs text-slate-500 font-semibold">{rating.course?.title}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-amber-500 font-black leading-none tracking-wider">
                        {'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 font-medium">No system reviews found yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Unified Action Telemetry Bottom Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            ['Approve Users', String(ad?.users?.pendingApprovals || 0), 'pending approvals', '#8b5cf6', 'from-violet-500/10 to-transparent', 'user-management'],
            ['Manage Courses', String(ad?.courses?.published || 0), 'active courses', '#3b82f6', 'from-blue-500/10 to-transparent', 'courses'],
            ['View Reports', String(ad?.queries?.total || 0), 'system queries', '#10b981', 'from-emerald-500/10 to-transparent', 'reports'],
            ['Certificates Issued', String(ad?.certificates?.total || 0), 'total credentials', '#db2777', 'from-pink-500/10 to-transparent', 'certificates'],
          ].map((x, index) => (
            <div
              key={index}
              onClick={() => onNavigate?.(x[5])}
              className="group relative bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden text-left"
            >
              {/* Accent indicator bar */}
              <div className="absolute top-0 bottom-0 left-0 w-1.5 transition-transform duration-300 group-hover:scale-y-110" style={{ backgroundColor: x[3] }} />
              
              <p className="text-sm font-bold text-slate-500 pl-2">{x[0]}</p>
              <div className="flex items-baseline gap-2 mt-2 pl-2">
                <span className="text-3xl font-black text-slate-800 tracking-tight">{x[1]}</span>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{x[2]}</span>
              </div>
            </div>
          ))}
        </section>

        {/* Premium Footer Demo Alert */}
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/50 via-white/80 to-purple-50/50 backdrop-blur-md p-4 text-slate-700 text-sm shadow-sm flex items-center justify-between gap-4">
          <p className="font-semibold text-slate-600 text-left">
            ⚡ <strong>Enterprise Telemetry active.</strong> System status is healthy. Click the avatar icon in the top-right to switch dashboard views.
          </p>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-black text-slate-400">CEAS-LMS v2.4</span>
        </div>
      </div>
    );
  }

  if (userRole === 'trainer') {
    const trainerName = trainerDashboardData?.trainer?.name || trainerDashboardData?.name || 'Trainer';
    const quickActions = [
      { label: 'Create Course', detail: `${td?.summary?.totalCourses || 0} courses`, icon: BookOpen, page: 'courses', tone: 'from-indigo-50 via-blue-50 to-white', accent: 'text-indigo-600' },
      { label: 'Grade Assessments', detail: 'Review submissions', icon: CheckCircle2, page: 'assessments', tone: 'from-emerald-50 via-teal-50 to-white', accent: 'text-emerald-600' },
      { label: 'Schedule Session', detail: `${upcomingSessions.length} upcoming`, icon: Video, page: 'live-sessions', tone: 'from-violet-50 via-purple-50 to-white', accent: 'text-violet-600' },
      { label: 'View Students', detail: `${td?.summary?.totalStudents || 0} learners`, icon: Users, page: 'my-students', tone: 'from-pink-50 via-rose-50 to-white', accent: 'text-pink-600' },
    ];

    return (
      <PremiumPageShell>
        <PremiumHero
          title="Trainer Dashboard"
          subtitle={`Welcome back, ${trainerName}. Manage classrooms, learning progress, live sessions, and learner support from one focused command center.`}
          eyebrow="Trainer command center"
          icon={GraduationCap}
          action={(
            <button
              onClick={() => onNavigate?.('live-sessions')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_-16px_rgba(79,70,229,.9)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Video className="h-4 w-4" />
              Start Live Session
            </button>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <PremiumStatCard label="My Courses" value={loadingTrainerDashboard ? '...' : String(td?.summary?.totalCourses || 0)} detail="Owned programs" icon={BookOpen} tone="from-indigo-50 via-blue-50 to-white" accent="text-indigo-600" />
          <PremiumStatCard label="Total Students" value={loadingTrainerDashboard ? '...' : String(td?.summary?.totalStudents || 0)} detail="Learners enrolled" icon={Users} tone="from-violet-50 via-purple-50 to-white" accent="text-violet-600" />
          <PremiumStatCard label="Active Batches" value="5" detail="Running cohorts" icon={GraduationCap} tone="from-amber-50 via-yellow-50 to-white" accent="text-amber-600" />
          <PremiumStatCard label="Pending" value="32" detail="Review queue" icon={Clock} tone="from-pink-50 via-rose-50 to-white" accent="text-pink-600" />
          <PremiumStatCard label="Live Sessions" value={upcomingSessions.length || 0} detail="Scheduled" icon={Video} tone="from-emerald-50 via-teal-50 to-white" accent="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PremiumCard className="overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950">My Active Courses</h3>
                  <p className="text-xs font-medium text-slate-500">Progress and enrollment snapshot</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.('courses')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View all</button>
            </header>
            <div className="space-y-3 p-5">
              {loadingTrainer ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
              ) : trainerCourses.length > 0 ? (
                trainerCourses.map((course: any, idx: number) => {
                  const progress = course.statistics?.avgProgress || 0;
                  return (
                    <button key={course._id || idx} onClick={() => onNavigate?.('courses')} className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 text-base font-black text-indigo-700">
                          {course.title?.[0] || 'C'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">{course.title}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">{course.currentEnrollments || 0} students enrolled</p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700">{progress}%</span>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-teal-500" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <BookOpen className="mx-auto mb-3 h-10 w-10 text-indigo-200" />
                  <p className="font-bold">No active courses found</p>
                  <p className="mt-1 text-sm">Create a course to get started.</p>
                </div>
              )}
            </div>
          </PremiumCard>

          <PremiumCard className="overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950">Upcoming Sessions</h3>
                  <p className="text-xs font-medium text-slate-500">Live classroom schedule</p>
                </div>
              </div>
              <button onClick={() => onNavigate?.('live-sessions')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Manage</button>
            </header>
            <div className="space-y-3 p-5">
              {loadingSessions ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>
              ) : upcomingSessions.length > 0 ? (
                upcomingSessions.map((session: any, idx: number) => (
                  <button key={session._id || idx} onClick={() => onNavigate?.('live-sessions')} className="w-full rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-teal-50/40 p-4 text-left transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{session.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{session.enrolledCount || 0} enrolled</p>
                      </div>
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700">
                        {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-teal-200" />
                  <p className="font-bold">No sessions scheduled</p>
                  <p className="mt-1 text-sm">Plan your next live class.</p>
                </div>
              )}
            </div>
          </PremiumCard>
        </div>

        <PremiumCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-950">Quick Actions</h3>
              <p className="text-xs font-medium text-slate-500">Most-used trainer workflows</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">System Active</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.label} onClick={() => onNavigate?.(action.page)} className={`group rounded-[22px] border border-white/80 bg-gradient-to-br ${action.tone} p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md`}>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">
                    <Icon className={`h-5 w-5 ${action.accent}`} />
                  </div>
                  <p className="text-sm font-black text-slate-950">{action.label}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{action.detail}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-black text-indigo-600">Open <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></p>
                </button>
              );
            })}
          </div>
        </PremiumCard>
      </PremiumPageShell>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {userRole === 'admin' ? 'Admin Dashboard' :
               userRole === 'trainer' ? 'Trainer Dashboard' :
               'My Learning'}
            </h2>
            <p className="text-gray-500 mt-1">
              {userRole === 'admin' ? 'Manage the entire LMS platform' :
               userRole === 'trainer' ? 'Manage your courses and students' :
               'Track your progress and achievements'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              {colors.name}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            onClick={
              userRole === 'admin'
                ? onOpenAdminUsers
                : userRole === 'trainer' && 'detailPage' in stat
                  ? () => onOpenTrainerDetail?.(stat.detailPage)
                  : undefined
            }
          />
        ))}
      </div>

      {/* Admin Quick Actions */}
      {userRole === 'admin' && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <button
              onClick={() => setActivePage('bulk-import')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">Add Users</span>
            </button>
            <button
              onClick={() => setActivePage('courses')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">Create Course</span>
            </button>
            <button
              onClick={() => setActivePage('batches')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">New Batch</span>
            </button>
            <button
              onClick={() => setActivePage('assessments')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">Create Test</span>
            </button>
            <button
              onClick={() => setActivePage('analytics')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">View Reports</span>
            </button>
            <button
              onClick={() => setActivePage('live-sessions')}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">Go Live</span>
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.bg }}
              >
                {userRole === 'admin' ? <Users className="w-5 h-5" style={{ color: colors.primary }} /> :
                 userRole === 'trainer' ? <BookOpen className="w-5 h-5" style={{ color: colors.primary }} /> :
                 <GraduationCap className="w-5 h-5" style={{ color: colors.primary }} />}
              </div>
              <h3 className="font-semibold text-gray-900">
                {userRole === 'admin' ? 'Recent Registrations' :
                 userRole === 'trainer' ? 'My Active Courses' :
                 'Enrolled Courses'}
              </h3>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {userRole === 'admin' ? (
              loadingAdminDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : ad?.recentRegistrations?.length > 0 ? (
                ad.recentRegistrations.slice(0, 4).map((user: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    {!user.isApproved && (
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">Approve</button>
                        <button className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">Reject</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No recent registrations</div>
              )
            ) : userRole === 'trainer' ? (
              loadingTrainer ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : trainerCourses.length > 0 ? (
                trainerCourses.map((course: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.('courses')}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                      {course.title?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{course.title}</p>
                      <p className="text-sm text-gray-500">{course.currentEnrollments || 0} students</p>
                    </div>
                    <span className="text-lg font-semibold" style={{ color: colors.primary }}>
                      {course.statistics?.avgProgress || 0}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No active courses found. Create a course to get started!
                </div>
              )
            ) : (
              loadingStudent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : studentData?.recentCourses?.length > 0 ? (
                studentData.recentCourses.slice(0, 4).map((course: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                        {course.title?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{course.title}</p>
                        <p className="text-xs text-gray-500">{course.completedLessons}/{course.totalLessons} lessons</p>
                      </div>
                    </div>
                    <div className="ml-13">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium" style={{ color: colors.primary }}>{course.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progressPercent}%`, backgroundColor: colors.primary }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { title: 'Cooperative Management Fundamentals', progress: 75 },
                  { title: 'Digital Marketing for Cooperatives', progress: 45 },
                  { title: 'Financial Literacy & Accounting', progress: 90 },
                ].map((course, idx) => (
                  <div key={idx} className="p-3 rounded-xl hover:bg-gray-50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
                        {course.title[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{course.title}</p>
                      </div>
                    </div>
                    <div className="ml-13">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium" style={{ color: colors.primary }}>{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${course.progress}%`, backgroundColor: colors.primary }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Right Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                {userRole === 'admin' ? <Star className="w-5 h-5 text-teal-600" /> :
                 userRole === 'trainer' ? <Video className="w-5 h-5 text-teal-600" /> :
                 <Calendar className="w-5 h-5 text-teal-600" />}
              </div>
              <h3 className="font-semibold text-gray-900">
                {userRole === 'admin' ? 'Recent Ratings' :
                 userRole === 'trainer' ? 'Upcoming Sessions' :
                 'Upcoming Sessions'}
              </h3>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {userRole === 'admin' ? (
              loadingAdminDashboard ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : ad?.recentRatings?.length > 0 ? (
                ad.recentRatings.slice(0, 4).map((rating: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs">
                          {rating.student?.firstName?.[0]}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">{rating.student?.firstName} {rating.student?.lastName}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{rating.course?.title}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No ratings yet</div>
              )
            ) : userRole === 'trainer' ? (
              loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : upcomingSessions.length > 0 ? (
                upcomingSessions.map((session: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onNavigate?.('live-sessions')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm truncate">{session.title}</span>
                      <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                        {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">{session.enrolledCount || 0} enrolled</span>
                      <button className="px-3 py-1 bg-teal-500 text-white rounded-lg text-xs font-medium hover:bg-teal-600">Join</button>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { title: 'Cooperative Governance Workshop', date: 'May 2', students: 45 },
                  { title: 'Financial Planning Session', date: 'May 5', students: 32 },
                ].map((session, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">{session.title}</span>
                      <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{session.date}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">{session.students} students</span>
                      <button className="px-3 py-1 bg-teal-500 text-white rounded-lg text-xs">Join</button>
                    </div>
                  </div>
                ))
              )
            ) : (
              [
                { title: 'Cooperative Governance Workshop', date: 'May 2', trainer: 'Dr. Rajesh Kumar' },
                { title: 'Member Engagement Strategies', date: 'May 5', trainer: 'Prof. Anita Sharma' },
              ].map((session, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">{session.title}</span>
                    <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{session.date}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">by {session.trainer}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {userRole === 'admin' ? (
            <>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={onOpenAdminUsers}>
                <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Approve Users</p>
                <p className="text-xs text-gray-500 mt-1">{ad?.users?.pendingApprovals || 0} pending</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('courses')}>
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Manage Courses</p>
                <p className="text-xs text-gray-500 mt-1">{ad?.courses?.published || 0} active</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('reports')}>
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">View Reports</p>
                <p className="text-xs text-gray-500 mt-1">{ad?.queries?.total || 0} queries</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('certificates')}>
                <Award className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Certificates</p>
                <p className="text-xs text-gray-500 mt-1">{ad?.certificates?.total || 0} total</p>
              </button>
            </>
          ) : userRole === 'trainer' ? (
            <>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('courses')}>
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Create Course</p>
                <p className="text-xs text-gray-500 mt-1">{td?.summary?.totalCourses || 0} courses</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onOpenTrainerDetail?.('assessments')}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Grade Assessments</p>
                <p className="text-xs text-gray-500 mt-1">Check pending</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('live-sessions')}>
                <Video className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Schedule Session</p>
                <p className="text-xs text-gray-500 mt-1">{upcomingSessions.length} upcoming</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onOpenTrainerDetail?.('my-students')}>
                <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">View Students</p>
                <p className="text-xs text-gray-500 mt-1">{td?.summary?.totalStudents || 0} total</p>
              </button>
            </>
          ) : (
            <>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('courses')}>
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Browse Courses</p>
                <p className="text-xs text-gray-500 mt-1">{s?.total || 0} enrolled</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('assessments')}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Take Assessment</p>
                <p className="text-xs text-gray-500 mt-1">{s?.inProgress || 0} in progress</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('certificates')}>
                <Award className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">My Certificates</p>
                <p className="text-xs text-gray-500 mt-1">{s?.completed || 0} earned</p>
              </button>
              <button className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-center" onClick={() => onNavigate?.('live-sessions')}>
                <Video className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-gray-900 text-sm">Join Session</p>
                <p className="text-xs text-gray-500 mt-1">Check schedule</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Learning Analytics - Only for Participants */}
      {userRole === 'participant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Your Progress
            </h3>
            <div className="flex flex-col items-center">
              {/* Circular Progress */}
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke={colors.primary}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${overallProgress * 2.83} 283`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{overallProgress}%</span>
                  <span className="text-xs text-gray-500">complete</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  {s?.completed || 0} of {s?.total || 0} courses completed
                </p>
                {s?.inProgress > 0 && (
                  <p className="text-indigo-600 text-sm font-medium mt-1">
                    {s.inProgress} course{s.inProgress > 1 ? 's' : ''} in progress
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Continue Learning - Most Recent In Progress Course */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Continue Learning
            </h3>
            {studentData?.recentCourses?.find((c: any) => c.progressPercent > 0 && c.progressPercent < 100) ? (
              (() => {
                const continueCourse = studentData.recentCourses.find((c: any) => c.progressPercent > 0 && c.progressPercent < 100);
                return continueCourse ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <p className="font-medium text-gray-900 truncate">{continueCourse.title}</p>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{continueCourse.progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ width: `${continueCourse.progressPercent}%`, backgroundColor: colors.primary }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {continueCourse.completedLessons} of {continueCourse.totalLessons} lessons
                      </p>
                    </div>
                    <button
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Continue Course
                    </button>
                  </div>
                ) : null;
              })()
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No course in progress</p>
                <button className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                  Browse Courses →
                </button>
              </div>
            )}
          </div>

          {/* Achievements / Quick Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Achievements
            </h3>
            <div className="space-y-3">
              {/* Streak Badge */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Learning Streak</p>
                  <p className="text-xs text-gray-500">{learningStats?.currentStreak || 0} days current</p>
                </div>
                <span className="text-lg">🔥</span>
              </div>
              {/* Certificates Badge */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Certificates</p>
                  <p className="text-xs text-gray-500">{learningStats?.certificatesEarned || 0} earned</p>
                </div>
                <span className="text-lg">🏆</span>
              </div>
              {/* Hours Badge */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Hourglass className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Hours Learned</p>
                  <p className="text-xs text-gray-500">{learningStats?.learningHours || 0} total hours</p>
                </div>
                <span className="text-lg">⏱️</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Analytics - Only for Participants */}
      {userRole === 'participant' && learningStats && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Learning Analytics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600">Current Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{learningStats.currentStreak || 0}</p>
              <p className="text-xs text-gray-500">days</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-100">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-gray-600">Longest Streak</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{learningStats.longestStreak || 0}</p>
              <p className="text-xs text-gray-500">days</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Hourglass className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Total Hours</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{learningStats.learningHours || 0}</p>
              <p className="text-xs text-gray-500">hours learned</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Certificates</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{learningStats.certificatesEarned || 0}</p>
              <p className="text-xs text-gray-500">earned</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Learning Days</span>
              <span className="font-semibold text-gray-900">{learningStats.totalLearningDays || 0} days</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo Helper */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-gray-700 text-sm">
          <strong>Demo Mode:</strong> Click the avatar icon in the top-right to switch between Admin, Trainer, and Participant views.
        </p>
      </div>
    </div>
  );
}
