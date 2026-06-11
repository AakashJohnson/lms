import dotenv from 'dotenv';
dotenv.config();

console.log('Testing route imports...\n');

const routes = [
  { name: 'auth', path: './src/routes/auth.routes.js' },
  { name: 'user', path: './src/routes/user.routes.js' },
  { name: 'course', path: './src/routes/course.routes.js' },
  { name: 'assessment', path: './src/routes/assessment.routes.js' },
  { name: 'payment', path: './src/routes/payment.routes.js' },
  { name: 'certificate', path: './src/routes/certificate.routes.js' },
  { name: 'dashboard', path: './src/routes/dashboard.routes.js' },
  { name: 'qms', path: './src/routes/qms.routes.js' },
  { name: 'media', path: './src/routes/media.routes.js' },
  { name: 'liveSession', path: './src/routes/liveSession.routes.js' },
  { name: 'report', path: './src/routes/report.routes.js' },
  { name: 'notification', path: './src/routes/notification.routes.js' }
];

async function testRoutes() {
  for (const route of routes) {
    try {
      await import(route.path);
      console.log(`✅ ${route.name} routes loaded`);
    } catch (err) {
      console.error(`❌ ${route.name} routes FAILED:`, err.message);
      console.error('   Stack:', err.stack);
      process.exit(1);
    }
  }
  console.log('\n🎉 All routes loaded successfully!');
  process.exit(0);
}

testRoutes();
