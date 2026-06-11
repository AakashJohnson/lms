import mongoose from 'mongoose';

console.log('Testing MongoDB Atlas connection...\n');

// Try different connection methods
const connections = [
  {
    name: 'SRV Format',
    uri: 'mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms'
  },
  {
    name: 'Standard Format (try 1)',
    uri: 'mongodb://ceas-lms:<password>@ceas-lms-shard-00-00.5jzp2fv.mongodb.net:27017,ceas-lms-shard-00-01.5jzp2fv.mongodb.net:27017,ceas-lms-shard-00-02.5jzp2fv.mongodb.net:27017/ceas-lms?ssl=true&replicaSet=atlas-123456-shard-0&authSource=admin&retryWrites=true&w=majority'
  }
];

async function testConnection(config) {
  console.log(`\nTrying: ${config.name}`);
  console.log(`URI: ${config.uri.substring(0, 50)}...`);
  
  try {
    await mongoose.connect(config.uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    
    console.log('✅ SUCCESS! Connected to MongoDB Atlas');
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Host: ${mongoose.connection.host}`);
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  for (const config of connections) {
    const success = await testConnection(config);
    if (success) {
      console.log('\n✅ Found working connection!');
      process.exit(0);
    }
  }
  
  console.log('\n❌ All connection attempts failed');
  console.log('\nPossible issues:');
  console.log('1. IP not whitelisted in MongoDB Atlas Network Access');
  console.log('2. Firewall blocking MongoDB ports');
  console.log('3. VPN or proxy interfering');
  console.log('4. DNS resolution issues');
  
  process.exit(1);
}

runTests();
