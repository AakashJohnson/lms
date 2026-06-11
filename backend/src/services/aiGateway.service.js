import axios from 'axios';
import { logger } from '../config/logger.js';
import AiUsageLog from '../models/AiUsageLog.model.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_FALLBACK_URLS = (process.env.AI_SERVICE_FALLBACK_URLS || 'http://localhost:8010')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const AI_SERVICE_TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS || 30000);
const AI_SERVICE_RETRIES = Number(process.env.AI_SERVICE_RETRIES || 1);
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || process.env.AI_MODEL || 'meta/llama-3.1-70b-instruct';

const serviceUrls = [...new Set([AI_SERVICE_URL, ...AI_SERVICE_FALLBACK_URLS])];

const createClient = (baseURL, customTimeout) => axios.create({
  baseURL,
  timeout: customTimeout || AI_SERVICE_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const callAiService = async ({
  endpoint,
  payload,
  retries = AI_SERVICE_RETRIES,
  timeout,
  includeFallbackUrls = true,
}) => {
  let lastError;
  const attempts = Math.max(1, retries + 1);
  const urls = includeFallbackUrls ? serviceUrls : [serviceUrls[0]];
  const requestTimeout = timeout || AI_SERVICE_TIMEOUT_MS;

  console.log(`[AI-GATEWAY] Calling ${endpoint} on ${urls[0]} (${attempts} attempts, timeout ${requestTimeout}ms)`);

  for (const baseURL of urls) {
    const client = createClient(baseURL, requestTimeout);

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        console.log(`[AI-GATEWAY] Attempt ${attempt}/${attempts} on ${baseURL}${endpoint}`);
        const response = await client.post(endpoint, payload);
        console.log(`[AI-GATEWAY] Success: received response from ${baseURL}${endpoint}`);
        return response.data;
      } catch (error) {
        lastError = error;
        const errorMsg = error.code || error.message || String(error);
        console.warn(`[AI-GATEWAY] Attempt ${attempt} failed on ${baseURL}: ${errorMsg}`);
        
        // Check for specific error types
        if (error.code === 'ECONNREFUSED') {
          console.error(`[AI-GATEWAY] Connection refused at ${baseURL} - is AI service running?`);
        } else if (error.code === 'ENOTFOUND') {
          console.error(`[AI-GATEWAY] Host not found: ${baseURL}`);
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          console.error(`[AI-GATEWAY] Request timeout (${requestTimeout}ms) at ${baseURL}`);
        }
        
        const shouldRetry = attempt < attempts;
        if (!shouldRetry) break;
        console.log(`[AI-GATEWAY] Retrying in ${300 * attempt}ms...`);
        await sleep(300 * attempt);
      }
    }
  }

  console.error(`[AI-GATEWAY] All attempts failed. Last error: ${lastError?.message || lastError?.code}`);
  throw lastError;
};

export const logAiUsage = async ({
  userId,
  feature,
  status,
  latencyMs = 0,
  tokens = {},
  requestMeta = {},
  errorMessage = '',
  model = NVIDIA_MODEL,
}) => {
  try {
    await AiUsageLog.create({
      user: userId || undefined,
      feature,
      provider: 'nvidia',
      model,
      status,
      latencyMs,
      tokens: {
        prompt: tokens.prompt || 0,
        completion: tokens.completion || 0,
        total: tokens.total || 0,
      },
      requestMeta,
      errorMessage,
    });
  } catch (error) {
    logger.warn(`AI usage log failed: ${error.message}`);
  }
};

export const getAiServiceConfig = () => ({
  aiServiceUrl: AI_SERVICE_URL,
  aiServiceFallbackUrls: AI_SERVICE_FALLBACK_URLS,
  aiServiceTimeoutMs: AI_SERVICE_TIMEOUT_MS,
  aiServiceRetries: AI_SERVICE_RETRIES,
  nvidiaModel: NVIDIA_MODEL,
});
