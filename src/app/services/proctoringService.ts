import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ActivityLog {
  type: string;
  timestamp: Date;
  details: string;
}

export interface Violation {
  type: string;
  timestamp: Date;
  details: string;
}

// ── Log Activity Logs (Batch) ─────────────────────────────────────────────────
export const logActivityBatch = async (attemptId: string, activityLogs: ActivityLog[]) => {
  try {
    const response = await api.post(`/proctoring/attempts/${attemptId}/log-activity`, {
      activityLogs,
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to log activity:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to log activity' };
  }
};

// ── Log Single Violation ──────────────────────────────────────────────────────
export const logViolation = async (attemptId: string, type: string, details: string) => {
  try {
    const response = await api.post(`/proctoring/attempts/${attemptId}/log-violation`, {
      type,
      details,
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to log violation:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to log violation' };
  }
};

// ── Get Proctoring Data (Trainer/Admin) ───────────────────────────────────────
export const getProctoringData = async (attemptId: string) => {
  try {
    const response = await api.get(`/proctoring/attempts/${attemptId}/proctoring`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch proctoring data:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to fetch proctoring data' };
  }
};

// ── Get All Flagged Attempts (Trainer/Admin) ──────────────────────────────────
export const getFlaggedAttempts = async (courseId?: string, assessmentId?: string) => {
  try {
    const params: any = {};
    if (courseId) params.courseId = courseId;
    if (assessmentId) params.assessmentId = assessmentId;
    
    const response = await api.get('/proctoring/flagged-attempts', { params });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch flagged attempts:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to fetch flagged attempts' };
  }
};

// ── Upload Webcam Recording URL ───────────────────────────────────────────────
export const uploadRecordingUrl = async (attemptId: string, recordingUrl: string) => {
  try {
    const response = await api.post(`/proctoring/attempts/${attemptId}/upload-recording`, {
      recordingUrl,
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to upload recording URL:', error);
    return { success: false, message: error.response?.data?.message || 'Failed to upload recording URL' };
  }
};

export default {
  logActivityBatch,
  logViolation,
  getProctoringData,
  getFlaggedAttempts,
  uploadRecordingUrl,
};
