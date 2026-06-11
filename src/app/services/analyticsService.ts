import axiosInstance from '../../utils/axiosConfig';

export interface OverviewAnalytics {
  totalWatchHours: number;
  totalViews: number;
  avgWatchTime: string;
  completionRate: number;
  uniqueViewers: number;
}

export interface CourseAnalytics {
  _id: string;
  title: string;
  thumbnail?: string;
  enrollments: number;
  completions: number;
  watchHours: number;
  avgProgress: number;
  avgRating: number;
  retention: number;
  mostWatchedModule: string;
  comments: number;
  likes: number;
  certificatesIssued: number;
}

export interface PeakHour {
  hour: string;
  users: number;
  percentage: number;
}

export interface RecentActivity {
  time: string;
  user: string;
  action: string;
  item: string;
  course: string;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  email: string;
  progress: number;
  status: string;
  enrolledAt: string;
  lastAccessAt: string;
  completedAt?: string;
}

export interface DetailedCourseAnalytics {
  courseId: string;
  courseTitle: string;
  metrics: {
    totalEnrollments: number;
    completions: number;
    completionRate: number;
    avgProgress: number;
    watchHours: number;
    avgRating: number;
    retention: number;
    certificatesIssued: number;
  };
  studentProgress: StudentProgress[];
}

/**
 * Get overview analytics (total watch hours, views, completion rate, etc.)
 */
export const getOverviewAnalytics = async (): Promise<OverviewAnalytics> => {
  const response = await axiosInstance.get('/analytics/overview');
  return response.data.data;
};

/**
 * Get per-course analytics
 */
export const getCourseAnalytics = async (filters?: { trainerId?: string }): Promise<CourseAnalytics[]> => {
  const response = await axiosInstance.get('/analytics/courses', { params: filters });
  return response.data.data;
};

/**
 * Get detailed analytics for a specific course
 */
export const getCourseDetailedAnalytics = async (courseId: string): Promise<DetailedCourseAnalytics> => {
  const response = await axiosInstance.get(`/analytics/course/${courseId}`);
  return response.data.data;
};

/**
 * Get peak usage hours analytics
 */
export const getPeakHoursAnalytics = async (): Promise<PeakHour[]> => {
  const response = await axiosInstance.get('/analytics/peak-hours');
  return response.data.data;
};

/**
 * Get recent activity timeline
 */
export const getRecentActivity = async (limit?: number): Promise<RecentActivity[]> => {
  const response = await axiosInstance.get('/analytics/recent-activity', {
    params: { limit }
  });
  return response.data.data;
};
