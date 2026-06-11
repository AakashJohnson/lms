import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function fixCourseOwnership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the trainer@ncui.in user (the one you're logging in with)
    const correctTrainer = await User.findOne({ email: 'trainer@ncui.in' });
    
    if (!correctTrainer) {
      console.log('❌ trainer@ncui.in not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n✅ Found correct trainer: ${correctTrainer.firstName} ${correctTrainer.lastName}`);
    console.log(`   Email: ${correctTrainer.email}`);
    console.log(`   ID: ${correctTrainer._id}`);

    // Update all courses to be owned by this trainer
    const result = await Course.updateMany(
      {},
      {
        $set: {
          createdBy: correctTrainer._id,
          trainer: correctTrainer._id
        }
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} courses`);

    // Verify the update
    const courses = await Course.find().select('title createdBy trainer').lean();
    console.log('\n📚 Updated courses:');
    console.log('='.repeat(80));
    for (const course of courses) {
      console.log(`${course.title}:`);
      console.log(`  createdBy: ${course.createdBy}`);
      console.log(`  trainer: ${course.trainer}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCourseOwnership();
