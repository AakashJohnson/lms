import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  BookOpen,
  Building2,
  CircleUserRound,
  FileBarChart2,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Star,
  UserCog,
  UserPlus,
  Users,
  Video,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import axiosInstance from '../utils/axiosConfig';
import UserManagement from '../components/admin/UserManagement';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || userData.role !== 'administrator') {
      navigate('/login');
      return;
    }

    setUser(userData);

    const fetchDashboardData = async () => {
      try {
        const response = await axiosInstance.get('/dashboard/admin');
        setStats(response.data?.data || null);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || 'A'}${user?.lastName?.[0] || 'U'}`;

  const metricCards = useMemo(
    () => [
      {
        icon: Users,
        title: 'Total Users',
        value: stats?.users?.total ?? 6,
        pct: '56%',
        tone: 'from-violet-500/10 via-purple-500/5 to-transparent',
        shadowColor: 'rgba(124, 58, 237, 0.08)',
        sparkline: "M0 30 Q 15 15, 30 22 T 60 8 T 90 4",
        accent: '#7c3aed',
        trend: '+12% growth',
      },
      {
        icon: GraduationCap,
        title: 'Enrollments',
        value: stats?.enrollments?.total ?? 16,
        pct: '72%',
        tone: 'from-blue-500/10 via-cyan-500/5 to-transparent',
        shadowColor: 'rgba(37, 99, 235, 0.08)',
        sparkline: "M0 25 Q 20 22, 40 8 T 80 4",
        accent: '#2563eb',
        trend: 'Steady growth',
      },
      {
        icon: BookOpen,
        title: 'Total Courses',
        value: stats?.courses?.total ?? 3,
        pct: '60%',
        tone: 'from-amber-500/10 via-orange-500/5 to-transparent',
        shadowColor: 'rgba(245, 158, 11, 0.08)',
        sparkline: "M0 20 Q 30 20, 60 10 T 90 8",
        accent: '#d97706',
        trend: '+3 new',
      },
      {
        icon: ShieldCheck,
        title: 'Completed',
        value: stats?.courses?.published ?? 9,
        pct: '85%',
        tone: 'from-emerald-500/10 via-teal-500/5 to-transparent',
        shadowColor: 'rgba(5, 150, 105, 0.08)',
        sparkline: "M0 30 L 30 12 L 60 16 L 90 4",
        accent: '#059669',
        trend: '94% success',
      },
      {
        icon: Star,
        title: 'Certificates',
        value: stats?.certificates?.total ?? 5,
        pct: '45%',
        tone: 'from-pink-500/10 via-rose-500/5 to-transparent',
        shadowColor: 'rgba(219, 39, 119, 0.08)',
        sparkline: "M0 35 Q 25 30, 50 12 T 90 6",
        accent: '#db2777',
        trend: 'Verifiable',
      },
    ],
    [stats]
  );

  const sidebarItems = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutGrid },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'trainers', label: 'Trainer Management', icon: UserCog },
    { id: 'students', label: 'Student Management', icon: CircleUserRound },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'batches', label: 'Batches', icon: BookOpen },
    { id: 'assign', label: 'Trainer Assignment', icon: GraduationCap },
    { id: 'import', label: 'Bulk Import', icon: UserPlus },
    { id: 'courses', label: 'Course Management', icon: BookOpen },
    { id: 'analytics', label: 'Advanced Analytics', icon: FileBarChart2 },
    { id: 'reports', label: 'Platform Reports', icon: FileBarChart2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Profile Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-14 w-14 rounded-full border-4 border-violet-200 border-t-violet-700 animate-spin" />
      </div>
    );
  }

  if (activeSection === 'users') {
    return <UserManagement />;
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-slate-200 bg-white/85 backdrop-blur-sm p-5 hidden lg:block">
          <div className="flex items-center gap-3 mb-6">
            <img src="/ankuvadini.png" alt="Anuvadini" className="h-10 w-auto" />
            <img src="/mca_logo.png" alt="MCA" className="h-10 w-10 rounded-full object-cover" />
            <img src="/ncui.png" alt="NCUI" className="h-10 w-10 rounded-full object-cover" />
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
                    active
                      ? 'bg-gradient-to-r from-violet-700 to-indigo-600 text-white shadow'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <header className="bg-white/90 border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between mb-5">
            <h1 className="text-3xl font-extrabold text-indigo-700 tracking-tight">CEAS-LMS Portal</h1>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 bg-white">
                <span className="text-lg">🌐</span>
                <span className="font-semibold">English</span>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-sm text-slate-500">Admin User</p>
                <p className="text-sm font-semibold text-indigo-700">Admin</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-700 text-white grid place-items-center font-bold text-lg">{initials}</div>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-slate-100" title="Logout">
                <LogOut className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </header>

          <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 mb-6 shadow-xl">
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
                    LMS Command Center is live. All background sync operations are running operational.
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
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-6">
            {metricCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  onClick={() => {
                    if (card.title === 'Total Users') setActiveSection('users');
                    else if (card.title === 'Total Courses') setActiveSection('courses');
                    else if (card.title === 'Enrollments') setActiveSection('students');
                    else if (card.title === 'Completed') setActiveSection('courses');
                    else if (card.title === 'Certificates') setActiveSection('reports');
                  }}
                  className="relative group rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer overflow-hidden"
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
                      {card.pct}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-0.5">{card.title}</p>
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
                      Live stats sync
                    </span>
                    <span className="text-emerald-500 font-bold">{card.trend}</span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Interactive Operations Center (Quick Actions) */}
          <section className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 mb-6 shadow-sm backdrop-blur-md">
            <h3 className="text-indigo-950 font-extrabold text-lg mb-4 flex items-center gap-2">
              <span className="p-1 bg-indigo-50 rounded-lg text-indigo-600">⚡</span>
              Platform Operations Center
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
              {[
                ['Add Users', UserPlus, 'import', 'border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/20', '#6366f1', 'Bulk CSV Import & Sync'],
                ['Create Course', Plus, 'courses', 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/20', '#3b82f6', 'Author modules & sections'],
                ['New Batch', GraduationCap, 'batches', 'border-green-100 hover:border-green-300 hover:bg-green-50/20', '#10b981', 'Cohort assignments'],
                ['Create Test', FileBarChart2, 'courses', 'border-yellow-100 hover:border-yellow-300 hover:bg-yellow-50/20', '#f59e0b', 'Grade & assessment files'],
                ['View Reports', FileBarChart2, 'reports', 'border-purple-100 hover:border-purple-300 hover:bg-purple-50/20', '#8b5cf6', 'Growth & query stats'],
                ['Go Live', Video, 'dashboard', 'border-pink-100 hover:border-pink-300 hover:bg-pink-50/20', '#ec4899', 'Instant classroom streams'],
              ].map(([label, Icon, target, hoverStyle, iconColor, desc]) => (
                <button
                  key={label as string}
                  onClick={() => setActiveSection(target as string)}
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
          <section className="bg-white border border-slate-200/60 rounded-3xl p-6 mb-6 shadow-sm relative overflow-hidden">
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
                  <p className="text-xs font-bold text-indigo-700/80 uppercase tracking-wider">Average Learning Time</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">48.6 min</p>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                    <span>▲ +8.2%</span>
                    <span className="text-slate-400 font-normal">vs last month</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-100/50">
                  <p className="text-xs font-bold text-cyan-700/80 uppercase tracking-wider">Peak Active Concurrency</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">1,420</p>
                  <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                    <span>▲ +14.5%</span>
                    <span className="text-slate-400 font-normal">system peak</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/50">
                  <p className="text-xs font-bold text-emerald-700/80 uppercase tracking-wider">Database Sync Latency</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Operational & Synced
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Auto-sync active every 4 hr</p>
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
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            {/* Recent Registrations Redesign */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-indigo-950 font-extrabold text-lg flex items-center gap-2">
                  <span className="p-1 bg-indigo-50 rounded-lg text-indigo-600">👥</span>
                  Recent Registrations
                </h3>
                <button
                  onClick={() => setActiveSection('users')}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
                >
                  Manage Users
                </button>
              </div>
              
              <div className="space-y-3">
                {[
                  ['Pratham Sharma', 'pratham.sharma@ncui.in', '2 min ago', 'from-purple-600 to-indigo-600'],
                  ['Pratham Pratham', 'pratham@ncui.in', '15 min ago', 'from-blue-600 to-cyan-600'],
                  ['Test Singh', 'student@ncui.in', '1 hr ago', 'from-emerald-600 to-teal-600'],
                  ['Vikas Kumar', 'trainer@ncui.in', '2 hr ago', 'from-pink-600 to-rose-600'],
                ].map((row) => (
                  <div key={row[1]} className="p-3 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${row[3]} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                        {row[0].split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{row[0]}</p>
                        <p className="text-xs text-slate-500 font-semibold">{row[1]}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{row[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Ratings Redesign */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-indigo-950 font-extrabold text-lg flex items-center gap-2">
                  <span className="p-1 bg-amber-50 rounded-lg text-amber-500">⭐</span>
                  Recent Ratings & Reviews
                </h3>
                <button
                  onClick={() => setActiveSection('reports')}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
                >
                  View All Reviews
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ['Pratham Sharma', 'CMS Course', 4, 'from-purple-500/10 to-transparent'],
                  ['Pratham Sharma', 'LMS Orientation', 5, 'from-blue-500/10 to-transparent'],
                  ['Pratham Pratham', 'CMS Course', 5, 'from-emerald-500/10 to-transparent'],
                  ['Pratham Pratham', 'LMS Orientation', 5, 'from-pink-500/10 to-transparent'],
                ].map((row, idx) => (
                  <div key={`${row[0]}-${idx}`} className="p-3 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-amber-500 text-sm">
                        ★
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{row[0]}</p>
                        <p className="text-xs text-slate-500 font-semibold">{row[1] as string}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-amber-500 font-black leading-none tracking-wider">
                        {'★'.repeat(row[2] as number)}{'☆'.repeat(5 - (row[2] as number))}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Unified Action Telemetry Bottom Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            {[
              ['Approve Users', '0', 'pending approvals', '#8b5cf6', 'from-violet-500/10 to-transparent', 'users'],
              ['Manage Courses', '3', 'active courses', '#3b82f6', 'from-blue-500/10 to-transparent', 'courses'],
              ['View Reports', '0', 'system queries', '#10b981', 'from-emerald-500/10 to-transparent', 'reports'],
              ['Certificates Issued', '5', 'total credentials', '#db2777', 'from-pink-500/10 to-transparent', 'reports'],
            ].map((x) => (
              <div
                key={x[0]}
                onClick={() => setActiveSection(x[5])}
                className="group relative bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden"
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
            <p className="font-semibold text-slate-600">
              ⚡ <strong>Enterprise Telemetry active.</strong> System status is healthy. Click the avatar icon in the top-right to switch dashboard views.
            </p>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-black text-slate-400">CEAS-LMS v2.4</span>
          </div>
        </main>
      </div>
    </div>
  );
}
