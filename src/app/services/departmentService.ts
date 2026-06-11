import axiosInstance from '../../utils/axiosConfig';

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  isActive: boolean;
  batchCount?: number;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentData {
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: string;
}

export interface UpdateDepartmentData extends Partial<CreateDepartmentData> {
  isActive?: boolean;
}

/**
 * Get all departments
 */
export const getDepartments = async (params?: {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const response = await axiosInstance.get('/departments', { params });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get single department
 */
export const getDepartment = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/departments/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Create new department
 */
export const createDepartment = async (data: CreateDepartmentData) => {
  try {
    const response = await axiosInstance.post('/departments', data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Update department
 */
export const updateDepartment = async (id: string, data: UpdateDepartmentData) => {
  try {
    const response = await axiosInstance.put(`/departments/${id}`, data);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Delete department
 */
export const deleteDepartment = async (id: string) => {
  try {
    const response = await axiosInstance.delete(`/departments/${id}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

/**
 * Get batches in a department
 */
export const getDepartmentBatches = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/departments/${id}/batches`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error;
  }
};

export default {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentBatches
};
