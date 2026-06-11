import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

async function getStudentToken() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find student
    const student = await User.findOne({ email: 'student@ncui.in' });
    
    if (!student) {
      console.error('❌ Student not found');
      process.exit(1);
    }

    console.log(`✅ Found student: ${student.firstName} ${student.lastName}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   ID: ${student._id}\n`);

    // Generate token
    const token = jwt.sign(
      { _id: student._id, role: student.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🔑 Generated Token:');
    console.log(token);
    console.log('\n📋 Use this token in your API calls:');
    console.log(`Authorization: Bearer ${token}`);

    // Test certificate API
    console.log('\n🧪 Testing certificate API...');
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios.get('http://localhost:5000/api/v1/certificates/my-certificates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('\n✅ API Response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('\n❌ API Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

getStudentToken();
