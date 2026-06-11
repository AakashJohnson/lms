import { callAiService } from '../aiGateway.service.js';
import { logger } from '../../config/logger.js';

export class FastApiAsrProvider {
  /**
   * @param {string} providerName - ASR provider name (indic_conformer, whisper_large_v3, whisper_turbo)
   */
  constructor(providerName) {
    this.name = providerName;
  }

  async transcribe(wavPath, options = {}) {
    logger.info(`[FASTAPI-ASR-PROVIDER] Requesting transcription via ${this.name}`, { wavPath, options });

    const payload = {
      audioPath: wavPath,
      provider: this.name,
      language: options.language || 'auto',
      languageHint: options.languageHint || 'auto',
      chunking: options.chunking || false,
      returnSegments: true
    };

    try {
      const response = await callAiService({
        endpoint: '/v1/asr/transcribe',
        payload,
        retries: 0, // Do not auto-retry at gateway level since pipeline manages fallbacks
        timeout: 600000 // 10 minutes timeout for model download and processing
      });

      if (!response || !response.success || !response.text) {
        throw new Error(response?.error || `FastAPI ASR provider ${this.name} failed or returned empty`);
      }

      return {
        success: true,
        provider: this.name,
        language: response.language || payload.language,
        text: response.text,
        segments: response.segments || [],
        confidence: response.confidence || null,
        duration: response.duration || 0
      };
    } catch (err) {
      logger.error(`[FASTAPI-ASR-PROVIDER] Provider ${this.name} failed`, { error: err.message });
      throw err;
    }
  }
}

export default FastApiAsrProvider;
