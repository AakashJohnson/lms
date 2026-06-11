import axiosInstance from '../../utils/axiosConfig';

export const getLessonAssignment = async (courseId: string, lessonId: string) => {
  const res = await axiosInstance.get(`/assignments/course/${courseId}/lesson/${lessonId}`);
  return res.data as { success: boolean; data: { assignment: any | null; submission: any | null } };
};

export const submitLessonAssignment = async (courseId: string, lessonId: string, formData: FormData) => {
  const res = await axiosInstance.post(`/assignments/course/${courseId}/lesson/${lessonId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; data: any };
};

export const getAssignmentSubmissions = async (courseIdOrAssignmentId: string, lessonId?: string) => {
  const url = lessonId
    ? `/assignments/course/${courseIdOrAssignmentId}/lesson/${lessonId}/submissions`
    : `/assignments/${courseIdOrAssignmentId}/submissions`;
  const res = await axiosInstance.get(url);
  return res.data as { success: boolean; data: any[] };
};

export const gradeAssignmentSubmission = async (submissionId: string, payload: { score: number; feedback?: string }) => {
  const res = await axiosInstance.patch(`/assignments/submissions/${submissionId}/grade`, payload);
  return res.data as { success: boolean; data: any };
};

export const getTeacherAssignmentOverview = async (filters?: Record<string, string>) => {
  const res = await axiosInstance.get('/assignments/teacher/overview', { params: filters });
  return res.data as { success: boolean; data: any[]; summary: any };
};

export const getTeacherAssignmentSubmissions = async (assignmentId: string) => {
  return getAssignmentSubmissions(assignmentId);
};

export const getSubmissionDetail = async (submissionId: string) => {
  const res = await axiosInstance.get(`/assignments/submissions/${submissionId}`);
  return res.data as { success: boolean; data: any };
};

export const reviewAssignmentSubmission = async (
  submissionId: string,
  payload: { score?: number | null; feedback?: string; status: string; teacherAttachment?: any }
) => {
  const res = await axiosInstance.put(`/assignments/submissions/${submissionId}/review`, payload);
  return res.data as { success: boolean; data: any };
};

export const uploadTeacherFeedbackFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosInstance.post('/assignments/teacher/feedback-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; data: any };
};
