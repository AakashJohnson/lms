import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { callAiService } from '../aiGateway.service.js';
import { logger } from '../../config/logger.js';

const runProcess = (command, args) => new Promise((resolve) => {
  const child = spawn(command, args, { windowsHide: true });
  child.on('close', resolve);
  child.on('error', () => resolve(1));
});

/**
 * Detects the language of the audio file.
 * If languageHint is provided and not 'auto', uses it.
 * Otherwise, extracts a short snippet and requests language detection from ai-service.
 */
export const detectLanguage = async ({ wavPath, languageHint, jobId, workDir }) => {
  if (languageHint && languageHint !== 'auto') {
    logger.info('[ASR-LANG-DETECT] Using teacher selected language hint', { languageHint });
    return { language: languageHint, confidence: 1.0 };
  }

  const forceDetection = String(process.env.ASR_FORCE_LANGUAGE_DETECTION || 'false').toLowerCase() === 'true';
  if (!forceDetection) {
    logger.info('[ASR-LANG-DETECT] Skipping separate language detection; ASR provider will auto-detect language');
    return { language: 'auto', confidence: 0.5, skipped: true };
  }

  logger.info('[ASR-LANG-DETECT] No hint, starting automatic language detection from audio...');
  
  if (!ffmpegPath || !fs.existsSync(ffmpegPath) || !fs.existsSync(wavPath)) {
    return { language: 'en', confidence: 0.5, warning: 'Snippet creation failed, defaulted to English' };
  }

  const snippetPath = path.join(workDir, 'snippet.wav');
  try {
    // A long large-v3 detection pass was adding several minutes before transcription
    // started. Keep language detection intentionally small; the full ASR pass still
    // validates the transcript with the selected provider chain.
    const snippetSeconds = Number(process.env.ASR_LANGUAGE_DETECT_SECONDS || 10);
    await runProcess(ffmpegPath, [
      '-y',
      '-ss', '0',
      '-t', String(Math.max(5, Math.min(snippetSeconds, 20))),
      '-i', wavPath,
      '-acodec', 'copy',
      snippetPath
    ]);

    if (!fs.existsSync(snippetPath)) {
      return { language: 'en', confidence: 0.5 };
    }

    logger.info('[ASR-LANG-DETECT] Sending audio snippet for language detection');
    // Call the Python FastAPI ASR transcribe endpoint with language=auto on the snippet.
    // Turbo is sufficient for detection and avoids blocking the UI for minutes.
    const response = await callAiService({
      endpoint: '/v1/asr/transcribe',
      payload: {
        audioPath: snippetPath,
        provider: process.env.ASR_LANGUAGE_DETECT_PROVIDER || 'whisper_turbo',
        language: 'auto',
        languageHint: 'auto',
        chunking: false,
        returnSegments: false
      },
      retries: 0,
      timeout: Number(process.env.ASR_LANGUAGE_DETECT_TIMEOUT_MS || 60000)
    });

    if (response && response.success && response.language) {
      logger.info('[ASR-LANG-DETECT] Auto-detected language from audio', {
        language: response.language,
        confidence: response.confidence
      });
      return {
        language: response.language,
        confidence: response.confidence || 0.8
      };
    }
  } catch (err) {
    logger.warn('[ASR-LANG-DETECT] Auto-detection failed, fallback to English', { error: err.message });
  } finally {
    if (fs.existsSync(snippetPath)) {
      try {
        fs.unlinkSync(snippetPath);
      } catch {}
    }
  }

  return { language: 'en', confidence: 0.5 };
};
