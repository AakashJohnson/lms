// API Configuration - Centralized and secure
// All external API calls now go through backend proxy endpoints

export const API_CONFIG = {
  // Backend base URL
  BACKEND_URL: import.meta.env.VITE_API_BASE || 'http://localhost:8000',
  
  // Secure proxy endpoints - no sensitive URLs exposed
  ENDPOINTS: {
    TRANSLATE: import.meta.env.VITE_PROXY_TRANSLATE_URL || '/api/proxy/translate',
    TTS: import.meta.env.VITE_PROXY_TTS_URL || '/api/proxy/tts',
    VOICE_TO_TEXT: import.meta.env.VITE_PROXY_VOICE_TO_TEXT_URL || '/api/proxy/voice-to-text',
    QUERY: '/api/query',
    HEALTH: '/api/health'
  }
};

// Helper function o build full URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BACKEND_URL}${endpoint}`;
};

// Validate environment configuration
export const validateApiConfig = (): boolean => {
  const requiredVars = ['VITE_API_BASE'];
  
  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      // console.warn(`Missing environment variable: ${varName}`);
      return false;
    }
  }
  
  return true;
};

// Initialize configuration check
if (import.meta.env.DEV) {
  validateApiConfig();
}