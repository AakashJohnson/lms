import dotenv from 'dotenv';
import { logger } from './src/config/logger.js';
import connectDB from './src/config/database.js';

dotenv.config();

console.log('Testing database connection...');

connectDB()
  .then(() => {
    logger.info('Database test completed');
    setTimeout(() => process.exit(0), 1000);
  })
  .catch((err) => {
    logger.error('Database test failed:', err);
    setTimeout(() => process.exit(0), 1000);
  });

// Force exit after 5 seconds
setTimeout(() => {
  console.log('Timeout - exiting');
  process.exit(0);
}, 5000);
