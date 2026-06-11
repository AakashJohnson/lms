import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function findPrathamGmail() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with Pratham in name
    const users = await User.find({
      $or: [
        { firstName: /pratham/i },
        { email: /pratham/i }
      ]
    });

    console.log(`👥 Found ${users.length} users with "Pratham":\n`);

    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   Organization: ${user.organization || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findPrathamGmail();
