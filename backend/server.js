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

// Import routes at top level
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import courseRoutes from './src/routes/course.routes.js';
import assessmentRoutes from './src/routes/assessment.routes.js';
import examSessionRoutes from './src/routes/examSession.routes.js';
import proctoringRoutes from './src/routes/proctoring.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import certificateRoutes from './src/routes/certificate.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import qmsRoutes from './src/routes/qms.routes.js';
import mediaRoutes from './src/routes/media.routes.js';
import fileRoutes from './src/routes/file.routes.js';
import liveSessionRoutes from './src/routes/liveSession.routes.js';
import reportRoutes from './src/routes/report.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import adminCourseReviewRoutes from './src/routes/adminCourseReview.routes.js';
import courseQueryRoutes from './src/routes/courseQuery.routes.js';
import departmentRoutes from './src/routes/department.routes.js';
import batchRoutes from './src/routes/batch.routes.js';
import lessonNoteRoutes from './src/routes/lessonNote.routes.js';
import bulkImportRoutes from './src/routes/bulkImport.routes.js';
import analyticsRoutes from './src/routes/analytics.routes.js';
import trainerRoutes from './src/routes/trainer.routes.js';
import trainerContentPlanningRoutes from './src/routes/trainerContentPlanning.routes.js';
import courseRatingRoutes from './src/routes/courseRating.routes.js';
import reviewTemplateRoutes from './src/routes/reviewTemplate.routes.js';
import topicQuestionRoutes from './src/routes/topicQuestion.routes.js';
import streakRoutes from './src/routes/streak.routes.js';
import flashcardRoutes from './src/routes/flashcard.routes.js';
import smartSearchRoutes from './src/routes/smartSearch.routes.js';
import forumRoutes from './src/routes/forum.routes.js';
import byteSizeRoutes from './src/routes/byteSize.routes.js';
import aiOpsRoutes from './src/routes/aiOps.routes.js';
import aiLessonQuestionRoutes from './src/routes/aiLessonQuestion.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import assignmentRoutes from './src/routes/assignment.routes.js';
import activityRoutes from './src/routes/activity.routes.js';


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
      mediaSrc: ["'self'", "blob:", "data:", "http://localhost:5000"],
      connectSrc: ["'self'", "http://localhost:5000"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS Configuration
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_PANEL_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-token']
}));

// Body Parser & Cookie Parser
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));
app.use(cookieParser());

// Serve uploaded files statically with CORS headers
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add CORS headers for static files
app.use('/uploads', (req, res, next) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

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

// Register API Routes
const API_PREFIX = `/api/${process.env.API_VERSION}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/courses`, courseRoutes);
app.use(`${API_PREFIX}/student`, studentRoutes);
app.use(`${API_PREFIX}/assignments`, assignmentRoutes);
app.use(`${API_PREFIX}/activity`, activityRoutes);

app.use(`${API_PREFIX}/assessments`, assessmentRoutes);
app.use(`${API_PREFIX}/exam-sessions`, examSessionRoutes);
app.use(`${API_PREFIX}/proctoring`, proctoringRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/certificates`, certificateRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/qms`, qmsRoutes);
app.use(`${API_PREFIX}/media`, mediaRoutes);
app.use(`${API_PREFIX}/files`, fileRoutes);
app.use(`${API_PREFIX}/live-sessions`, liveSessionRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin/courses`, adminCourseReviewRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/course-queries`, courseQueryRoutes);
app.use(`${API_PREFIX}/departments`, departmentRoutes);
app.use(`${API_PREFIX}/batches`, batchRoutes);
app.use(`${API_PREFIX}/lesson-notes`, lessonNoteRoutes);
app.use(`${API_PREFIX}/bulk-import`, bulkImportRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/trainer`, trainerContentPlanningRoutes);
app.use(`${API_PREFIX}/trainer`, trainerRoutes);
app.use(`${API_PREFIX}/ratings`, courseRatingRoutes);
app.use(`${API_PREFIX}/review-templates`, reviewTemplateRoutes);
app.use(`${API_PREFIX}/topic-questions`, topicQuestionRoutes);
app.use(`${API_PREFIX}/streak`, streakRoutes);
app.use(`${API_PREFIX}/flashcards`, flashcardRoutes);
app.use(`${API_PREFIX}/smart-search`, smartSearchRoutes);
app.use(`${API_PREFIX}/forum`, forumRoutes);
app.use(`${API_PREFIX}/byte-size`, byteSizeRoutes);
app.use(`${API_PREFIX}/ai-ops`, aiOpsRoutes);
app.use(`${API_PREFIX}/lesson-ai`, aiLessonQuestionRoutes);
app.use(`${API_PREFIX}/lesson-ai-questions`, aiLessonQuestionRoutes);

logger.info(`✅ Routes registered with prefix: ${API_PREFIX}`);

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, async () => {
  logger.info(`🚀 CEAS-LMS Backend Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/health`);
  logger.info(`📖 API Base: http://localhost:${PORT}${API_PREFIX}`);
  
  // Connect to MongoDB (async, don't block)
  connectDB().catch(err => {
    logger.warn('⚠️  MongoDB connection failed. Login and database features disabled.');
    logger.warn('💡 Solution: See FIX_LOGIN_NOW.md for MongoDB Atlas setup');
  });
  
  // Initialize Redis (async, don't block)
  try {
    initRedis();
  } catch (err) {
    logger.warn('⚠️  Redis initialization failed. Caching disabled.');
  }
  
  logger.info(`\n${'='.repeat(60)}`);
  logger.info(`🎯 Server ready! Login credentials:`);
  logger.info(`   Admin:   admin@ncui.in / Admin@123`);
  logger.info(`   Trainer: trainer@ncui.in / Trainer@123`);
  logger.info(`   Student: student@ncui.in / Student@123`);
  logger.info(`${'='.repeat(60)}\n`);
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
import { setupSocketIO } from './src/config/socket.js';
setupSocketIO(io);

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
