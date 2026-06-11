import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Copy, RotateCcw, Send, Globe, Languages } from 'lucide-react';
import { voiceRecordingService } from '../services/voiceService';
import { translationService } from '../services/translationService';
import { useLanguage } from '../services/languageContext';
import './VirtualKeyboard.css';

interface VirtualKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onTextInput: (text: string) => void;
  currentText: string;
  languages?: Array<{ id: string; name: string; englishName: string; apiCode?: string }>;
  showLanguageSelection?: boolean;
  defaultLanguage?: string;
  closeOnSubmit?: boolean;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  onClose,
  onTextInput,
  currentText,
  languages = translationService.getSupportedLanguages(),
  showLanguageSelection = true,
  // defaultLanguage = 'en',
  closeOnSubmit = true
}) => {
  const [typedText, setTypedText] = useState(currentText);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [lastAction, setLastAction] = useState('typing');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showApiError, setShowApiError] = useState(false);
  const skipOnChangeRef = useRef(false);

  // Use shared language context
  const { currentLanguage, setCurrentLanguage } = useLanguage();

  // Update local state when currentText prop changes
  useEffect(() => {
    setTypedText(currentText);
  }, [currentText]);

  // Update selectedLanguage when currentLanguage changes
  useEffect(() => {
    // This ensures the virtual keyboard stays in sync with the main language
  }, [currentLanguage]);

  // Get current word being typed (similar to RN implementation)
  const getCurrentWord = (text: string): string => {
    const trimmed = text.trimEnd();
    const lastSpaceIndex = trimmed.lastIndexOf(' ');
    return lastSpaceIndex === -1 ? trimmed : trimmed.substring(lastSpaceIndex + 1);
  };

  // Real transliteration function using the translation API
  const getTransliterationSuggestion = async (word: string, language: string): Promise<string> => {
    try {
      if (!word.trim() || language === 'en' || word.length < 2) {
        return '';
      }

      // Only try transliteration if the word looks like it could be romanized text
      const isRomanizedText = /^[a-zA-Z]+$/.test(word);
      if (!isRomanizedText) {
        return '';
      }

      const response = await translationService.getTransliterationSuggestion(word, language);
      
      if (response.success && response.translatedText) {
        // Only return suggestion if it's different from input and not just lowercase/uppercase
        const suggestion = response.translatedText.trim();
        if (suggestion && suggestion.toLowerCase() !== word.toLowerCase()) {
          // Clear any previous API errors on success
          setApiError(null);
          setShowApiError(false);
          return suggestion;
        }
      }
      
      return '';
    } catch (error) {
      console.error('Transliteration Error:', error);
      // Set error state for user feedback
      setApiError('Translation service temporarily unavailable');
      setShowApiError(true);
      // Auto-hide error after 3 seconds
      setTimeout(() => setShowApiError(false), 3000);
      return '';
    }
  };

  // Function to translate the entire text
  const translateText = async (text: string, fromLang: string, toLang: string) => {
    if (!text.trim() || fromLang === toLang) {
      setTranslatedText('');
      setShowTranslation(false);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translationService.translateForDisplay(text, fromLang, toLang);
      
      if (response.success && response.translatedText) {
        const translated = response.translatedText.trim();
        // Only show translation if it's meaningfully different from original
        if (translated && translated !== text.trim()) {
          setTranslatedText(translated);
          setShowTranslation(true);
        } else {
          setTranslatedText('');
          setShowTranslation(false);
        }
      } else {
        setTranslatedText('');
        setShowTranslation(false);
        if (response.error && response.error !== 'No transliteration needed') {
          console.warn('Translation failed:', response.error);
        }
      }
    } catch (error) {
      console.error('Translation Error:', error);
      setTranslatedText('');
      setShowTranslation(false);
    } finally {
      setIsTranslating(false);
    }
  };

  // Transliteration suggestions with debounce and improved logic
  useEffect(() => {
    const lastCharIsSpace = typedText.slice(-1) === ' ';
    if (lastAction === 'typing' && !lastCharIsSpace) {
      const currentWord = getCurrentWord(typedText);
      if (currentWord && currentWord.length >= 2 && currentLanguage !== 'en') {
        // Only show loading for words that are likely to have suggestions
        const isRomanizedText = /^[a-zA-Z]+$/.test(currentWord);
        if (isRomanizedText) {
          setIsLoadingSuggestions(true);
        }
        
        const timer = setTimeout(async () => {
          try {
            const suggestion = await getTransliterationSuggestion(currentWord, currentLanguage);
            setSuggestions(suggestion || '');
          } catch (error) {
            console.error('Transliteration Error:', error);
            setSuggestions('');
          } finally {
            setIsLoadingSuggestions(false);
          }
        }, 300);

        return () => {
          clearTimeout(timer);
          setIsLoadingSuggestions(false);
        };
      } else {
        setSuggestions('');
        setIsLoadingSuggestions(false);
      }
    } else if (lastCharIsSpace) {
      setSuggestions('');
      setIsLoadingSuggestions(false);
    }
  }, [typedText, currentLanguage, lastAction]);

  // Auto-translate text when language changes or text is updated
  useEffect(() => {
    if (typedText.trim() && currentLanguage !== 'en') {
      const timer = setTimeout(() => {
        translateText(typedText, currentLanguage, 'en');
      }, 1000); // Debounce translation

      return () => clearTimeout(timer);
    } else {
      setTranslatedText('');
      setShowTranslation(false);
    }
  }, [typedText, currentLanguage]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording]);

  // Voice recording functions (similar to RN implementation)
  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    
    try {
      if (!voiceRecordingService.isRecordingSupported()) {
        throw new Error('Voice recording is not supported in this browser');
      }
      await voiceRecordingService.startRecording();
    } catch (error) {
      console.error('Start Recording Error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      const response = await voiceRecordingService.completeRecording(currentLanguage);
      setIsRecording(false);
      
      if (response.success && response.transcription) {
        const cleanedText = response.transcription.replace(/[।.]/g, '');
        skipOnChangeRef.current = true;
        
        const newText = typedText + (typedText && !typedText.endsWith(' ') ? ' ' : '') + cleanedText;
        setTypedText(newText);
        onTextInput(newText);
        setSuggestions('');
        setLastAction('micInput');
        
        setTimeout(() => {
          skipOnChangeRef.current = false;
          setLastAction('typing');
        }, 100);
      }
    } catch (error) {
      console.error('Stop Recording Error:', error);
      setIsRecording(false);
      skipOnChangeRef.current = false;
    }
  };

  const handleSuggestionPress = () => {
    if (!suggestions) return;

    const currentWord = getCurrentWord(typedText);
    if (!currentWord) return;

    const prefix = typedText.substring(0, typedText.length - currentWord.length);
    const newTypedText = prefix + suggestions + ' ';
    setTypedText(newTypedText);
    onTextInput(newTypedText);
    setSuggestions('');
    setLastAction('suggestionSelected');
  };

  const handleLanguageSelect = (languageId: string) => {
    setCurrentLanguage(languageId);
    setShowLanguageModal(false);
    setTypedText('');
    onTextInput('');
    setSuggestions('');
    setTranslatedText('');
    setShowTranslation(false);
  };

  const handleReset = () => {
    setTypedText('');
    onTextInput('');
    setSuggestions('');
    setTranslatedText('');
    setShowTranslation(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(typedText);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleSubmit = () => {
    if (typedText.trim()) {
      // If we have a translation and user is typing in non-English, offer both
      // const textToSubmit = showTranslation && translatedText 
      //   ? `${typedText}\n\n[Translation: ${translatedText}]`
      //   : typedText;
      
      // onTextInput(textToSubmit);
      if (closeOnSubmit) {
        onClose();
      } else {
        setTypedText('');
        onTextInput('');
        setSuggestions('');
        setTranslatedText('');
        setShowTranslation(false);
      }
    }
  };

  const handleChangeText = (text: string) => {
    if (lastAction !== 'micInput') {
      setLastAction('typing');
    }
    setTypedText(text);
    onTextInput(text);

    // Auto-transliterate on space - improved logic
    if (currentLanguage !== 'en' && text.slice(-1) === ' ' && lastAction === 'typing') {
      const words = text.trim().split(' ');
      const lastWord = words[words.length - 1];

      if (lastWord && suggestions && suggestions.trim()) {
        // Replace the last word with the suggestion
        const wordsBeforeLast = words.slice(0, -1);
        const newWords = [...wordsBeforeLast, suggestions];
        const newText = newWords.join(' ') + ' ';
        
        setTypedText(newText);
        onTextInput(newText);
        setSuggestions('');
        setIsLoadingSuggestions(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="virtual-keyboard-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="virtual-keyboard-container"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="virtual-keyboard-header">
            <div className="header-content">
              <div className="header-icon">
                ⌨️
              </div>
              <h3>Virtual Keyboard</h3>
            </div>
            <motion.button 
              className="virtual-keyboard-close" 
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Text Input Area */}
          <div className="virtual-keyboard-input-section">
            <div className="virtual-keyboard-textarea-container">
              <motion.textarea
                value={typedText}
                onChange={(e) => handleChangeText(e.target.value)}
                placeholder="✨ Start typing your message here..."
                className="virtual-keyboard-textarea"
                rows={3}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              />
              
              {/* Send Button (shows when there's text) */}
              <AnimatePresence>
                {typedText.length > 0 && (
                  <motion.button
                    className="virtual-keyboard-send-btn"
                    onClick={handleSubmit}
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Send size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Translation Display */}
            <AnimatePresence>
              {(isTranslating || showTranslation) && currentLanguage !== 'en' && typedText.trim() && (
                <motion.div 
                  className="virtual-keyboard-translation"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {isTranslating ? (
                    <div className="virtual-keyboard-loader">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Languages size={16} />
                      </motion.div>
                      <span>Translating...</span>
                    </div>
                  ) : (
                    translatedText && (
                      <motion.div
                        className="virtual-keyboard-translated-text"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <div className="translation-header">
                          <span className="translation-icon">🔄</span>
                          <span className="translation-label">Translation to English:</span>
                        </div>
                        <div className="translation-content">
                          {translatedText}
                        </div>
                      </motion.div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simple Suggestions */}
            {(isLoadingSuggestions || suggestions) && currentLanguage !== 'en' && (
              <div className="simple-suggestion">
                {isLoadingSuggestions ? (
                  <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                    transliterating...
                  </span>
                ) : (
                  suggestions && (
                    <span 
                      onClick={handleSuggestionPress}
                      style={{ 
                        fontSize: '14px', 
                        color: '#007bff', 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '2px 0'
                      }}
                    >
                      {suggestions}
                    </span>
                  )
                )}
              </div>
            )}

            {/* Simple Error Display */}
            {showApiError && apiError && (
              <div style={{ 
                fontSize: '12px', 
                color: '#dc3545', 
                fontStyle: 'italic',
                padding: '2px 0'
              }}>
                ⚠️ {apiError}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="virtual-keyboard-actions">
            <motion.div 
              className="virtual-keyboard-action-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, staggerChildren: 0.1 }}
            >
              {/* Microphone Button */}
              <motion.button
                className={`virtual-keyboard-action-btn mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                title={isRecording ? "Stop Recording" : "Start Recording"}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <motion.div
                  animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </motion.div>
                <span>{isRecording ? 'Stop' : 'Record'}</span>
              </motion.button>

              {/* Language Selection */}
              {showLanguageSelection && (
                <motion.button
                  className="virtual-keyboard-action-btn language-btn"
                  onClick={() => setShowLanguageModal(true)}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Globe size={16} />
                  </motion.div>
                  <span>{languages.find((lang: any) => lang.id === currentLanguage)?.englishName}</span>
                </motion.button>
              )}

              {/* Reset Button */}
              <motion.button
                className="virtual-keyboard-action-btn reset-btn"
                onClick={handleReset}
                // whileHover={{ scale: 1.1, rotate: -360, y: -2 }}
                whileTap={{ scale: 0.9 }}
                title="Reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <RotateCcw size={20} />
                <span>Reset</span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Language Selection Modal */}
        <AnimatePresence>
          {showLanguageModal && (
            <motion.div
              className="language-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLanguageModal(false)}
            >
              <motion.div
                className="language-modal-content"
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="language-modal-header">
                  <span className="language-modal-icon">🌍</span>
                  <h3>Select Language</h3>
                </div>
                <motion.div 
                  className="language-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, staggerChildren: 0.05 }}
                >
                  {languages.map((lang: any, index: number) => (
                    <motion.button
                      key={lang.id}
                      className={`language-item ${currentLanguage === lang.id ? 'selected' : ''}`}
                      onClick={() => handleLanguageSelect(lang.id)}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="language-content">
                        <span className="language-name">{lang.name}</span>
                        <span className="language-english">{lang.englishName}</span>
                      </div>
                      {currentLanguage === lang.id && (
                        <motion.div
                          className="language-check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
                <motion.button
                  className="language-modal-close"
                  onClick={() => setShowLanguageModal(false)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default VirtualKeyboard;
