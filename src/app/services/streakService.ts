const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Request failed';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Record learning activity
export const recordActivity = async (activityType: string, data: any = {}) => {
  try {
    const response = await fetch(`${API_URL}/streak/activity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ activityType, data })
    });
    return await response.json();
  } catch (error) {
    console.error('Error recording activity:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Record daily login
export const recordDailyLogin = async () => {
  try {
    const response = await fetch(`${API_URL}/streak/login`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Error recording login:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Get user streak stats
export const getStreakStats = async () => {
  try {
    const response = await fetch(`${API_URL}/streak/stats`, {
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching streak stats:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Get monthly activity calendar
export const getMonthlyActivity = async (year: number, month: number) => {
  try {
    const response = await fetch(`${API_URL}/streak/calendar/${year}/${month}`, {
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching monthly activity:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Get leaderboard
export const getLeaderboard = async (period: string = 'weekly', limit: number = 20) => {
  try {
    const response = await fetch(`${API_URL}/streak/leaderboard/${period}?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Get user rank
export const getUserRank = async (period: string = 'overall') => {
  try {
    const response = await fetch(`${API_URL}/streak/rank/${period}`, {
      headers: getAuthHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return { success: false, message: getErrorMessage(error) };
  }
};

// Auto-record activities helpers
export const recordVideoWatch = async (minutes: number) => {
  return recordActivity('video_watch', { minutes });
};

export const recordLessonComplete = async () => {
  return recordActivity('lesson_complete');
};

export const recordQuizComplete = async () => {
  return recordActivity('quiz_complete');
};

export const recordAssignmentComplete = async () => {
  return recordActivity('assignment_complete');
};

export const recordQuestionAsk = async () => {
  return recordActivity('question_ask');
};

export const recordNoteCreate = async () => {
  return recordActivity('note_create');
};
