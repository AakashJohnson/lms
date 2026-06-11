import axiosInstance from '../../utils/axiosConfig';

export interface TrainerDashboardData {
  summary: {
    totalCourses: number;
    publishedCourses: number;
    totalStudents: number;
  };
  courses: Array<{
    _id: string;
    title: string;
    currentEnrollments: number;
    isPublished: boolean;
    ratings: {
      average: number;
      count: number;
    };
    statistics: {
      totalCompletions: number;
      avgProgress: number;
    };
    enrollmentCount: number;
    completedCount: number;
  }>;
  performance: Array<{
    title: string;
    enrollments: number;
    completions: number;
    completionRate: number;
    avgRating: number;
  }>;
}

export interface AdminDashboardData {
  users: {
    total: number;
    admins: number;
    trainers: number;
    students: number;
    pendingApprovals: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
  };
  enrollments: {
    total: number;
    completed: number;
    inProgress: number;
  };
  queries: {
    total: number;
    open: number;
    resolved: number;
  };
  media: {
    total: number;
  };
  certificates: {
    total: number;
  };
  payments: {
    total: number;
    revenue: number;
  };
  recentRegistrations: Array<any>;
  recentRatings?: Array<{
    _id: string;
    course: {
      _id: string;
      title: string;
      thumbnail?: string;
    };
    student: {
      _id: string;
      firstName: string;
      lastName: string;
      profilePicture?: string;
    };
    rating: number;
    review?: string;
    createdAt: string;
  }>;
  lastUpdated: string;
}

/**
 * Get trainer dashboard data
 */
export const getTrainerDashboard = async () => {
  try {
    const response = await axiosInstance.get('/dashboard/trainer');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get admin dashboard data
 */
export const getAdminDashboard = async () => {
  try {
    const response = await axiosInstance.get('/dashboard/admin');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export default {
  getTrainerDashboard,
  getAdminDashboard
};
