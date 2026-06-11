import mongoose from 'mongoose';
import { logger } from './logger.js';
import dns from 'dns';

// Override default DNS resolution servers in Node.js to handle MongoDB Atlas SRV query issues (ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  logger.info('🌐 Overrode default DNS resolution servers with [8.8.8.8, 1.1.1.1] for reliable MongoDB Atlas SRV connection');
} catch (err) {
  logger.warn(`⚠️ Custom DNS server configuration failed: ${err.message}`);
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;

    logger.info(`🔌 Attempting MongoDB connection...`);
    logger.info(`📍 URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);

    // Determine if we're connecting to Atlas (needs TLS) or local (no TLS)
    const isAtlas = mongoUri.includes('mongodb+srv://') || mongoUri.includes('mongodb.net');
    
    // Set a timeout for the entire connection attempt
    const connectionOptions = {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 60000,
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      family: 4, // Use IPv4, skip IPv6
      retryWrites: true,
      w: 'majority'
    };

    // Only add TLS options for Atlas connections
    if (isAtlas) {
      connectionOptions.tls = true;
      connectionOptions.tlsAllowInvalidCertificates = false;
      connectionOptions.directConnection = false;
    }

    const connectionPromise = mongoose.connect(mongoUri, connectionOptions);

    // Race between connection and timeout (60 seconds)
    const conn = await Promise.race([
      connectionPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 60s')), 60000)
      )
    ]);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📦 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

  } catch (error) {
    logger.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    
    // Try local MongoDB as fallback
    if (process.env.MONGODB_URI_LOCAL && process.env.NODE_ENV === 'development') {
      try {
        logger.info('🔄 Attempting local MongoDB connection...');
        const conn = await mongoose.connect(process.env.MONGODB_URI_LOCAL, {
          serverSelectionTimeoutMS: 5000,
          family: 4,
          // Local MongoDB doesn't use TLS
          tls: false
        });
        logger.info(`✅ MongoDB Local Connected: ${conn.connection.host}`);
        logger.info(`📦 Database: ${conn.connection.name}`);
        logger.warn('⚠️  Using local MongoDB. Atlas connection failed.');
        return conn;
      } catch (localError) {
        logger.error(`❌ Local MongoDB also failed: ${localError.message}`);
      }
    }
    
    logger.warn('⚠️  Running without database. Some features will not work.');
    logger.warn('💡 Solution: Setup MongoDB Atlas (5 min) - See FIX_LOGIN_NOW.md');
    logger.warn('📝 Or use local MongoDB: mongodb://localhost:27017/ceas-lms');
    // Don't exit process - let server run without database
    return null;
  }
};

export default connectDB;
