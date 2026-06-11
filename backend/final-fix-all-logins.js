import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function finalFixAllLogins() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔧 Fixing all user passwords...\n');

    // Fix Admin
    console.log('1. ADMIN');
    let admin = await User.findOne({ email: 'admin@ncui.in' });
    if (admin) {
      admin.password = await bcrypt.hash('Admin@123', 10);
      admin.isActive = true;
      admin.isApproved = true;
      await admin.save({ validateBeforeSave: false });
      console.log('   ✅ Password: Admin@123');
    }

    // Fix Trainer
    console.log('\n2. TRAINER');
    let trainer = await User.findOne({ email: 'trainer@ncui.in' });
    if (trainer) {
      trainer.password = await bcrypt.hash('Trainer@123', 10);
      trainer.isActive = true;
      trainer.isApproved = true;
      await trainer.save({ validateBeforeSave: false });
      console.log('   ✅ Password: Trainer@123');
    }

    // Fix Student
    console.log('\n3. STUDENT');
    let student = await User.findOne({ email: 'student@ncui.in' });
    if (student) {
      student.password = await bcrypt.hash('Student@123', 10);
      student.isActive = true;
      student.isApproved = true;
      await student.save({ validateBeforeSave: false });
      console.log('   ✅ Password: Student@123');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL PASSWORDS FIXED!');
    console.log('='.repeat(80));
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    console.log('Admin:   admin@ncui.in / Admin@123');
    console.log('Trainer: trainer@ncui.in / Trainer@123');
    console.log('Student: student@ncui.in / Student@123');
    console.log('\n🎉 Try logging in now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

finalFixAllLogins();
