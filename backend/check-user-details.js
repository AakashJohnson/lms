import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
  console.log('Connected to DB');

  const users = await User.find({ role: 'trainer' });
  for (const u of users) {
    console.log(`\nTrainer: ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u._id}`);
    
    // Find courses where this trainer is the trainer field or createdBy field
    const courses = await Course.find({
      $or: [
        { trainer: u._id },
        { createdBy: u._id }
      ]
    });
    console.log(`  Courses (${courses.length}):`);
    for (const c of courses) {
      // get enrollments
      const enrolls = await Enrollment.countDocuments({ course: c._id });
      console.log(`    - [${c._id}] ${c.title} (Enrollments count field: ${c.currentEnrollments}, actual enrollments doc count: ${enrolls})`);
    }
  }
  await mongoose.disconnect();
}
check();
