import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseQuery from './src/models/CourseQuery.model.js';

dotenv.config();

const testDirectQuery = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const studentId = '69f84a92065b138fba9bb0f4'; // From database check

    console.log(`🔍 Searching for queries with student ID: ${studentId}\n`);

    // Test 1: Find without populate
    const queriesRaw = await CourseQuery.find({ student: studentId });
    console.log(`✅ Raw query (no populate): Found ${queriesRaw.length} queries`);

    // Test 2: Find with populate
    try {
      const queriesPopulated = await CourseQuery.find({ student: studentId })
        .populate('course', 'title thumbnail')
        .populate('trainer', 'name email')
        .populate('replies.repliedBy', 'name email')
        .sort({ createdAt: -1 });
      
      console.log(`✅ Populated query: Found ${queriesPopulated.length} queries`);
      
      if (queriesPopulated.length > 0) {
        console.log('\n📋 First Query Details:');
        const first = queriesPopulated[0];
        console.log(`  Question: ${first.question}`);
        console.log(`  Status: ${first.status}`);
        console.log(`  Category: ${first.category}`);
        console.log(`  Course: ${first.course?.title || 'Not populated'}`);
        console.log(`  Trainer: ${first.trainer?.name || 'Not populated'}`);
        console.log(`  Created: ${first.createdAt}`);
      }
    } catch (popError) {
      console.error('❌ Error with populate:', popError.message);
      console.log('  This might be the issue - populate failing');
    }

    await mongoose.disconnect();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testDirectQuery();
