import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import dotenv from 'dotenv';

dotenv.config();

const assignCoursesToVikas = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Find Vikas Kumar
    const vikas = await User.findOne({ email: 'trainer@ncui.in' });
    
    if (!vikas) {
      console.log('❌ Vikas Kumar not found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Vikas Kumar Details:');
    console.log(`   ID: ${vikas._id}`);
    console.log(`   Name: ${vikas.firstName} ${vikas.lastName}`);
    console.log(`   Email: ${vikas.email}`);
    console.log('');

    // Find all courses
    const allCourses = await Course.find({});
    console.log(`📚 Total courses in database: ${allCourses.length}\n`);

    // Show current course trainers
    console.log('📋 Current Course Trainers:');
    for (const course of allCourses) {
      console.log(`   ${course.title} - Trainer: ${course.trainer || 'None'}`);
    }
    console.log('');

    // Update courses using updateMany to bypass validation
    const result = await Course.updateMany(
      {},
      { 
        $set: { 
          trainer: vikas._id,
          createdBy: vikas._id
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} course(s)`);
    console.log('');

    // Verify
    const vikasCourses = await Course.find({ trainer: vikas._id });
    console.log(`📊 Vikas Kumar now has ${vikasCourses.length} course(s):`);
    vikasCourses.forEach(course => {
      console.log(`   - ${course.title}`);
    });

    await mongoose.connection.close();
    console.log('');
    console.log('✅ Database connection closed');
    console.log('');
    console.log('🔄 Now refresh the page to see Vikas Kumar\'s courses!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

assignCoursesToVikas();
