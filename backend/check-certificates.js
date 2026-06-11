import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Certificate from './src/models/Certificate.model.js';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function checkCertificates() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all certificates
    const certificates = await Certificate.find()
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`📜 Found ${certificates.length} certificate(s):\n`);

    certificates.forEach((cert, index) => {
      console.log(`${index + 1}. Certificate ID: ${cert.certificateId}`);
      console.log(`   Student: ${cert.student?.firstName} ${cert.student?.lastName} (${cert.student?.email})`);
      console.log(`   Course: ${cert.course?.title}`);
      console.log(`   Status: ${cert.status}`);
      console.log(`   Issue Date: ${cert.issueDate.toLocaleDateString()}`);
      console.log(`   Verification Token: ${cert.verificationToken}`);
      console.log(`   QR Code: ${cert.qrCodeUrl}`);
      console.log(`   PDF: ${cert.pdfUrl}`);
      console.log(`   Verification Count: ${cert.verificationCount}`);
      console.log(`   🔗 Verification URL: http://localhost:5173/verify/${cert.verificationToken}`);
      console.log('');
    });

    if (certificates.length === 0) {
      console.log('⚠️  No certificates found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCertificates();
