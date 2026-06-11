import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

// Redis store for rate limiting (distributed rate limiting)
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.resetExpiryOnChange = options.resetExpiryOnChange || false;
  }

  getClient() {
    const client = getRedisClient();
    if (!client) return null;

    // Fail open unless Redis is fully ready. This avoids request stalls when
    // Redis is disconnected or still trying to reconnect.
    if (client.status !== 'ready') return null;

    return client;
  }

  async increment(key) {
    const redisKey = this.prefix + key;
    try {
      const client = this.getClient();

      // If Redis is not available, allow request (return 1 to satisfy express-rate-limit)
      if (!client) {
        return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
      }

      const current = await client.incr(redisKey);
      
      if (current === 1) {
        await client.expire(redisKey, 60); // 1 minute default
      }
      
      const ttl = await client.ttl(redisKey);
      
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + ttl * 1000)
      };
    } catch (error) {
      logger.warn(`Rate limiter error: ${error.message}`);
      // Fallback to allowing request if Redis fails (return 1 to satisfy express-rate-limit)
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }
  }

  async decrement(key) {
    const redisKey = this.prefix + key;
    try {
      const client = this.getClient();
      if (!client) return;
      await client.decr(redisKey);
    } catch (error) {
      logger.warn(`Rate limiter decrement error: ${error.message}`);
    }
  }

  async resetKey(key) {
    const redisKey = this.prefix + key;
    try {
      const client = this.getClient();
      if (!client) return;
      await client.del(redisKey);
    } catch (error) {
      logger.warn(`Rate limiter reset error: ${error.message}`);
    }
  }
}

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:general:' }),
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

// Strict rate limiter for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:auth:' }),
  skipSuccessfulRequests: true // Don't count successful requests
});

// OTP rate limiter
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per 5 minutes
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:otp:' })
});

// Payment rate limiter
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payment requests per minute
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:payment:' })
});

// File upload rate limiter
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:upload:' })
});

// Assessment attempt rate limiter
export const assessmentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute (for submitting answers)
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:assessment:' })
});

// AI routes rate limiter
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.AI_RATE_LIMIT_MAX || 20),
  message: 'Too many AI requests, please try again shortly',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'rl:ai:' }),
});

export default {
  rateLimiter,
  authRateLimiter,
  otpRateLimiter,
  paymentRateLimiter,
  uploadRateLimiter,
  assessmentRateLimiter,
  aiRateLimiter
};
