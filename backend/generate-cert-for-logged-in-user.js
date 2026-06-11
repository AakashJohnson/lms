import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Certificate from './src/models/Certificate.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function generateCertForLoggedInUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // The logged-in user email from the screenshot
    const email = 'pratham@ncui.in'; // Change this if different
    
    console.log(`🔍 Looking for user: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n📋 Available users:');
      const users = await User.find({}, 'email firstName lastName role').limit(10);
      users.forEach(u => console.log(`   - ${u.email} (${u.firstName} ${u.lastName}) - ${u.role}`));
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}\n`);

    // Find all completed enrollments for this user
    const enrollments = await Enrollment.find({
      user: user._id,
      status: 'completed',
      progressPercent: 100
    }).populate('course', 'title');

    console.log(`📊 Found ${enrollments.length} completed enrollments\n`);

    if (enrollments.length === 0) {
      console.log('⚠️  No completed enrollments found');
      console.log('\n📋 All enrollments for this user:');
      const allEnrollments = await Enrollment.find({ user: user._id }).populate('course', 'title');
      allEnrollments.forEach(e => {
        console.log(`   - ${e.course?.title || 'Unknown'}: ${e.status} (${e.progressPercent}%)`);
      });
      return;
    }

    // Generate certificates for each completed course
    for (const enrollment of enrollments) {
      const course = enrollment.course;
      console.log(`\n📚 Course: ${course.title} (${course._id})`);

      // Check if certificate already exists
      const existingCert = await Certificate.findOne({
        student: user._id,
        course: course._id
      });

      if (existingCert) {
        console.log(`   ✅ Certificate already exists: ${existingCert.certificateId}`);
        continue;
      }

      // Generate certificate
      console.log(`   🎓 Generating certificate...`);
      try {
        const result = await autoGenerateCertificate(user._id, course._id);
        if (result && result.success) {
          console.log(`   ✅ Certificate generated: ${result.certificate.certificateId}`);
        } else {
          console.log(`   ⚠️  ${result?.message || 'Failed'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Show all certificates for this user
    console.log('\n📜 All certificates for this user:');
    const allCerts = await Certificate.find({ student: user._id }).populate('course', 'title');
    allCerts.forEach(cert => {
      console.log(`   - ${cert.course.title}: ${cert.certificateId} (${cert.status})`);
    });

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

generateCertForLoggedInUser();
