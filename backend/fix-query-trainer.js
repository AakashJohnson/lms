import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseQuery from './src/models/CourseQuery.model.js';

dotenv.config();

const fixQueryTrainer = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    // Get all queries
    const queries = await CourseQuery.find();
    console.log(`📊 Total Queries: ${queries.length}\n`);

    if (queries.length === 0) {
      console.log('❌ No queries found');
      await mongoose.disconnect();
      return;
    }

    // Show current trainer IDs
    console.log('Current Trainer IDs in queries:');
    const trainerIds = [...new Set(queries.map(q => q.trainer.toString()))];
    trainerIds.forEach((id, index) => {
      const count = queries.filter(q => q.trainer.toString() === id).length;
      console.log(`  ${index + 1}. ${id} (${count} queries)`);
    });

    console.log('\n📝 To fix authorization issue:');
    console.log('1. Check logged-in trainer ID in browser console:');
    console.log('   const user = JSON.parse(localStorage.getItem("user"));');
    console.log('   console.log("Trainer ID:", user._id || user.id);');
    console.log('\n2. If trainer ID is different, run this script with the correct ID:');
    console.log('   node fix-query-trainer.js <new-trainer-id>');
    console.log('\n3. Or update queries manually in MongoDB Compass');

    // If trainer ID provided as argument, update all queries
    if (process.argv[2]) {
      const newTrainerId = process.argv[2];
      console.log(`\n🔄 Updating all queries to trainer ID: ${newTrainerId}`);
      
      const result = await CourseQuery.updateMany(
        {},
        { $set: { trainer: newTrainerId } }
      );

      console.log(`✅ Updated ${result.modifiedCount} queries`);
      
      // Verify
      const updated = await CourseQuery.find({ trainer: newTrainerId });
      console.log(`✅ Verified: ${updated.length} queries now have trainer ID: ${newTrainerId}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixQueryTrainer();
