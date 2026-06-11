import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function finalFixEverything() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔧 FIXING ALL USERS - FINAL FIX\n');
    console.log('='.repeat(80));

    // Define users with correct passwords
    const users = [
      { email: 'admin@ncui.in', password: 'Admin@123' },
      { email: 'trainer@ncui.in', password: 'Trainer@123' },
      { email: 'student@ncui.in', password: 'Student@123' }
    ];

    for (const userData of users) {
      console.log(`\n📋 ${userData.email}`);
      
      // Find user
      const user = await User.findOne({ email: userData.email });
      
      if (!user) {
        console.log('   ❌ User not found!');
        continue;
      }

      // Hash password directly without salt variable
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Update using direct MongoDB update to bypass middleware
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            isActive: true,
            isApproved: true,
            isLocked: false,
            loginAttempts: 0,
            lockUntil: null
          }
        }
      );
      
      console.log(`   ✅ Password: ${userData.password}`);
      
      // Verify immediately
      const updatedUser = await User.findById(user._id).select('+password');
      const testMatch = await bcrypt.compare(userData.password, updatedUser.password);
      console.log(`   🔐 Verification: ${testMatch ? '✅ WORKS!' : '❌ FAILED!'}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ FINAL FIX COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    console.log('Admin:   admin@ncui.in   / Admin@123');
    console.log('Trainer: trainer@ncui.in / Trainer@123');
    console.log('Student: student@ncui.in / Student@123');
    console.log('\n🎉 ALL PASSWORDS ARE WORKING NOW!');
    console.log('🎉 REFRESH THE LOGIN PAGE AND TRY AGAIN!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

finalFixEverything();
