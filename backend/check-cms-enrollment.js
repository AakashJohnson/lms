import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkCMSEnrollment() {
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

    // Find CMS course
    const cmsCourse = await Course.findOne({ title: /CMS/i });
    if (!cmsCourse) {
      console.error('❌ CMS course not found');
      return;
    }

    console.log(`📚 CMS Course: ${cmsCourse.title} (${cmsCourse._id})\n`);

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      user: student._id,
      course: cmsCourse._id
    });

    if (!enrollment) {
      console.log('❌ No enrollment found for CMS course');
      console.log('\n🔧 Creating enrollment and marking as completed...');
      
      // Get total lessons
      const totalLessons = (cmsCourse.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
      console.log(`   Total lessons: ${totalLessons}`);

      // Create completed enrollment
      const allLessons = [];
      cmsCourse.sections.forEach(section => {
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

      const newEnrollment = await Enrollment.create({
        user: student._id,
        course: cmsCourse._id,
        status: 'completed',
        progressPercent: 100,
        lessonProgress: allLessons,
        completedAt: new Date(),
        enrolledAt: new Date()
      });

      console.log('✅ Enrollment created and marked as completed');
      console.log(`   Enrollment ID: ${newEnrollment._id}`);
      
      return newEnrollment;
    }

    console.log('📊 Enrollment Status:');
    console.log(`   Enrollment ID: ${enrollment._id}`);
    console.log(`   Status: ${enrollment.status}`);
    console.log(`   Progress: ${enrollment.progressPercent}%`);
    console.log(`   Completed At: ${enrollment.completedAt || 'Not set'}`);
    console.log(`   Lessons Progress: ${enrollment.lessonProgress?.length || 0} lessons`);

    if (enrollment.status !== 'completed' || enrollment.progressPercent !== 100) {
      console.log('\n🔧 Updating enrollment to completed...');
      
      // Get total lessons
      const totalLessons = (cmsCourse.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
      
      // Mark all lessons as completed
      const allLessons = [];
      cmsCourse.sections.forEach(section => {
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

      console.log('✅ Enrollment updated to completed');
    }

    return enrollment;

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCMSEnrollment();
