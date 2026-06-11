import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export interface LiveSession {
  _id: string;
  title: string;
  course?: {
    _id: string;
    title: string;
    thumbnail?: string;
  };
  module?: string;
  description?: string;
  agenda?: string;
  trainer: {
    _id: string;
    name: string;
    email: string;
  };
  date: string;
  startTime: string;
  duration: number;
  platform: 'Zoom' | 'Google Meet' | 'Microsoft Teams' | 'Webex' | 'YouTube Live' | 'Custom';
  joinLink: string;
  meetingId?: string;
  passcode?: string;
  hostEmail?: string;
  coHosts?: string[];
  maxCapacity: number;
  enrolledStudents: Array<{
    student: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    enrolledAt: string;
    attended: boolean;
    joinedAt?: string;
    leftAt?: string;
    duration?: number;
  }>;
  enrolledCount: number;
  availableSeats: number;
  isFull: boolean;
  isEnrolled?: boolean;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  recurring: {
    type: 'none' | 'daily' | 'weekly' | 'monthly';
    endDate?: string;
  };
  requireRegistration: boolean;
  allowRecording: boolean;
  recordingUrl?: string;
  recordingAvailable: boolean;
  waitingRoom: boolean;
  sendReminder: boolean;
  reminderMinutes: number;
  reminderSent: boolean;
  materials?: string[];
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionData {
  title: string;
  course?: string;
  module?: string;
  description?: string;
  agenda?: string;
  date: string;
  startTime: string;
  duration: number;
  platform: string;
  joinLink: string;
  meetingId?: string;
  passcode?: string;
  hostEmail?: string;
  coHosts?: string;
  maxCapacity?: number;
  recurring?: {
    type: string;
    endDate?: string;
  };
  requireRegistration?: boolean;
  allowRecording?: boolean;
  waitingRoom?: boolean;
  sendReminder?: boolean;
  reminderMinutes?: number;
  materials?: string;
  tags?: string;
}

// Create live session
export const createLiveSession = async (data: CreateSessionData) => {
  const response = await axios.post(`${API_URL}/live-sessions`, data, getAuthHeader());
  return response.data;
};

// Get all live sessions
export const getAllLiveSessions = async (filters?: {
  status?: string;
  platform?: string;
  course?: string;
  upcoming?: boolean;
  past?: boolean;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.platform) params.append('platform', filters.platform);
  if (filters?.course) params.append('course', filters.course);
  if (filters?.upcoming) params.append('upcoming', 'true');
  if (filters?.past) params.append('past', 'true');

  const response = await axios.get(
    `${API_URL}/live-sessions?${params.toString()}`,
    getAuthHeader()
  );
  return response.data;
};

// Get single live session
export const getLiveSession = async (sessionId: string) => {
  const response = await axios.get(`${API_URL}/live-sessions/${sessionId}`, getAuthHeader());
  return response.data;
};

// Update live session
export const updateLiveSession = async (sessionId: string, data: Partial<CreateSessionData>) => {
  const response = await axios.put(`${API_URL}/live-sessions/${sessionId}`, data, getAuthHeader());
  return response.data;
};

// Delete live session
export const deleteLiveSession = async (sessionId: string) => {
  const response = await axios.delete(`${API_URL}/live-sessions/${sessionId}`, getAuthHeader());
  return response.data;
};

// Join/Enroll in live session
export const joinLiveSession = async (sessionId: string) => {
  const response = await axios.post(`${API_URL}/live-sessions/${sessionId}/join`, {}, getAuthHeader());
  return response.data;
};

// Leave live session
export const leaveLiveSession = async (sessionId: string) => {
  const response = await axios.post(`${API_URL}/live-sessions/${sessionId}/leave`, {}, getAuthHeader());
  return response.data;
};

// Mark attendance
export const markAttendance = async (sessionId: string, data?: {
  studentId?: string;
  joinedAt?: string;
  leftAt?: string;
}) => {
  const response = await axios.post(`${API_URL}/live-sessions/${sessionId}/attendance`, data || {}, getAuthHeader());
  return response.data;
};

// Get session attendance
export const getSessionAttendance = async (sessionId: string) => {
  const response = await axios.get(`${API_URL}/live-sessions/${sessionId}/attendance`, getAuthHeader());
  return response.data;
};

// Get my enrolled sessions
export const getMyEnrolledSessions = async () => {
  const response = await axios.get(`${API_URL}/live-sessions/my-sessions`, getAuthHeader());
  return response.data;
};
