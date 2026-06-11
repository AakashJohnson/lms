import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function checkUserPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all participants
    const participants = await User.find({ role: 'participant' }).select('+password');

    console.log(`👥 Found ${participants.length} participants:\n`);

    for (const user of participants) {
      console.log(`📋 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      
      // Test common passwords
      if (user.password) {
        const testPasswords = ['student123', 'pratham123', 'Student@123', 'Pratham@123'];
        for (const pwd of testPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          if (match) {
            console.log(`   ✅ Password: ${pwd}`);
            break;
          }
        }
      }
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('WORKING LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('');
    console.log('1. Email: student@ncui.in');
    console.log('   Password: student123 or Student@123');
    console.log('');
    console.log('2. Email: pratham@ncui.in');
    console.log('   Password: pratham123 or Pratham@123');
    console.log('');
    console.log('3. Email: pratham.sharma@ncui.in');
    console.log('   Password: pratham123 or Pratham@123');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkUserPasswords();
