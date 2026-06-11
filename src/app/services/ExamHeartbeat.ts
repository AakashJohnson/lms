import { updateHeartbeat } from './examSessionService';
import { toast } from 'sonner';

/**
 * ExamHeartbeat - Manages keep-alive pings for exam sessions
 * Sends heartbeat every 10 seconds to maintain session validity
 * Handles connection loss and recovery
 */
export class ExamHeartbeat {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionId: string;
  private missedPings: number = 0;
  private readonly MAX_MISSED = 3;
  private readonly PING_INTERVAL = 10000; // 10 seconds
  private isActive: boolean = false;
  private onConnectionLoss?: () => void;
  private onConnectionRestore?: () => void;
  private onAutoSubmit?: () => void;

  constructor(
    sessionId: string,
    callbacks?: {
      onConnectionLoss?: () => void;
      onConnectionRestore?: () => void;
      onAutoSubmit?: () => void;
    }
  ) {
    this.sessionId = sessionId;
    this.onConnectionLoss = callbacks?.onConnectionLoss;
    this.onConnectionRestore = callbacks?.onConnectionRestore;
    this.onAutoSubmit = callbacks?.onAutoSubmit;
  }

  /**
   * Start heartbeat monitoring
   */
  start() {
    if (this.isActive) {
      console.warn('Heartbeat already active');
      return;
    }

    console.log('💓 Starting heartbeat for session:', this.sessionId);
    this.isActive = true;
    this.missedPings = 0;

    // Send initial heartbeat
    this.ping();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.PING_INTERVAL);
  }

  /**
   * Stop heartbeat monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    console.log('💔 Heartbeat stopped for session:', this.sessionId);
  }

  /**
   * Send heartbeat ping
   */
  private async ping() {
    if (!this.isActive) return;

    try {
      const response = await updateHeartbeat(this.sessionId);
      
      if (response.success) {
        // Heartbeat successful
        if (this.missedPings > 0) {
          // Connection restored
          console.log('✅ Connection restored');
          this.missedPings = 0;
          
          if (this.onConnectionRestore) {
            this.onConnectionRestore();
          }
          
          toast.success('Connection restored', {
            description: 'Your exam session is active again',
            duration: 3000
          });
        }

        // Check time remaining
        const timeRemaining = response.data?.timeRemaining || 0;
        if (timeRemaining <= 60 && timeRemaining > 0) {
          // Less than 1 minute remaining
          toast.warning('Time running out!', {
            description: `Only ${timeRemaining} seconds remaining`,
            duration: 5000
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Heartbeat failed:', error);
      this.missedPings++;

      if (this.missedPings === 1) {
        // First miss - show warning
        toast.warning('Connection issue detected', {
          description: 'Attempting to reconnect...',
          duration: 3000
        });
      }

      if (this.missedPings >= this.MAX_MISSED) {
        // Max missed pings reached
        console.error('💔 Connection lost - max missed pings reached');
        this.handleConnectionLoss();
      }
    }
  }

  /**
   * Handle connection loss
   */
  private handleConnectionLoss() {
    this.stop();

    toast.error('Connection lost', {
      description: 'Your exam will be auto-submitted due to connection loss',
      duration: 10000
    });

    if (this.onConnectionLoss) {
      this.onConnectionLoss();
    }

    // Auto-submit after 5 seconds
    setTimeout(() => {
      if (this.onAutoSubmit) {
        this.onAutoSubmit();
      }
    }, 5000);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      missedPings: this.missedPings,
      maxMissed: this.MAX_MISSED
    };
  }

  /**
   * Reset missed pings counter
   */
  reset() {
    this.missedPings = 0;
  }
}

/**
 * ExamSessionManager - Manages the entire exam session lifecycle
 */
export class ExamSessionManager {
  private sessionId: string | null = null;
  private token: string | null = null;
  private heartbeat: ExamHeartbeat | null = null;
  private deviceFingerprint: string;
  private expiryTime: Date | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(deviceFingerprint: string) {
    this.deviceFingerprint = deviceFingerprint;
  }

  /**
   * Initialize session
   */
  initialize(sessionId: string, token: string, expiryTime: string) {
    this.sessionId = sessionId;
    this.token = token;
    this.expiryTime = new Date(expiryTime);

    // Store in sessionStorage for recovery
    sessionStorage.setItem('examSessionId', sessionId);
    sessionStorage.setItem('examSessionToken', token);
    sessionStorage.setItem('examSessionExpiry', expiryTime);

    console.log('🎯 Session initialized:', {
      sessionId,
      expiryTime: this.expiryTime
    });
  }

  /**
   * Start heartbeat
   */
  startHeartbeat(callbacks?: {
    onConnectionLoss?: () => void;
    onConnectionRestore?: () => void;
    onAutoSubmit?: () => void;
  }) {
    if (!this.sessionId) {
      console.error('Cannot start heartbeat: No session ID');
      return;
    }

    this.heartbeat = new ExamHeartbeat(this.sessionId, callbacks);
    this.heartbeat.start();

    // Set up auto-expiry timer
    if (this.expiryTime) {
      const timeUntilExpiry = this.expiryTime.getTime() - Date.now();
      if (timeUntilExpiry > 0) {
        this.timeoutId = setTimeout(() => {
          this.handleExpiry();
        }, timeUntilExpiry);
      }
    }
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeat) {
      this.heartbeat.stop();
      this.heartbeat = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Handle session expiry
   */
  private handleExpiry() {
    console.log('⏰ Session expired');
    
    toast.error('Time\'s up!', {
      description: 'Your exam time has expired. Submitting automatically...',
      duration: 5000
    });

    this.stopHeartbeat();

    // Trigger auto-submit
    if (this.heartbeat?.getStatus().isActive) {
      // Session was active, trigger callbacks
      const callbacks = (this.heartbeat as any).onAutoSubmit;
      if (callbacks) {
        callbacks();
      }
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      token: this.token,
      expiryTime: this.expiryTime,
      deviceFingerprint: this.deviceFingerprint,
      heartbeatStatus: this.heartbeat?.getStatus()
    };
  }

  /**
   * Recover session from storage
   */
  static recoverSession(): { sessionId: string; token: string; expiryTime: string } | null {
    const sessionId = sessionStorage.getItem('examSessionId');
    const token = sessionStorage.getItem('examSessionToken');
    const expiryTime = sessionStorage.getItem('examSessionExpiry');

    if (sessionId && token && expiryTime) {
      // Check if session is still valid
      const expiry = new Date(expiryTime);
      if (expiry > new Date()) {
        return { sessionId, token, expiryTime };
      } else {
        // Session expired, clear storage
        ExamSessionManager.clearSession();
      }
    }

    return null;
  }

  /**
   * Clear session from storage
   */
  static clearSession() {
    sessionStorage.removeItem('examSessionId');
    sessionStorage.removeItem('examSessionToken');
    sessionStorage.removeItem('examSessionExpiry');
  }

  /**
   * Cleanup on unmount
   */
  cleanup() {
    this.stopHeartbeat();
    ExamSessionManager.clearSession();
  }
}

/**
 * Network Status Monitor
 * Monitors online/offline status and notifies user
 */
export class NetworkMonitor {
  private onOnline?: () => void;
  private onOffline?: () => void;
  private isMonitoring: boolean = false;

  constructor(callbacks?: {
    onOnline?: () => void;
    onOffline?: () => void;
  }) {
    this.onOnline = callbacks?.onOnline;
    this.onOffline = callbacks?.onOffline;
  }

  start() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    console.log('📡 Network monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    this.isMonitoring = false;
    console.log('📡 Network monitoring stopped');
  }

  private handleOnline = () => {
    console.log('✅ Network online');
    
    toast.success('Back online', {
      description: 'Your internet connection has been restored',
      duration: 3000
    });

    if (this.onOnline) {
      this.onOnline();
    }
  };

  private handleOffline = () => {
    console.log('❌ Network offline');
    
    toast.error('No internet connection', {
      description: 'Please check your connection. Your progress is being saved.',
      duration: 10000
    });

    if (this.onOffline) {
      this.onOffline();
    }
  };

  isOnline(): boolean {
    return navigator.onLine;
  }
}
