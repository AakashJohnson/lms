import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables FIRST
dotenv.config();

// Import configurations
import connectDB from './src/config/database.js';
import { initRedis } from './src/config/redis.js';
import { logger, morganStream } from './src/config/logger.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import { rateLimiter } from './src/middlewares/rateLimiter.js';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_PANEL_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize());

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Rate Limiting
app.use('/api/', rateLimiter);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CEAS-LMS Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Start server FIRST, then connect to databases
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 CEAS-LMS Backend Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/health`);
  
  // Connect to MongoDB (async, don't block)
  connectDB().catch(err => {
    logger.warn('⚠️  MongoDB connection failed. Login and database features disabled.');
  });
  
  // Initialize Redis (async, don't block)
  try {
    initRedis();
  } catch (err) {
    logger.warn('⚠️  Redis initialization failed. Caching disabled.');
  }
  
  // Import and setup routes AFTER server is listening
  try {
    const authRoutes = (await import('./src/routes/auth.routes.js')).default;
    const userRoutes = (await import('./src/routes/user.routes.js')).default;
    const courseRoutes = (await import('./src/routes/course.routes.js')).default;
    const assessmentRoutes = (await import('./src/routes/assessment.routes.js')).default;
    const paymentRoutes = (await import('./src/routes/payment.routes.js')).default;
    const certificateRoutes = (await import('./src/routes/certificate.routes.js')).default;
    const dashboardRoutes = (await import('./src/routes/dashboard.routes.js')).default;
    const qmsRoutes = (await import('./src/routes/qms.routes.js')).default;
    const mediaRoutes = (await import('./src/routes/media.routes.js')).default;
    const liveSessionRoutes = (await import('./src/routes/liveSession.routes.js')).default;
    const reportRoutes = (await import('./src/routes/report.routes.js')).default;
    const notificationRoutes = (await import('./src/routes/notification.routes.js')).default;
    
    // API Routes
    const API_PREFIX = `/api/${process.env.API_VERSION}`;
    
    app.use(`${API_PREFIX}/auth`, authRoutes);
    app.use(`${API_PREFIX}/users`, userRoutes);
    app.use(`${API_PREFIX}/courses`, courseRoutes);
    app.use(`${API_PREFIX}/assessments`, assessmentRoutes);
    app.use(`${API_PREFIX}/payments`, paymentRoutes);
    app.use(`${API_PREFIX}/certificates`, certificateRoutes);
    app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
    app.use(`${API_PREFIX}/qms`, qmsRoutes);
    app.use(`${API_PREFIX}/media`, mediaRoutes);
    app.use(`${API_PREFIX}/live-sessions`, liveSessionRoutes);
    app.use(`${API_PREFIX}/reports`, reportRoutes);
    app.use(`${API_PREFIX}/notifications`, notificationRoutes);
    
    logger.info(`✅ All routes loaded successfully`);
    logger.info(`📖 API Base: http://localhost:${PORT}${API_PREFIX}`);
    
  } catch (error) {
    logger.error(`❌ Error loading routes: ${error.message}`);
    logger.error(error.stack);
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use(errorHandler);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    logger.info(`Socket ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    httpServer.close(() => process.exit(1));
  }
});

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export default app;
