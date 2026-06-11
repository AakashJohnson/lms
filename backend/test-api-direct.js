import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function testAPIDirect() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Pratham Sharma user
    const user = await User.findOne({ email: 'pratham.sharma@ncui.in' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('👤 User Found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   ID Type: ${typeof user._id}`);
    console.log('');

    // Generate JWT token (simulating login)
    const token = jwt.sign(
      { _id: user._id, id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || '<JWT_SECRET_FROM_ENV>',
      { expiresIn: '30d' }
    );

    console.log('🔑 Generated JWT Token:');
    console.log(`   ${token.substring(0, 50)}...`);
    console.log('');

    // Simulate the getMyCertificates API call
    console.log('📜 Simulating getMyCertificates API call...');
    console.log(`   Query: Certificate.find({ student: "${user._id}" })`);
    console.log('');

    // Try different query methods
    console.log('Method 1: Using user._id directly');
    const certs1 = await Certificate.find({ student: user._id });
    console.log(`   Result: ${certs1.length} certificates`);

    console.log('\nMethod 2: Using user._id.toString()');
    const certs2 = await Certificate.find({ student: user._id.toString() });
    console.log(`   Result: ${certs2.length} certificates`);

    console.log('\nMethod 3: Using mongoose.Types.ObjectId');
    const certs3 = await Certificate.find({ student: mongoose.Types.ObjectId(user._id) });
    console.log(`   Result: ${certs3.length} certificates`);

    console.log('\n📋 All certificates in database:');
    const allCerts = await Certificate.find({}).select('student certificateId');
    allCerts.forEach(cert => {
      console.log(`   - ${cert.certificateId}: student=${cert.student} (${typeof cert.student})`);
      console.log(`     Match with user._id? ${cert.student.toString() === user._id.toString()}`);
    });

    console.log('\n✅ Certificates for Pratham Sharma:');
    const userCerts = await Certificate.find({ student: user._id })
      .populate('course', 'title');
    
    if (userCerts.length === 0) {
      console.log('   ❌ NO CERTIFICATES FOUND!');
      console.log('   This is the problem - certificates exist but query is not finding them');
    } else {
      userCerts.forEach(cert => {
        console.log(`   ✅ ${cert.course?.title}: ${cert.certificateId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testAPIDirect();
