import axiosInstance from '../utils/axiosConfig';

const unwrap = (response) => response.data?.data;

export const activityApi = {
  getMySummary: (params) => axiosInstance.get('/activity/my/summary', { params }).then(unwrap),
  getMyCalendar: (params) => axiosInstance.get('/activity/my/calendar', { params }).then(unwrap),
  getMyDay: (params) => axiosInstance.get('/activity/my/day', { params }).then(unwrap),
  getMyRange: (params) => axiosInstance.get('/activity/my/range', { params }).then(unwrap),

  getTeacherCourses: () => axiosInstance.get('/activity/teacher/courses').then(unwrap),
  getTeacherCourseStudents: (courseId) => axiosInstance.get(`/activity/teacher/courses/${courseId}/students`).then(unwrap),
  getTeacherStudentSummary: (studentId, params) => axiosInstance.get(`/activity/teacher/students/${studentId}/summary`, { params }).then(unwrap),
  getTeacherStudentCalendar: (studentId, params) => axiosInstance.get(`/activity/teacher/students/${studentId}/calendar`, { params }).then(unwrap),
  getTeacherStudentDay: (studentId, params) => axiosInstance.get(`/activity/teacher/students/${studentId}/day`, { params }).then(unwrap),

  searchAdminStudents: (q) => axiosInstance.get('/activity/admin/students/search', { params: { q } }).then(unwrap),
  getAdminStudentSummary: (studentId, params) => axiosInstance.get(`/activity/admin/students/${studentId}/summary`, { params }).then(unwrap),
  getAdminStudentCalendar: (studentId, params) => axiosInstance.get(`/activity/admin/students/${studentId}/calendar`, { params }).then(unwrap),
  getAdminStudentDay: (studentId, params) => axiosInstance.get(`/activity/admin/students/${studentId}/day`, { params }).then(unwrap),
  exportAdminStudentActivity: (studentId, params) => axiosInstance.get(`/activity/admin/students/${studentId}/export`, {
    params,
    responseType: 'blob',
  }),
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
