import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  return token ? `Bearer ${token}` : '';
};

// Create axios instance with auth
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export interface CourseQuery {
  _id: string;
  course: {
    _id: string;
    title: string;
    thumbnail?: string;
  };
  student: {
    _id: string;
    name: string;
    email: string;
  };
  trainer: {
    _id: string;
    name: string;
    email: string;
  };
  question: string;
  category: 'course-content' | 'lesson' | 'assessment' | 'technical' | 'general';
  lessonReference?: string;
  status: 'pending' | 'answered' | 'closed';
  replies: Array<{
    _id: string;
    repliedBy: {
      _id: string;
      name: string;
      email: string;
    };
    repliedByModel: 'Trainer' | 'Admin';
    reply: string;
    repliedAt: string;
  }>;
  isPublic: boolean;
  upvotes: string[];
  upvoteCount: number;
  replyCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQueryData {
  courseId: string;
  question: string;
  category?: string;
  lessonReference?: string;
  isPublic?: boolean;
}

// Student APIs
export const createCourseQuery = async (data: CreateQueryData) => {
  const response = await api.post('/course-queries', data);
  return response.data;
};

export const getCourseQueries = async (courseId: string, filters?: { status?: string; category?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.category) params.append('category', filters.category);
  
  const response = await api.get(`/course-queries/course/${courseId}?${params.toString()}`);
  return response.data;
};

export const getMyQueries = async (filters?: { status?: string; courseId?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.courseId) params.append('courseId', filters.courseId);
  
  const response = await api.get(`/course-queries/my-queries?${params.toString()}`);
  return response.data;
};

export const toggleQueryVisibility = async (queryId: string) => {
  const response = await api.patch(`/course-queries/${queryId}/visibility`);
  return response.data;
};

export const upvoteQuery = async (queryId: string) => {
  const response = await api.post(`/course-queries/${queryId}/upvote`);
  return response.data;
};

// Trainer APIs
export const getTrainerQueries = async (filters?: { status?: string; courseId?: string; category?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.courseId) params.append('courseId', filters.courseId);
  if (filters?.category) params.append('category', filters.category);
  
  const response = await api.get(`/course-queries/trainer?${params.toString()}`);
  return response.data;
};

export const replyToCourseQuery = async (queryId: string, reply: string) => {
  const response = await api.post(`/course-queries/${queryId}/reply`, { reply });
  return response.data;
};

export const updateQueryStatus = async (queryId: string, status: 'pending' | 'answered' | 'closed') => {
  const response = await api.patch(`/course-queries/${queryId}/status`, { status });
  return response.data;
};

export const togglePinQuery = async (queryId: string) => {
  const response = await api.patch(`/course-queries/${queryId}/pin`);
  return response.data;
};
