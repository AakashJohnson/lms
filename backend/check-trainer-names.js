import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

async function checkTrainerNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all trainers
    const trainers = await Trainer.find({}).select('_id firstName lastName email fullName name').lean();
    console.log('📋 All Trainers in Database:');
    console.log('═'.repeat(80));
    trainers.forEach((trainer, idx) => {
      console.log(`${idx + 1}. ID: ${trainer._id}`);
      console.log(`   firstName: "${trainer.firstName || 'N/A'}"`);
      console.log(`   lastName: "${trainer.lastName || 'N/A'}"`);
      console.log(`   fullName: "${trainer.fullName || 'N/A'}"`);
      console.log(`   name: "${trainer.name || 'N/A'}"`);
      console.log(`   email: ${trainer.email}`);
      console.log('');
    });

    // Get all courses with trainer info
    const courses = await Course.find({})
      .select('title trainer createdBy')
      .populate('trainer', 'firstName lastName fullName name email')
      .lean();

    console.log('\n📚 All Courses with Trainer Info:');
    console.log('═'.repeat(80));
    courses.forEach((course, idx) => {
      console.log(`${idx + 1}. Course: "${course.title}"`);
      console.log(`   Trainer ID: ${course.trainer}`);
      if (typeof course.trainer === 'object' && course.trainer !== null) {
        console.log(`   Trainer Name: ${course.trainer.fullName || course.trainer.name || `${course.trainer.firstName} ${course.trainer.lastName}`}`);
        console.log(`   Trainer Email: ${course.trainer.email}`);
      }
      console.log(`   Created By: ${course.createdBy}`);
      console.log('');
    });

    // Check if trainer@ncui.in exists
    const trainerUser = await Trainer.findOne({ email: 'trainer@ncui.in' }).lean();
    console.log('\n🔍 Trainer User (trainer@ncui.in):');
    console.log('═'.repeat(80));
    if (trainerUser) {
      console.log(`ID: ${trainerUser._id}`);
      console.log(`firstName: "${trainerUser.firstName}"`);
      console.log(`lastName: "${trainerUser.lastName}"`);
      console.log(`fullName: "${trainerUser.fullName || 'N/A'}"`);
      console.log(`name: "${trainerUser.name || 'N/A'}"`);
      console.log(`email: ${trainerUser.email}`);
    } else {
      console.log('❌ Not found!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTrainerNames();
