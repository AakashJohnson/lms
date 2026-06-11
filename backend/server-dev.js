import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
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

// Data Sanitization
app.use(mongoSanitize());

// Compression
app.use(compression());

// Logging
app.use(morgan('dev'));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎉 CEAS-LMS Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    status: {
      server: '✅ Running',
      mongodb: '⚠️  Not connected - Setup MongoDB Atlas',
      redis: '⚠️  Not connected - Optional for dev'
    },
    instructions: {
      mongodb: 'See MONGODB_SETUP_GUIDE.md',
      login: 'See COMPLETE_LOGIN_SETUP.md'
    }
  });
});

// Test API Route
app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    data: {
      version: '1.0.0',
      features: [
        '✅ Server running',
        '⚠️  MongoDB needed for authentication',
        '⚠️  Redis optional for caching'
      ],
      nextSteps: [
        '1. Setup MongoDB Atlas (5 min)',
        '2. Update MONGODB_URI in .env',
        '3. Run: npm run dev',
        '4. Create test users: node create-test-users.js',
        '5. Login and test!'
      ]
    }
  });
});

// MongoDB Setup Instructions
app.get('/api/v1/setup', (req, res) => {
  res.json({
    success: true,
    message: 'MongoDB Setup Required',
    steps: [
      {
        step: 1,
        title: 'Sign up for MongoDB Atlas',
        url: 'https://www.mongodb.com/cloud/atlas/register',
        time: '2 minutes'
      },
      {
        step: 2,
        title: 'Create Free Cluster',
        description: 'Choose M0 FREE tier, select region',
        time: '3-5 minutes'
      },
      {
        step: 3,
        title: 'Create Database User',
        description: 'Username: ceas-admin, Generate password',
        time: '1 minute'
      },
      {
        step: 4,
        title: 'Setup Network Access',
        description: 'Allow access from anywhere (0.0.0.0/0)',
        time: '1 minute'
      },
      {
        step: 5,
        title: 'Get Connection String',
        description: 'Connect → Connect your application → Copy string',
        time: '1 minute'
      },
      {
        step: 6,
        title: 'Update .env file',
        example: 'MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms',
        time: '1 minute'
      }
    ],
    documentation: 'See MONGODB_SETUP_GUIDE.md for detailed instructions',
    totalTime: '10 minutes'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET /health - Server health check',
      'GET /api/v1/test - Test API',
      'GET /api/v1/setup - MongoDB setup guide'
    ],
    tip: 'Setup MongoDB Atlas to enable all features'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`✅ CEAS-LMS Backend Server`);
  console.log(`📍 Running on: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/v1/test`);
  console.log(`📖 Setup: http://localhost:${PORT}/api/v1/setup`);
  console.log('========================================');
  console.log('');
  console.log('⚠️  MongoDB Not Connected');
  console.log('');
  console.log('📝 To enable full features:');
  console.log('   1. Setup MongoDB Atlas (free)');
  console.log('   2. See: MONGODB_SETUP_GUIDE.md');
  console.log('   3. Or visit: http://localhost:5000/api/v1/setup');
  console.log('');
  console.log('💡 This dev server works without MongoDB');
  console.log('   Perfect for testing server setup!');
  console.log('');
});

export default app;
