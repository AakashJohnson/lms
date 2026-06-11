import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { logger } from './src/config/logger.js';
import connectDB from './src/config/database.js';
import { initRedis } from './src/config/redis.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB (don't wait)
connectDB().catch(() => {});

// Init Redis (don't wait)
try {
  initRedis();
} catch (err) {}

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
