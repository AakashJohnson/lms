import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 5000);

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CEAS-LMS Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    status: {
      server: 'Running',
      mongodb: 'Not connected (use MongoDB Atlas)',
      redis: 'Not connected (optional for dev)'
    }
  });
});

// Test route
app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    data: {
      version: '1.0.0',
      endpoints: [
        'GET /health',
        'GET /api/v1/test',
        'POST /api/v1/auth/register (needs MongoDB)',
        'POST /api/v1/auth/login (needs MongoDB)'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: ['GET /health', 'GET /api/v1/test']
  });
});

function startServer(port) {
  const server = app.listen(port, () => {
    const actualPort = server.address()?.port;
    console.log('');
    console.log('========================================');
    console.log(`Server running on port ${actualPort}`);
    console.log(`URL: http://localhost:${actualPort}`);
    console.log(`Health: http://localhost:${actualPort}/health`);
    console.log(`Test: http://localhost:${actualPort}/api/v1/test`);
    console.log('========================================');
    console.log('');
    console.log('MongoDB not connected');
    console.log('To connect MongoDB:');
    console.log('   1. Sign up at https://www.mongodb.com/cloud/atlas');
    console.log('   2. Get connection string');
    console.log('   3. Update MONGODB_URI in .env');
    console.log('   4. Run: npm run dev');
    console.log('');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port === DEFAULT_PORT) {
      // Fall back to any open port so smoke checks stay reliable.
      startServer(0);
      return;
    }
    throw error;
  });
}

startServer(DEFAULT_PORT);
