import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function forceGenerateCertificate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get student email from command line or use default
    const studentEmail = process.argv[2] || 'student@ncui.in';
    const courseTitle = process.argv[3] || 'test';

    console.log(`\n🔍 Looking for student: ${studentEmail}`);
    console.log(`🔍 Looking for course: ${courseTitle}`);

    // Find student
    const student = await User.findOne({ email: studentEmail });
    
    if (!student) {
      console.error(`❌ Student not found: ${studentEmail}`);
      process.exit(1);
    }
    console.log(`✅ Found student: ${student.firstName} ${student.lastName} (${student._id})`);

    // Find course
    const course = await Course.findOne({ 
      title: { $regex: courseTitle, $options: 'i' } 
    });
    
    if (!course) {
      console.error(`❌ Course not found: ${courseTitle}`);
      console.log('\n📚 Available courses:');
      const courses = await Course.find({}, 'title').limit(10);
      courses.forEach(c => console.log(`   - ${c.title}`));
      process.exit(1);
    }
    console.log(`✅ Found course: ${course.title} (${course._id})`);

    // Check enrollment
    let enrollment = await Enrollment.findOne({ 
      user: student._id, 
      course: course._id 
    });

    if (!enrollment) {
      console.log('⚠️  Student not enrolled. Creating enrollment...');
      enrollment = await Enrollment.create({
        user: student._id,
        course: course._id,
        status: 'enrolled',
        progressPercent: 0,
        lessonProgress: []
      });
      console.log('✅ Enrollment created');
    }

    console.log(`\n📊 Current enrollment status:`);
    console.log(`   - Status: ${enrollment.status}`);
    console.log(`   - Progress: ${enrollment.progressPercent}%`);
    console.log(`   - Completed lessons: ${enrollment.lessonProgress.filter(lp => lp.completed).length}`);

    // Get total lessons
    const totalLessons = (course.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
    console.log(`   - Total lessons: ${totalLessons}`);

    // Mark all lessons as completed
    console.log(`\n🎯 Marking all lessons as completed...`);
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
    console.log('✅ Enrollment status updated to "completed"');

    // Generate certificate
    console.log('\n🎓 Generating certificate...');
    const certificate = await autoGenerateCertificate(student._id, course._id);

    if (certificate) {
      console.log('\n✅ Certificate generated successfully!');
      console.log(`   - Certificate ID: ${certificate.certificateId}`);
      console.log(`   - Verification Token: ${certificate.verificationToken}`);
      console.log(`   - QR Code: ${certificate.qrCodeUrl}`);
      console.log(`   - PDF: ${certificate.pdfUrl}`);
      console.log(`\n🔗 Verification URL:`);
      console.log(`   http://localhost:5173/verify/${certificate.verificationToken}`);
    } else {
      console.error('❌ Certificate generation failed');
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
forceGenerateCertificate();
