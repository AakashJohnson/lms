import mongoose from 'mongoose';
import LiveSession from './src/models/LiveSession.model.js';
import Participant from './src/models/Participant.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

async function checkEnrollment() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const sessions = await LiveSession.find({ isActive: true })
      .populate('enrolledStudents.student', 'firstName lastName email');

    console.log(`📊 Total Sessions: ${sessions.length}\n`);

    for (const session of sessions) {
      console.log(`Session: ${session.title}`);
      console.log(`  ID: ${session._id}`);
      console.log(`  Enrolled Students (${session.enrolledStudents.length}):`);
      
      if (session.enrolledStudents.length === 0) {
        console.log('    (none)');
      } else {
        session.enrolledStudents.forEach((enrollment, idx) => {
          console.log(`    ${idx + 1}. Student ID: ${enrollment.student._id || enrollment.student}`);
          console.log(`       Name: ${enrollment.student.firstName} ${enrollment.student.lastName}`);
          console.log(`       Email: ${enrollment.student.email}`);
          console.log(`       Enrolled At: ${enrollment.enrolledAt}`);
          console.log(`       Attended: ${enrollment.attended}`);
        });
      }
      console.log('---\n');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkEnrollment();
