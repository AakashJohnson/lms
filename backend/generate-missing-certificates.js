import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function generateMissingCertificates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all completed enrollments
    const completedEnrollments = await Enrollment.find({ 
      status: 'completed',
      progressPercent: 100 
    })
      .populate('user', 'firstName lastName email')
      .populate('course', 'title')
      .lean();

    console.log(`📊 Found ${completedEnrollments.length} completed enrollments\n`);

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    // Check each enrollment for certificate
    for (const enrollment of completedEnrollments) {
      const student = enrollment.user;
      const course = enrollment.course;
      
      if (!student || !course) {
        console.log(`⚠️  Skipping enrollment - missing user or course data`);
        skipped++;
        continue;
      }
      
      console.log(`\n👤 ${student.firstName} ${student.lastName} - ${course.title}`);

      // Check if certificate exists
      const existingCert = await Certificate.findOne({
        student: student._id,
        course: course._id
      });

      if (existingCert) {
        console.log(`   ✅ Certificate already exists: ${existingCert.certificateId}`);
        skipped++;
        continue;
      }

      // Generate certificate
      console.log(`   🎓 Generating certificate...`);
      try {
        const result = await autoGenerateCertificate(student._id, course._id);
        if (result && result.success) {
          console.log(`   ✅ Certificate generated: ${result.certificate.certificateId}`);
          generated++;
        } else {
          console.log(`   ❌ Failed: ${result?.message || 'Unknown error'}`);
          errors++;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errors++;
      }
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 SUMMARY:`);
    console.log(`   - Total Enrollments: ${completedEnrollments.length}`);
    console.log(`   - Certificates Generated: ${generated}`);
    console.log(`   - Skipped (already exists): ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
generateMissingCertificates();
