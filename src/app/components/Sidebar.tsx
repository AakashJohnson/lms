import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Award,
  Settings,
  Bell,
  Video,
  Users,
  MessageSquare,
  PlaySquare,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserPlus,
  GraduationCap,
  Search,
  Brain,
  Bot,
  Globe,
  CalendarDays,
  ClipboardCheck,
} from 'lucide-react';
import { getUnreadCount } from '../services/notificationService';

interface SidebarProps {
  userRole: 'admin' | 'trainer' | 'participant';
  activePage: string;
  onPageChange: (page: string) => void;
}

export function Sidebar({ userRole, activePage, onPageChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const studentMenuCategories = [
    {
      category: 'Overview',
      items: [
        { icon: LayoutDashboard, label: 'My Dashboard', page: 'dashboard' },
        { icon: CalendarDays, label: 'Calendar Activity', page: 'calendar-activity' },
        { icon: BarChart3, label: 'My Progress', page: 'reports' },
      ],
    },
    {
      category: 'Learning',
      items: [
        { icon: Globe, label: 'Course Marketplace', page: 'global-courses' },
        { icon: BookOpen, label: 'My Courses', page: 'courses' },
        { icon: Brain, label: 'Byte Learning', page: 'byte-size-learning' },
        { icon: Video, label: 'Live Sessions', page: 'live-sessions' },
        { icon: ClipboardList, label: 'My Assessments', page: 'assessments' },
        { icon: Award, label: 'My Certificates', page: 'certificates' },
      ],
    },
    {
      category: 'AI & Media',
      items: [
        { icon: Search, label: 'Smart Search', page: 'smart-search' },
        { icon: Bot, label: 'AI Tutor', page: 'ai-tutor' },
        { icon: PlaySquare, label: 'Media Library', page: 'media-library' },
      ],
    },
    {
      category: 'Community',
      items: [
        { icon: MessageSquare, label: 'Ask Questions (QMS)', page: 'qms' },
        { icon: MessageSquare, label: 'Community Forum', page: 'forum' },
      ],
    },
  ];

  const trainerMenuCategories = [
    {
      category: 'Trainer Hub',
      items: [
        { icon: LayoutDashboard, label: 'Command Dashboard', page: 'dashboard' },
        { icon: Users, label: 'Learner Roster', page: 'my-students' },
        { icon: CalendarDays, label: 'Student Activity Tracker', page: 'student-activity-tracker' },
      ],
    },
    {
      category: 'Teaching Studio',
      items: [
        { icon: BookOpen, label: 'Course Studio', page: 'courses' },
        { icon: CalendarDays, label: 'Content Planning', page: 'content-planning' },
        { icon: Brain, label: 'Byte Learning', page: 'byte-size-learning' },
        { icon: PlaySquare, label: 'Media Library', page: 'media-library' },
        { icon: Video, label: 'Live Sessions', page: 'live-sessions' },
      ],
    },
    {
      category: 'Evaluation',
      items: [
        { icon: ClipboardList, label: 'Assessments', page: 'assessments' },
        { icon: ClipboardCheck, label: 'Assignments Review', page: 'assignments-review' },
        { icon: Award, label: 'Certificates', page: 'certificates' },
      ],
    },
    {
      category: 'Support & AI',
      items: [
        { icon: Search, label: 'Smart Search', page: 'smart-search' },
        { icon: MessageSquare, label: 'Student Queries', page: 'qms' },
        { icon: MessageSquare, label: 'Community Forum', page: 'forum' },
      ],
    },
    {
      category: 'Utilities',
      items: [
        { icon: UserPlus, label: 'Bulk Import', page: 'bulk-import' },
      ],
    },
  ];

  const adminMenuCategories = [
    {
      category: 'Overview & Analytics',
      items: [
        { icon: LayoutDashboard, label: 'Admin Dashboard', page: 'dashboard' },
        { icon: LineChart, label: 'Advanced Analytics', page: 'analytics' },
        { icon: CalendarDays, label: 'Student Activity Monitor', page: 'student-activity-monitor' },
        { icon: BarChart3, label: 'Platform Reports', page: 'reports' },
      ],
    },
    {
      category: 'User & Org Management',
      items: [
        { icon: Users, label: 'User Management', page: 'user-management' },
        { icon: Users, label: 'Trainer Management', page: 'trainer-management' },
        { icon: Users, label: 'Student Management', page: 'student-management' },
        { icon: Building2, label: 'Departments', page: 'departments' },
        { icon: BookOpen, label: 'Batches', page: 'batches' },
        { icon: GraduationCap, label: 'Trainer Assignment', page: 'trainer-assignment' },
        { icon: UserPlus, label: 'Bulk Import', page: 'bulk-import' },
      ],
    },
    {
      category: 'Academics & Content',
      items: [
        { icon: BookOpen, label: 'Course Management', page: 'courses' },
        { icon: ClipboardCheck, label: 'Course Review Center', page: 'course-review' },
        { icon: ClipboardList, label: 'Assessments', page: 'assessments' },
        { icon: ClipboardCheck, label: 'Assignments Review', page: 'assignments-review' },
        { icon: Video, label: 'Live Sessions', page: 'live-sessions' },
        { icon: Award, label: 'Certificate Management', page: 'certificate-management' },
        { icon: PlaySquare, label: 'Media Library', page: 'media-library' },
      ],
    },
    {
      category: 'AI & Engagement',
      items: [
        { icon: Search, label: 'Smart Search', page: 'smart-search' },
        { icon: MessageSquare, label: 'Query Management', page: 'qms' },
        { icon: MessageSquare, label: 'Community Forum', page: 'forum' },
      ],
    },
  ];

  const bottomItems = [
    { icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount.toString() : undefined, page: 'notifications' },
    { icon: Settings, label: 'Profile Settings', page: 'settings' },
  ];

  const allCategories =
    userRole === 'participant' ? studentMenuCategories :
    userRole === 'trainer' ? trainerMenuCategories :
    adminMenuCategories;

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} relative flex flex-shrink-0 flex-col px-3 py-4 transition-all duration-300`}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[26px] border border-indigo-100/80 bg-white/78 shadow-[0_18px_44px_-28px_rgba(79,70,229,0.38)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_16%_8%,rgba(79,70,229,0.10),transparent_36%),radial-gradient(circle_at_82%_24%,rgba(20,184,166,0.09),transparent_34%)]" />
      {!collapsed && (
        <div className="relative border-b border-indigo-100/70 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
            {userRole === 'trainer' ? 'Trainer Console' : userRole === 'admin' ? 'Admin Console' : 'Learning Portal'}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {userRole === 'trainer' ? 'Classroom Operations' : userRole === 'admin' ? 'Platform Management' : 'Student Workspace'}
          </p>
        </div>
      )}

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-10 w-7 h-7 bg-white border border-indigo-100 rounded-full flex items-center justify-center shadow-sm hover:bg-indigo-50 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-slate-600" /> : <ChevronLeft className="w-3 h-3 text-slate-600" />}
      </button>

      <nav className="relative flex-1 px-3 py-3 space-y-4 overflow-y-auto overflow-x-hidden">
        {allCategories.map((category, catIndex) => (
          <div key={catIndex} className="space-y-1">
            {!collapsed ? (
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] px-3 mb-1 mt-4 first:mt-0 select-none">
                {category.category}
              </h3>
            ) : (
              catIndex > 0 && <div className="border-t border-indigo-100 my-2 mx-1" />
            )}

            {category.items.map((item, index) => {
              const Icon = item.icon;
              const isActive = activePage === item.page;

              return (
                <button
                  key={index}
                  onClick={() => onPageChange(item.page)}
                  title={collapsed ? item.label : undefined}
                  className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4F46E5] via-[#2563EB] to-[#14B8A6] text-white shadow-[0_16px_30px_-18px_rgba(79,70,229,0.95)]'
                      : 'text-slate-700 hover:bg-white/95 hover:text-indigo-700 hover:shadow-sm hover:translate-x-1'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.95)]" />
                  )}
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative px-3 py-3 space-y-1 border-t border-indigo-100/70">
        {bottomItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activePage === item.page;

          return (
            <button
              key={index}
              onClick={() => onPageChange(item.page)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 relative ${
                isActive
                  ? 'bg-gradient-to-r from-[#4F46E5] to-[#2563EB] text-white shadow-[0_14px_26px_-18px_rgba(79,70,229,0.9)]'
                  : 'text-slate-700 hover:bg-white/90 hover:shadow-sm hover:-translate-y-0.5'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
              {'badge' in item && item.badge && (
                <span className={`${collapsed ? 'absolute top-1 right-1' : 'ml-auto'} text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white text-indigo-600' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {!collapsed && (
          <div className="mt-3 rounded-[22px] border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-sky-50/60 p-3 shadow-[0_12px_30px_-24px_rgba(37,99,235,0.72)]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#2563EB] text-white flex items-center justify-center mb-2">
              <Bot className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{userRole === 'trainer' ? 'Teaching Assistant' : 'Need Help?'}</p>
            <p className="text-xs text-slate-500 mt-1">{userRole === 'trainer' ? 'Use smart search and QMS tools to support learners faster.' : 'Use AI Tutor for learning support and quick doubts.'}</p>
            <button
              onClick={() => onPageChange(userRole === 'trainer' ? 'smart-search' : 'ai-tutor')}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#2563EB] py-2 text-xs font-semibold text-white hover:brightness-105 transition-all"
            >
              {userRole === 'trainer' ? 'Open Tools' : 'Open Support'}
            </button>
          </div>
        )}
      </div>
      </div>
    </aside>
  );
}
