import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BrandingBar } from './components/BrandingBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Certificates } from './components/Certificates';
import { LiveSessions } from './components/LiveSessions';
import { QMS as Qms } from './components/QMS';
import { MediaLibrary } from './components/MediaLibrary';
import { MyCourses } from './components/MyCourses';
import { GlobalCourses } from './components/GlobalCourses';
import { Assessments } from './components/Assessments';
import { Reports } from './components/Reports';
import { UserManagement } from './components/UserManagement';
import { Notifications } from './components/Notifications';
import { ProfileSettings } from './components/ProfileSettings';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ChatbotLauncher } from './components/ChatbotLauncher';
import { AdminUserInsights } from './components/AdminUserInsights';
import { MyStudents } from './components/MyStudents';
import { TrainerManagement } from './components/TrainerManagement';
import { StudentManagement } from './components/admin/StudentManagement';
import { DepartmentManagement } from './components/admin/DepartmentManagement';
import { BatchManagement } from './components/admin/BatchManagement';
import { BulkStudentImport } from './components/admin/BulkStudentImport';
import { TrainerAssignment } from './components/admin/TrainerAssignment';
import { CertificateManagement } from './components/admin/CertificateManagement';
import { CourseReviewCenter } from './components/admin/CourseReviewCenter';
import SmartSearch from './components/SmartSearch';
import { CommunityForum } from './components/CommunityForum';
import ByteSizeLearning from './components/byteSize/ByteSizeLearning';
import AITutorPage from './components/AITutorPage';
import { TrainerContentPlanning } from './components/TrainerContentPlanning';
import { AssignmentsReview } from './components/AssignmentsReview';
import { Toaster } from './components/ui/sonner';
import CalendarActivity from '../pages/student/CalendarActivity';
import StudentActivityTracker from '../pages/teacher/StudentActivityTracker';
import StudentActivityMonitor from '../pages/admin/StudentActivityMonitor';
import axiosInstance from '../utils/axiosConfig';

export default function App() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);
  
  const checkAuthentication = async () => {
    const token = localStorage.getItem('token');
    
    // No token = not authenticated
    if (!token) {
      console.log('❌ No token found. Redirecting to login...');
      localStorage.removeItem('user');
      navigate('/login');
      setIsLoading(false);
      return;
    }
    
    // Verify token with backend
    try {
      const response = await axiosInstance.get('/auth/me');
      if (response.data.success && response.data.data) {
        // Token is valid
        setIsAuthenticated(true);
        const userData = response.data.data;
        localStorage.setItem('user', JSON.stringify(userData));
        
        const fullName = userData.fullName || 
                        userData.name || 
                        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                        'User';
        const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
        
        setCurrentUser({
          name: fullName,
          avatar: initials,
          role: getRoleMapping(userData.role || 'participant'),
          email: userData.email || '',
        });
        setIsLoading(false);
      } else {
        // Invalid response
        handleInvalidAuth();
      }
    } catch (error: any) {
      console.error('❌ Token validation failed:', error);
      handleInvalidAuth();
    }
  };
  
  const handleInvalidAuth = () => {
    console.log('❌ Invalid authentication. Clearing session...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsLoading(false);
    navigate('/login');
  };
  
  // Fetch fresh user data from backend on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
      
      // Listen for profile updates
      const handleProfileUpdate = (event: CustomEvent) => {
        const userData = event.detail;
        const fullName = userData.fullName || 
                        userData.name || 
                        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                        'User';
        const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
        
        setCurrentUser({
          name: fullName,
          avatar: initials,
          role: getRoleMapping(userData.role || 'participant'),
          email: userData.email || '',
        });
      };
      
      window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
      
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      };
    }
  }, [isAuthenticated]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/auth/me');
      if (response.data.success && response.data.data) {
        const userData = response.data.data;
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify(userData));
        
        const fullName = userData.fullName || 
                        userData.name || 
                        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
                        'User';
        const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
        
        setCurrentUser({
          name: fullName,
          avatar: initials,
          role: getRoleMapping(userData.role || 'participant'),
          email: userData.email || '',
        });
      } else {
        // Fallback to localStorage
        loadUserFromLocalStorage();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to localStorage if API fails
      loadUserFromLocalStorage();
    }
  };

  const loadUserFromLocalStorage = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const fullName = storedUser.fullName || 
                      storedUser.name || 
                      `${storedUser.firstName || ''} ${storedUser.lastName || ''}`.trim() || 
                      'User';
      const initials = fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
      
      setCurrentUser({
        name: fullName,
        avatar: initials,
        role: getRoleMapping(storedUser.role || 'participant'),
        email: storedUser.email || '',
      });
    } catch (e) {
      console.error('Failed to load user from localStorage:', e);
      // Set default user if everything fails
      setCurrentUser({
        name: 'User',
        avatar: 'U',
        role: 'participant',
        email: '',
      });
    }
  };
  
  // Sync active page with URL to survive refresh
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (window.location.pathname === '/trainer/content-planning' || window.location.pathname === '/teacher/content-planning') {
      setActivePage('content-planning');
      return;
    }
    if (pageParam && pageParam !== activePage) {
      setActivePage(pageParam);
    }
  }, []);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    window.history.pushState({}, '', page === 'content-planning' ? '/trainer/content-planning' : `/dashboard?page=${page}`);
  };

  // Listen for programmatic navigation from SmartSearch component
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');
      if (window.location.pathname === '/trainer/content-planning' || window.location.pathname === '/teacher/content-planning') {
        setActivePage('content-planning');
        return;
      }
      if (pageParam) setActivePage(pageParam);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Map backend roles to frontend roles
  const getRoleMapping = (backendRole: string): 'admin' | 'trainer' | 'participant' => {
    switch (backendRole) {
      case 'administrator':
        return 'admin';
      case 'trainer':
        return 'trainer';
      case 'student':
        return 'participant';
      case 'participant':
        return 'participant';
      default:
        return 'participant';
    }
  };
  
  const userRole = currentUser?.role || 'participant';
  
  // Logout function
  const handleLogout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate('/login');
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-[#FAFBFF]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, don't render anything (will redirect to login)
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            userRole={userRole}
            onOpenAdminUsers={() => {
              if (userRole === 'admin') {
                handlePageChange('admin-users');
              }
            }}
            onOpenTrainerDetail={(detailPage) => {
              if (userRole === 'trainer') {
                handlePageChange(detailPage);
              }
            }}
            onNavigate={(page) => handlePageChange(page)}
          />
        );
      case 'admin-users':
        return (
          <AdminUserInsights
            selectedUserId={selectedAdminUserId}
            onBackToDashboard={() => {
              setSelectedAdminUserId(null);
              handlePageChange('dashboard');
            }}
            onOpenUser={(userId) => {
              setSelectedAdminUserId(userId);
            }}
            onBackToList={() => setSelectedAdminUserId(null)}
          />
        );
      case 'global-courses':
        return <GlobalCourses />;
      case 'courses':
        return <MyCourses userRole={userRole} />;
      case 'content-planning':
        return userRole === 'trainer' || userRole === 'admin'
          ? <TrainerContentPlanning />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'assignments-review':
        return userRole === 'trainer' || userRole === 'admin'
          ? <AssignmentsReview />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'calendar-activity':
        return userRole === 'participant'
          ? <CalendarActivity />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'student-activity-tracker':
        return userRole === 'trainer'
          ? <StudentActivityTracker />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'student-activity-monitor':
        return userRole === 'admin'
          ? <StudentActivityMonitor />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'my-students':
        return <MyStudents userRole={userRole} />;
      case 'trainer-management':
        return <TrainerManagement userRole={userRole} />;
      case 'student-management':
        return <StudentManagement userRole={userRole} />;
      case 'assessments':
        return <Assessments userRole={userRole} />;
      case 'reports':
        return <Reports userRole={userRole} />;
      case 'certificates':
        return <Certificates userRole={userRole} />;
      case 'certificate-management':
        return <CertificateManagement />;
      case 'course-review':
        return userRole === 'admin'
          ? <CourseReviewCenter />
          : <Dashboard userRole={userRole} onNavigate={(page) => handlePageChange(page)} />;
      case 'live-sessions':
        return <LiveSessions userRole={userRole} />;
      case 'user-management':
        return <UserManagement userRole={userRole === 'participant' ? 'admin' : userRole} />;
      case 'departments':
        return <DepartmentManagement />;
      case 'batches':
        return <BatchManagement />;
      case 'trainer-assignment':
        return <TrainerAssignment />;
      case 'bulk-import':
        return <BulkStudentImport />;
      case 'notifications':
        return <Notifications />;
      case 'settings':
        return <ProfileSettings userRole={userRole} />;
      case 'qms':
        return <Qms userRole={userRole} />;
      case 'media-library':
        return <MediaLibrary userRole={userRole} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'smart-search':
        return <SmartSearch />;
      case 'forum':
        return <CommunityForum userRole={userRole} />;
      case 'byte-size-learning':
        return <ByteSizeLearning userRole={userRole} onNavigate={(page) => setActivePage(page)} />;
      case 'ai-tutor':
        if (userRole !== 'participant') {
          return (
            <Dashboard
              userRole={userRole}
              onOpenAdminUsers={() => {
                if (userRole === 'admin') {
                  handlePageChange('admin-users');
                }
              }}
              onOpenTrainerDetail={(detailPage) => {
                if (userRole === 'trainer') {
                  handlePageChange(detailPage);
                }
              }}
            />
          );
        }
        return <AITutorPage />;
      default:
        return (
          <Dashboard
            userRole={userRole}
            onOpenAdminUsers={() => {
              if (userRole === 'admin') {
                handlePageChange('admin-users');
              }
            }}
            onOpenTrainerDetail={(detailPage) => {
              if (userRole === 'trainer') {
                handlePageChange(detailPage);
              }
            }}
          />
        );
    }
  };

  return (
    <div className="size-full flex flex-col bg-gradient-to-br from-[#f7f8ff] via-white to-[#f4f8ff]">
      {/* Branding Bar */}
      <BrandingBar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar userRole={userRole} activePage={activePage} onPageChange={handlePageChange} />

        {/* Main Content */}
        <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
          {renderContent()}
        </main>
      </div>

      <ChatbotLauncher />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
