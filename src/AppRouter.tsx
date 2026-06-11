import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import App from './app/App'; // Main dashboard app
import { CertificateVerification } from './app/components/CertificateVerification';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Home: marketing landing for guests; dashboard when a session exists (same as Login.jsx)
function HomeGate() {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  if (token && userRaw) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing; signed-in users go to dashboard */}
        <Route path="/" element={<HomeGate />} />
        
        {/* Login page */}
        <Route path="/login" element={<Login />} />
        
        {/* Public Certificate Verification - No auth required */}
        <Route path="/verify/:token" element={<CertificateVerification />} />
        
        {/* Main Dashboard - Works for all roles */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['administrator', 'trainer', 'student']}>
              <App />
            </ProtectedRoute>
          }
        />
        
        {/* Legacy routes - redirect to main dashboard */}
        <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/trainer/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/student/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/student/calendar-activity" element={<Navigate to="/dashboard?page=calendar-activity" replace />} />
        <Route path="/student/learning-activity" element={<Navigate to="/dashboard?page=calendar-activity" replace />} />
        <Route path="/teacher/student-activity-tracker" element={<Navigate to="/dashboard?page=student-activity-tracker" replace />} />
        <Route path="/trainer/student-activity-tracker" element={<Navigate to="/dashboard?page=student-activity-tracker" replace />} />
        <Route path="/admin/student-activity-monitor" element={<Navigate to="/dashboard?page=student-activity-monitor" replace />} />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
