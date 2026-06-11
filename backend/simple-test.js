console.log('Starting...');

try {
  console.log('Test 1: Basic console');
  
  import('dotenv').then(async (dotenv) => {
    console.log('Test 2: dotenv imported');
    dotenv.default.config();
    console.log('Test 3: dotenv configured');
    console.log('PORT:', process.env.PORT);
    
    const { logger } = await import('./src/config/logger.js');
    console.log('Test 4: logger imported');
    logger.info('Logger works!');
    
    console.log('✅ All tests passed!');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
  
} catch (err) {
  console.error('❌ Sync Error:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
}
