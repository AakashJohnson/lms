import dotenv from 'dotenv';
dotenv.config();

console.log('✅ dotenv loaded');

import { logger } from './src/config/logger.js';
console.log('✅ logger loaded');

import connectDB from './src/config/database.js';
console.log('✅ database loaded');

import { initRedis } from './src/config/redis.js';
console.log('✅ redis loaded');

import authRoutes from './src/routes/auth.routes.js';
console.log('✅ auth routes loaded');

console.log('\n🎉 All imports successful!');
process.exit(0);
