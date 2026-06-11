import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function checkCreatedBy() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all courses and check createdBy field
    const courses = await Course.find().lean();
    
    console.log('\n📚 Course createdBy vs trainer fields:');
    console.log('='.repeat(80));
    
    for (const course of courses) {
      console.log(`\nCourse: ${course.title}`);
      console.log(`  createdBy: ${course.createdBy}`);
      console.log(`  trainer: ${course.trainer}`);
      
      if (course.createdBy) {
        const creator = await User.findById(course.createdBy);
        if (creator) {
          console.log(`  Creator: ${creator.firstName} ${creator.lastName} (${creator.role})`);
        } else {
          console.log(`  Creator: NOT FOUND`);
        }
      } else {
        console.log(`  Creator: NULL/UNDEFINED`);
      }
      
      if (course.trainer) {
        const trainer = await User.findById(course.trainer);
        if (trainer) {
          console.log(`  Trainer: ${trainer.firstName} ${trainer.lastName} (${trainer.role})`);
        } else {
          console.log(`  Trainer: NOT FOUND`);
        }
      } else {
        console.log(`  Trainer: NULL/UNDEFINED`);
      }
      
      console.log('-'.repeat(80));
    }

    // Get all users to see who's who
    console.log('\n👥 All Users:');
    console.log('='.repeat(80));
    const users = await User.find().select('firstName lastName email role').lean();
    users.forEach(user => {
      console.log(`${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - ID: ${user._id}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCreatedBy();
