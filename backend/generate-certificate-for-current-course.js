import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function generateCertificateForCurrentCourse() {
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

    // Get the course from command line or use "test" as default
    const courseTitle = process.argv[2] || 'test';
    console.log(`🔍 Looking for course: ${courseTitle}\n`);

    // Find course
    const course = await Course.findOne({ 
      title: { $regex: courseTitle, $options: 'i' } 
    });
    
    if (!course) {
      console.error(`❌ Course not found: ${courseTitle}`);
      console.log('\n📚 Available courses:');
      const courses = await Course.find({}, 'title _id').limit(20);
      courses.forEach(c => console.log(`   - ${c.title} (${c._id})`));
      return;
    }

    console.log(`📚 Course: ${course.title} (${course._id})\n`);

    // Check if enrollment exists
    let enrollment = await Enrollment.findOne({
      user: student._id,
      course: course._id
    });

    if (!enrollment) {
      console.log('⚠️  No enrollment found. Creating enrollment...');
      enrollment = await Enrollment.create({
        user: student._id,
        course: course._id,
        status: 'enrolled',
        progressPercent: 0,
        lessonProgress: []
      });
      console.log('✅ Enrollment created\n');
    }

    // Get total lessons
    const totalLessons = (course.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
    console.log(`📊 Total lessons in course: ${totalLessons}`);

    // Mark all lessons as completed
    console.log('🎯 Marking all lessons as completed...');
    const allLessons = [];
    course.sections.forEach(section => {
      section.lessons.forEach(lesson => {
        allLessons.push({
          lessonId: lesson._id,
          sectionId: section._id,
          completed: true,
          completedAt: new Date(),
          lastPosition: 100,
          watchedSeconds: 100,
          totalDuration: 100
        });
      });
    });

    enrollment.lessonProgress = allLessons;
    enrollment.progressPercent = 100;
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    await enrollment.save();

    console.log('✅ All lessons marked as completed');
    console.log('✅ Enrollment status updated to "completed"\n');

    // Generate certificate
    console.log('🎓 Generating certificate...');
    const result = await autoGenerateCertificate(student._id, course._id);

    if (result && result.success) {
      console.log('\n✅ Certificate generated successfully!');
      console.log(`   - Certificate ID: ${result.certificate.certificateId}`);
      console.log(`   - Verification Token: ${result.certificate.verificationToken}`);
      console.log(`   - QR Code: ${result.certificate.qrCodeUrl}`);
      console.log(`   - PDF: ${result.certificate.pdfUrl}`);
      console.log(`\n🔗 Verification URL:`);
      console.log(`   http://localhost:5173/verify/${result.certificate.verificationToken}`);
    } else {
      console.error('❌ Certificate generation failed:', result?.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
generateCertificateForCurrentCourse();
