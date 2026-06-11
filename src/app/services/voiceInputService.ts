const V2T_API = 'https://anuvadini-services.aicte-india.org/api/voice-to-text';
const TRANSLATE_API = 'https://pravahai.aicte-india.org/api/translatebulk';
const AUTH_KEY = 'z1x2c3v4b5n6m7a8s9d0f1g2h3j4k5l6';

class VoiceInputService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  get isCurrentlyRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access not supported in this browser');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
    });
    const mimeType =
      ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  async stopAndTranscribe(lang = 'en'): Promise<string> {
    const blob = await this.stopRecording();
    const base64 = await this.blobToBase64(blob);
    try {
      const res = await fetch(V2T_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_KEY}`,
        },
        body: JSON.stringify({ audioBuffer: base64, audioLanguage: `${lang}-IN` }),
      });
      const data = await res.json();
      return data.transcription || '';
    } catch {
      throw new Error('Voice transcription failed. Please check your connection.');
    }
  }

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    if (fromLang === toLang || !text.trim()) return text;
    const fmt = (l: string) => (l.includes('-') ? l : `${l}-IN`);
    try {
      const res = await fetch(TRANSLATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: [text],
          source_language: fmt(fromLang),
          target_language: fmt(toLang),
        }),
      });
      const data = await res.json();
      return data.translated_text?.[0] || text;
    } catch {
      return text;
    }
  }

  private stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject(new Error('No active recording'));
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.audioChunks, { type: 'audio/webm' }));
        this.cleanup();
      };
      this.mediaRecorder.stop();
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.stop();
    this.cleanup();
  }
}

export const voiceInputService = new VoiceInputService();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'as', label: 'অসমীয়া (Assamese)' },
  { code: 'ur', label: 'اردو (Urdu)' },
];
