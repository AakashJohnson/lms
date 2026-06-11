import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.model.js';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';

dotenv.config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const email = process.argv[2];
    const newPassword = process.argv[3] || 'Trainer@123';

    if (!email) {
      console.log('❌ Please provide email address');
      console.log('Usage: node backend/reset-password.js <email> [password]');
      console.log('Example: node backend/reset-password.js roytripathi@gmail.com Trainer@123');
      process.exit(1);
    }

    console.log(`🔍 Searching for user: ${email}\n`);

    // Check in all collections
    let user = await Admin.findOne({ email });
    let userType = 'Admin';

    if (!user) {
      user = await Trainer.findOne({ email });
      userType = 'Trainer';
    }

    if (!user) {
      user = await Participant.findOne({ email });
      userType = 'Participant';
    }

    if (!user) {
      console.log('❌ USER NOT FOUND');
      process.exit(1);
    }

    console.log(`✅ Found ${userType}: ${user.firstName} ${user.lastName}\n`);

    // Reset password
    user.password = newPassword;
    await user.save(); // This will trigger the pre-save hook to hash the password

    console.log('✅ PASSWORD RESET SUCCESSFULLY!');
    console.log('─────────────────────────────────────────');
    console.log(`Name:         ${user.firstName} ${user.lastName}`);
    console.log(`Email:        ${user.email}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`Role:         ${user.role}`);
    console.log('─────────────────────────────────────────');
    console.log('\n🎉 User can now login with the new password!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetPassword();
