import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function verifyPrathamCertificates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Pratham user
    const pratham = await User.findOne({ email: 'pratham@ncui.in' });
    
    if (!pratham) {
      console.log('❌ Pratham user not found!');
      return;
    }

    console.log('👤 Pratham User Found:');
    console.log(`   Name: ${pratham.firstName} ${pratham.lastName}`);
    console.log(`   Email: ${pratham.email}`);
    console.log(`   ID: ${pratham._id}`);
    console.log(`   Mobile: ${pratham.mobile}`);
    console.log('');

    // Find enrollments
    const enrollments = await Enrollment.find({ user: pratham._id })
      .populate('course', 'title');
    
    console.log(`📚 Enrollments: ${enrollments.length}`);
    enrollments.forEach((enrollment, i) => {
      console.log(`   ${i + 1}. ${enrollment.course?.title || 'Unknown'}`);
      console.log(`      Status: ${enrollment.status}`);
      console.log(`      Progress: ${enrollment.progressPercent}%`);
      console.log(`      Completed: ${enrollment.completedAt ? 'Yes' : 'No'}`);
    });
    console.log('');

    // Find certificates
    const certificates = await Certificate.find({ student: pratham._id })
      .populate('course', 'title');
    
    console.log(`🎓 Certificates: ${certificates.length}`);
    certificates.forEach((cert, i) => {
      console.log(`   ${i + 1}. ${cert.course?.title || 'Unknown'}`);
      console.log(`      Certificate ID: ${cert.certificateId}`);
      console.log(`      Course ID: ${cert.course?._id}`);
      console.log(`      Issue Date: ${cert.issueDate}`);
      console.log(`      Status: ${cert.status}`);
    });
    console.log('');

    console.log('✅ Verification complete!');
    console.log('');
    console.log('📋 Login with these credentials:');
    console.log('   Email: pratham@ncui.in');
    console.log('   Password: pratham123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

verifyPrathamCertificates();
