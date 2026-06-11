import { useState, useEffect, useRef } from 'react';
import { translationService } from '../components/services/translationService';

export interface TranslatableMessage {
  id: string | number;
  text: string;
  originalText?: string;
  originalLanguage?: string;
  sender?: 'user' | 'bot' | 'agent';
  role?: 'user' | 'agent';
  targetLanguage?: string;
  [key: string]: any;
}

interface TranslationCache {
  [key: string]: string; // key: `${messageId}_${targetLang}`, value: translated text
}

export const useMessageTranslation = (
  messages: TranslatableMessage[],
  targetLanguage: string
) => {
  const [translatedMessages, setTranslatedMessages] = useState<TranslatableMessage[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const translationCacheRef = useRef<TranslationCache>({});
  const isTranslatingRef = useRef(false);

  useEffect(() => {
    const translateMessages = async () => {
      // Prevent concurrent translations
      if (isTranslatingRef.current) {
        // console.log('[Translation] Already translating, skipping...');
        return;
      }

      // console.log(`[Translation] Starting translation: ${messages.length} messages, target: ${targetLanguage}`);
      isTranslatingRef.current = true;
      setIsTranslating(true);

      try {
        const translated = await Promise.all(
          messages.map(async (msg) => {
            const messageId = msg.id;
            const msgTargetLang = msg.targetLanguage || targetLanguage;
            const cacheKey = `${messageId}_${msgTargetLang}`;

            // Check cache first
            if (translationCacheRef.current[cacheKey]) {
              // console.log(`[Translation] Cache hit for message ${messageId}`);
              return {
                ...msg,
                text: translationCacheRef.current[cacheKey],
              };
            }

            // Determine original language and text
            const originalText = msg.originalText || msg.text;
            const originalLang = msg.originalLanguage || 'en';

            // console.log(`[Translation] Message ${messageId}: originalLang=${originalLang}, targetLang=${targetLanguage}`);

            // Skip translation if already in target language
            if (originalLang === msgTargetLang) {
              // console.log(`[Translation] Message ${messageId} already in target language`);
              return msg;
            }

            // Translate the message
            try {
              // console.log(`[Translation] API call: Translating "${originalText.substring(0, 30)}..." from ${originalLang} to ${targetLanguage}`);
              const result = await translationService.translateText(
                originalText,
                originalLang,
                msgTargetLang
              );

              if (result.success && result.translatedText) {
                // Update cache
                translationCacheRef.current[cacheKey] = result.translatedText;
                // console.log(`[Translation] Message ${messageId} translated successfully to: "${result.translatedText.substring(0, 30)}..."`);

                return {
                  ...msg,
                  text: result.translatedText,
                };
              } else {
                console.error(`[Translation] Translation failed for message ${messageId}:`, result.error);
              }
            } catch (error) {
              console.error(`[Translation] Exception translating message ${messageId}:`, error);
            }

            // Return original if translation fails
            return msg;
          })
        );

        // console.log(`[Translation] Translation complete, updating state with ${translated.length} messages`);
        setTranslatedMessages(translated);
      } catch (error) {
        console.error('[Translation] Error in translation process:', error);
        setTranslatedMessages(messages);
      } finally {
        setIsTranslating(false);
        isTranslatingRef.current = false;
      }
    };

    translateMessages();
  }, [messages, targetLanguage]); // Direct dependencies - triggers on any change

  return {
    translatedMessages,
    isTranslating,
  };
};
