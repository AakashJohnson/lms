import { TrendingUp, Users, Clock, Play, BookOpen, Award, MessageSquare, Star, Download, Eye, ThumbsUp, ThumbsDown, Loader2, RefreshCw, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FilterBar } from './FilterBar';
import {
  getOverviewAnalytics,
  getCourseAnalytics,
  getPeakHoursAnalytics,
  getRecentActivity,
  type OverviewAnalytics,
  type CourseAnalytics,
  type PeakHour,
  type RecentActivity as ActivityType
} from '../services/analyticsService';
import { getAllRatings, type CourseRating } from '../services/ratingService';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function AnalyticsDashboard() {
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  // State for analytics data
  const [videoAnalytics, setVideoAnalytics] = useState<OverviewAnalytics | null>(null);
  const [coursePerformance, setCoursePerformance] = useState<CourseAnalytics[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<ActivityType[]>([]);
  const [allRatings, setAllRatings] = useState<CourseRating[]>([]);
  
  // Ratings filter state
  const [selectedRatingCourse, setSelectedRatingCourse] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0); // 0 = all, 1-5 = specific rating
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Export as Excel
  const exportAsExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const currentDate = new Date().toLocaleDateString();

      // Overview Sheet
      const overviewData = videoAnalytics ? [
        ['Analytics Report - ' + currentDate],
        [''],
        ['Overview Metrics'],
        ['Total Watch Hours', videoAnalytics.totalWatchHours || 0],
        ['Total Views', videoAnalytics.totalViews || 0],
        ['Average Watch Time', videoAnalytics.avgWatchTime || '0:00'],
        ['Completion Rate', (videoAnalytics.completionRate || 0) + '%'],
        ['Unique Viewers', videoAnalytics.uniqueViewers || 0]
      ] : [];

      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview');

      // Course Performance Sheet
      const courseHeaders = ['Course Title', 'Enrollments', 'Completions', 'Watch Hours', 'Avg Progress', 'Avg Rating', 'Retention', 'Certificates Issued'];
      const courseData = coursePerformance.map(course => [
        course.title || 'N/A',
        course.enrollments || 0,
        course.completions || 0,
        course.watchHours || 0,
        (course.avgProgress || 0).toFixed(1) + '%',
        (course.avgRating || 0).toFixed(1),
        (course.retention || 0).toFixed(1) + '%',
        course.certificatesIssued || 0
      ]);
      courseData.unshift(courseHeaders);
      const courseSheet = XLSX.utils.aoa_to_sheet(courseData);
      XLSX.utils.book_append_sheet(wb, courseSheet, 'Course Performance');

      // Peak Hours Sheet
      if (peakHours.length > 0) {
        const peakHeaders = ['Hour', 'Users', 'Percentage'];
        const peakData = peakHours.map(peak => [
          peak.hour || 'N/A',
          peak.users || 0,
          (peak.percentage || 0).toFixed(1) + '%'
        ]);
        peakData.unshift(peakHeaders);
        const peakSheet = XLSX.utils.aoa_to_sheet(peakData);
        XLSX.utils.book_append_sheet(wb, peakSheet, 'Peak Hours');
      }

      // Activity Timeline Sheet
      if (activityTimeline.length > 0) {
        const activityHeaders = ['Time', 'User', 'Action', 'Item', 'Course'];
        const activityData = activityTimeline.map(activity => [
          activity.time || 'N/A',
          activity.user || 'N/A',
          activity.action || 'N/A',
          activity.item || 'N/A',
          activity.course || 'N/A'
        ]);
        activityData.unshift(activityHeaders);
        const activitySheet = XLSX.utils.aoa_to_sheet(activityData);
        XLSX.utils.book_append_sheet(wb, activitySheet, 'Recent Activity');
      }

      // Ratings Sheet
      if (allRatings.length > 0) {
        const ratingHeaders = ['Course', 'Student', 'Rating', 'Comment', 'Date'];
        const ratingData = allRatings.map(rating => [
          rating.courseTitle || 'N/A',
          rating.studentName || 'N/A',
          rating.rating || 0,
          rating.comment || 'N/A',
          rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : 'N/A'
        ]);
        ratingData.unshift(ratingHeaders);
        const ratingSheet = XLSX.utils.aoa_to_sheet(ratingData);
        XLSX.utils.book_append_sheet(wb, ratingSheet, 'Ratings & Reviews');
      }

      // Download file
      XLSX.writeFile(wb, `Analytics_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Analytics report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  // Export as PDF (using browser print)
  const exportAsPDF = () => {
    try {
      // Create a printable document
      const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Analytics Report - ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #4f46e5; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .metric-label { font-size: 12px; color: #666; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Analytics Report</h1>
  <p>Generated on: ${new Date().toLocaleString()}</p>

  <h2>Overview Metrics</h2>
  <div>
    <div class="metric"><div class="metric-value">${videoAnalytics?.totalWatchHours || 0}</div><div class="metric-label">Total Watch Hours</div></div>
    <div class="metric"><div class="metric-value">${videoAnalytics?.totalViews || 0}</div><div class="metric-label">Total Views</div></div>
    <div class="metric"><div class="metric-value">${videoAnalytics?.avgWatchTime || '0:00'}</div><div class="metric-label">Avg Watch Time</div></div>
    <div class="metric"><div class="metric-value">${videoAnalytics?.completionRate || 0}%</div><div class="metric-label">Completion Rate</div></div>
    <div class="metric"><div class="metric-value">${videoAnalytics?.uniqueViewers || 0}</div><div class="metric-label">Unique Viewers</div></div>
  </div>

  <h2>Course Performance</h2>
  <table>
    <thead><tr><th>Course</th><th>Enrollments</th><th>Completions</th><th>Watch Hours</th><th>Avg Progress</th><th>Rating</th><th>Retention</th></tr></thead>
    <tbody>
      ${coursePerformance.map(course => `<tr>
        <td>${course.title || 'N/A'}</td>
        <td>${course.enrollments || 0}</td>
        <td>${course.completions || 0}</td>
        <td>${course.watchHours || 0}</td>
        <td>${(course.avgProgress || 0).toFixed(1)}%</td>
        <td>${(course.avgRating || 0).toFixed(1)}</td>
        <td>${(course.retention || 0).toFixed(1)}%</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${peakHours.length > 0 ? `
  <h2>Peak Hours</h2>
  <table>
    <thead><tr><th>Hour</th><th>Users</th><th>Percentage</th></tr></thead>
    <tbody>
      ${peakHours.map(peak => `<tr><td>${peak.hour || 'N/A'}</td><td>${peak.users || 0}</td><td>${(peak.percentage || 0).toFixed(1)}%</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  ${activityTimeline.length > 0 ? `
  <h2>Recent Activity</h2>
  <table>
    <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Item</th><th>Course</th></tr></thead>
    <tbody>
      ${activityTimeline.map(activity => `<tr><td>${activity.time || 'N/A'}</td><td>${activity.user || 'N/A'}</td><td>${activity.action || 'N/A'}</td><td>${activity.item || 'N/A'}</td><td>${activity.course || 'N/A'}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  ${allRatings.length > 0 ? `
  <h2>Ratings & Reviews</h2>
  <table>
    <thead><tr><th>Course</th><th>Student</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead>
    <tbody>
      ${allRatings.slice(0, 50).map(rating => `<tr><td>${rating.courseTitle || 'N/A'}</td><td>${rating.studentName || 'N/A'}</td><td>${rating.rating || 0}</td><td>${(rating.comment || 'N/A').substring(0, 50)}${(rating.comment || '').length > 50 ? '...' : ''}</td><td>${rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : 'N/A'}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  <p style="margin-top: 30px; color: #999; font-size: 12px;">Generated by LMS Analytics Dashboard</p>
</body>
</html>`;

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
        toast.success('PDF ready for printing!');
      } else {
        toast.error('Unable to open print window');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [overview, courses, peaks, activity, ratings] = await Promise.all([
        getOverviewAnalytics(),
        getCourseAnalytics(),
        getPeakHoursAnalytics().catch(() => []), // Admin only, may fail for trainers
        getRecentActivity(10),
        getAllRatings({ limit: 100 }).catch(() => ({ data: [] })) // Fetch all ratings
      ]);

      setVideoAnalytics(overview);
      setCoursePerformance(courses);
      setPeakHours(peaks);
      setActivityTimeline(activity);
      setAllRatings(ratings.data || []);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error(error.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Get unique courses from ratings
  const coursesWithRatings = Array.from(
    new Map(allRatings.map(r => [r.course._id, r.course])).values()
  );

  // Filter ratings based on selected course and rating filter
  const filteredRatings = allRatings.filter(rating => {
    const courseMatch = selectedRatingCourse === 'all' || rating.course._id === selectedRatingCourse;
    const ratingMatch = ratingFilter === 0 || rating.rating === ratingFilter;
    return courseMatch && ratingMatch;
  });

  // Calculate rating statistics for selected course
  const getRatingStats = (courseId: string) => {
    const courseRatings = allRatings.filter(r => r.course._id === courseId);
    if (courseRatings.length === 0) return null;

    const avgRating = courseRatings.reduce((sum, r) => sum + r.rating, 0) / courseRatings.length;
    const distribution = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: courseRatings.filter(r => r.rating === star).length,
      percentage: (courseRatings.filter(r => r.rating === star).length / courseRatings.length) * 100
    }));

    return {
      avgRating: avgRating.toFixed(1),
      totalRatings: courseRatings.length,
      distribution
    };
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Advanced Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Deep insights into course performance, user engagement, and platform metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Comprehensive Filters */}
      <FilterBar
        onFilterChange={setActiveFilters}
        showProgramFilter={true}
        showBatchFilter={true}
        showCourseFilter={true}
        showExport={true}
      />

      {/* Video Analytics Summary */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-8 text-white">
        <h3 className="text-xl font-bold mb-6">Video Lecture Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <Clock className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-3xl font-bold">{videoAnalytics?.totalWatchHours.toLocaleString() || 0}</p>
            <p className="text-sm opacity-90 mt-1">Total Watch Hours</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <Play className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-3xl font-bold">{videoAnalytics?.totalViews.toLocaleString() || 0}</p>
            <p className="text-sm opacity-90 mt-1">Total Video Views</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <Eye className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-3xl font-bold">{videoAnalytics?.avgWatchTime || '0 min'}</p>
            <p className="text-sm opacity-90 mt-1">Avg Watch Time</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <TrendingUp className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-3xl font-bold">{videoAnalytics?.completionRate || 0}%</p>
            <p className="text-sm opacity-90 mt-1">Video Completion</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <Users className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-3xl font-bold">{videoAnalytics?.uniqueViewers.toLocaleString() || 0}</p>
            <p className="text-sm opacity-90 mt-1">Unique Viewers</p>
          </div>
        </div>
      </div>

      {/* Course Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-lg text-gray-900">Detailed Course Performance</h3>
          <p className="text-sm text-gray-600 mt-1">
            {coursePerformance.length > 0 
              ? `Showing ${coursePerformance.length} course${coursePerformance.length !== 1 ? 's' : ''}`
              : 'No courses found'}
          </p>
        </div>
        
        {coursePerformance.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No course data available</p>
            <p className="text-gray-500 text-sm mt-2">Create courses and enroll students to see analytics</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Enrollments</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completions</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Watch Hours</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Avg Progress</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rating</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coursePerformance.map((course) => (
                  <tr
                    key={course._id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedCourse === course._id ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => setSelectedCourse(selectedCourse === course._id ? null : course._id)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{course.title}</p>
                        {course.mostWatchedModule && (
                          <p className="text-xs text-gray-600 mt-1">Most watched: {course.mostWatchedModule}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{course.enrollments.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-gray-900">{course.completions.toLocaleString()}</span>
                        {course.enrollments > 0 && (
                          <span className="text-xs text-gray-600">
                            ({Math.round((course.completions / course.enrollments) * 100)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">{course.watchHours.toLocaleString()}h</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{course.avgProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-purple-500 h-2 rounded-full"
                            style={{ width: `${course.avgProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-gray-900">{course.avgRating.toFixed(1)}</span>
                        <span className="text-xs text-gray-600">/5.0</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        course.retention >= 85 ? 'bg-green-100 text-green-700' :
                        course.retention >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {course.retention}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded Course Details */}
        {selectedCourse && (() => {
          const course = coursePerformance.find(c => c._id === selectedCourse);
          if (!course) return null;

          return (
            <div className="p-6 bg-purple-50 border-t border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-4">Detailed Metrics for: {course.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <p className="text-sm text-gray-600">Comments</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{course.comments}</p>
                  <p className="text-xs text-gray-600 mt-1">User discussions</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-gray-600">Likes</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{course.likes}</p>
                  <p className="text-xs text-gray-600 mt-1">Positive feedback</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm text-gray-600">Certificates</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{course.certificatesIssued}</p>
                  <p className="text-xs text-gray-600 mt-1">Issued</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-gray-600">Completion Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {course.enrollments > 0 
                      ? Math.round((course.completions / course.enrollments) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Students who finished</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Peak Usage Hours */}
      {peakHours.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Peak Usage Hours (Last 7 Days)</h3>
          <div className="space-y-3">
            {peakHours.map((hour, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-700">{hour.hour}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-8 relative">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-purple-500 h-8 rounded-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${hour.percentage}%` }}
                    >
                      <span className="text-white font-semibold text-sm">{hour.users.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-gray-600">{hour.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Ratings & Feedback */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Student Ratings & Feedback</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {allRatings.length} total rating{allRatings.length !== 1 ? 's' : ''} across all courses
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Course Filter */}
              <select
                value={selectedRatingCourse}
                onChange={(e) => setSelectedRatingCourse(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Courses</option>
                {coursesWithRatings.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>

              {/* Rating Filter */}
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={0}>All Ratings</option>
                <option value={5}>⭐⭐⭐⭐⭐ (5 stars)</option>
                <option value={4}>⭐⭐⭐⭐ (4 stars)</option>
                <option value={3}>⭐⭐⭐ (3 stars)</option>
                <option value={2}>⭐⭐ (2 stars)</option>
                <option value={1}>⭐ (1 star)</option>
              </select>
            </div>

            {/* Rating Statistics for Selected Course */}
            {selectedRatingCourse !== 'all' && (() => {
              const stats = getRatingStats(selectedRatingCourse);
              if (!stats) return null;

              return (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-gray-900">{stats.avgRating}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(parseFloat(stats.avgRating))
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {stats.distribution.map(({ star, count, percentage }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-8">{star}★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Ratings List */}
          {filteredRatings.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No ratings found</p>
              <p className="text-gray-500 text-sm mt-2">
                {allRatings.length === 0 
                  ? 'Students will be able to rate courses after completion'
                  : 'Try adjusting the filters'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredRatings.map((rating) => (
                <div key={rating._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Student Avatar */}
                    <div className="flex-shrink-0">
                      {rating.student.profilePicture ? (
                        <img
                          src={rating.student.profilePicture}
                          alt={`${rating.student.firstName} ${rating.student.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-sm">
                            {rating.student.firstName[0]}{rating.student.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rating Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {rating.student.firstName} {rating.student.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{rating.course.title}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rating.rating
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rating.review && (
                        <p className="text-sm text-gray-700 leading-relaxed">{rating.review}</p>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(rating.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Activity Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-lg text-gray-900">Recent User Activity</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Live</span>
            </div>
          </div>
          {activityTimeline.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No recent activity</p>
              <p className="text-gray-500 text-sm mt-2">Activity will appear here as students interact with courses</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {activityTimeline.map((activity, idx) => (
                <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-16 text-xs text-gray-600">{activity.time}</div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{activity.user}</span>{' '}
                        <span className="text-gray-600">{activity.action}</span>{' '}
                        <span className="font-medium text-indigo-600">{activity.item}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">{activity.course}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Export Analytics Report</h4>
            <p className="text-sm text-gray-600">Download comprehensive analytics data for the selected time period</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={exportAsPDF}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              <Download className="w-5 h-5" />
              Export as PDF
            </button>
            <button
              onClick={exportAsExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-all"
            >
              <Download className="w-5 h-5" />
              Export as Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
