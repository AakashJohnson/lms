import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const testLogin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    // Test credentials from Login.jsx
    const testUsers = [
      { email: 'admin@ncui.in', password: 'Admin@123', role: 'administrator' },
      { email: 'trainer@ncui.in', password: 'Trainer@123', role: 'trainer' },
      { email: 'student@ncui.in', password: 'Student@123', role: 'participant' }
    ];

    console.log('\n🔐 Testing Login Credentials:\n');

    for (const testUser of testUsers) {
      const user = await User.findOne({ email: testUser.email }).select('+password');
      
      if (!user) {
        console.log(`❌ ${testUser.role.toUpperCase()}: User not found (${testUser.email})`);
        continue;
      }

      const isMatch = await user.comparePassword(testUser.password);
      
      console.log(`${isMatch ? '✅' : '❌'} ${testUser.role.toUpperCase()}: ${testUser.email}`);
      console.log(`   Password: ${testUser.password}`);
      console.log(`   Match: ${isMatch}`);
      console.log(`   Approved: ${user.isApproved}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Locked: ${user.isLocked}`);
      
      if (isMatch) {
        // Test JWT generation
        try {
          const token = user.getSignedJwtToken();
          console.log(`   JWT: ${token.substring(0, 30)}...`);
        } catch (err) {
          console.log(`   ⚠️  JWT Error: ${err.message}`);
        }
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testLogin();
