import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function checkTrainerEnrollments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find trainer
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });
    if (!trainer) {
      console.log('❌ Trainer not found');
      return;
    }
    console.log(`👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName} (${trainer._id})\n`);

    // Find trainer's courses
    const courses = await Course.find({
      $or: [{ instructor: trainer._id }, { createdBy: trainer._id }]
    }).select('title currentEnrollments isPublished');

    console.log(`📚 Trainer's Courses: ${courses.length}\n`);

    let totalEnrollmentsFromDB = 0;
    let totalFromCurrentEnrollments = 0;

    for (const course of courses) {
      // Get actual enrollments from Enrollment model
      const enrollments = await Enrollment.find({ course: course._id });
      const enrollmentCount = enrollments.length;
      
      totalEnrollmentsFromDB += enrollmentCount;
      totalFromCurrentEnrollments += course.currentEnrollments || 0;

      console.log(`\n📖 Course: ${course.title}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Published: ${course.isPublished ? 'Yes' : 'No'}`);
      console.log(`   currentEnrollments field: ${course.currentEnrollments || 0}`);
      console.log(`   Actual enrollments in DB: ${enrollmentCount}`);
      
      if (enrollmentCount !== (course.currentEnrollments || 0)) {
        console.log(`   ⚠️  MISMATCH! Field says ${course.currentEnrollments || 0} but DB has ${enrollmentCount}`);
      }

      // Show enrollment details
      if (enrollments.length > 0) {
        console.log(`   Enrollments:`);
        for (const enrollment of enrollments.slice(0, 5)) {
          const student = await User.findById(enrollment.student).select('firstName lastName email');
          console.log(`     - ${student?.firstName} ${student?.lastName} (${enrollment.status})`);
        }
        if (enrollments.length > 5) {
          console.log(`     ... and ${enrollments.length - 5} more`);
        }
      }
    }

    console.log(`\n\n📊 SUMMARY:`);
    console.log(`   Total courses: ${courses.length}`);
    console.log(`   Total from currentEnrollments field: ${totalFromCurrentEnrollments}`);
    console.log(`   Total from Enrollment model: ${totalEnrollmentsFromDB}`);
    
    if (totalFromCurrentEnrollments !== totalEnrollmentsFromDB) {
      console.log(`\n   ⚠️  MISMATCH DETECTED!`);
      console.log(`   The currentEnrollments field is out of sync with actual enrollments.`);
      console.log(`\n   💡 Solution: Run sync script to update currentEnrollments field`);
    } else {
      console.log(`\n   ✅ All counts match!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkTrainerEnrollments();
