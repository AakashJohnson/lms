import mongoose from 'mongoose';
import LiveSession from './src/models/LiveSession.model.js';
import Participant from './src/models/Participant.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

async function testEnrollmentCheck() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the session
    const session = await LiveSession.findOne({ title: 'dada' })
      .populate('enrolledStudents.student', 'firstName lastName email');

    if (!session) {
      console.log('❌ Session not found');
      return;
    }

    console.log(`Session: ${session.title} (${session._id})`);
    console.log(`Enrolled Students: ${session.enrolledStudents.length}\n`);

    // Test with the enrolled student ID
    const enrolledStudentId = '69f84a92065b138fba9bb0f4';
    console.log(`Testing with student ID: ${enrolledStudentId}`);
    
    const isEnrolled = session.isStudentEnrolled(enrolledStudentId);
    console.log(`isStudentEnrolled result: ${isEnrolled}\n`);

    // Show enrolled student IDs
    console.log('Enrolled student IDs:');
    session.enrolledStudents.forEach((enrollment, idx) => {
      const studentId = enrollment.student._id || enrollment.student;
      console.log(`  ${idx + 1}. ${studentId} (type: ${typeof studentId})`);
      console.log(`     toString(): ${studentId.toString()}`);
      console.log(`     Match: ${studentId.toString() === enrolledStudentId.toString()}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testEnrollmentCheck();
