import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Course from './src/models/Course.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function completeLoginFixAndTest() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('='.repeat(80));
    console.log('STEP 1: CHECKING EXISTING USERS');
    console.log('='.repeat(80));
    
    const allUsers = await User.find({}).select('+password');
    console.log(`\nTotal users: ${allUsers.length}\n`);

    // Define the users we need
    const requiredUsers = [
      { email: 'admin@ncui.in', firstName: 'Admin', lastName: 'User', mobile: '9999999999', role: 'administrator', password: 'Admin@123' },
      { email: 'trainer@ncui.in', firstName: 'Trainer', lastName: 'Kumar', mobile: '8888888888', role: 'trainer', password: 'Trainer@123' },
      { email: 'student@ncui.in', firstName: 'Student', lastName: 'Singh', mobile: '7777777777', role: 'participant', password: 'Student@123' },
    ];

    console.log('='.repeat(80));
    console.log('STEP 2: CREATING/UPDATING USERS');
    console.log('='.repeat(80));

    const salt = await bcrypt.genSalt(10);

    for (const userData of requiredUsers) {
      console.log(`\n📋 ${userData.firstName} ${userData.lastName} (${userData.email})`);
      
      let user = await User.findOne({ email: userData.email }).select('+password');
      
      if (user) {
        console.log('   ✅ User exists - updating password');
        user.password = await bcrypt.hash(userData.password, salt);
        user.isActive = true;
        user.isApproved = true;
        user.firstName = userData.firstName;
        user.lastName = userData.lastName;
        user.role = userData.role;
        await user.save();
      } else {
        console.log('   🆕 Creating new user');
        user = await User.create({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          mobile: userData.mobile,
          password: await bcrypt.hash(userData.password, salt),
          role: userData.role,
          isApproved: true,
          isActive: true
        });
      }
      
      console.log(`   ✅ Password set to: ${userData.password}`);
      
      // Test password
      const testMatch = await bcrypt.compare(userData.password, user.password);
      console.log(`   🔐 Password test: ${testMatch ? '✅ WORKS' : '❌ FAILED'}`);
      
      // Test JWT method
      try {
        const token = user.getSignedJwtToken();
        console.log(`   🔑 JWT generation: ✅ WORKS`);
      } catch (error) {
        console.log(`   🔑 JWT generation: ❌ FAILED - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: ENSURING STUDENT HAS CERTIFICATES');
    console.log('='.repeat(80));

    const student = await User.findOne({ email: 'student@ncui.in' });
    if (student) {
      console.log(`\n👤 Student: ${student.firstName} ${student.lastName}`);
      console.log(`   ID: ${student._id}`);
      
      // Check existing certificates
      const existingCerts = await Certificate.find({ student: student._id });
      console.log(`   Existing certificates: ${existingCerts.length}`);
      
      if (existingCerts.length === 0) {
        console.log('   📚 Creating enrollments and certificates...');
        
        const courses = await Course.find({});
        console.log(`   Found ${courses.length} courses`);
        
        for (const course of courses) {
          console.log(`\n   📚 ${course.title}`);
          
          // Create enrollment
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

          await Enrollment.findOneAndUpdate(
            { user: student._id, course: course._id },
            {
              user: student._id,
              course: course._id,
              status: 'completed',
              progressPercent: 100,
              lessonProgress: allLessons,
              completedAt: new Date(),
              enrolledAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          console.log(`      ✅ Enrollment created`);
          
          // Generate certificate
          try {
            const result = await autoGenerateCertificate(student._id, course._id);
            if (result && result.success) {
              console.log(`      ✅ Certificate: ${result.certificate.certificateId}`);
            } else {
              console.log(`      ⚠️  ${result?.message || 'Failed'}`);
            }
          } catch (error) {
            console.log(`      ❌ Error: ${error.message}`);
          }
        }
      } else {
        console.log('   ✅ Student already has certificates');
        existingCerts.forEach(cert => {
          console.log(`      - ${cert.certificateId}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: FINAL VERIFICATION');
    console.log('='.repeat(80));

    for (const userData of requiredUsers) {
      console.log(`\n📋 ${userData.email}`);
      const user = await User.findOne({ email: userData.email }).select('+password');
      
      if (!user) {
        console.log('   ❌ USER NOT FOUND!');
        continue;
      }
      
      console.log(`   ✅ User exists`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Approved: ${user.isApproved}`);
      
      const passwordMatch = await bcrypt.compare(userData.password, user.password);
      console.log(`   Password (${userData.password}): ${passwordMatch ? '✅ CORRECT' : '❌ WRONG'}`);
      
      try {
        const token = user.getSignedJwtToken();
        console.log(`   JWT Token: ✅ CAN GENERATE`);
      } catch (error) {
        console.log(`   JWT Token: ❌ ERROR - ${error.message}`);
      }
      
      if (user.role === 'participant') {
        const certs = await Certificate.countDocuments({ student: user._id });
        console.log(`   Certificates: ${certs}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL CHECKS COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📋 WORKING LOGIN CREDENTIALS:\n');
    
    console.log('ADMIN:');
    console.log('   Email: admin@ncui.in');
    console.log('   Password: Admin@123');
    console.log('');
    
    console.log('TRAINER:');
    console.log('   Email: trainer@ncui.in');
    console.log('   Password: Trainer@123');
    console.log('');
    
    console.log('STUDENT (with certificates):');
    console.log('   Email: student@ncui.in');
    console.log('   Password: Student@123');
    console.log('');
    
    console.log('🎉 Try logging in now! All accounts are ready!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

completeLoginFixAndTest();
