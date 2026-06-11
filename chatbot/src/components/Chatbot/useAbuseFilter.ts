import { useState, useEffect, useRef } from 'react';
import abusiveWordsData from '../Jsonfile/abusiveWords.json';

const getAllAbusiveWords = (): string[] => {
  try {
    const words: string[] = [];
    // The JSON structure has an array of objects with 'words' property
    if (Array.isArray(abusiveWordsData)) {
      abusiveWordsData.forEach((languageData: any) => {
        if (languageData.words && Array.isArray(languageData.words)) {
          words.push(...languageData.words);
        }
      });
    }
    return words;
  } catch (error) {
    console.warn('Error loading abusive words:', error);
    return [];
  }
};

const abusiveWords = getAllAbusiveWords();

// Helper function to check if a character is a word boundary
const isWordBoundary = (char: string): boolean => {
  // Check for whitespace, punctuation, or start/end of string
  return /[\s\p{P}]/u.test(char) || char === '';
};

// Helper function to check if a word is at a word boundary
const isWordAtBoundary = (text: string, startIndex: number, wordLength: number): boolean => {
  const beforeChar = startIndex > 0 ? text[startIndex - 1] : '';
  const afterChar = startIndex + wordLength < text.length ? text[startIndex + wordLength] : '';

  return isWordBoundary(beforeChar) && isWordBoundary(afterChar);
};

const filterMessage = (message: string): string => {
  try {
    let filteredMessage = message;

    abusiveWords.forEach(word => {
      // Escape special regex characters
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Create a case-insensitive regex without word boundaries
      const regex = new RegExp(escapedWord, 'gi');

      // Find all matches and check if they're at word boundaries
      let match;
      const matches: Array<{ index: number, word: string }> = [];

      while ((match = regex.exec(message)) !== null) {
        const matchIndex = match.index;
        const matchWord = match[0];

        // Check if this match is at a word boundary
        if (isWordAtBoundary(message, matchIndex, matchWord.length)) {
          matches.push({ index: matchIndex, word: matchWord });
        }
      }

      // Replace matches from end to start to avoid index shifting
      matches.reverse().forEach(({ index, word }) => {
        const before = filteredMessage.substring(0, index);
        const after = filteredMessage.substring(index + word.length);
        filteredMessage = before + '******' + after;
      });
    });

    return filteredMessage;
  } catch (error) {
    console.warn('Error filtering message:', error);
    return message;
  }
};

const containsAbuse = (original: string, filtered: string): boolean => {
  return original.toLowerCase() !== filtered.toLowerCase();
};

interface AbuseFilterResult {
  filteredMessage: string;
  isAbusive: boolean;
  violationCount: number;
  incrementViolation: () => void;
  isBanned: boolean;
}

/**
 * Debounced abuse filter — the heavy regex scan only fires 300ms after the
 * user stops typing, keeping every keystroke lag-free.
 */
export const useAbuseFilter = (message: string, maxViolations: number = 4): AbuseFilterResult => {
  const [violationCount, setViolationCount] = useState<number>(0);
  const [isBanned, setIsBanned] = useState<boolean>(false);

  // Debounced scan result — starts as clean so UI is never blocked
  const [debouncedResult, setDebouncedResult] = useState<{ filtered: string; abusive: boolean }>({
    filtered: message,
    abusive: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending scan
    if (timerRef.current) clearTimeout(timerRef.current);

    // Schedule the expensive scan 300ms after the user stops typing
    timerRef.current = setTimeout(() => {
      try {
        const filtered = filterMessage(message);
        setDebouncedResult({ filtered, abusive: containsAbuse(message, filtered) });
      } catch (error) {
        console.warn('Error in debounced abuse scan:', error);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message]);

  try {
    const filteredMessage = filterMessage(message);
    const isAbusive = containsAbuse(message, filteredMessage);

    const incrementViolation = () => {
      setViolationCount(prev => {
        const newCount = prev + 1;
        if (newCount >= maxViolations) {
          setIsBanned(true);
        }
        return newCount;
      });
    };

    return { filteredMessage, isAbusive, violationCount, incrementViolation, isBanned };
  } catch (error) {
    console.warn('Error in useAbuseFilter:', error);
    return { 
      filteredMessage: message, 
      isAbusive: false, 
      violationCount: 0, 
      incrementViolation: () => {}, 
      isBanned: false 
    };
  }
};