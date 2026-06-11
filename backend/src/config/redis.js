import Redis from 'ioredis';
import { logger } from './logger.js';

let redisClient = null;

export const initRedis = () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('⚠️  Redis connection failed after 3 attempts. Running without cache.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true // Don't connect immediately
    });

    // Try to connect
    redisClient.connect().catch(err => {
      logger.warn('⚠️  Redis connection failed. Caching disabled.');
      logger.warn('💡 Tip: Redis is optional for development');
      redisClient = null;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.warn(`⚠️  Redis error: ${err.message}`);
    });

    redisClient.on('ready', () => {
      logger.info('🚀 Redis is ready to accept commands');
    });

  } catch (error) {
    logger.warn(`⚠️  Redis initialization failed: ${error.message}`);
    logger.warn('💡 Running without cache. This is OK for development.');
    redisClient = null;
  }
};

export const getRedisClient = () => {
  // Silently return null if Redis not available
  return redisClient;
};

export const isRedisReady = () => Boolean(redisClient && redisClient.status === 'ready');

// Cache helper functions
export const cacheGet = async (key) => {
  try {
    if (!isRedisReady()) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn(`Cache get error: ${error.message}`);
    return null;
  }
};

export const cacheSet = async (key, value, ttl = 3600) => {
  try {
    if (!isRedisReady()) return false;
    await redisClient.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn(`Cache set error: ${error.message}`);
    return false;
  }
};

export const cacheDel = async (key) => {
  try {
    if (!isRedisReady()) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.warn(`Cache delete error: ${error.message}`);
    return false;
  }
};

export const cacheFlush = async () => {
  try {
    if (!isRedisReady()) return false;
    await redisClient.flushall();
    logger.info('Redis cache flushed');
    return true;
  } catch (error) {
    logger.warn(`Cache flush error: ${error.message}`);
    return false;
  }
};

export default redisClient;
