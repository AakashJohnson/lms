import axiosInstance from '../../utils/axiosConfig';

export const getCourseReviewList = async (filters?: Record<string, string>) => {
  const res = await axiosInstance.get('/admin/courses/review', { params: filters });
  return res.data as { success: boolean; data: any[]; summary: any; total: number };
};

export const getCourseReviewDetail = async (courseId: string) => {
  const res = await axiosInstance.get(`/admin/courses/${courseId}/review`);
  return res.data as { success: boolean; data: any };
};

export const publishCourse = async (courseId: string, message?: string) => {
  const res = await axiosInstance.put(`/admin/courses/${courseId}/publish`, { message });
  return res.data as { success: boolean; data: any; message?: string };
};

export const requestCourseChanges = async (courseId: string, message: string) => {
  const res = await axiosInstance.put(`/admin/courses/${courseId}/request-changes`, { message });
  return res.data as { success: boolean; data: any; message?: string };
};

export const rejectCourse = async (courseId: string, message: string) => {
  const res = await axiosInstance.put(`/admin/courses/${courseId}/reject`, { message });
  return res.data as { success: boolean; data: any; message?: string };
};

export const unpublishCourse = async (courseId: string, message?: string) => {
  const res = await axiosInstance.put(`/admin/courses/${courseId}/unpublish`, { message });
  return res.data as { success: boolean; data: any; message?: string };
};
