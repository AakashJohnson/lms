import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const fixPrathamPasswords = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    console.log('🔧 FIXING PRATHAM USER PASSWORDS');
    console.log('='.repeat(60));
    console.log('');

    const emails = ['pratham@ncui.in', 'pratham.sharma@ncui.in'];

    for (const email of emails) {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.log(`❌ ${email} - NOT FOUND`);
        continue;
      }

      console.log(`📧 ${email}`);
      console.log(`   Current role: ${user.role}`);
      
      // Set password to Student@123
      user.password = 'Student@123';
      await user.save();
      
      // Verify it works
      const updatedUser = await User.findOne({ email }).select('+password');
      const passwordWorks = await updatedUser.comparePassword('Student@123');
      
      console.log(`   Password updated: ${passwordWorks ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log('');
    }

    console.log('✅ Password fix complete!');
    console.log('');
    console.log('📋 ALL STUDENT CREDENTIALS:');
    console.log('─'.repeat(60));
    console.log('   student@ncui.in / Student@123');
    console.log('   pratham@ncui.in / Student@123');
    console.log('   pratham.sharma@ncui.in / Student@123');
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPrathamPasswords();
