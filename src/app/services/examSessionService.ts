import axiosInstance from '../../utils/axiosConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemInfo {
  browser: {
    name: string;
    version: string;
    supported: boolean;
  };
  internetSpeed: {
    downloadSpeed: number;
    uploadSpeed: number;
    latency: number;
  };
  devices: {
    webcam: boolean;
    microphone: boolean;
  };
  environment: {
    multipleMonitors: boolean;
    screenSharing: boolean;
    virtualMachine: boolean;
  };
}

export interface GeoLocation {
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateSessionData {
  assessmentId: string;
  deviceFingerprint: string;
  systemInfo: SystemInfo;
  geoLocation?: GeoLocation;
}

export interface ExamSession {
  sessionId: string;
  token: string;
  expiryTime: string;
  timeLimit?: number;
  status: 'active' | 'paused' | 'completed' | 'terminated' | 'expired';
  riskScore?: {
    overall: number;
    level: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface ViolationData {
  type: string;
  details: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Create a new exam session
 */
export async function createExamSession(data: CreateSessionData) {
  const res = await axiosInstance.post('/exam-sessions/create', data);
  return res.data;
}

/**
 * Validate exam session
 */
export async function validateSession(sessionId: string, deviceFingerprint: string) {
  const res = await axiosInstance.get(`/exam-sessions/${sessionId}/validate`, {
    params: { deviceFingerprint }
  });
  return res.data;
}

/**
 * Update heartbeat (keep-alive)
 */
export async function updateHeartbeat(sessionId: string) {
  const res = await axiosInstance.post(`/exam-sessions/${sessionId}/heartbeat`);
  return res.data;
}

/**
 * Log a violation
 */
export async function logViolation(sessionId: string, violation: ViolationData) {
  const res = await axiosInstance.post(`/exam-sessions/${sessionId}/violation`, violation);
  return res.data;
}

/**
 * Terminate session
 */
export async function terminateSession(sessionId: string, reason: string) {
  const res = await axiosInstance.post(`/exam-sessions/${sessionId}/terminate`, { reason });
  return res.data;
}

/**
 * Resume paused session
 */
export async function resumeSession(sessionId: string) {
  const res = await axiosInstance.post(`/exam-sessions/${sessionId}/resume`);
  return res.data;
}

/**
 * Get session details
 */
export async function getSessionDetails(sessionId: string) {
  const res = await axiosInstance.get(`/exam-sessions/${sessionId}`);
  return res.data;
}

/**
 * Get all sessions for an assessment (Admin/Trainer only)
 */
export async function getAssessmentSessions(assessmentId: string, params?: Record<string, string>) {
  const res = await axiosInstance.get(`/exam-sessions/assessment/${assessmentId}`, { params });
  return res.data;
}

// ─── Device Fingerprinting ────────────────────────────────────────────────────

/**
 * Generate a unique device fingerprint
 */
export function generateDeviceFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    let gpuInfo = 'unknown';
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      }
    }

    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages?.join(',') || '',
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      screenColorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      gpu: gpuInfo,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      plugins: Array.from(navigator.plugins || []).map(p => p.name).join(','),
      canvasFingerprint: getCanvasFingerprint(ctx),
      touchSupport: 'ontouchstart' in window,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unspecified'
    };

    // Create hash from fingerprint
    const fingerprintString = JSON.stringify(fingerprint);
    return btoa(fingerprintString).substring(0, 64);
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    return btoa(navigator.userAgent + Date.now()).substring(0, 64);
  }
}

function getCanvasFingerprint(ctx: CanvasRenderingContext2D | null): string {
  if (!ctx) return 'no-canvas';
  
  try {
    const canvas = ctx.canvas;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Canvas Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas Fingerprint', 4, 17);
    
    return canvas.toDataURL().substring(0, 100);
  } catch (error) {
    return 'canvas-error';
  }
}

// ─── System Info Collection ───────────────────────────────────────────────────

/**
 * Collect system information
 */
export async function collectSystemInfo(): Promise<SystemInfo> {
  const browserInfo = getBrowserInfo();
  const internetSpeed = await testInternetSpeed();
  const devices = await checkDevices();
  const environment = checkEnvironment();

  return {
    browser: browserInfo,
    internetSpeed,
    devices,
    environment
  };
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let supported = false;

  if (/Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor)) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    supported = true;
  } else if (/Firefox/.test(userAgent)) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    supported = true;
  } else if (/Edg/.test(userAgent)) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    supported = true;
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    supported = false; // Safari has limited support
  }

  return { name, version, supported };
}

async function testInternetSpeed(): Promise<{ downloadSpeed: number; uploadSpeed: number; latency: number }> {
  try {
    const startTime = Date.now();
    
    // Test download speed
    const response = await fetch('https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png', {
      cache: 'no-store'
    });
    const blob = await response.blob();
    const endTime = Date.now();
    
    const duration = (endTime - startTime) / 1000; // seconds
    const sizeInBits = blob.size * 8;
    const speedMbps = parseFloat((sizeInBits / duration / 1024 / 1024).toFixed(2));
    
    // Latency
    const latency = endTime - startTime;

    return {
      downloadSpeed: speedMbps,
      uploadSpeed: 0, // Upload speed test not implemented
      latency
    };
  } catch (error) {
    console.error('Internet speed test failed:', error);
    return {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 9999
    };
  }
}

async function checkDevices(): Promise<{ webcam: boolean; microphone: boolean }> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasWebcam = devices.some(device => device.kind === 'videoinput');
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');

    return {
      webcam: hasWebcam,
      microphone: hasMicrophone
    };
  } catch (error) {
    console.error('Device check failed:', error);
    return {
      webcam: false,
      microphone: false
    };
  }
}

function checkEnvironment(): { multipleMonitors: boolean; screenSharing: boolean; virtualMachine: boolean } {
  // Check for multiple monitors
  const multipleMonitors = (window.screen as any).isExtended || false;

  // Check for screen sharing (limited detection)
  const screenSharing = false; // Cannot reliably detect

  // Check for virtual machine indicators
  const isVM = /VirtualBox|VMware|QEMU|Parallels/i.test(navigator.userAgent);

  return {
    multipleMonitors,
    screenSharing,
    virtualMachine: isVM
  };
}

// ─── Geo Location ─────────────────────────────────────────────────────────────

/**
 * Get user's geo location (requires permission)
 */
export async function getGeoLocation(): Promise<GeoLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
}
