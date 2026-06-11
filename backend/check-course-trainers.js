/**
 * Check Course Trainers
 * This script checks if courses have proper trainer assignments
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import CourseQuery from './src/models/CourseQuery.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function checkCourseTrainers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Check courses
    const courses = await Course.find({}).populate('trainer', 'name email').lean();
    console.log(`📚 Found ${courses.length} courses\n`);

    for (const course of courses) {
      console.log(`\n📖 Course: ${course.title}`);
      console.log(`   ID: ${course._id}`);
      console.log(`   Trainer: ${course.trainer ? (course.trainer.name || course.trainer.email || course.trainer) : '❌ NO TRAINER'}`);
      console.log(`   Trainer ID: ${course.trainer?._id || course.trainer || '❌ EMPTY'}`);
    }

    // Check queries
    console.log('\n\n🔍 Checking Course Queries...\n');
    const queries = await CourseQuery.find({})
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('trainer', 'name email')
      .lean();

    console.log(`📝 Found ${queries.length} queries\n`);

    for (const query of queries) {
      console.log(`\n❓ Query: ${query.question.substring(0, 50)}...`);
      console.log(`   Student: ${query.student?.name || query.student?.email || query.student}`);
      console.log(`   Course: ${query.course?.title || query.course}`);
      console.log(`   Trainer: ${query.trainer ? (query.trainer.name || query.trainer.email || query.trainer) : '❌ NO TRAINER'}`);
      console.log(`   Status: ${query.status}`);
      console.log(`   Replies: ${query.replies?.length || 0}`);
    }

    console.log('\n\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCourseTrainers();
