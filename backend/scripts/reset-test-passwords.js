import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function resetPasswords() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = [
      { email: 'admin@ncui.in', password: 'Admin@123' },
      { email: 'trainer@ncui.in', password: 'Trainer@123' },
      { email: 'student@ncui.in', password: 'Student@123' }
    ];

    for (const u of users) {
      const user = await User.findOne({ email: u.email }).select('+password');
      if (!user) {
        console.warn('User not found:', u.email);
        continue;
      }

      user.password = u.password;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.isActive = true;
      user.isApproved = true;
      await user.save();
      console.log(`Reset password for ${u.email}`);
    }

    console.log('Done. Try logging in with default test passwords.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetPasswords();
