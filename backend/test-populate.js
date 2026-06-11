import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseQuery from './src/models/CourseQuery.model.js';
import Participant from './src/models/Participant.model.js';

dotenv.config();

const testPopulate = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const studentId = '69f84a92065b138fba9bb0f4';
    
    // Check participant directly
    console.log('1️⃣ Checking Participant:');
    const participant = await Participant.findById(studentId);
    console.log('  ID:', participant._id);
    console.log('  First Name:', participant.firstName);
    console.log('  Last Name:', participant.lastName);
    console.log('  Email:', participant.email);
    console.log('---\n');

    // Test populate
    console.log('2️⃣ Testing Query Populate:');
    const query = await CourseQuery.findOne({ student: studentId })
      .populate('student', 'firstName lastName email');
    
    console.log('  Query ID:', query._id);
    console.log('  Question:', query.question);
    console.log('  Student (populated):');
    console.log('    ID:', query.student._id);
    console.log('    First Name:', query.student.firstName);
    console.log('    Last Name:', query.student.lastName);
    console.log('    Email:', query.student.email);
    console.log('    Full Name:', `${query.student.firstName} ${query.student.lastName}`);
    console.log('---\n');

    // Test all queries
    console.log('3️⃣ Testing All Queries:');
    const allQueries = await CourseQuery.find()
      .populate('student', 'firstName lastName email')
      .limit(3);
    
    allQueries.forEach((q, i) => {
      console.log(`  Query ${i + 1}:`);
      console.log(`    Question: ${q.question}`);
      console.log(`    Student: ${q.student.firstName} ${q.student.lastName}`);
      console.log(`    Email: ${q.student.email}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test Complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testPopulate();
