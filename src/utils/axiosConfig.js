import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 0, // No timeout for large file uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiration and authentication errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Token expired, invalid, or missing - ANY 401 error
      if (error.response.status === 401) {
        console.log('❌ 401 Unauthorized - Token invalid or expired');
        console.log('Error message:', error.response.data?.message);
        
        // Clear all auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login (only if not already on login page)
        if (!window.location.pathname.includes('/login')) {
          console.log('🚪 Redirecting to login...');
          window.location.href = '/login';
        }
      }
      
      // Account deactivated or forbidden
      if (error.response.status === 403) {
        const errorMessage = error.response.data?.message || '';
        
        if (errorMessage.includes('deactivated') || errorMessage.includes('pending approval')) {
          console.log('❌ Account issue:', errorMessage);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    } else if (error.request) {
      // Network error - no response from server
      console.error('❌ Network error - No response from server');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
