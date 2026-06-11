// import axios from "axios";

// export const textToSpeech = async (
//   text: string,
//   lang: string = "hi-IN",
//   voice: string = "hi-IN-MadhurNeural",
//   gender: string = "Female"
// ) => {
//   try {
//     const response = await axios.post(
//       "https://anuvadini-services.aicte-india.org/api/text-to-speech",
//       {
//         text: text,
//         lang: lang,
//         languageVoice: voice,
//         gender: gender,
//       },
//       {
//         headers: {
//           Authorization: "Bearer <YOUR_API_TOKEN>", // <-- Use actual token
//           "Content-Type": "application/json",
//           Accept: "*/*",
//         },
//         withCredentials: true, // Needed as per original fetch
//       }
//     );

//     return response.data; // Contains audio URL
//   } catch (error) {
//     console.error("TTS Error:", error);
//     throw error;
//   }
// };


import axios from "axios";
import { proxyService } from './proxyService';

// Fallback direct API URL
const TTS_API_URL = "https://anuvadini-services.aicte-india.org/api/text-to-speech";

// Add only languages supported by your TTS API
const AZURE_SPEECH_CONFIG: Record<string, { code: string; voice: string }> = {
  assamese: { code: "as-IN", voice: "as-IN-PriyomNeural" },
  bengali: { code: "bn-IN", voice: "bn-IN-TanishaaNeural" },
  bodo: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  dogri: { code: "hi-IN", voice: "hi-IN-MadhurNeural" },
  gujarati: { code: "gu-IN", voice: "gu-IN-DhwaniNeural" },
  hindi: { code: "hi-IN", voice: "hi-IN-MadhurNeural" },
  kannada: { code: "kn-IN", voice: "kn-IN-GaganNeural" },
  konkani: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  maithili: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  malayalam: { code: "ml-IN", voice: "ml-IN-MidhunNeural" },
  manipuri: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  marathi: { code: "mr-IN", voice: "mr-IN-AarohiNeural" },
  odia: { code: "or-IN", voice: "or-IN-SubhasiniNeural" },
  punjabi: { code: "pa-IN", voice: "pa-IN-VaaniNeural" },
  sanskrit: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  santali: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  sindhi: { code: "hi-IN", voice: "hi-IN-MadhurNeural" }, 
  tamil: { code: "ta-IN", voice: "ta-IN-ValluvarNeural" },
  telugu: { code: "te-IN", voice: "te-IN-MohanNeural" },
  urdu: { code: "ur-IN", voice: "ur-IN-SalmanNeural" },
  english: { code: "en-IN", voice: "en-IN-PrabhatNeural" },
  arabic: { code: "ar-SA", voice: "ar-SA-HamedNeural" },
  chinese: { code: "zh-CN", voice: "zh-CN-XiaoxiaoNeural" },
  japanese: { code: "ja-JP", voice: "ja-JP-NanamiNeural" },
  nepali: { code: "ne-NP", voice: "ne-NP-SagarNeural" },
  korean: { code: "ko-KR", voice: "ko-KR-SunHiNeural" },
  russian: { code: "ru-RU", voice: "ru-RU-DariyaNeural" },

};

export const textToSpeech = async (
  text: string,
  langKey: string = "hindi" // pass "assamese", "english", etc.
): Promise<any> => {
  const config = AZURE_SPEECH_CONFIG[langKey.toLowerCase()];

  if (!config) {
    console.error("Unsupported language:", langKey);
    // console.log("Available language keys:", Object.keys(AZURE_SPEECH_CONFIG));
    // Fallback to English if language not supported
    const fallbackConfig = AZURE_SPEECH_CONFIG["english"];
    if (!fallbackConfig) {
      throw new Error(`Language ${langKey} not supported and no fallback available`);
    }
    // console.log("Falling back to English TTS");
    return await textToSpeech(text, "english");
  }

  // Try proxy first
  try {
    // console.log(`🔄 Trying TTS via proxy: "${text}" in ${langKey} (${config.code})`);
    
    const proxyResult = await proxyService.textToSpeech({
      text: text,
      lang: config.code,
      language_voice: config.voice,
      gender: "Female",
    });

    // console.log("✅ TTS via proxy successful:", proxyResult);
    
    // Validate response has audio data
    if (proxyResult && (proxyResult.audio || proxyResult.audio_url)) {
      return proxyResult;
    }
    
    throw new Error("No audio data received from proxy TTS service");
  } catch (proxyError) {
    console.warn("⚠️ Proxy TTS failed, falling back to direct API:", proxyError);
  }

  // Fallback to direct API
  try {
    // console.log(`🔄 Using direct TTS API: "${text}" in ${langKey} (${config.code})`);
    
    const response = await axios.post(
      TTS_API_URL,
      {
        text: text,
        lang: config.code,
        languageVoice: config.voice,
        gender: "Female",
      },
      {
        headers: {
          Authorization: "Bearer <YOUR_API_TOKEN>",
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        withCredentials: true,
        timeout: 10000, // 10 second timeout
      }
    );

    // console.log("✅ Direct TTS API response:", response.data);
    
    // Validate response has audio data
    if (!response.data || (!response.data.audio && !response.data.audio_url)) {
      throw new Error("No audio data received from TTS service");
    }
    
    return response.data;
  } catch (error) {
    console.error("❌ TTS API Error:", error);
    
    // If it's a network error or API failure, throw to trigger fallback
    if (axios.isAxiosError(error)) {
      if ((error as any).code === 'ECONNABORTED') {
        throw new Error("TTS service timeout. Please try again.");
      } else if ((error as any).response?.status === 401) {
        throw new Error("TTS service authentication failed.");
      } else if ((error as any).response?.status >= 500) {
        throw new Error("TTS service temporarily unavailable.");
      }
    }
    
    throw error;
  }
};
