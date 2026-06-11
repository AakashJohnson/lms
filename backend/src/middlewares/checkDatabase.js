import mongoose from 'mongoose';
import { logger } from '../config/logger.js';

/**
 * Middleware to check if database is connected
 * Returns user-friendly error if database is not available
 */
export const checkDatabase = (req, res, next) => {
  const dbState = mongoose.connection.readyState;
  
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (dbState !== 1) {
    logger.warn(`Database not connected. State: ${dbState}. Request: ${req.method} ${req.originalUrl}`);
    
    return res.status(503).json({
      success: false,
      error: 'Database not connected',
      message: 'The database is currently unavailable. Please ensure MongoDB is installed and running.',
      solution: {
        step1: 'Install MongoDB from: https://www.mongodb.com/try/download/community',
        step2: 'Or check if MongoDB service is running: Get-Service MongoDB',
        step3: 'Or read: INSTALL_MONGODB_MANUAL_STEPS.md',
        currentState: dbState === 0 ? 'Disconnected' : dbState === 2 ? 'Connecting' : 'Disconnecting'
      }
    });
  }
  
  next();
};

export default checkDatabase;
