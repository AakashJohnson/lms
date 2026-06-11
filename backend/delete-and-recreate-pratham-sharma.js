import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Certificate from './src/models/Certificate.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function deleteAndRecreatePrathamSharma() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete existing user and all related data
    console.log('🗑️  Deleting existing Pratham Sharma user...');
    const existingUser = await User.findOne({ email: 'pratham.sharma@ncui.in' });
    
    if (existingUser) {
      // Delete certificates
      await Certificate.deleteMany({ student: existingUser._id });
      console.log('   ✅ Deleted certificates');
      
      // Delete enrollments
      await Enrollment.deleteMany({ user: existingUser._id });
      console.log('   ✅ Deleted enrollments');
      
      // Delete user
      await User.deleteOne({ _id: existingUser._id });
      console.log('   ✅ Deleted user');
    }

    // Create fresh user
    console.log('\n🆕 Creating fresh Pratham Sharma user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('pratham123', salt);
    
    const user = await User.create({
      firstName: 'Pratham',
      lastName: 'Sharma',
      email: 'pratham.sharma@ncui.in',
      mobile: '9876543210',
      password: hashedPassword,
      role: 'participant',
      isApproved: true,
      isActive: true
    });
    
    console.log('✅ User created');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);

    // Get all courses
    const courses = await Course.find({});
    console.log(`\n📚 Found ${courses.length} courses\n`);

    // Enroll and complete all courses
    for (const course of courses) {
      console.log(`📚 ${course.title}`);

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

      const enrollment = await Enrollment.create({
        user: user._id,
        course: course._id,
        status: 'completed',
        progressPercent: 100,
        lessonProgress: allLessons,
        completedAt: new Date(),
        enrolledAt: new Date()
      });

      console.log(`   ✅ Enrollment created (100%)`);

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
    console.log('✅ DONE! Fresh account created with certificates!');
    console.log('='.repeat(80));
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('   Email: pratham.sharma@ncui.in');
    console.log('   Password: pratham123');
    console.log('');
    console.log('🎉 Try logging in now!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

deleteAndRecreatePrathamSharma();
