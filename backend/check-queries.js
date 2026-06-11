import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CourseQuery from './src/models/CourseQuery.model.js';

dotenv.config();

const checkQueries = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all queries (without populate to avoid schema issues)
    const queries = await CourseQuery.find()
      .sort({ createdAt: -1 });

    console.log(`📊 Total Queries in Database: ${queries.length}\n`);

    if (queries.length === 0) {
      console.log('❌ No queries found in database!');
      console.log('\nPossible reasons:');
      console.log('1. Query not saved due to validation error');
      console.log('2. Wrong collection name');
      console.log('3. Database connection issue');
      console.log('4. Authorization issue\n');
    } else {
      console.log('✅ Queries found:\n');
      queries.forEach((query, index) => {
        console.log(`Query #${index + 1}:`);
        console.log(`  ID: ${query._id}`);
        console.log(`  Question: ${query.question}`);
        console.log(`  Student ID: ${query.student}`);
        console.log(`  Course ID: ${query.course}`);
        console.log(`  Trainer ID: ${query.trainer || 'Not assigned'}`);
        console.log(`  Status: ${query.status}`);
        console.log(`  Category: ${query.category}`);
        console.log(`  Created: ${query.createdAt}`);
        console.log(`  Replies: ${query.replies?.length || 0}`);
        console.log('---\n');
      });
    }

    // Check collection stats
    const stats = await mongoose.connection.db.collection('coursequeries').stats();
    console.log('📈 Collection Stats:');
    console.log(`  Collection: coursequeries`);
    console.log(`  Document Count: ${stats.count}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Indexes: ${stats.nindexes}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

checkQueries();
