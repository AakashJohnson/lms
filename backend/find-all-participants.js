import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function findAllParticipants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all participants
    const participants = await User.find({ role: 'participant' });

    console.log(`👥 Found ${participants.length} participants:\n`);

    for (const user of participants) {
      console.log(`📋 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   ID: ${user._id}`);
      
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

    console.log('='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total Participants: ${participants.length}`);
    console.log('');
    console.log('Accounts with certificates:');
    for (const user of participants) {
      const certCount = await Certificate.countDocuments({ student: user._id });
      if (certCount > 0) {
        console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.email}): ${certCount} certificates`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findAllParticipants();
