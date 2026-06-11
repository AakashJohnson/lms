import RivaAsrProvider from './rivaAsr.provider.js';
import FastApiAsrProvider from './fastApiAsr.provider.js';
import { logger } from '../../config/logger.js';

// Cache instances
const providers = {
  riva: new RivaAsrProvider(),
  indic_conformer: new FastApiAsrProvider('indic_conformer'),
  whisper_large_v3: new FastApiAsrProvider('whisper_large_v3'),
  whisper_turbo: new FastApiAsrProvider('whisper_turbo'),
};

const INDIAN_LANGUAGES = new Set([
  'hi', 'hinglish', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'od', 'as', 'other_indian'
]);

const isTurboEnabled = () => String(process.env.ASR_ENABLE_TURBO || 'true').toLowerCase() !== 'false';

const normalizeChainNames = (chainNames = []) => {
  const normalized = [];
  for (const rawName of chainNames) {
    const name = String(rawName || '').trim();
    if (!name) continue;
    if (name === 'whisper_turbo' && !isTurboEnabled()) {
      logger.warn('[ASR-FACTORY] Skipping whisper_turbo because ASR_ENABLE_TURBO=false; using whisper_large_v3 instead');
      if (!normalized.includes('whisper_large_v3')) normalized.push('whisper_large_v3');
      continue;
    }
    if (!providers[name]) {
      logger.warn('[ASR-FACTORY] Ignoring unknown ASR provider from chain', { name });
      continue;
    }
    if (!normalized.includes(name)) normalized.push(name);
  }
  return normalized;
};

/**
 * Returns a provider instance by name.
 */
export const getProvider = (name) => {
  return providers[name];
};

/**
 * Builds the provider fallback chain based on language options and mode.
 * @returns {Array<Object>} List of ASR providers in prioritized order.
 */
export const buildProviderChain = ({ languageHint = 'auto', detectedLanguage = 'auto', asrMode = 'Balanced' }) => {
  logger.info('[ASR-FACTORY] Building provider chain', { languageHint, detectedLanguage, asrMode });

  // If user requested fast/speed mode, prioritize whisper_turbo
  if (asrMode === 'Fast' || asrMode === 'Speed') {
    const fastChain = normalizeChainNames(['whisper_turbo', 'whisper_large_v3', 'riva']);
    return fastChain.map(name => providers[name]).filter(Boolean);
  }

  // If user requested maximum accuracy, prioritize whisper_large_v3
  if (asrMode === 'Accuracy') {
    return [
      providers.whisper_large_v3,
      providers.indic_conformer,
      providers.riva,
      providers.whisper_turbo
    ];
  }

  // Determine if it is an Indian language
  const isIndianLanguage = INDIAN_LANGUAGES.has(languageHint) || INDIAN_LANGUAGES.has(detectedLanguage);

  let chainNames = [];

  if (languageHint === 'en' || (!isIndianLanguage && detectedLanguage === 'en')) {
    // English chain
    chainNames = ['riva', 'whisper_turbo', 'whisper_large_v3'];
  } else if (isIndianLanguage) {
    // Indian language chain
    chainNames = ['indic_conformer', 'whisper_turbo', 'whisper_large_v3', 'riva'];
  } else {
    // Unknown or mixed
    chainNames = ['whisper_turbo', 'indic_conformer', 'whisper_large_v3', 'riva'];
  }

  // Allow custom override via env only when explicitly forced. A stale
  // ASR_PROVIDER_CHAIN=whisper_large_v3 made Balanced mode unusably slow on CPU.
  if (String(process.env.ASR_FORCE_PROVIDER_CHAIN || 'false').toLowerCase() === 'true' && process.env.ASR_PROVIDER_CHAIN) {
    const customChain = process.env.ASR_PROVIDER_CHAIN.split(',').map(s => s.trim());
    if (customChain.length > 0) {
      chainNames = customChain;
    }
  }

  chainNames = normalizeChainNames(chainNames);

  logger.info('[ASR-FACTORY] Resolved provider chain', { chainNames });

  return chainNames.map(name => providers[name]).filter(Boolean);
};
