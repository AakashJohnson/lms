import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function unlockAllAccounts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔓 Unlocking all accounts...\n');

    // Update all users to unlock them
    const result = await User.updateMany(
      {},
      {
        $set: {
          isLocked: false,
          loginAttempts: 0,
          lockUntil: null,
          isActive: true,
          isApproved: true
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);

    // Verify
    const users = await User.find({});
    console.log('\n📋 All users status:\n');
    
    users.forEach(user => {
      console.log(`${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Locked: ${user.isLocked || false}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Approved: ${user.isApproved}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ ALL ACCOUNTS UNLOCKED!');
    console.log('='.repeat(80));
    console.log('\n🎉 Try logging in now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

unlockAllAccounts();
