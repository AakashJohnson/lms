import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Certificate from './src/models/Certificate.model.js';
import { autoGenerateCertificate } from './src/services/certificateGenerator.service.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkPrathamStudent() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Search for Pratham user
    console.log('🔍 Searching for Pratham user...\n');
    
    const prathamUsers = await User.find({
      $or: [
        { firstName: /pratham/i },
        { lastName: /pratham/i },
        { email: /pratham/i }
      ]
    });

    if (prathamUsers.length === 0) {
      console.log('❌ No user found with name "Pratham"');
      console.log('\n📋 All participants:');
      const allParticipants = await User.find({ role: 'participant' });
      allParticipants.forEach(u => {
        console.log(`   - ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u._id}`);
      });
      return;
    }

    console.log(`✅ Found ${prathamUsers.length} user(s) with name Pratham:\n`);

    for (const user of prathamUsers) {
      console.log(`${'='.repeat(80)}`);
      console.log(`👤 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log(`${'='.repeat(80)}\n`);

      // Check enrollments
      const enrollments = await Enrollment.find({ user: user._id }).populate('course', 'title');
      console.log(`📚 Enrollments: ${enrollments.length}`);
      
      if (enrollments.length === 0) {
        console.log('   No enrollments found\n');
        continue;
      }

      enrollments.forEach(e => {
        console.log(`   - ${e.course?.title || 'Unknown'}`);
        console.log(`     Status: ${e.status}`);
        console.log(`     Progress: ${e.progressPercent}%`);
        console.log(`     Completed: ${e.completedAt ? new Date(e.completedAt).toLocaleString() : 'Not completed'}`);
      });

      // Check certificates
      const certificates = await Certificate.find({ student: user._id }).populate('course', 'title');
      console.log(`\n🎓 Certificates: ${certificates.length}`);
      
      if (certificates.length === 0) {
        console.log('   No certificates found');
      } else {
        certificates.forEach(cert => {
          console.log(`   ✅ ${cert.course.title}: ${cert.certificateId} (${cert.status})`);
        });
      }

      // Generate certificates for completed courses
      const completedEnrollments = enrollments.filter(e => e.status === 'completed' && e.progressPercent === 100);
      
      if (completedEnrollments.length > 0) {
        console.log(`\n🎯 Generating certificates for ${completedEnrollments.length} completed course(s)...\n`);
        
        for (const enrollment of completedEnrollments) {
          const course = enrollment.course;
          console.log(`   📚 ${course.title}`);

          // Check if certificate exists
          const existing = await Certificate.findOne({
            student: user._id,
            course: course._id
          });

          if (existing) {
            console.log(`      ✅ Certificate already exists: ${existing.certificateId}`);
            continue;
          }

          // Generate certificate
          console.log(`      🎓 Generating certificate...`);
          try {
            const result = await autoGenerateCertificate(user._id, course._id);
            if (result && result.success) {
              console.log(`      ✅ Certificate generated: ${result.certificate.certificateId}`);
            } else {
              console.log(`      ⚠️  ${result?.message || 'Failed to generate'}`);
            }
          } catch (error) {
            console.log(`      ❌ Error: ${error.message}`);
          }
        }
      } else {
        console.log('\n⚠️  No completed courses found for this user');
      }

      console.log('\n');
    }

    console.log('✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkPrathamStudent();
