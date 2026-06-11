import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';

dotenv.config();

async function checkCourseTrainer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a course and check its trainer field
    const courses = await Course.find().limit(5).lean();
    
    console.log('\n📚 Course Trainer Fields:');
    console.log('='.repeat(60));
    
    for (const course of courses) {
      console.log(`\nCourse: ${course.title}`);
      console.log(`Trainer field type: ${typeof course.trainer}`);
      console.log(`Trainer value: ${JSON.stringify(course.trainer, null, 2)}`);
      console.log('-'.repeat(60));
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCourseTrainer();
