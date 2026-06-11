import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function findCourseById() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const courseId = process.argv[2] || '69fb8a1f27c8be4cca1a14';
    console.log(`🔍 Looking for course: ${courseId}\n`);

    const course = await Course.findById(courseId);
    
    if (course) {
      console.log('✅ Course found:');
      console.log(`   ID: ${course._id}`);
      console.log(`   Title: ${course.title}`);
      console.log(`   Slug: ${course.slug}`);
      console.log(`   Status: ${course.status}`);
    } else {
      console.log('❌ Course not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

findCourseById();
