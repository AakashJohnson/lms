import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || process.env.DATABASE_URL || 'mongodb://localhost:27017/ceas-lms';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const arg = process.argv[2];
    if (!arg) {
      console.error('Usage: node scripts/unlock-user.js <emailOrMobile>');
      process.exit(1);
    }

    const query = arg.includes('@') ? { email: arg.toLowerCase() } : { mobile: arg };

    const user = await User.findOne(query);
    if (!user) {
      console.error('User not found for', arg);
      process.exit(1);
    }

    await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    console.log(`Unlocked user ${user.email || user.mobile}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
