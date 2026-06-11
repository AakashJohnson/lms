import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import CourseQuery from './src/models/CourseQuery.model.js';

dotenv.config();

const checkStudentData = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const studentId = '69f84a92065b138fba9bb0f4';
    
    console.log('📝 Checking Student Data...');
    console.log('Student ID:', studentId);
    console.log('---\n');

    // Check in User collection
    console.log('1️⃣ Checking User Collection:');
    const user = await User.findById(studentId);
    if (user) {
      console.log('✅ User found in User collection:');
      console.log('  ID:', user._id);
      console.log('  Name:', user.name);
      console.log('  Email:', user.email);
      console.log('  Role:', user.role);
    } else {
      console.log('❌ User NOT found in User collection');
    }
    console.log('---\n');

    // Check in Participant collection
    console.log('2️⃣ Checking Participant Collection:');
    const Participant = (await import('./src/models/Participant.model.js')).default;
    const participant = await Participant.findById(studentId);
    if (participant) {
      console.log('✅ Found in Participant collection:');
      console.log('  ID:', participant._id);
      console.log('  Name:', participant.name);
      console.log('  Email:', participant.email);
    } else {
      console.log('❌ NOT found in Participant collection');
    }
    console.log('---\n');

    // Check query with populate
    console.log('3️⃣ Testing Query Populate:');
    const query = await CourseQuery.findOne({ student: studentId })
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('trainer', 'name email');
    
    if (query) {
      console.log('✅ Query found:');
      console.log('  Query ID:', query._id);
      console.log('  Question:', query.question);
      console.log('  Student (populated):', query.student);
      console.log('  Course (populated):', query.course);
      console.log('  Trainer (populated):', query.trainer);
    } else {
      console.log('❌ Query not found');
    }
    console.log('---\n');

    // Check all users
    console.log('4️⃣ All Users in Database:');
    const allUsers = await User.find().select('_id name email role');
    console.log(`Total Users: ${allUsers.length}`);
    allUsers.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} (${u.email}) - ${u.role} - ID: ${u._id}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

checkStudentData();
