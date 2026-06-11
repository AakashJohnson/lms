import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function fixAllStudentPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all participants
    const participants = await User.find({ role: 'participant' }).select('+password');

    console.log(`👥 Found ${participants.length} participants\n`);
    console.log('🔧 Fixing passwords...\n');

    const salt = await bcrypt.genSalt(10);

    for (const user of participants) {
      console.log(`📋 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      
      // Set password based on email
      let newPassword = 'Student@123'; // Default
      
      if (user.email.includes('student')) {
        newPassword = 'Student@123';
      } else if (user.email.includes('pratham')) {
        newPassword = 'Pratham@123';
      }
      
      user.password = await bcrypt.hash(newPassword, salt);
      user.isActive = true;
      user.isApproved = true;
      await user.save();
      
      console.log(`   ✅ Password set to: ${newPassword}`);
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ ALL PASSWORDS FIXED!');
    console.log('='.repeat(80));
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    
    console.log('ADMIN:');
    console.log('   Email: admin@ncui.in');
    console.log('   Password: Admin@123');
    console.log('');
    
    console.log('TRAINER:');
    console.log('   Email: trainer@ncui.in');
    console.log('   Password: Trainer@123');
    console.log('');
    
    console.log('STUDENTS:');
    console.log('   Email: student@ncui.in');
    console.log('   Password: Student@123');
    console.log('');
    console.log('   Email: pratham@ncui.in');
    console.log('   Password: Pratham@123');
    console.log('');
    console.log('   Email: pratham.sharma@ncui.in');
    console.log('   Password: Pratham@123');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixAllStudentPasswords();
