import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const runTest = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';
    console.log('🔌 Connecting to MongoDB at', mongoUri.split('@').pop(), '...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the student user
    const studentEmail = 'student@ncui.in';
    const user = await User.findOne({ email: studentEmail });
    if (!user) {
      console.error(`❌ Student user (${studentEmail}) not found.`);
      await mongoose.connection.close();
      return;
    }

    const token = user.getSignedJwtToken();
    console.log(`🔑 Generated token for ${studentEmail}: ${token.substring(0, 20)}...`);

    // Disconnect DB before making HTTP calls
    await mongoose.connection.close();

    const testQueries = ['exms', 'how to play course lecutres', 'quiz'];

    for (const q of testQueries) {
      console.log(`\n🔍 Sending query: "${q}"`);
      const start = Date.now();
      try {
        const response = await axios.post('http://localhost:5000/api/v1/smart-search', 
          { query: q },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        const duration = Date.now() - start;
        console.log(`🚀 Done in ${duration}ms (controller reported: ${response.data.data.meta.latencyMs}ms)`);
        console.log('✅ Status:', response.data.success);
        console.log('✅ Corrected query:', response.data.data.query);
        console.log('✅ Suggestions:', response.data.data.suggestions);
        console.log('✅ Trending:', response.data.data.trending);
        console.log('✅ Intent Category:', response.data.data.intentCategory);
        console.log('✅ Results count:', Object.keys(response.data.data.results).reduce((acc, key) => {
          acc[key] = response.data.data.results[key].length;
          return acc;
        }, {}));
      } catch (err) {
        console.error('❌ Request error:', err.response?.data || err.message);
      }
    }

  } catch (error) {
    console.error('❌ General error:', error);
  }
};

runTest();
