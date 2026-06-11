import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import {
  BookOpen,
  Users,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Clock,
  Star,
  AlertCircle,
  BarChart3,
  Calendar,
  FileText,
  Award,
  Activity
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api/v1';

export default function TrainerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queriesLoading, setQueriesLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || userData.role !== 'trainer') {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchDashboardData(token);
    fetchPendingQueries(token);
  }, [navigate]);

  const fetchDashboardData = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/trainer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingQueries = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/course-queries/trainer?status=pending&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueries(response.data.data || []);
    } catch (error) {
      console.error('Error fetching queries:', error);
    } finally {
      setQueriesLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleViewAllQueries = () => {
    // Navigate to queries page (you'll need to create this route)
    navigate('/trainer/queries');
  };

  const handleCreateCourse = () => {
    navigate('/trainer/create-course');
  };

  const handleViewCourse = (courseId) => {
    navigate(`/trainer/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalEnrollments = stats?.courses?.reduce((sum, course) => sum + (course.enrollmentCount || 0), 0) || 0;
  const totalCompletions = stats?.courses?.reduce((sum, course) => sum + (course.completedCount || 0), 0) || 0;
  const avgCompletionRate = totalEnrollments > 0 ? ((totalCompletions / totalEnrollments) * 100).toFixed(1) : 0;
  const avgRating = stats?.courses?.length > 0 
    ? (stats.courses.reduce((sum, c) => sum + (c.ratings?.average || 0), 0) / stats.courses.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-7 h-7 text-indigo-600" />
                Trainer Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateCourse}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Create Course
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Courses"
            value={stats?.summary?.totalCourses || 0}
            icon={<BookOpen className="w-6 h-6" />}
            color="bg-blue-500"
            subtitle={`${stats?.summary?.publishedCourses || 0} published`}
          />
          <StatCard
            title="Total Students"
            value={totalEnrollments}
            icon={<Users className="w-6 h-6" />}
            color="bg-green-500"
            subtitle="Across all courses"
          />
          <StatCard
            title="Completion Rate"
            value={`${avgCompletionRate}%`}
            icon={<CheckCircle className="w-6 h-6" />}
            color="bg-purple-500"
            subtitle={`${totalCompletions} completed`}
          />
          <StatCard
            title="Average Rating"
            value={avgRating}
            icon={<Star className="w-6 h-6" />}
            color="bg-yellow-500"
            subtitle="Student feedback"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Courses */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Courses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    My Courses
                  </h2>
                  <span className="text-sm text-gray-500">
                    {stats?.courses?.length || 0} total
                  </span>
                </div>
              </div>
              <div className="p-6">
                {stats?.courses && stats.courses.length > 0 ? (
                  <div className="space-y-4">
                    {stats.courses.map((course) => (
                      <CourseCard
                        key={course._id}
                        course={course}
                        onView={() => handleViewCourse(course._id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No courses yet</p>
                    <button
                      onClick={handleCreateCourse}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Create Your First Course
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Overview */}
            {stats?.performance && stats.performance.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Course Performance
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {stats.performance.slice(0, 5).map((perf, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{perf.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {perf.enrollments || 0} enrolled
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              {perf.completions || 0} completed
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-yellow-600 font-semibold">
                            <Star className="w-4 h-4 fill-yellow-600" />
                            {perf.avgRating?.toFixed(1) || 'N/A'}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {perf.completionRate?.toFixed(0) || 0}% completion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Queries & Quick Actions */}
          <div className="space-y-6">
            {/* Pending Questions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Student Questions
                  </h2>
                  {queries.length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                      {queries.length} pending
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">
                {queriesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : queries.length > 0 ? (
                  <div className="space-y-3">
                    {queries.map((query) => (
                      <QueryCard key={query._id} query={query} />
                    ))}
                    <button
                      onClick={handleViewAllQueries}
                      className="w-full py-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      View All Questions →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No pending questions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <ActionButton
                    title="Create Course"
                    icon={<BookOpen className="w-5 h-5" />}
                    onClick={handleCreateCourse}
                  />
                  <ActionButton
                    title="View Questions"
                    icon={<MessageSquare className="w-5 h-5" />}
                    onClick={handleViewAllQueries}
                  />
                  <ActionButton
                    title="Create Assessment"
                    icon={<FileText className="w-5 h-5" />}
                    onClick={() => navigate('/trainer/create-assessment')}
                  />
                  <ActionButton
                    title="Schedule Live Session"
                    icon={<Calendar className="w-5 h-5" />}
                    onClick={() => navigate('/trainer/live-sessions')}
                  />
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Pro Tip</h3>
                  <p className="text-sm text-indigo-100">
                    Respond to student questions within 24 hours to maintain high engagement and satisfaction rates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`${color} w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, onView }) {
  const completionRate = course.enrollmentCount > 0
    ? ((course.completedCount / course.enrollmentCount) * 100).toFixed(0)
    : 0;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-gray-900">{course.title}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            course.isPublished
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.enrollmentCount || 0} students
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {completionRate}% completed
          </span>
          {course.ratings?.average > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Star className="w-4 h-4 fill-yellow-600" />
              {course.ratings.average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onView}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        Manage
      </button>
    </div>
  );
}

function QueryCard({ query }) {
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {query.question}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(query.createdAt)}
        </span>
        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
          {query.category || 'general'}
        </span>
      </div>
    </div>
  );
}

function ActionButton({ title, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200 hover:border-indigo-300 group"
    >
      <div className="text-indigo-600 group-hover:text-indigo-700">
        {icon}
      </div>
      <span className="font-medium text-gray-700 group-hover:text-indigo-700">
        {title}
      </span>
    </button>
  );
}
