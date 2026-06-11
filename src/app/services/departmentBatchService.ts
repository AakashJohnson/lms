import axiosInstance from '../../utils/axiosConfig';

/**
 * Get all departments
 */
export const getDepartments = async (params?: { isActive?: boolean; search?: string }) => {
  const response = await axiosInstance.get('/departments', { params });
  return response.data;
};

/**
 * Create department
 */
export const createDepartment = async (data: { name: string; code: string; description?: string }) => {
  const response = await axiosInstance.post('/departments', data);
  return response.data;
};

/**
 * Update department
 */
export const updateDepartment = async (id: string, data: { name?: string; code?: string; description?: string; isActive?: boolean }) => {
  const response = await axiosInstance.put(`/departments/${id}`, data);
  return response.data;
};

/**
 * Delete department
 */
export const deleteDepartment = async (id: string) => {
  const response = await axiosInstance.delete(`/departments/${id}`);
  return response.data;
};

/**
 * Get all batches with filters
 */
export const getBatches = async (params?: { department?: string; year?: number; isActive?: boolean; search?: string; page?: number; limit?: number }) => {
  const response = await axiosInstance.get('/batches', { params });
  return response.data;
};

/**
 * Get single batch with details
 */
export const getBatch = async (id: string) => {
  const response = await axiosInstance.get(`/batches/${id}`);
  return response.data;
};

/**
 * Create batch
 */
export const createBatch = async (data: {
  name: string;
  code: string;
  department: string;
  year: number;
  semester?: number;
  section?: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
}) => {
  const response = await axiosInstance.post('/batches', data);
  return response.data;
};

/**
 * Update batch
 */
export const updateBatch = async (id: string, data: any) => {
  const response = await axiosInstance.put(`/batches/${id}`, data);
  return response.data;
};

/**
 * Delete batch
 */
export const deleteBatch = async (id: string) => {
  const response = await axiosInstance.delete(`/batches/${id}`);
  return response.data;
};

/**
 * Get batch students
 */
export const getBatchStudents = async (batchId: string) => {
  const response = await axiosInstance.get(`/batches/${batchId}/students`);
  return response.data;
};

/**
 * Assign students to batch
 */
export const assignStudentsToBatch = async (batchId: string, studentIds: string[]) => {
  const response = await axiosInstance.post(`/batches/${batchId}/assign`, { studentIds });
  return response.data;
};

/**
 * Remove students from batch
 */
export const removeStudentsFromBatch = async (batchId: string, studentIds: string[]) => {
  const response = await axiosInstance.post(`/batches/${batchId}/remove`, { studentIds });
  return response.data;
};

/**
 * Import students with department & batch
 */
export const importStudentsWithDepartment = async (students: any[], defaultPassword?: string) => {
  const response = await axiosInstance.post('/bulk-import/students/department', {
    students,
    defaultPassword: defaultPassword || 'Student@123'
  });
  return response.data;
};

/**
 * Import students from Excel file
 */
export const importStudentsFromExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post('/bulk-import/students/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Get student import template
 */
export const getStudentImportTemplate = async () => {
  const response = await axiosInstance.get('/bulk-import/template/students', {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Assign courses to batch
 */
export const assignCoursesToBatch = async (batchId: string, courseIds: string[], enrollStudents = true) => {
  const response = await axiosInstance.post(`/bulk-import/batch/${batchId}/courses`, {
    courseIds,
    enrollStudents
  });
  return response.data;
};

/**
 * Assign courses to department
 */
export const assignCoursesToDepartment = async (departmentId: string, courseIds: string[], enrollAllBatches = true) => {
  const response = await axiosInstance.post(`/bulk-import/department/${departmentId}/courses`, {
    courseIds,
    enrollAllBatches
  });
  return response.data;
};

/**
 * Auto divide participants department-wise into batches
 */
export const autoDivideParticipantsByDepartment = async (payload?: {
  departmentIds?: string[];
  onlyUnassigned?: boolean;
}) => {
  const response = await axiosInstance.post('/bulk-import/participants/auto-divide', payload || {});
  return response.data;
};

/**
 * Get unassigned participants (optionally by department)
 */
export const getUnassignedParticipants = async (params?: {
  departmentId?: string;
  limit?: number;
}) => {
  const response = await axiosInstance.get('/bulk-import/participants/unassigned', { params });
  return response.data;
};

/**
 * Manually assign participants to selected batch
 */
export const manualAssignParticipantsToBatch = async (batchId: string, participantIds: string[]) => {
  const response = await axiosInstance.post('/bulk-import/participants/manual-assign', {
    batchId,
    participantIds,
  });
  return response.data;
};

/**
 * Get batch analytics/dashboard
 */
export const getBatchAnalytics = async (batchId: string) => {
  const response = await axiosInstance.get(`/batches/${batchId}/analytics`);
  return response.data;
};

/**
 * Get all students (for manual assignment)
 */
export const getAllStudents = async (params?: { department?: string; batch?: string; search?: string; page?: number; limit?: number }) => {
  const response = await axiosInstance.get('/users', {
    params: { role: 'student', ...params }
  });
  return response.data;
};

export default {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents,
  assignStudentsToBatch,
  removeStudentsFromBatch,
  importStudentsWithDepartment,
  importStudentsFromExcel,
  getStudentImportTemplate,
  assignCoursesToBatch,
  assignCoursesToDepartment,
  autoDivideParticipantsByDepartment,
  getUnassignedParticipants,
  manualAssignParticipantsToBatch,
  getBatchAnalytics,
  getAllStudents
};
