import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function fixAndGenerateCertificates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find student
    const student = await User.findOne({ email: 'student@ncui.in' });
    if (!student) {
      console.error('❌ Student not found');
      return;
    }

    console.log(`👤 Student: ${student.firstName} ${student.lastName} (${student._id})\n`);

    // Find all completed enrollments for this student
    const enrollments = await Enrollment.find({
      user: student._id,
      status: 'completed',
      progressPercent: 100
    });

    console.log(`📊 Found ${enrollments.length} completed enrollments\n`);

    for (const enrollment of enrollments) {
      console.log(`\n📚 Processing enrollment ${enrollment._id}`);
      console.log(`   Course ID: ${enrollment.course}`);
      console.log(`   Status: ${enrollment.status}`);
      console.log(`   Progress: ${enrollment.progressPercent}%`);

      // Get course details
      const course = await Course.findById(enrollment.course);
      if (!course) {
        console.log(`   ❌ Course not found for ID: ${enrollment.course}`);
        continue;
      }

      console.log(`   ✅ Course: ${course.title}`);

      // Try to generate certificate
      console.log(`   🎓 Generating certificate...`);
      try {
        const result = await autoGenerateCertificate(student._id, course._id);
        if (result && result.success) {
          console.log(`   ✅ Certificate generated: ${result.certificate.certificateId}`);
        } else {
          console.log(`   ⚠️  ${result?.message || 'Certificate generation failed'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Done!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixAndGenerateCertificates();
