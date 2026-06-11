import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LiveSession from './src/models/LiveSession.model.js';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const checkLiveSessions = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all live sessions
    const sessions = await LiveSession.find()
      .populate('trainer', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    console.log(`📊 Total Live Sessions: ${sessions.length}\n`);

    if (sessions.length === 0) {
      console.log('❌ No live sessions found in database!');
    } else {
      console.log('✅ Live Sessions:\n');
      sessions.forEach((session, index) => {
        console.log(`Session #${index + 1}:`);
        console.log(`  ID: ${session._id}`);
        console.log(`  Title: ${session.title}`);
        console.log(`  Trainer: ${session.trainer?.name || 'N/A'}`);
        console.log(`  Course: ${session.course?.title || 'N/A'}`);
        console.log(`  Date: ${session.date}`);
        console.log(`  Time: ${session.startTime}`);
        console.log(`  Duration: ${session.duration} min`);
        console.log(`  Platform: ${session.platform}`);
        console.log(`  Join Link: ${session.joinLink}`);
        console.log(`  Status: ${session.status}`);
        console.log(`  Enrolled: ${session.enrolledCount}/${session.maxCapacity}`);
        console.log(`  Created: ${session.createdAt}`);
        console.log('---\n');
      });
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

checkLiveSessions();
