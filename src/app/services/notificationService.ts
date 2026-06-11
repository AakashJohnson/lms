import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

export interface Notification {
  _id: string;
  userId: string;
  type: 'success' | 'info' | 'warning' | 'error';
  category: 'course' | 'assessment' | 'certificate' | 'session' | 'payment' | 'system';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  today: number;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  stats?: NotificationStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get all notifications
export const getAllNotifications = async (params?: {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: string;
  category?: string;
}): Promise<NotificationResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.read !== undefined) queryParams.append('read', params.read.toString());
  if (params?.type) queryParams.append('type', params.type);
  if (params?.category) queryParams.append('category', params.category);

  const response = await axios.get(
    `${API_URL}/notifications?${queryParams.toString()}`,
    getAuthHeader()
  );
  return response.data;
};

// Get unread notifications count
export const getUnreadCount = async (): Promise<number> => {
  const response = await axios.get(`${API_URL}/notifications/unread/count`, getAuthHeader());
  return response.data.count;
};

// Mark notification as read
export const markAsRead = async (notificationId: string) => {
  const response = await axios.patch(
    `${API_URL}/notifications/${notificationId}/read`,
    {},
    getAuthHeader()
  );
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await axios.patch(
    `${API_URL}/notifications/read-all`,
    {},
    getAuthHeader()
  );
  return response.data;
};

// Delete notification
export const deleteNotification = async (notificationId: string) => {
  const response = await axios.delete(
    `${API_URL}/notifications/${notificationId}`,
    getAuthHeader()
  );
  return response.data;
};

// Delete all read notifications
export const clearAllRead = async () => {
  const response = await axios.delete(
    `${API_URL}/notifications/clear-read`,
    getAuthHeader()
  );
  return response.data;
};

// Get notification preferences
export const getNotificationPreferences = async () => {
  const response = await axios.get(`${API_URL}/notifications/preferences`, getAuthHeader());
  return response.data.data;
};

// Update notification preferences
export const updateNotificationPreferences = async (preferences: any) => {
  const response = await axios.put(
    `${API_URL}/notifications/preferences`,
    preferences,
    getAuthHeader()
  );
  return response.data;
};
