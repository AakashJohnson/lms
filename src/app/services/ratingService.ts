import axiosInstance from '../../utils/axiosConfig';

export interface CourseRating {
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
  isApproved: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitRatingData {
  courseId: string;
  rating: number;
  review?: string;
  templateId?: string;
}

export interface ReviewTemplate {
  _id: string;
  title: string;
  templateText: string;
  category: 'positive' | 'neutral' | 'negative';
  isActive: boolean;
  order: number;
}

/**
 * Submit or update a course rating
 */
export const submitRating = async (data: SubmitRatingData) => {
  const response = await axiosInstance.post('/ratings', data);
  return response.data;
};

/**
 * Get ratings for a specific course
 */
export const getCourseRatings = async (courseId: string, page = 1, limit = 10) => {
  const response = await axiosInstance.get(`/ratings/course/${courseId}`, {
    params: { page, limit }
  });
  return response.data;
};

/**
 * Get student's own rating for a course
 */
export const getMyRating = async (courseId: string) => {
  const response = await axiosInstance.get(`/ratings/my-rating/${courseId}`);
  return response.data;
};

/**
 * Get all ratings (Admin/Trainer)
 */
export const getAllRatings = async (params?: {
  page?: number;
  limit?: number;
  courseId?: string;
  trainerId?: string;
  minRating?: number;
  maxRating?: number;
}) => {
  const response = await axiosInstance.get('/ratings', { params });
  return response.data;
};

/**
 * Get recent ratings (Admin)
 */
export const getRecentRatings = async (limit = 10) => {
  const response = await axiosInstance.get('/ratings/recent', {
    params: { limit }
  });
  return response.data;
};

/**
 * Delete a rating (Admin)
 */
export const deleteRating = async (ratingId: string) => {
  const response = await axiosInstance.delete(`/ratings/${ratingId}`);
  return response.data;
};

/**
 * Toggle rating visibility (Admin)
 */
export const toggleRatingVisibility = async (ratingId: string) => {
  const response = await axiosInstance.patch(`/ratings/${ratingId}/visibility`);
  return response.data;
};

/**
 * Get active review templates for students to select
 */
export const getReviewTemplates = async () => {
  const response = await axiosInstance.get('/review-templates');
  return response.data;
};
