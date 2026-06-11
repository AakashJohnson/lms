import {
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Loader2,
  Trash2,
  ChevronDown,
  Shield,
  GraduationCap,
  MessageSquare,
  ClipboardList,
  FileText,
  MoreVertical,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Bot,
  Settings2,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  Notification as NotificationType
} from '../services/notificationService';
import { toast } from 'sonner';

export function Notifications() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions' | 'system' | 'course'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    today: 0
  });

  useEffect(() => {
    loadNotifications();
    requestNotificationPermission();
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Browser notifications enabled!');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await getAllNotifications({ limit: 50 });
      setNotifications(response.data);
      
      // Calculate stats
      const unread = response.data.filter(n => !n.read).length;
      const read = response.data.filter(n => n.read).length;
      const today = response.data.filter(n => {
        const notifDate = new Date(n.createdAt);
        const todayDate = new Date();
        return notifDate.toDateString() === todayDate.toDateString();
      }).length;

      setStats({
        total: response.data.length,
        unread,
        read,
        today
      });
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast.error(error.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setStats(prev => ({
        ...prev,
        unread: prev.unread - 1,
        read: prev.read + 1
      }));
      toast.success('Marked as read');
    } catch (error: any) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setStats(prev => ({
        ...prev,
        unread: 0,
        read: prev.total
      }));
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      const deletedNotif = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setStats(prev => ({
        total: prev.total - 1,
        unread: deletedNotif?.read ? prev.unread : prev.unread - 1,
        read: deletedNotif?.read ? prev.read - 1 : prev.read,
        today: prev.today
      }));
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllRead();
      setNotifications(prev => prev.filter(n => !n.read));
      setStats(prev => ({
        ...prev,
        total: prev.unread,
        read: 0
      }));
      toast.success('All read notifications cleared');
    } catch (error: any) {
      toast.error('Failed to clear notifications');
    }
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    try {
      // Mark as read if unread
      if (!notification.read) {
        await handleMarkAsRead(notification._id);
      }

      // Navigate to action URL if exists
      if (notification.actionUrl) {
        console.log('📍 Navigating to:', notification.actionUrl);
        
        // Check if it's a page name (no slash) or full URL
        if (!notification.actionUrl.startsWith('/')) {
          // It's a page name, navigate within dashboard
          window.location.href = `/dashboard?page=${notification.actionUrl}`;
        } else {
          // It's a full URL path
          window.location.href = notification.actionUrl;
        }
      } else {
        toast.info('No action URL for this notification');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const typeConfig = {
    success: { icon: CheckCircle2, iconClass: 'text-emerald-600', bg: 'from-emerald-100 to-emerald-50' },
    info: { icon: Info, iconClass: 'text-blue-600', bg: 'from-blue-100 to-blue-50' },
    warning: { icon: AlertTriangle, iconClass: 'text-amber-600', bg: 'from-amber-100 to-amber-50' },
    error: { icon: XCircle, iconClass: 'text-rose-600', bg: 'from-rose-100 to-rose-50' },
  };

  const notificationTabs = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'unread', label: 'Unread', icon: Filter },
    { id: 'mentions', label: 'Mentions', icon: MessageSquare },
    { id: 'system', label: 'System', icon: Shield },
    { id: 'course', label: 'Course Updates', icon: GraduationCap },
  ] as const;

  const categoryLabel: Record<NotificationType['category'], string> = {
    course: 'Course Update',
    assessment: 'Assignment',
    certificate: 'Report',
    session: 'Message',
    payment: 'Payment',
    system: 'System',
  };

  const categoryIcon: Record<NotificationType['category'], React.ElementType> = {
    course: GraduationCap,
    assessment: ClipboardList,
    certificate: FileText,
    session: MessageSquare,
    payment: CheckCircle,
    system: Shield,
  };

  const categoryTone: Record<NotificationType['category'], string> = {
    course: 'bg-blue-50 text-blue-700 border-blue-100',
    assessment: 'bg-violet-50 text-violet-700 border-violet-100',
    certificate: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    session: 'bg-sky-50 text-sky-700 border-sky-100',
    payment: 'bg-amber-50 text-amber-700 border-amber-100',
    system: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const filteredNotifications = useMemo(() => {
    const matchesTab = (notification: NotificationType) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return !notification.read;
      if (activeTab === 'system') return notification.category === 'system';
      if (activeTab === 'course') return notification.category === 'course';
      return /message|trainer|admin/i.test(`${notification.title} ${notification.message}`);
    };

    const list = notifications.filter(matchesTab);
    return [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [notifications, activeTab, sortBy]);

  const preferenceRows = [
    { label: 'Course Updates', sublabel: 'New courses, updates and content', icon: GraduationCap, color: 'from-blue-500 to-cyan-500' },
    { label: 'System Alerts', sublabel: 'Maintenance, downtime and alerts', icon: Shield, color: 'from-rose-500 to-red-500' },
    { label: 'Messages', sublabel: 'Messages from trainers and admins', icon: MessageSquare, color: 'from-violet-500 to-purple-500' },
    { label: 'Weekly Reports', sublabel: 'Weekly performance summaries', icon: ClipboardList, color: 'from-emerald-500 to-teal-500' },
  ];

  const timeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 px-1 sm:px-0">
      <div className="pointer-events-none absolute right-0 top-8 h-44 w-44 rounded-full bg-indigo-200/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 right-8 h-40 w-40 rounded-full bg-cyan-200/20 blur-3xl" />

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.08),transparent_28%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Notification Center
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Stay updated with your learning progress and platform activities.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={stats.unread === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />Mark all as read
            </button>
            <button
              onClick={handleClearAll}
              disabled={stats.read === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />Clear all
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, description: 'All notifications', icon: Bell, bg: 'from-blue-100 to-blue-50', iconBg: 'bg-blue-100 text-blue-600', accent: 'bg-blue-400' },
          { label: 'Unread', value: stats.unread, description: 'Needs your attention', icon: Bell, bg: 'from-rose-100 to-red-50', iconBg: 'bg-rose-100 text-rose-600', accent: 'bg-rose-400' },
          { label: 'Read', value: stats.read, description: 'Marked as read', icon: CheckCircle2, bg: 'from-emerald-100 to-green-50', iconBg: 'bg-emerald-100 text-emerald-600', accent: 'bg-emerald-400' },
          { label: 'Today', value: stats.today, description: 'Today’s activity', icon: CalendarDays, bg: 'from-violet-100 to-purple-50', iconBg: 'bg-violet-100 text-violet-600', accent: 'bg-violet-400' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`group overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${item.bg} p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/70 shadow-sm ${item.iconBg}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-950">{item.value}</p>
                    <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </div>
                <div className="mt-1 flex h-12 items-end gap-1 opacity-60">
                  <span className={`w-1.5 rounded-full ${item.accent} h-3`} />
                  <span className={`w-1.5 rounded-full ${item.accent} h-5`} />
                  <span className={`w-1.5 rounded-full ${item.accent} h-2`} />
                  <span className={`w-1.5 rounded-full ${item.accent} h-6`} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Filter + Actions */}
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {notificationTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${active ? 'border-indigo-200 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-200' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                aria-label="Sort notifications"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <button
              onClick={handleMarkAllAsRead}
              disabled={stats.unread === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />Mark all as read
            </button>
            <button
              onClick={handleClearAll}
              disabled={stats.read === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />Clear all
            </button>
          </div>
        </div>
      </section>

      {/* Notifications + Preferences */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">All Notifications</h3>
              <p className="text-sm text-slate-500">Showing your latest platform updates and learning activity.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50">
              <Sparkles className="h-4 w-4 text-indigo-600" />View all notifications
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Bell className="h-8 w-8" />
                </div>
                <p className="text-lg font-medium text-slate-700">No notifications yet</p>
                <p className="mt-2 text-sm text-slate-500">You&apos;ll see updates about your courses and activities here.</p>
              </div>
            ) : (
              filteredNotifications.slice(0, 5).map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;
                const CategoryIcon = categoryIcon[notification.category];
                const isUnread = !notification.read;

                return (
                  <article
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`group cursor-pointer px-6 py-5 transition-all duration-300 hover:bg-slate-50 ${isUnread ? 'bg-blue-50/40' : 'bg-white'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br ${config.bg} shadow-sm`}>
                        <Icon className={`h-6 w-6 ${config.iconClass}`} />
                        {notification.category === 'session' ? <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-slate-500">AU</span> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryTone[notification.category]}`}>
                                <CategoryIcon className="h-3.5 w-3.5" />
                                {categoryLabel[notification.category]}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                                {notification.read ? 'Read' : 'Unread'}
                              </span>
                            </div>
                            <h4 className="text-base font-semibold text-slate-950">{notification.title}</h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {isUnread ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : <span className="h-2 w-2 rounded-full bg-slate-300" />}
                            <span className="whitespace-nowrap">{timeAgo(notification.createdAt)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                              aria-label="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{notification.message}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification._id);
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100"
                            >
                              <CheckCircle className="h-4 w-4" />Mark as read
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification._id);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Showing 1 to {Math.min(5, filteredNotifications.length)} of {stats.total} notifications</p>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-all hover:text-indigo-700">
              View all notifications <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
            <p className="mt-1 text-sm text-slate-500">Manage how you receive notifications.</p>
          </div>

          <div className="divide-y divide-slate-100 px-6">
            {preferenceRows.map((pref) => {
              const Icon = pref.icon;
              return (
                <div key={pref.label} className="flex items-center gap-4 py-4">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${pref.color} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{pref.label}</p>
                    <p className="text-sm text-slate-500">{pref.sublabel}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <span className="sr-only">Toggle {pref.label}</span>
                    <input type="checkbox" aria-label={`Toggle ${pref.label}`} title={`Toggle ${pref.label}`} className="sr-only peer" defaultChecked />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 transition-all duration-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 p-4">
            <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100">
              <span className="inline-flex items-center gap-2"><Settings2 className="h-4 w-4 text-indigo-600" />Manage email preferences</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>

      {/* Floating AI Assistant */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="group flex items-center gap-3 rounded-full border border-slate-800/10 bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 px-4 py-3 text-white shadow-xl shadow-indigo-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/30">
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
    </div>
  );
}
