import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function findPrathamSharma() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users with "Pratham" in their name
    const users = await User.find({
      $or: [
        { firstName: /pratham/i },
        { lastName: /pratham/i },
        { firstName: /sharma/i },
        { lastName: /sharma/i }
      ]
    });

    console.log(`👥 Found ${users.length} users with Pratham/Sharma in name:\n`);

    for (const user of users) {
      console.log(`📋 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Role: ${user.role}`);
      
      // Check enrollments
      const enrollments = await Enrollment.find({ user: user._id })
        .populate('course', 'title');
      console.log(`   Enrollments: ${enrollments.length}`);
      enrollments.forEach(e => {
        console.log(`      - ${e.course?.title}: ${e.progressPercent}% (${e.status})`);
      });
      
      // Check certificates
      const certificates = await Certificate.find({ student: user._id })
        .populate('course', 'title');
      console.log(`   Certificates: ${certificates.length}`);
      certificates.forEach(c => {
        console.log(`      - ${c.course?.title}: ${c.certificateId}`);
      });
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findPrathamSharma();
