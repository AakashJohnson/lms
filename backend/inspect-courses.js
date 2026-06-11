import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
  const courses = await Course.find({}).lean();
  console.log(`Found ${courses.length} courses:`);
  for (const c of courses) {
    console.log(`\nCourse: "${c.title}" (ID: ${c._id})`);
    console.log(`  Created By: ${c.createdBy}`);
    console.log(`  Trainer: ${c.trainer}`);
    console.log(`  Sections:`);
    if (!c.sections || c.sections.length === 0) {
      console.log(`    (No sections)`);
    } else {
      for (const s of c.sections) {
        console.log(`    Section: "${s.title}" (ID: ${s._id})`);
        if (!s.lessons || s.lessons.length === 0) {
          console.log(`      (No lessons)`);
        } else {
          for (const l of s.lessons) {
            console.log(`      Lesson: "${l.title}" (ID: ${l._id}, Type: ${l.type})`);
          }
        }
      }
    }
  }
  await mongoose.disconnect();
}
check();
