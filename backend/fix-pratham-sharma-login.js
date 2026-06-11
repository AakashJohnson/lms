import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function fixPrathamSharmaLogin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Pratham Sharma
    const user = await User.findOne({ email: 'pratham.sharma@ncui.in' }).select('+password');

    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('👤 User Found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Approved: ${user.isApproved}`);
    console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
    console.log('');

    // Make sure user is active and approved
    if (!user.isActive || !user.isApproved) {
      console.log('🔧 Fixing user status...');
      user.isActive = true;
      user.isApproved = true;
    }

    // Reset password to pratham123
    console.log('🔑 Resetting password to: pratham123');
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash('pratham123', salt);

    await user.save();

    console.log('✅ User fixed!\n');
    console.log('='.repeat(80));
    console.log('LOGIN CREDENTIALS:');
    console.log('='.repeat(80));
    console.log('');
    console.log('Email: pratham.sharma@ncui.in');
    console.log('Password: pratham123');
    console.log('');
    console.log('✅ Try logging in now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixPrathamSharmaLogin();
