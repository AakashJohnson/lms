import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkStudentPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const student = await User.findOne({ email: 'student@ncui.in' });
    
    if (!student) {
      console.error('❌ Student not found');
      return;
    }

    console.log(`👤 Student: ${student.firstName} ${student.lastName}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   Has Password: ${student.password ? 'Yes' : 'No'}`);

    if (!student.password) {
      console.log('\n⚠️  Student has no password! Setting password to "student123"...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('student123', salt);
      student.password = hashedPassword;
      await student.save();
      console.log('✅ Password set successfully!');
      console.log('   Password: student123');
      return;
    }

    console.log(`   Password Hash: ${student.password.substring(0, 20)}...`);

    // Test common passwords
    const testPasswords = ['student123', 'Student@123', 'password', 'student', '123456'];
    
    console.log('\n🔐 Testing common passwords:');
    for (const pwd of testPasswords) {
      const isMatch = await bcrypt.compare(pwd, student.password);
      if (isMatch) {
        console.log(`   ✅ CORRECT PASSWORD: "${pwd}"`);
        return;
      } else {
        console.log(`   ❌ Not: "${pwd}"`);
      }
    }

    console.log('\n⚠️  None of the common passwords matched.');
    console.log('💡 Resetting password to "student123"...');

    // Reset password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('student123', salt);
    student.password = hashedPassword;
    await student.save();

    console.log('✅ Password reset successfully!');
    console.log('   New password: student123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkStudentPassword();
