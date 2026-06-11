import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function createPrathamUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if Pratham user already exists
    let pratham = await User.findOne({ email: 'pratham@ncui.in' });
    
    if (pratham) {
      console.log('✅ Pratham user already exists');
    } else {
      console.log('🆕 Creating Pratham user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('pratham123', salt);
      
      pratham = await User.create({
        firstName: 'Pratham',
        lastName: 'Pratham',
        email: 'pratham@ncui.in',
        mobile: '6666666666',
        password: hashedPassword,
        role: 'participant',
        isApproved: true,
        isActive: true
      });
      
      console.log('✅ Pratham user created');
    }

    console.log(`\n👤 Pratham Pratham`);
    console.log(`   Email: ${pratham.email}`);
    console.log(`   ID: ${pratham._id}`);
    console.log(`   Password: pratham123\n`);

    // Get all courses
    const courses = await Course.find({});
    console.log(`📚 Found ${courses.length} courses\n`);

    // Enroll in all courses and mark as completed
    for (const course of courses) {
      console.log(`📚 ${course.title}`);

      // Check if already enrolled
      let enrollment = await Enrollment.findOne({
        user: pratham._id,
        course: course._id
      });

      if (!enrollment) {
        console.log(`   📝 Creating enrollment...`);
        
        // Get total lessons
        const totalLessons = (course.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
        
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
          user: pratham._id,
          course: course._id,
          status: 'completed',
          progressPercent: 100,
          lessonProgress: allLessons,
          completedAt: new Date(),
          enrolledAt: new Date()
        });

        console.log(`   ✅ Enrollment created (100% complete)`);
      } else {
        console.log(`   ✅ Already enrolled (${enrollment.progressPercent}%)`);
      }

      // Generate certificate
      console.log(`   🎓 Generating certificate...`);
      try {
        const result = await autoGenerateCertificate(pratham._id, course._id);
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
    console.log('\n📋 Login credentials:');
    console.log('   Email: pratham@ncui.in');
    console.log('   Password: pratham123');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

createPrathamUser();
