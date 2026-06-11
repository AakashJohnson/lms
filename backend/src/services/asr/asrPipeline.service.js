import fs from 'fs';
import path from 'path';
import { detectLanguage } from './languageDetection.service.js';
import { buildProviderChain } from './asrProviderFactory.js';
import { chunkAudio } from './audioPreprocess.service.js';
import { evaluateTranscriptQuality } from './transcriptQuality.service.js';
import { logger } from '../../config/logger.js';

/**
 * Transcribes the given WAV file using the provider chain, quality gate, and fallbacks.
 */
export const transcribeWithPipeline = async ({
  wavPath,
  durationSeconds,
  languageHint = 'auto',
  jobId,
  workDir,
  asrMode = 'Balanced',
  onProgress = () => {}
}) => {
  // 1. Language Detection
  onProgress({ stage: 'detecting_language', progress: 35, message: 'Detecting language...' });
  const { language: detectedLanguage, confidence: langConfidence } = await detectLanguage({
    wavPath,
    languageHint,
    jobId,
    workDir
  });

  // 2. Build Provider Chain
  const providers = buildProviderChain({ languageHint, detectedLanguage, asrMode });
  if (providers.length === 0) {
    throw new Error('No ASR providers configured.');
  }

  // 3. Audio Chunking (if audio is long)
  const chunksDir = path.join(workDir, 'chunks');
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  const chunks = await chunkAudio(wavPath, chunksDir, durationSeconds);
  const isChunked = chunks.length > 0;

  let bestAttempt = null;
  const providersTried = [];

  // 4. Try Providers sequentially
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const isFallback = i > 0;
    const progressVal = isFallback ? 60 : 45;
    const stageName = isFallback ? 'transcribing_fallback_asr' : 'transcribing_primary_asr';
    const message = isFallback 
      ? `Primary provider weak. Trying fallback: ${provider.name}...`
      : `Transcribing with ${provider.name}...`;

    onProgress({ stage: stageName, progress: progressVal, message });
    logger.info(`[ASR-PIPELINE] Attempting transcription with ${provider.name}`, { isFallback, isChunked });

    try {
      let result = null;

      if (isChunked) {
        // Chunked transcription loop
        const chunkResults = [];
        let chunkFailed = false;

        for (const chunk of chunks) {
          const chunkNumber = chunk.index + 1;
          const chunkCount = chunks.length;
          const chunkStartProgress = 45 + Math.round((chunk.index / Math.max(1, chunkCount)) * 20);
          onProgress({
            stage: 'transcribing',
            progress: chunkStartProgress,
            message: `Transcribing audio chunk ${chunkNumber} of ${chunkCount} with ${provider.name}...`
          });
          logger.info(`[ASR-PIPELINE] Transcribing chunk ${chunk.index} with ${provider.name}`);
          
          let chunkResult = null;
          // Try current provider for chunk
          try {
            chunkResult = await provider.transcribe(chunk.path, {
              language: detectedLanguage,
              languageHint,
              chunking: true
            });
          } catch (chunkErr) {
            logger.warn(`[ASR-PIPELINE] Chunk ${chunk.index} failed on ${provider.name}. Trying fallbacks for this chunk.`, { error: chunkErr.message });
            
            // Try subsequent providers as fallback for this specific chunk
            for (let j = i + 1; j < providers.length; j++) {
              const fallbackProvider = providers[j];
              try {
                chunkResult = await fallbackProvider.transcribe(chunk.path, {
                  language: detectedLanguage,
                  languageHint,
                  chunking: true
                });
                logger.info(`[ASR-PIPELINE] Chunk ${chunk.index} recovered successfully using ${fallbackProvider.name}`);
                break;
              } catch (fallbackErr) {
                logger.warn(`[ASR-PIPELINE] Chunk ${chunk.index} fallback ${fallbackProvider.name} failed`, { error: fallbackErr.message });
              }
            }
          }

          if (!chunkResult) {
            chunkFailed = true;
            break;
          }
          chunkResults.push({ chunk, result: chunkResult });
          const chunkDoneProgress = 45 + Math.round((chunkNumber / Math.max(1, chunkCount)) * 20);
          onProgress({
            stage: 'transcribing',
            progress: chunkDoneProgress,
            message: `Completed audio chunk ${chunkNumber} of ${chunkCount}.`
          });
        }

        if (chunkFailed) {
          throw new Error(`One or more audio chunks could not be transcribed by ${provider.name} or fallbacks.`);
        }

        // Merge chunk transcripts and offset segments timestamps
        let mergedText = '';
        let mergedSegments = [];
        let resolvedLanguage = detectedLanguage;

        for (const item of chunkResults) {
          const text = item.result.text.trim();
          if (text) {
            mergedText += (mergedText ? ' ' : '') + text;
          }
          if (item.result.segments && item.result.segments.length > 0) {
            const offsetSegments = item.result.segments.map(seg => ({
              start: Number((seg.start + item.chunk.startTime).toFixed(2)),
              end: Number((seg.end + item.chunk.startTime).toFixed(2)),
              text: seg.text
            }));
            mergedSegments.push(...offsetSegments);
          }
          resolvedLanguage = item.result.language || resolvedLanguage;
        }

        result = {
          success: true,
          provider: provider.name,
          language: resolvedLanguage,
          text: mergedText,
          segments: mergedSegments,
          confidence: 0.9 // Combined confidence
        };

      } else {
        // Single file transcription
        result = await provider.transcribe(wavPath, {
          language: detectedLanguage,
          languageHint,
          chunking: false
        });
      }

      // Quality check the result
      onProgress({ stage: 'checking_transcript_quality', progress: 70, message: 'Validating transcript quality...' });
      const quality = evaluateTranscriptQuality(result.text, durationSeconds);
      
      const attempt = {
        provider: provider.name,
        result,
        quality,
        fallbackUsed: isFallback
      };
      
      providersTried.push(provider.name);

      if (!bestAttempt || quality.score > bestAttempt.quality.score) {
        bestAttempt = attempt;
      }

      if (quality.passed) {
        logger.info(`[ASR-PIPELINE] ASR accepted with score ${quality.score}/100 using ${provider.name}`);
        return {
          text: result.text,
          segments: result.segments,
          provider: provider.name,
          language: result.language || detectedLanguage,
          confidence: result.confidence || 0.9,
          qualityScore: quality.score,
          fallbackUsed: isFallback,
          providersTried,
          warnings: quality.warnings
        };
      } else {
        logger.warn(`[ASR-PIPELINE] ASR output failed quality check (score: ${quality.score}/100) on ${provider.name}. Trying fallback.`, { reasons: quality.reasons });
      }

    } catch (err) {
      logger.error(`[ASR-PIPELINE] Provider ${provider.name} failed during pipeline execution`, { error: err.message });
      providersTried.push(provider.name);
    }
  }

  // 5. Fallback selection if no provider passed the quality gate
  if (bestAttempt && bestAttempt.result.text.trim()) {
    logger.warn('[ASR-PIPELINE] No provider passed quality gate. Returning best available attempt.', {
      provider: bestAttempt.provider,
      score: bestAttempt.quality.score
    });
    return {
      text: bestAttempt.result.text,
      segments: bestAttempt.result.segments,
      provider: bestAttempt.provider,
      language: bestAttempt.result.language || detectedLanguage,
      confidence: bestAttempt.result.confidence || 0.7,
      qualityScore: bestAttempt.quality.score,
      fallbackUsed: true,
      providersTried,
      warnings: [...(bestAttempt.quality.warnings || []), 'Quality threshold not met. Best available ASR used.']
    };
  }

  throw new Error('Speech could not be recognized by any ASR provider.');
};
