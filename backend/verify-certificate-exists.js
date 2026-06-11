import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Certificate from './src/models/Certificate.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function verifyCertificateExists() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the student
    const student = await User.findOne({ email: 'student@ncui.in' });
    
    if (!student) {
      console.error('❌ Student not found');
      return;
    }

    console.log(`👤 Student: ${student.firstName} ${student.lastName}`);
    console.log(`   _id: ${student._id}`);
    console.log(`   _id type: ${typeof student._id}`);
    console.log(`   _id toString: ${student._id.toString()}\n`);

    // Find ALL certificates
    console.log('📜 ALL Certificates in database:');
    const allCerts = await Certificate.find({});
    console.log(`   Total: ${allCerts.length}\n`);
    
    allCerts.forEach((cert, i) => {
      console.log(`Certificate ${i + 1}:`);
      console.log(`   Certificate ID: ${cert.certificateId}`);
      console.log(`   Student ID: ${cert.student}`);
      console.log(`   Student ID type: ${typeof cert.student}`);
      console.log(`   Student ID toString: ${cert.student.toString()}`);
      console.log(`   Course ID: ${cert.course}`);
      console.log(`   Match: ${cert.student.toString() === student._id.toString()}`);
      console.log('');
    });

    // Find certificates for this specific student
    console.log('🔍 Querying certificates for student...');
    const studentCerts = await Certificate.find({ student: student._id });
    console.log(`   Found: ${studentCerts.length} certificate(s)\n`);

    if (studentCerts.length > 0) {
      studentCerts.forEach((cert, i) => {
        console.log(`Student Certificate ${i + 1}:`);
        console.log(`   Certificate ID: ${cert.certificateId}`);
        console.log(`   Course ID: ${cert.course}`);
        console.log(`   Status: ${cert.status}`);
        console.log(`   Issue Date: ${cert.issueDate}`);
      });
    } else {
      console.log('❌ No certificates found for this student!');
      console.log('   This means the student ID in the certificate does not match');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

verifyCertificateExists();
