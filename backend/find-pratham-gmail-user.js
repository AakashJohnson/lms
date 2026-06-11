import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function findPrathamGmailUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user with pratham@gmail.com
    const user = await User.findOne({ email: 'pratham@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('👤 User Found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Mobile: ${user.mobile}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Organization: ${user.organization}`);
    console.log('');

    // Check enrollments
    const enrollments = await Enrollment.find({ user: user._id })
      .populate('course', 'title');
    console.log(`📚 Enrollments: ${enrollments.length}`);
    enrollments.forEach(e => {
      console.log(`   - ${e.course?.title}: ${e.progressPercent}% (${e.status})`);
    });
    console.log('');

    // Check certificates
    const certificates = await Certificate.find({ student: user._id })
      .populate('course', 'title');
    console.log(`🎓 Certificates: ${certificates.length}`);
    if (certificates.length > 0) {
      certificates.forEach(c => {
        console.log(`   - ${c.course?.title}: ${c.certificateId}`);
      });
    } else {
      console.log('   ❌ NO CERTIFICATES!');
    }
    console.log('');

    console.log('='.repeat(80));
    console.log('THIS IS THE ACCOUNT YOU ARE CURRENTLY LOGGED IN WITH!');
    console.log('='.repeat(80));
    console.log('');
    console.log('The certificates were created for: pratham.sharma@ncui.in');
    console.log('But you are logged in with: pratham@gmail.com');
    console.log('');
    console.log('You need to either:');
    console.log('1. Create certificates for pratham@gmail.com, OR');
    console.log('2. Logout and login with pratham.sharma@ncui.in');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findPrathamGmailUser();
