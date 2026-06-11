import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface LanguageContextType {
  currentLanguage: string;
  setCurrentLanguage: (language: string) => void;
  languageMap: Record<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");

  const languageMap: Record<string, string> = {
    en: 'English',
    ar: 'Arabic (العربية)',
    as: 'Assamese (অসমীয়া)',
    bn: 'Bengali (বাংলা)',
    brx: 'Bodo (बोड़ो)',
    zh: 'Chinese (中文)',
    kok: 'Konkani (कोंकणी)',
    doi: 'Dogri (डोगरी)',
    hi: 'Hindi (हिन्दी)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
    gu: 'Gujarati (ગુજરાતી)',
    it: 'Italian (Italiano)',
    ja: 'Japanese (日本語)',
    kn: 'Kannada (ಕನ್ನಡ)',
    ks: 'Kashmiri (کٲشُر)',
    ko: 'Korean (한국인)',
    mai: 'Maithili (मैथिली)',
    ml: 'Malayalam (മലയാളം)',
    ms: 'Malay (Melayu)',
    mr: 'Marathi (मराठी)',
    mni: 'Manipuri (মৈতৈলোন্)',
    ne: 'Nepali (नेपाली)',
    or: 'Odia (ଓଡ଼ିଆ)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)',
    pt: 'Portuguese (Português)',
    ru: 'Russian (Русский)',
    sa: 'Sanskrit (संस्कृत)',
    sat: 'Santali (ᱥᱟᱱᱛᱨᱢ)',
    sd: 'Sindhi (سنڌي)',
    es: 'Spanish (Español)',
    ta: 'Tamil (தமிழ்)',
    te: 'Telugu (తెలుగు)',
    ur: 'Urdu (اردو)'
  };

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
  };

  const value: LanguageContextType = {
    currentLanguage,
    setCurrentLanguage: handleLanguageChange,
    languageMap
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}; 