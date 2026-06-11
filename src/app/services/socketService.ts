import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(userId: string, role: string) {
    if (this.socket?.connected) {
      return;
    }

    const token = localStorage.getItem('token');
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      query: { userId, role },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Real-time events from trainer actions
    const events = [
      'new_course',
      'course_updated',
      'new_media',
      'media_updated',
      'new_live_session',
      'live_session_updated',
      'new_assessment',
      'assessment_updated',
      'new_announcement',
      'question_answered',
      'certificate_ready',
      'payment_status_updated',
      'user_approved',
      'notification',
      'enrollment_approved',
      'content_published'
    ];

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        console.log(`📡 Received event: ${event}`, data);
        this.emit(event, data);
      });
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Emit events to server
  send(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
