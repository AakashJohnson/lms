import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || userData.role !== 'student') {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/my-dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Learning Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user?.firstName}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Enrolled Courses"
            value={dashboard?.statistics?.enrolledCourses || 0}
            icon="📚"
            color="bg-blue-500"
          />
          <StatCard
            title="In Progress"
            value={dashboard?.statistics?.inProgressCourses || 0}
            icon="⏳"
            color="bg-yellow-500"
          />
          <StatCard
            title="Completed"
            value={dashboard?.statistics?.completedCourses || 0}
            icon="✅"
            color="bg-green-500"
          />
          <StatCard
            title="Certificates"
            value={dashboard?.statistics?.certificatesEarned || 0}
            icon="🏆"
            color="bg-purple-500"
          />
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Overall Progress</h2>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Average Progress</span>
                <span className="text-sm font-medium text-indigo-600">
                  {dashboard?.statistics?.averageProgress || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${dashboard?.statistics?.averageProgress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard?.recentCourses?.map((course, index) => (
              <CourseCard key={index} course={course} />
            )) || <p className="text-gray-500 col-span-2">No courses in progress</p>}
          </div>
        </div>

        {/* My Certificates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Certificates</h2>
          <div className="space-y-3">
            {dashboard?.certificates?.map((cert, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <p className="font-medium">{cert.courseName}</p>
                    <p className="text-sm text-gray-600">
                      Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                  Download
                </button>
              </div>
            )) || <p className="text-gray-500">No certificates yet. Complete courses to earn certificates!</p>}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        <img
          src={course.course?.thumbnail || '/placeholder-course.jpg'}
          alt={course.course?.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{course.course?.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{course.progress}% complete</span>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Continue →
            </button>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${course.progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
