import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkCMSCourseCertificate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the student
    const student = await User.findOne({ email: 'student@ncui.in' });
    
    if (!student) {
      console.error('❌ Student not found');
      return;
    }

    console.log(`👤 Student: ${student.firstName} ${student.lastName} (${student._id})\n`);

    // Find CMS course
    const cmsCourse = await Course.findOne({ title: /CMS/i });
    
    if (!cmsCourse) {
      console.log('⚠️  CMS course not found. Looking for all courses...');
      const allCourses = await Course.find({}, 'title _id').limit(10);
      console.log('\n📚 Available courses:');
      allCourses.forEach(c => console.log(`   - ${c.title} (${c._id})`));
      return;
    }

    console.log(`📚 Course: ${cmsCourse.title} (${cmsCourse._id})\n`);

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      user: student._id,
      course: cmsCourse._id
    });

    if (enrollment) {
      console.log('📊 Enrollment Status:');
      console.log(`   Status: ${enrollment.status}`);
      console.log(`   Progress: ${enrollment.progressPercent}%`);
      console.log(`   Completed At: ${enrollment.completedAt || 'Not completed'}`);
      console.log(`   Lessons Progress: ${enrollment.lessonProgress?.length || 0} lessons tracked\n`);
    } else {
      console.log('⚠️  No enrollment found for this course\n');
    }

    // Check certificate
    const certificate = await Certificate.findOne({
      student: student._id,
      course: cmsCourse._id
    });

    if (certificate) {
      console.log('🎓 Certificate EXISTS:');
      console.log(`   Certificate ID: ${certificate.certificateId}`);
      console.log(`   Status: ${certificate.status}`);
      console.log(`   Issue Date: ${new Date(certificate.issueDate).toLocaleString()}`);
      console.log(`   Completion Date: ${new Date(certificate.completionDate).toLocaleString()}`);
      console.log(`   PDF URL: ${certificate.pdfUrl}`);
      console.log(`   QR Code: ${certificate.qrCodeUrl}`);
    } else {
      console.log('❌ No certificate found for this course');
    }

    // Check ALL certificates for this student
    console.log('\n📜 All certificates for this student:');
    const allCerts = await Certificate.find({ student: student._id })
      .populate('course', 'title _id');
    
    if (allCerts.length === 0) {
      console.log('   No certificates found');
    } else {
      allCerts.forEach((cert, index) => {
        console.log(`\n   Certificate ${index + 1}:`);
        console.log(`      Course: ${cert.course.title} (${cert.course._id})`);
        console.log(`      Certificate ID: ${cert.certificateId}`);
        console.log(`      Status: ${cert.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCMSCourseCertificate();
