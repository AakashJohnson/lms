import axiosInstance from '../../utils/axiosConfig';

export interface Batch {
  _id: string;
  name: string;
  code: string;
  department: {
    _id: string;
    name: string;
    code: string;
  };
  year: number;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  currentStudents: number;
  coordinator?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainers?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  isActive: boolean;
  isFull?: boolean;
  availableSeats?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchData {
  name: string;
  code: string;
  department: string;
  year: number;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  coordinator?: string;
  trainers?: string[];
}

export interface UpdateBatchData extends Partial<CreateBatchData> {
  isActive?: boolean;
}

/**
 * Get all batches
 */
export const getBatches = async (params?: {
  department?: string;
  year?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const response = await axiosInstance.get('/batches', { params });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get single batch
 */
export const getBatch = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/batches/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Create new batch
 */
export const createBatch = async (data: CreateBatchData) => {
  try {
    const response = await axiosInstance.post('/batches', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Update batch
 */
export const updateBatch = async (id: string, data: UpdateBatchData) => {
  try {
    const response = await axiosInstance.put(`/batches/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Delete batch
 */
export const deleteBatch = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/batches/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get students in a batch
 */
export const getBatchStudents = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/batches/${id}/students`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Assign students to batch
 */
export const assignStudentsToBatch = async (batchId: string, studentIds: string[]) => {
  try {
    const response = await axiosInstance.post(`/batches/${batchId}/assign`, { studentIds });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Remove students from batch
 */
export const removeStudentsFromBatch = async (batchId: string, studentIds: string[]) => {
  try {
    const response = await axiosInstance.post(`/batches/${batchId}/remove`, { studentIds });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export default {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents,
  assignStudentsToBatch,
  removeStudentsFromBatch
};
