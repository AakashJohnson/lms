import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  Bell,
  Video,
  FileText,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStudent } from '../../contexts/StudentContext';
import { DashboardCard, InfoCard } from './DashboardCard';
import { ProgressChart, CircularProgress } from './ProgressChart';
import StreakLeaderboard from './StreakLeaderboard';
import { toast } from 'sonner';

export function EnhancedStudentDashboard() {
  const navigate = useNavigate();
  const { dashboardData, profile, loading, error, refreshDashboard } = useStudent();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDashboard();
    setRefreshing(false);
    toast.success('Dashboard refreshed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.statistics;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {profile?.firstName || 'Student'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your learning journey today
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Enrolled Courses"
            value={stats?.enrolledCourses || 0}
            icon={BookOpen}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-100"
            onClick={() => navigate('/dashboard/courses')}
          />
          <DashboardCard
            title="In Progress"
            value={stats?.inProgressCourses || 0}
            icon={Clock}
            iconColor="text-yellow-600"
            iconBgColor="bg-yellow-100"
            subtitle={`${stats?.averageProgress || 0}% avg progress`}
          />
          <DashboardCard
            title="Completed"
            value={stats?.completedCourses || 0}
            icon={CheckCircle2}
            iconColor="text-green-600"
            iconBgColor="bg-green-100"
          />
          <DashboardCard
            title="Certificates"
            value={stats?.certificatesEarned || 0}
            icon={Award}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-100"
            onClick={() => navigate('/dashboard/certificates')}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            title="Assessments"
            value={`${stats?.completedAssessments || 0}/${stats?.totalAssessments || 0}`}
            icon={FileText}
            iconColor="text-indigo-600"
            iconBgColor="bg-indigo-100"
            subtitle={`${stats?.averageScore || 0}% avg score`}
          />
          <DashboardCard
            title="Live Sessions"
            value={stats?.upcomingLiveSessions || 0}
            icon={Video}
            iconColor="text-pink-600"
            iconBgColor="bg-pink-100"
            subtitle="Upcoming this week"
            onClick={() => navigate('/dashboard/live-sessions')}
          />
          <DashboardCard
            title="Study Hours"
            value={stats?.totalStudyHours || 0}
            icon={BarChart3}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-100"
            subtitle="This month"
          />
        </div>

        {/* Streak & Leaderboard */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🎯</span> Learning Progress & Leaderboard
          </h2>
          <StreakLeaderboard />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Continue Learning */}
            <InfoCard
              title="Continue Learning"
              action={
                <button
                  onClick={() => navigate('/dashboard/courses')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All →
                </button>
              }
            >
              {dashboardData?.recentCourses && dashboardData.recentCourses.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentCourses.slice(0, 3).map((course) => (
                    <CourseProgressCard key={course._id} course={course} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No courses in progress</p>
                  <button
                    onClick={() => navigate('/dashboard/courses')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                  >
                    Browse Courses
                  </button>
                </div>
              )}
            </InfoCard>

            {/* Recent Activity */}
            <InfoCard title="Recent Activity">
              {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentActivities.slice(0, 5).map((activity) => (
                    <ActivityItem key={activity._id} activity={activity} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </InfoCard>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-8">
            {/* Overall Progress */}
            <InfoCard title="Overall Progress">
              <div className="flex justify-center py-4">
                <CircularProgress
                  percentage={stats?.averageProgress || 0}
                  label="Average Progress"
                />
              </div>
              <div className="mt-6">
                <ProgressChart
                  data={[
                    {
                      label: 'Completed',
                      value: stats?.completedCourses || 0,
                      color: 'bg-green-500'
                    },
                    {
                      label: 'In Progress',
                      value: stats?.inProgressCourses || 0,
                      color: 'bg-yellow-500'
                    },
                    {
                      label: 'Not Started',
                      value: (stats?.enrolledCourses || 0) - (stats?.completedCourses || 0) - (stats?.inProgressCourses || 0),
                      color: 'bg-gray-300'
                    }
                  ]}
                />
              </div>
            </InfoCard>

            {/* Upcoming Sessions */}
            <InfoCard
              title="Upcoming Sessions"
              action={
                <button
                  onClick={() => navigate('/dashboard/live-sessions')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All →
                </button>
              }
            >
              {dashboardData?.upcomingSessions && dashboardData.upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcomingSessions.slice(0, 3).map((session) => (
                    <SessionCard key={session._id} session={session} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming sessions</p>
              )}
            </InfoCard>

            {/* Notifications */}
            <InfoCard
              title="Notifications"
              action={
                <button
                  onClick={() => navigate('/dashboard/notifications')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View All →
                </button>
              }
            >
              {dashboardData?.notifications && dashboardData.notifications.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.notifications.slice(0, 3).map((notification: any) => (
                    <NotificationItem key={notification._id} notification={notification} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No new notifications</p>
              )}
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function CourseProgressCard({ course }: { course: any }) {
  const navigate = useNavigate();
  
  return (
    <div
      onClick={() => navigate(`/dashboard/courses/${course.course._id}`)}
      className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl hover:shadow-md transition-all cursor-pointer border border-indigo-100"
    >
      <img
        src={course.course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&h=100&fit=crop'}
        alt={course.course.title}
        className="w-20 h-20 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{course.course.title}</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{course.progress}% complete</span>
          <span className="text-sm font-medium text-indigo-600">Continue →</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${course.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'course_enrolled': return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'assessment_completed': return <FileText className="w-5 h-5 text-green-600" />;
      case 'certificate_earned': return <Award className="w-5 h-5 text-purple-600" />;
      case 'session_attended': return <Video className="w-5 h-5 text-pink-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.timestamp).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: any }) {
  return (
    <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-100">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{session.title}</h4>
        <Video className="w-4 h-4 text-pink-600 flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
        <Calendar className="w-3 h-3" />
        <span>
          {new Date(session.scheduledAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
      <p className="text-xs text-gray-600">Trainer: {session.trainer?.name || 'TBA'}</p>
    </div>
  );
}

function NotificationItem({ notification }: { notification: any }) {
  return (
    <div className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
      <Bell className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{notification.title || notification.message}</p>
        <p className="text-xs text-gray-500">
          {new Date(notification.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
