import { logger } from '../../config/logger.js';

const WHISPER_HALLUCINATIONS = [
  'thank you for watching',
  'subscribe to my channel',
  'thanks for watching',
  'please subscribe',
  'www.youtube.com',
  'translated by',
  'subtitles by',
  'ytdl',
  'multi-lingual subtitles'
];

/**
 * Evaluates the quality of a transcript and returns a score out of 100.
 * @param {string} text - Raw transcript text
 * @param {number} durationSeconds - Audio duration in seconds
 * @returns {Object} { passed: boolean, score: number, reasons: string[], warnings: string[] }
 */
export const evaluateTranscriptQuality = (text = '', durationSeconds = 0) => {
  const minChars = Number(process.env.ASR_MIN_TRANSCRIPT_CHARS || 80);
  const minWpm = Number(process.env.ASR_MIN_WORDS_PER_MINUTE || 20);
  const maxRepeatRatio = Number(process.env.ASR_MAX_REPEAT_RATIO || 0.35);
  const minQualityScore = Number(process.env.ASR_MIN_QUALITY_SCORE || 60);

  const cleanText = String(text || '').trim();
  const charCount = cleanText.length;
  
  const reasons = [];
  const warnings = [];
  let score = 100;

  if (charCount === 0) {
    return {
      passed: false,
      score: 0,
      reasons: ['Transcript is completely empty'],
      warnings: []
    };
  }

  // 1. Check if it's only punctuation
  if (/^[\s\p{P}]+$/u.test(cleanText)) {
    score -= 90;
    reasons.push('Transcript contains only punctuation/whitespace');
  }

  // 2. Minimum character check
  if (charCount < minChars) {
    score -= 30;
    reasons.push(`Transcript length (${charCount} chars) is below minimum of ${minChars}`);
  }

  // Word count & WPM checks
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const durationMinutes = durationSeconds / 60;

  if (durationMinutes > 0) {
    const wpm = wordCount / durationMinutes;
    if (wpm < minWpm) {
      score -= 35;
      reasons.push(`Words per minute (${wpm.toFixed(1)}) is too low (min ${minWpm})`);
    } else if (wpm > 350) {
      score -= 40;
      reasons.push(`Words per minute (${wpm.toFixed(1)}) is unrealistically high (max 350)`);
    }
  }

  // 3. Word Repetition check (Repetition Ratio)
  if (wordCount > 10) {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repeatRatio = 1 - (uniqueWords.size / wordCount);
    if (repeatRatio > maxRepeatRatio) {
      const deduction = Math.min(45, Math.round((repeatRatio - maxRepeatRatio) * 100));
      score -= deduction;
      reasons.push(`High repetition ratio detected: ${(repeatRatio * 100).toFixed(0)}% (threshold ${maxRepeatRatio * 100}%)`);
    }
  }

  // 4. Hallucination phrases checks
  const lowerText = cleanText.toLowerCase();
  let hallucinationCount = 0;
  for (const phrase of WHISPER_HALLUCINATIONS) {
    if (lowerText.includes(phrase)) {
      hallucinationCount++;
    }
  }
  if (hallucinationCount > 0) {
    score -= Math.min(40, hallucinationCount * 15);
    warnings.push(`Whisper hallucination phrase(s) detected: ${hallucinationCount}`);
  }

  // Final status
  const passed = score >= minQualityScore;

  logger.info('[ASR-QUALITY] Evaluation finished', {
    passed,
    score,
    wordCount,
    durationSeconds,
    charCount,
    reasons,
    warnings
  });

  return {
    passed,
    score: Math.max(0, score),
    reasons,
    warnings
  };
};
