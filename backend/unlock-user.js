import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.model.js';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';

dotenv.config();

const unlockUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const email = process.argv[2] || 'roytripathi@gmail.com';

    console.log(`🔍 Searching for user: ${email}\n`);

    // Check in all collections
    let user = await Admin.findOne({ email });
    let userType = 'Admin';
    let Model = Admin;

    if (!user) {
      user = await Trainer.findOne({ email });
      userType = 'Trainer';
      Model = Trainer;
    }

    if (!user) {
      user = await Participant.findOne({ email });
      userType = 'Participant';
      Model = Participant;
    }

    if (!user) {
      console.log('❌ USER NOT FOUND');
      process.exit(1);
    }

    console.log(`✅ Found ${userType}: ${user.firstName} ${user.lastName}`);
    console.log(`Current Status:`);
    console.log(`  - Login Attempts: ${user.loginAttempts}`);
    console.log(`  - Is Locked: ${user.isLocked ? '❌ YES' : '✅ NO'}`);
    console.log(`  - Lock Until: ${user.lockUntil || 'N/A'}\n`);

    // Unlock the user
    await Model.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 }
    });

    console.log('✅ USER UNLOCKED SUCCESSFULLY!');
    console.log('─────────────────────────────────────────');
    console.log(`Name:           ${user.firstName} ${user.lastName}`);
    console.log(`Email:          ${user.email}`);
    console.log(`Login Attempts: 0 (Reset)`);
    console.log(`Lock Status:    Unlocked ✅`);
    console.log('─────────────────────────────────────────');
    console.log('\n🎉 User can now attempt login again!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

unlockUser();
