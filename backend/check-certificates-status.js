import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkCertificatesStatus() {
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

    if (completedEnrollments.length === 0) {
      console.log('⚠️  No completed enrollments found');
      return;
    }

    // Check each enrollment for certificate
    for (const enrollment of completedEnrollments) {
      const student = enrollment.user;
      const course = enrollment.course;
      
      if (!student || !course) {
        console.log(`\n⚠️  Skipping enrollment - missing user or course data`);
        continue;
      }
      
      console.log(`\n👤 Student: ${student.firstName} ${student.lastName} (${student.email})`);
      console.log(`📚 Course: ${course.title}`);
      console.log(`✅ Completed: ${enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleString() : 'N/A'}`);
      console.log(`📈 Progress: ${enrollment.progressPercent}%`);

      // Check if certificate exists
      const certificate = await Certificate.findOne({
        student: student._id,
        course: course._id
      });

      if (certificate) {
        console.log(`🎓 Certificate: ✅ EXISTS`);
        console.log(`   - Certificate ID: ${certificate.certificateId}`);
        console.log(`   - Status: ${certificate.status}`);
        console.log(`   - Issue Date: ${new Date(certificate.issueDate).toLocaleString()}`);
        console.log(`   - PDF URL: ${certificate.pdfUrl || 'NOT GENERATED'}`);
        console.log(`   - QR Code: ${certificate.qrCodeUrl || 'NOT GENERATED'}`);
      } else {
        console.log(`🎓 Certificate: ❌ MISSING`);
        console.log(`   ⚠️  This student should have a certificate but doesn't!`);
      }
      
      console.log('─'.repeat(80));
    }

    // Summary
    const totalCertificates = await Certificate.countDocuments();
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Completed Enrollments: ${completedEnrollments.length}`);
    console.log(`   - Total Certificates: ${totalCertificates}`);
    console.log(`   - Missing Certificates: ${completedEnrollments.length - totalCertificates}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
checkCertificatesStatus();
