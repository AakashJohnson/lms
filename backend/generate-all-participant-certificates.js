import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Certificate from './src/models/Certificate.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function generateAllParticipantCertificates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all participants
    const participants = await User.find({ role: 'participant' });
    console.log(`👥 Found ${participants.length} participants\n`);

    for (const user of participants) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`👤 ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user._id}`);
      console.log(`${'='.repeat(80)}`);

      // Find completed enrollments
      const enrollments = await Enrollment.find({
        user: user._id,
        status: 'completed',
        progressPercent: 100
      }).populate('course', 'title');

      console.log(`📊 Completed enrollments: ${enrollments.length}`);

      if (enrollments.length === 0) {
        console.log('   No completed courses');
        continue;
      }

      // Generate certificates
      for (const enrollment of enrollments) {
        const course = enrollment.course;
        console.log(`\n   📚 ${course.title}`);

        // Check existing
        const existing = await Certificate.findOne({
          student: user._id,
          course: course._id
        });

        if (existing) {
          console.log(`      ✅ Certificate exists: ${existing.certificateId}`);
          continue;
        }

        // Generate
        console.log(`      🎓 Generating...`);
        try {
          const result = await autoGenerateCertificate(user._id, course._id);
          if (result && result.success) {
            console.log(`      ✅ Generated: ${result.certificate.certificateId}`);
          } else {
            console.log(`      ⚠️  ${result?.message || 'Failed'}`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(80));

    // Show all certificates
    const allCerts = await Certificate.find({}).populate('student', 'firstName lastName email').populate('course', 'title');
    console.log(`\nTotal certificates: ${allCerts.length}\n`);
    
    allCerts.forEach(cert => {
      console.log(`✅ ${cert.student.firstName} ${cert.student.lastName} (${cert.student.email})`);
      console.log(`   Course: ${cert.course.title}`);
      console.log(`   Certificate: ${cert.certificateId}`);
      console.log(`   Status: ${cert.status}\n`);
    });

    console.log('='.repeat(80));
    console.log('✅ DONE!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

generateAllParticipantCertificates();
