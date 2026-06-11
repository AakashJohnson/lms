// Proxy service for secure API calls through backend
import axios from 'axios';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface ProxyTranslationRequest {
  text: string;
  from_language: string;
  to_language: string;
}

export interface ProxyTTSRequest {
  text: string;
  lang: string;
  language_voice: string;
  gender: string;
}

export interface ProxyVoiceToTextRequest {
  audio_buffer: string;
  audio_language: string;
}

class ProxyService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE.replace(/\/$/, "")}/api/proxy`;
  }

  /**
   * Get JWT token from URL or localStorage
   */
  private getToken(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("token") || localStorage.getItem("chatbot_jwt");
  }

  /**
   * Helper to get common headers
   */
  private getHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  /**
   * Translate text through proxy
   */
  async translateText(request: ProxyTranslationRequest) {
    try {
      const response = await axios.post(`${this.baseUrl}/translate`, request, {
        headers: this.getHeaders(),
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error('Proxy Translation Error:', error);
      throw error;
    }
  }

  /**
   * Text-to-Speech through proxy
   */
  async textToSpeech(request: ProxyTTSRequest) {
    try {
      const response = await axios.post(`${this.baseUrl}/tts`, request, {
        headers: this.getHeaders(),
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error('Proxy TTS Error:', error);
      throw error;
    }
  }

  /**
   * Voice-to-Text through proxy
   */
  async voiceToText(request: ProxyVoiceToTextRequest) {
    try {
      const response = await axios.post(`${this.baseUrl}/voice-to-text`, request, {
        headers: this.getHeaders(),
        timeout: 30000, // Longer timeout for audio processing
      });
      return response.data;
    } catch (error) {
      console.error('Proxy Voice-to-Text Error:', error);
      throw error;
    }
  }

  /**
   * Test if proxy is available
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE}/`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Proxy connection test failed:', error);
      return false;
    }
  }
}

export const proxyService = new ProxyService();