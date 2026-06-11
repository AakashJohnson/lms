import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Volume2, Search } from 'lucide-react';
// import { useLanguage } from '../services/languageContext';

interface LanguageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
  onLanguageChange: (languageCode: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  onLanguageChange,
}) => {
  // const { currentLanguage: contextLanguage } = useLanguage();

  const languages = [
    { code: 'ar', english: 'Arabic', native: 'العربية' },
    { code: 'as', english: 'Assamese', native: 'অসমীয়া' },
    { code: 'bn', english: 'Bengali', native: 'বাংলা' },
    { code: 'brx', english: 'Bodo', native: 'बोड़ो' },
    { code: 'zh', english: 'Chinese', native: '中文' },
    { code: 'kok', english: 'Konkani', native: 'कोंकणी' },
    { code: 'doi', english: 'Dogri', native: 'डोगरी' },
    { code: 'en', english: 'English', native: 'English' },
    { code: 'fr', english: 'French', native: 'Français' },
    { code: 'de', english: 'German', native: 'Deutsch' },
    { code: 'gu', english: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
    { code: 'it', english: 'Italian', native: 'Italiano' },
    { code: 'ja', english: 'Japanese', native: '日本語' },
    { code: 'kn', english: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ks', english: 'Kashmiri', native: 'کٲشُر' },
    { code: 'ko', english: 'Korean', native: '한국인' },
    { code: 'mai', english: 'Maithili', native: 'मैथिली' },
    { code: 'ml', english: 'Malayalam', native: 'മലയാളം' },
    { code: 'mr', english: 'Marathi', native: 'मराठी' },
    { code: 'mni', english: 'Manipuri', native: 'মৈতৈলোন্' },
    { code: 'ne', english: 'Nepali', native: 'नेपाली' },
    { code: 'or', english: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'pa', english: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'pt', english: 'Portuguese', native: 'Português' },
    { code: 'ru', english: 'Russian', native: 'Русский' },
    { code: 'sa', english: 'Sanskrit', native: 'संस्कृत' },
    { code: 'sat', english: 'Santali', native: 'ᱥᱟᱱᱛᱨᱢ' },
    { code: 'sd', english: 'Sindhi', native: 'سنڌي' },
    { code: 'es', english: 'Spanish', native: 'Español' },
    { code: 'ta', english: 'Tamil', native: 'தமிழ்' },
    { code: 'te', english: 'Telugu', native: 'తెలుగు' },
    { code: 'ur', english: 'Urdu', native: 'اردو' },
  ];

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
  };

  const handleSpeak = (e: React.MouseEvent, text: string, langCode: string) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              zIndex: 999,
            }}
          />

          {/* Dropdown Menu */}
          <motion.div
            className="language-dropdown-content"
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              marginLeft: '-125px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '12px',
              width: '250px',
              maxHeight: '400px',
              overflow: 'hidden',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e5e7eb',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={18} color="#6366f1" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  Select Language
                </h2>
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '0 4px 12px 4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Search size={16} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Search language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    marginLeft: '8px',
                    width: '100%',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                />
              </div>
            </div>

            {/* Language List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto',
                flex: 1,
                paddingRight: '4px',
              }}
            >
              {filteredLanguages.map((language) => (
                <motion.button
                  key={language.code}
                  onClick={() => {
                    handleLanguageSelect(language.code);
                    onClose();
                  }}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    border: currentLanguage === language.code ? '1px solid #6366f1' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: currentLanguage === language.code ? '#eef2ff' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div
                      style={{
                        fontWeight: '500',
                        color: currentLanguage === language.code ? '#6366f1' : '#1f2937',
                        fontSize: '15px',
                      }}
                    >
                      {language.native}
                    </div>
                    <div
                      style={{
                        fontWeight: '400',
                        color: currentLanguage === language.code ? '#6b7280' : '#6b7280',
                        fontSize: '13px',
                      }}
                    >
                      {language.english}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.div
                      onClick={(e) => handleSpeak(e, language.native, language.code)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6366f1',
                      }}
                    >
                      <Volume2 size={18} />
                    </motion.div>
                    {currentLanguage === language.code && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{
                          color: '#6366f1',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LanguageSelector;
