import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getStudentDashboard, 
  getStudentProfile,
  StudentDashboardData 
} from '../services/dashboardService';
import { socketService } from '../services/socketService';
import { toast } from 'sonner';

interface StudentContextType {
  dashboardData: StudentDashboardData | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  realTimeEnabled: boolean;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within StudentProvider');
  }
  return context;
};

interface StudentProviderProps {
  children: ReactNode;
}

export const StudentProvider = ({ children }: StudentProviderProps) => {
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const refreshDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentDashboard();
      setDashboardData(data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load dashboard data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await getStudentProfile();
      setProfile(data);
      // Also update localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, ...data }));
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    }
  };

  // Setup real-time event listeners
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.role === 'student') {
      // Initial data load
      refreshDashboard();
      refreshProfile();

      // Connect to socket for real-time updates
      socketService.connect(user._id, user.role);
      setRealTimeEnabled(true);

      // Browser push notification helper
      const showBrowserNotification = (title: string, body: string, icon?: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(title, {
              body,
              icon: icon || undefined,
              badge: undefined,
              tag: 'ceas-lms',
              requireInteraction: false,
              silent: false
            });

            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            // Handle click
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.error('Error showing browser notification:', error);
          }
        }
      };

      // Listen for real-time events
      const handleNewCourse = (data: any) => {
        toast.success(`New course available: ${data.title}`);
        showBrowserNotification('New Course Available', `${data.title} has been added to the platform`);
        refreshDashboard();
      };

      const handleNewMedia = (data: any) => {
        toast.info(`New content uploaded: ${data.title}`);
        showBrowserNotification('New Content', `${data.title} is now available`);
        refreshDashboard();
      };

      const handleNewLiveSession = (data: any) => {
        toast.info(`New live session scheduled: ${data.title}`);
        showBrowserNotification('Live Session Scheduled', `${data.title} - Join soon!`);
        refreshDashboard();
      };

      const handleNewAssessment = (data: any) => {
        toast.warning(`New assessment available: ${data.title}`);
        showBrowserNotification('New Assessment', `${data.title} is ready to take`);
        refreshDashboard();
      };

      const handleQuestionAnswered = (data: any) => {
        toast.success('Your question has been answered!');
        showBrowserNotification('Question Answered', 'Check your Q&A section for the response');
        refreshDashboard();
      };

      const handleCertificateReady = (data: any) => {
        toast.success('🎉 Your certificate is ready for download!');
        showBrowserNotification('Certificate Ready', 'Your certificate is now available for download');
        refreshDashboard();
      };

      const handleUserApproved = (data: any) => {
        toast.success('Your account has been approved!');
        showBrowserNotification('Account Approved', 'You can now access all features');
        refreshProfile();
      };

      const handleNotification = (data: any) => {
        toast(data.message, { 
          description: data.title,
          duration: 5000 
        });
        showBrowserNotification(data.title || 'New Notification', data.message);
        refreshDashboard();
      };

      const handleContentPublished = (data: any) => {
        toast.info(`New content published: ${data.title}`);
        showBrowserNotification('Content Published', `${data.title} is now available`);
        refreshDashboard();
      };

      // Register event listeners
      socketService.on('new_course', handleNewCourse);
      socketService.on('new_media', handleNewMedia);
      socketService.on('new_live_session', handleNewLiveSession);
      socketService.on('new_assessment', handleNewAssessment);
      socketService.on('question_answered', handleQuestionAnswered);
      socketService.on('certificate_ready', handleCertificateReady);
      socketService.on('user_approved', handleUserApproved);
      socketService.on('notification', handleNotification);
      socketService.on('content_published', handleContentPublished);

      // Cleanup on unmount
      return () => {
        socketService.off('new_course', handleNewCourse);
        socketService.off('new_media', handleNewMedia);
        socketService.off('new_live_session', handleNewLiveSession);
        socketService.off('new_assessment', handleNewAssessment);
        socketService.off('question_answered', handleQuestionAnswered);
        socketService.off('certificate_ready', handleCertificateReady);
        socketService.off('user_approved', handleUserApproved);
        socketService.off('notification', handleNotification);
        socketService.off('content_published', handleContentPublished);
        socketService.disconnect();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    dashboardData,
    profile,
    loading,
    error,
    refreshDashboard,
    refreshProfile,
    realTimeEnabled
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};
