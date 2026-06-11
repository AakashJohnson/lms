/**
 * Check Video URLs in Database
 * This script checks what video URLs are saved in course lessons
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';

dotenv.config();

async function checkVideoUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    const courses = await Course.find({}).lean();
    console.log(`📚 Found ${courses.length} courses\n`);

    for (const course of courses) {
      console.log(`\n📖 Course: ${course.title}`);
      console.log(`   ID: ${course._id}`);
      
      if (!course.sections || course.sections.length === 0) {
        console.log('   ⚠️  No sections found');
        continue;
      }

      for (const section of course.sections) {
        console.log(`\n   📂 Section: ${section.title}`);
        
        if (!section.lessons || section.lessons.length === 0) {
          console.log('      ⚠️  No lessons found');
          continue;
        }

        for (const lesson of section.lessons) {
          if (lesson.type === 'video') {
            console.log(`\n      🎬 Lesson: ${lesson.title}`);
            console.log(`         Type: ${lesson.type}`);
            console.log(`         videoUrl: ${lesson.videoUrl || '(empty)'}`);
            console.log(`         lessonVideo: ${lesson.lessonVideo || '(empty)'}`);
            
            if (!lesson.videoUrl && !lesson.lessonVideo) {
              console.log('         ❌ NO VIDEO URL FOUND!');
            } else if (lesson.videoUrl && lesson.videoUrl.startsWith('blob:')) {
              console.log('         ❌ BLOB URL DETECTED (local only, not accessible)');
            } else if (lesson.lessonVideo && lesson.lessonVideo.startsWith('blob:')) {
              console.log('         ❌ BLOB URL DETECTED in lessonVideo (local only, not accessible)');
            } else {
              console.log('         ✅ Valid URL found');
            }
          }
        }
      }
    }

    console.log('\n\n✅ Check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVideoUrls();
