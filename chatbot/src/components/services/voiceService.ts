// import axios from 'axios';

// const V2T_KEY = "z1x2c3v4b5n6m7a8s9d0f1g2h3j4k5l6";
// const API_BASE_URL = 'https://anuvadini-services.aicte-india.org/api';

// export interface VoiceRecordingState {
//   isRecording: boolean;
//   isProcessing: boolean;
//   error: string | null;
//   recordingPath: string | null;
//   recordingSource: string | null;
//   voiceTranslatedText: string;
// }

// export interface VoiceToTextResponse {
//   transcription?: string;
//   success: boolean;
//   error?: string;
// }

// class VoiceRecordingService {
//   private mediaRecorder: MediaRecorder | null = null;
//   private audioChunks: Blob[] = [];
//   private stream: MediaStream | null = null;
//   private recordingStartTime: number = 0;

//   /**
//    * Start recording audio from the user's microphone
//    */
//   async startRecording(): Promise<boolean> {
//     try {
//       // Request microphone permission
//       this.stream = await navigator.mediaDevices.getUserMedia({ 
//         audio: {
//           echoCancellation: true,
//           noiseSuppression: true,
//           sampleRate: 44100,
//         } 
//       });

//       // Check if MediaRecorder is supported
//       if (!MediaRecorder.isTypeSupported('audio/webm')) {
//         throw new Error('Browser does not support audio recording');
//       }

//       // Create MediaRecorder instance
//       this.mediaRecorder = new MediaRecorder(this.stream, {
//         mimeType: 'audio/webm'
//       });

//       this.audioChunks = [];

//       // Set up event handlers
//       this.mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           this.audioChunks.push(event.data);
//         }
//       };

//       this.mediaRecorder.onerror = (event) => {
//         console.error('MediaRecorder error:', event);
//       };

//       // Start recording
//       this.mediaRecorder.start(100); // Collect data every 100ms
//       this.recordingStartTime = Date.now();

//       return true;
//     } catch (error) {
//       console.error('Error starting recording:', error);
//       this.cleanup();
//       throw error;
//     }
//   }

//   /**
//    * Stop recording and return the audio blob
//    */
//   async stopRecording(): Promise<Blob> {
//     return new Promise((resolve, reject) => {
//       if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
//         reject(new Error('No active recording found'));
//         return;
//       }

//       this.mediaRecorder.onstop = () => {
//         const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
//         this.cleanup();
//         resolve(audioBlob);
//       };

//       this.mediaRecorder.stop();
//     });
//   }

//   /**
//    * Convert audio blob to base64 string
//    */
//   private async blobToBase64(blob: Blob): Promise<string> {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         const base64String = (reader.result as string).split(',')[1];
//         resolve(base64String);
//       };
//       reader.onerror = reject;
//       reader.readAsDataURL(blob);
//     });
//   }

//   /**
//    * Send audio to voice-to-text API
//    */
//   async voiceToText(audiob64: string, audioLanguage: string): Promise<VoiceToTextResponse> {
//     try {
//       const audioLanguageIn = audioLanguage + "-IN";

//       const response = await axios.post(
//         `${API_BASE_URL}/voice-to-text`,
//         {
//           audioBuffer: audiob64,
//           audioLanguage: audioLanguageIn,
//         },
//         {
//           headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${V2T_KEY}`,
//           },
//         }
//       );

//       console.log('Voice-to-Text Response:', response.data);

//       return {
//         transcription: response.data.transcription,
//         success: true
//       };
//     } catch (error) {
//       console.error('Voice-to-Text Error:', error);

//       if (axios.isAxiosError(error)) {
//         return {
//           success: false,
//           error: (error as any).response?.data?.message || (error as any).message
//         };
//       }

//       return {
//         success: false,
//         error: 'An unexpected error occurred'
//       };
//     }
//   }

//   /**
//    * Complete recording process: stop recording and transcribe
//    */
//   async completeRecording(selectedLanguage: string = 'en'): Promise<VoiceToTextResponse> {
//     try {
//       // Stop recording and get audio blob
//       const audioBlob = await this.stopRecording();

//       // Convert to base64
//       const audioBuffer = await this.blobToBase64(audioBlob);

//       // Send for transcription
//       const response = await this.voiceToText(audioBuffer, selectedLanguage);

//       return response;
//     } catch (error) {
//       console.error('Error completing recording:', error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : 'Recording failed'
//       };
//     }
//   }

//   /**
//    * Check if browser supports audio recording
//    */
//   isRecordingSupported(): boolean {
//     return !!(navigator.mediaDevices && window.MediaRecorder);
//   }

//   /**
//    * Get recording duration in seconds
//    */
//   getRecordingDuration(): number {
//     if (this.recordingStartTime === 0) return 0;
//     return Math.floor((Date.now() - this.recordingStartTime) / 1000);
//   }

//   /**
//    * Check if currently recording
//    */
//   isCurrentlyRecording(): boolean {
//     return this.mediaRecorder?.state === 'recording';
//   }

//   /**
//    * Clean up resources
//    */
//   private cleanup(): void {
//     if (this.stream) {
//       this.stream.getTracks().forEach(track => track.stop());
//       this.stream = null;
//     }

//     if (this.mediaRecorder) {
//       this.mediaRecorder = null;
//     }

//     this.audioChunks = [];
//     this.recordingStartTime = 0;
//   }

//   /**
//    * Cancel current recording
//    */
//   cancelRecording(): void {
//     if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
//       this.mediaRecorder.stop();
//     }
//     this.cleanup();
//   }
// }

// // Export singleton instance
// export const voiceRecordingService = new VoiceRecordingService();



import axios from "axios";
import { sendMessageToAPI, getApiLanguageCode } from "./chatService";
import { textToSpeech } from "./ttsService";
import { proxyService } from './proxyService';
import { translationService } from "./translationService";

const V2T_KEY = "z1x2c3v4b5n6m7a8s9d0f1g2h3j4k5l6";
const API_BASE_URL = 'https://anuvadini-services.aicte-india.org/api';

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  recordingPath: string | null;
  recordingSource: string | null;
  voiceTranslatedText: string;
}

export interface VoiceToTextResponse {
  transcription?: string;
  success: boolean;
  error?: string;
}

class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recordingStartTime: number = 0;

  /**
   * Start recording audio from the user's microphone
   */
  async startRecording(): Promise<boolean> {
    try {
      // Check HTTPS requirement
      if (!window.location.protocol.includes('https') && !window.location.hostname.includes('localhost')) {
        throw new Error('HTTPS is required for microphone access. Please use HTTPS or localhost for development.');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1,
        }
      });

      // Check if MediaRecorder is supported and find compatible format
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error('No supported audio recording format found');
          }
        }
      }

      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        throw new Error('MediaRecorder encountered an error');
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recordingStartTime = Date.now();

      // console.log('🎤 Recording started with format:', mimeType);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.cleanup();

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone permission denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is being used by another application. Please close other applications and try again.');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error('Microphone constraints cannot be satisfied. Please check your microphone settings.');
        } else if (error.name === 'SecurityError') {
          throw new Error('Microphone access blocked due to security restrictions. Please use HTTPS.');
        }
      }

      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        reject(new Error('No active recording found'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert audio blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Send audio to voice-to-text API
   */
  async voiceToText(audiob64: string, audioLanguage: string): Promise<VoiceToTextResponse> {
    try {
      const audioLanguageIn = audioLanguage + "-IN";

      // Try proxy first
      try {
        // console.log('🔄 Trying Voice-to-Text via proxy...');
        const proxyResult = await proxyService.voiceToText({
          audio_buffer: audiob64,
          audio_language: audioLanguageIn,
        });

        if (proxyResult.success && proxyResult.transcription) {
          // console.log('✅ Voice-to-Text via proxy successful');
          return {
            transcription: proxyResult.transcription,
            success: true
          };
        }
      } catch (proxyError) {
        console.warn('⚠️ Proxy Voice-to-Text failed, falling back to direct API:', proxyError);
      }

      // Fallback to direct API
      // console.log('🔄 Using direct Voice-to-Text API...');
      const response = await axios.post(
        `${API_BASE_URL}/voice-to-text`,
        {
          audioBuffer: audiob64,
          audioLanguage: audioLanguageIn,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${V2T_KEY}`,
          },
        }
      );

      // console.log('Voice-to-Text Response:', response.data);

      return {
        transcription: response.data.transcription,
        success: true
      };
    } catch (error) {
      console.error('Voice-to-Text Error:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: (error as any).response?.data?.message || (error as any).message
        };
      }

      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    }
  }

  /**
   * Complete recording process: stop recording and transcribe
   */
  async completeRecording(selectedLanguage: string = 'en'): Promise<VoiceToTextResponse> {
    try {
      // Stop recording and get audio blob
      const audioBlob = await this.stopRecording();

      // Convert to base64
      const audioBuffer = await this.blobToBase64(audioBlob);

      // Send for transcription
      const response = await this.voiceToText(audioBuffer, selectedLanguage);

      return response;
    } catch (error) {
      console.error('Error completing recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Recording failed'
      };
    }
  }

  /**
   * Check if browser supports audio recording
   */
  isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && window.MediaRecorder);
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (this.recordingStartTime === 0) return 0;
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    this.audioChunks = [];
    this.recordingStartTime = 0;
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }
}

// Export singleton instance
export const voiceRecordingService = new VoiceRecordingService();


const LANGUAGE_MAP: Record<string, string> = {
  en: "english",
  "en-IN": "english",
  hi: "hindi",
  "hi-IN": "hindi",
  // mr: "marathi",
  // gu: "gujarati",
  // ta: "tamil",
  // te: "telugu",
  // kn: "kannada",
  // ml: "malayalam",
  // bn: "bengali",
  // pa: "punjabi",
  // as: "assamese",
  // en: "english",
  //   hi: "hindi",
  te: "telugu",
  ta: "tamil",
  bn: "bengali",
  gu: "gujarati",
  mr: "marathi",
  kn: "kannada",
  ml: "malayalam",
  pa: "punjabi",
  ur: "urdu",
  or: "odia",
  as: "assamese",
  ar: "arabic",
  zh: "chinese",
  ja: "japanese",
  ne: "nepali",
  ko: "korean",
  ru: "russian",
};

let isRecording = false;

export const handleVoiceInteraction = async (
  lang: string = "hi",
  addMessageToChat?: (message: any) => any,
  onAudioStart?: (messageId: number, audioRef: HTMLAudioElement) => void,
  onAudioEnd?: () => void,
  onProcessingStart?: () => void,
  onProcessingEnd?: () => void
) => {
  try {
    if (!isRecording) {
      // console.log("🎙 Start recording...");
      isRecording = true;
      await voiceRecordingService.startRecording();
    } else {
      // console.log("⏹ Stop and process...");
      isRecording = false;

      if (onProcessingStart) onProcessingStart();
      const transcriptionResult = await voiceRecordingService.completeRecording(lang);

      if (!transcriptionResult.success || !transcriptionResult.transcription) {
        console.error("❌ Transcription failed:", transcriptionResult.error);
        if (onProcessingEnd) onProcessingEnd();
        return;
      }

      const userMessage = transcriptionResult.transcription;
      // console.log("📝 Transcribed:", userMessage);

      if (addMessageToChat) {
        addMessageToChat({ role: "user", text: userMessage });
      }

      const apiLangCode = getApiLanguageCode(lang);
      const botReply = await sendMessageToAPI(userMessage, undefined, apiLangCode);
      // console.log("bot reply", botReply);

      // ✅ Extract a string from botReply instead of passing whole object
      const botAnswer =
        botReply && typeof botReply === "object" && "answer" in botReply
          ? botReply.answer
          : String(botReply ?? "I'm listening. Tell me more so I can assist you better!");

      // ✅ Add only the answer text to chat and get the message object
      let botMessageId: number | undefined;

      // 🔴 Translate bot response to user's current language if needed
      let finalBotAnswer = botAnswer;
      const originalBotLanguage = "en"; // Bot responses are originally in English
      
      if (lang !== "en" && botAnswer) {
        // console.log(`[Voice] Translating bot message from en to ${lang}`);
        const tr = await translationService.translateText(
          botAnswer,
          "en",
          lang,
        );
        if (tr.success && tr.translatedText) {
          finalBotAnswer = tr.translatedText;
        }
      }

      if (addMessageToChat) {
        const botMessage = addMessageToChat({
          role: "assistant",
          text: finalBotAnswer || "I couldn't find an answer.",
          originalText: botAnswer, // Store original English text
          originalLanguage: originalBotLanguage, // Store original language
          targetLanguage: lang,
        });
        // Extract message ID if the return value has it
        botMessageId = (botMessage as any)?.id;
      }

      const mappedLang = LANGUAGE_MAP[lang] || "english";
      const ttsResult = await textToSpeech(finalBotAnswer, mappedLang);

      const base64Audio =
        ttsResult?.audio ||
        ttsResult?.audio_url ||
        ttsResult?.audioFile ||
        ttsResult?.data?.audio;

      if (base64Audio) {
        // Clear processing state before playing audio
        if (onProcessingEnd) onProcessingEnd();

        // Check if base64Audio is actually a URL
        const isUrl = base64Audio.startsWith('http') || base64Audio.startsWith('blob:') || base64Audio.includes('://');
        const audioSrc = isUrl ? base64Audio : `data:audio/wav;base64,${base64Audio}`;

        const audio = new Audio(audioSrc);
        audio.crossOrigin = "anonymous";

        // Notify that audio is starting
        if (onAudioStart && botMessageId) {
          onAudioStart(botMessageId, audio);
        }

        // Set up audio end handler
        audio.onended = () => {
          // console.log("🔇 Audio playback ended");
          if (onAudioEnd) {
            onAudioEnd();
          }
        };

        try {
          await audio.play();
          // console.log("🔊 Playing bot response...");
        } catch (playError) {
          console.error("🔊 Audio play back error:", playError);
        }
      } else {
        console.error("🔇 TTS failed or returned no audio", ttsResult);
        if (onProcessingEnd) onProcessingEnd();
      }
    }
  } catch (error) {
    console.error("🚨 Voice interaction error:", error);
    isRecording = false;
    if (onProcessingEnd) onProcessingEnd();
  }
};