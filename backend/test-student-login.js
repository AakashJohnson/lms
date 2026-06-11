import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function testStudentLogin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find student
    const student = await User.findOne({ email: 'student@ncui.in' }).select('+password');

    if (!student) {
      console.log('❌ Student not found!');
      return;
    }

    console.log('👤 Student Found:');
    console.log(`   Name: ${student.firstName} ${student.lastName}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Has Password: ${student.password ? 'Yes' : 'No'}`);
    console.log('');

    // Test passwords
    const testPasswords = ['student123', 'Student@123', 'Student123', 'student@123'];
    
    console.log('🔐 Testing passwords:');
    for (const pwd of testPasswords) {
      try {
        const match = await bcrypt.compare(pwd, student.password);
        console.log(`   ${pwd}: ${match ? '✅ MATCH' : '❌ No match'}`);
        if (match) {
          console.log(`\n✅ CORRECT PASSWORD: ${pwd}`);
          break;
        }
      } catch (error) {
        console.log(`   ${pwd}: ❌ Error - ${error.message}`);
      }
    }

    // Reset password to student123
    console.log('\n🔧 Resetting password to: student123');
    const salt = await bcrypt.genSalt(10);
    student.password = await bcrypt.hash('student123', salt);
    await student.save();
    console.log('✅ Password reset complete!');

    console.log('\n='.repeat(80));
    console.log('LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('Email: student@ncui.in');
    console.log('Password: student123');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testStudentLogin();
