import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function createCertificatesForGmailUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the user with pratham@gmail.com
    const user = await User.findOne({ email: 'pratham@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('👤 User Found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log('');

    // Get all courses
    const courses = await Course.find({});
    console.log(`📚 Found ${courses.length} courses\n`);

    // Enroll in all courses and mark as completed
    for (const course of courses) {
      console.log(`📚 ${course.title}`);

      // Check if already enrolled
      let enrollment = await Enrollment.findOne({
        user: user._id,
        course: course._id
      });

      if (!enrollment) {
        console.log(`   📝 Creating enrollment...`);
        
        // Mark all lessons as completed
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

        enrollment = await Enrollment.create({
          user: user._id,
          course: course._id,
          status: 'completed',
          progressPercent: 100,
          lessonProgress: allLessons,
          completedAt: new Date(),
          enrolledAt: new Date()
        });

        console.log(`   ✅ Enrollment created (100% complete)`);
      } else {
        // Update existing enrollment to completed
        if (enrollment.status !== 'completed' || enrollment.progressPercent !== 100) {
          console.log(`   📝 Updating enrollment to completed...`);
          
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

          enrollment.status = 'completed';
          enrollment.progressPercent = 100;
          enrollment.lessonProgress = allLessons;
          enrollment.completedAt = new Date();
          await enrollment.save();

          console.log(`   ✅ Enrollment updated (100% complete)`);
        } else {
          console.log(`   ✅ Already enrolled (${enrollment.progressPercent}%)`);
        }
      }

      // Generate certificate
      console.log(`   🎓 Generating certificate...`);
      try {
        const result = await autoGenerateCertificate(user._id, course._id);
        if (result && result.success) {
          console.log(`   ✅ Certificate: ${result.certificate.certificateId}`);
        } else {
          console.log(`   ⚠️  ${result?.message || 'Failed'}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      console.log('');
    }

    console.log('='.repeat(80));
    console.log('✅ DONE!');
    console.log('='.repeat(80));
    console.log('\n📋 Your account:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log('');
    console.log('🎉 Certificates have been created for your account!');
    console.log('');
    console.log('⚠️  IMPORTANT: Refresh the page (F5) to see the certificates!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

createCertificatesForGmailUser();
