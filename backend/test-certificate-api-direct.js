import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function testCertificateAPIDirect() {
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
    console.log(`   ID: ${student._id}\n`);

    // Get certificates exactly as the API does
    const certificates = await Certificate.find({ student: student._id })
      .populate('course', 'title slug thumbnail')
      .sort('-issueDate');

    console.log(`📜 Found ${certificates.length} certificate(s)\n`);

    certificates.forEach((cert, index) => {
      console.log(`Certificate ${index + 1}:`);
      console.log(`   Certificate ID: ${cert.certificateId}`);
      console.log(`   Course (populated):`, cert.course);
      console.log(`   Course._id: ${cert.course?._id}`);
      console.log(`   Course.title: ${cert.course?.title}`);
      console.log(`   Status: ${cert.status}`);
      console.log(`   PDF URL: ${cert.pdfUrl}`);
      console.log('');
    });

    // Simulate API response
    console.log('📋 API Response (as JSON):');
    const apiResponse = {
      success: true,
      count: certificates.length,
      data: certificates.map(cert => ({
        _id: cert._id,
        certificateId: cert.certificateId,
        course: {
          _id: cert.course._id.toString(),
          title: cert.course.title,
          slug: cert.course.slug,
          thumbnail: cert.course.thumbnail
        },
        student: cert.student,
        completionDate: cert.completionDate,
        issueDate: cert.issueDate,
        status: cert.status,
        qrCodeUrl: cert.qrCodeUrl,
        pdfUrl: cert.pdfUrl,
        metadata: cert.metadata
      }))
    };

    console.log(JSON.stringify(apiResponse, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testCertificateAPIDirect();
