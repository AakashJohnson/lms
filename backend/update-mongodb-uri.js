#!/usr/bin/env node

/**
 * Helper script to update MongoDB URI in .env file
 * Usage: node update-mongodb-uri.js "your-connection-string"
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

// Get connection string from command line
const newUri = process.argv[2];

if (!newUri) {
  console.log('\n❌ Error: Please provide MongoDB connection string\n');
  console.log('Usage:');
  console.log('  node update-mongodb-uri.js "mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms"\n');
  console.log('Example:');
  console.log('  node update-mongodb-uri.js "mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms"\n');
  process.exit(1);
}

// Validate connection string
if (!newUri.startsWith('mongodb://') && !newUri.startsWith('mongodb+srv://')) {
  console.log('\n❌ Error: Invalid MongoDB connection string');
  console.log('   Must start with mongodb:// or mongodb+srv://\n');
  process.exit(1);
}

// Check if database name is included
if (!newUri.includes('/ceas-lms')) {
  console.log('\n⚠️  Warning: Connection string should include database name "/ceas-lms"');
  console.log('   Example: mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms');
}

try {
  // Read .env file
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace MONGODB_URI
  const regex = /MONGODB_URI=.*/;
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `MONGODB_URI=${newUri}`);
  } else {
    // Add if not exists
    envContent += `\nMONGODB_URI=${newUri}\n`;
  }

  // Write back to .env
  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('\n✅ MongoDB URI updated successfully!\n');
  console.log('📝 Updated in: backend/.env');
  console.log('🔗 New URI:', newUri.replace(/:[^:@]+@/, ':****@')); // Hide password
  console.log('\n📋 Next Steps:');
  console.log('   1. Stop current server (Ctrl+C)');
  console.log('   2. Start full server: npm run dev');
  console.log('   3. Create test users: node create-test-users.js');
  console.log('   4. Try login at http://localhost:5173\n');

} catch (error) {
  console.error('\n❌ Error updating .env file:', error.message);
  process.exit(1);
}
