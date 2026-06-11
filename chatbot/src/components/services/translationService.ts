// Translation service for text translation and suggestions
import axios from 'axios';
import { proxyService } from './proxyService';

const TRANSLATION_API_URL = 'https://pravahai.aicte-india.org/api/translatebulk';

export interface TranslationRequest {
  from: string;
  text: string;
  to: string;
}

export interface TranslationResponse {
  translations: Array<{
    text: string;
  }>;
}

export interface TranslationServiceResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
}

class TranslationService {
  private useProxy: boolean = true;

  /**
   * Translate text using proxy first, fallback to direct API
   */
  async translateText(
    text: string, 
    fromLanguage: string, 
    toLanguage: string
  ): Promise<TranslationServiceResponse> {
    try {
      if (!text.trim()) {
        return {
          success: false,
          error: 'Text cannot be empty'
        };
      }

      // Format language codes to match API requirements (add -IN suffix if not present)
      const formatLanguageCode = (lang: string): string => {
        if (lang === 'en') return 'en-IN';
        if (lang === 'hi') return 'hi-IN';
        if (lang === 'bn') return 'bn-IN';
        if (lang === 'ta') return 'ta-IN';
        if (lang === 'te') return 'te-IN';
        if (lang === 'mr') return 'mr-IN';
        if (lang === 'gu') return 'gu-IN';
        if (lang === 'kn') return 'kn-IN';
        if (lang === 'ml') return 'ml-IN';
        if (lang === 'pa') return 'pa-IN';
        if (lang === 'or') return 'or-IN';
        if (lang === 'as') return 'as-IN';
        if (lang === 'ur') return 'ur-IN';
        return lang.includes('-') ? lang : `${lang}-IN`;
      };

      // Try proxy first if enabled
      if (this.useProxy) {
        try {
          // console.log('🔄 Trying translation via proxy...');
          const proxyResult = await proxyService.translateText({
            text: text,
            from_language: formatLanguageCode(fromLanguage),
            to_language: formatLanguageCode(toLanguage)
          });

          if (proxyResult.success) {
            // console.log('✅ Translation via proxy successful');
            return {
              success: true,
              translatedText: proxyResult.translated_text || text
            };
          }
        } catch (proxyError) {
          console.warn('⚠️ Proxy translation failed, falling back to direct API:', proxyError);
          this.useProxy = false; // Disable proxy for subsequent requests
        }
      }

      // Fallback to direct API
      // console.log('🔄 Using direct translation API...');
      const translationRequest: TranslationRequest[] = [{
        from: formatLanguageCode(fromLanguage),
        text: text,
        to: formatLanguageCode(toLanguage)
      }];

      const response = await axios.post(
        TRANSLATION_API_URL,
        translationRequest,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000 // 10 second timeout
        }
      );
      // console.log('Translation API response:', response.data);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const translationResult = response.data[0] as TranslationResponse;
        
        // Handle the new API response format with nested translations array
        if (translationResult.translations && Array.isArray(translationResult.translations) && translationResult.translations.length > 0) {
          const translatedText = translationResult.translations[0].text;
          
          return {
            success: true,
            translatedText: translatedText || text
          };
        } else {
          return {
            success: false,
            error: 'No translation found in API response'
          };
        }
      } else {
        return {
          success: false,
          error: 'Invalid response format from translation API'
        };
      }

    } catch (error) {
      console.error('Translation Error:', error);
      
      if (axios.isAxiosError(error)) {
        if ((error as any).code === 'ECONNABORTED') {
          return {
            success: false,
            error: 'Translation request timed out'
          };
        }
        
        return {
          success: false,
          error: (error as any).response?.data?.message || (error as any).message || 'Translation failed'
        };
      }
      
      return {
        success: false,
        error: 'An unexpected error occurred during translation'
      };
    }
  }

  /**
   * Get transliteration suggestions for a word
   * This converts romanized text to the target language script
   */
  async getTransliterationSuggestion(
    word: string, 
    targetLanguage: string
  ): Promise<TranslationServiceResponse> {
    if (!word.trim() || targetLanguage === 'en') {
      return {
        success: false,
        error: 'No transliteration needed'
      };
    }

    try {
      // For transliteration, we assume the input is romanized text (English) 
      // and want to convert to target language script
      const result = await this.translateText(word, 'en', targetLanguage);
      
      // If translation fails or returns the same text, it might not be a valid transliteration
      if (!result.success || result.translatedText === word) {
        return {
          success: false,
          error: 'No transliteration suggestion available'
        };
      }
      
      return result;
    } catch (error) {
      console.error('Transliteration Error:', error);
      return {
        success: false,
        error: 'Transliteration service unavailable'
      };
    }
  }

  /**
   * Get multiple transliteration suggestions for better user experience
   */
  async getMultipleTransliterationSuggestions(
    word: string, 
    targetLanguage: string
  ): Promise<TranslationServiceResponse> {
    // For now, return single suggestion, but this can be extended
    // to call multiple APIs or provide alternative suggestions
    return this.getTransliterationSuggestion(word, targetLanguage);
  }

  /**
   * Translate entire text for display purposes
   */
  async translateForDisplay(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<TranslationServiceResponse> {
    if (fromLanguage === toLanguage) {
      return {
        success: true,
        translatedText: text
      };
    }

    return this.translateText(text, fromLanguage, toLanguage);
  }

  /**
   * Get supported language pairs
   */
  getSupportedLanguages(): Array<{ id: string; name: string; englishName: string; apiCode: string }> {

   return [
  { id: 'en', name: 'English', englishName: 'English', apiCode: 'en-IN' },
  { id: 'hi', name: 'हिन्दी', englishName: 'Hindi', apiCode: 'hi-IN' },
  { id: 'bn', name: 'বাংলা', englishName: 'Bengali', apiCode: 'bn-IN' },
  { id: 'ta', name: 'தமிழ்', englishName: 'Tamil', apiCode: 'ta-IN' },
  { id: 'te', name: 'తెలుగు', englishName: 'Telugu', apiCode: 'te-IN' },
  { id: 'mr', name: 'मराठी', englishName: 'Marathi', apiCode: 'mr-IN' },
  { id: 'gu', name: 'ગુજરાતી', englishName: 'Gujarati', apiCode: 'gu-IN' },
  { id: 'kn', name: 'ಕನ್ನಡ', englishName: 'Kannada', apiCode: 'kn-IN' },
  { id: 'ml', name: 'മലയാളം', englishName: 'Malayalam', apiCode: 'ml-IN' },
  { id: 'pa', name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', apiCode: 'pa-IN' },
  { id: 'or', name: 'ଓଡ଼ିଆ', englishName: 'Odia', apiCode: 'or-IN' },
  { id: 'as', name: 'অসমীয়া', englishName: 'Assamese', apiCode: 'as-IN' },
  { id: 'ur', name: 'اردو', englishName: 'Urdu', apiCode: 'ur-IN' },
  // Additional Indian Regional Languages
  { id: 'brx', name: 'बोड़ो', englishName: 'Bodo', apiCode: 'brx-IN' },
  { id: 'doi', name: 'डोगरी', englishName: 'Dogri', apiCode: 'doi-IN' },
  { id: 'ks', name: 'کٲشُر', englishName: 'Kashmiri', apiCode: 'ks-IN' },
  { id: 'gom', name: 'कोंकणी', englishName: 'Konkani', apiCode: 'gom-IN' },
  { id: 'mai', name: 'मैथिली', englishName: 'Maithili', apiCode: 'mai-IN' },
  { id: 'mni', name: 'মৈতৈলোন্', englishName: 'Manipuri', apiCode: 'mni-IN' },
  { id: 'ne', name: 'नेपाली', englishName: 'Nepali', apiCode: 'ne-IN' },
  { id: 'sat', name: 'ᱥᱟᱱᱛᱨᱢ', englishName: 'Santali', apiCode: 'sat-IN' },
  { id: 'sd', name: 'سنڌي', englishName: 'Sindhi', apiCode: 'sd-IN' },
  
];
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(languageId: string): boolean {
    return this.getSupportedLanguages().some(lang => lang.id === languageId);
  }
}

// Export singleton instance
export const translationService = new TranslationService();
