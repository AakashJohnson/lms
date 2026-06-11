import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Course from './src/models/Course.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function testCertificateAPI() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Pratham user
    const pratham = await User.findOne({ email: 'pratham@ncui.in' });
    
    if (!pratham) {
      console.log('❌ Pratham user not found!');
      return;
    }

    console.log('👤 Testing for user:');
    console.log(`   Name: ${pratham.firstName} ${pratham.lastName}`);
    console.log(`   Email: ${pratham.email}`);
    console.log(`   ID: ${pratham._id}`);
    console.log('');

    // Simulate the getMyCertificates API call
    console.log('📜 Simulating getMyCertificates API call...');
    console.log(`   Query: { student: "${pratham._id}" }`);
    console.log('');

    const certificates = await Certificate.find({ student: pratham._id })
      .populate('course', 'title slug thumbnail')
      .sort('-issueDate');

    console.log(`✅ Found ${certificates.length} certificates:\n`);

    certificates.forEach((cert, i) => {
      console.log(`${i + 1}. Certificate ID: ${cert.certificateId}`);
      console.log(`   Course: ${cert.course?.title}`);
      console.log(`   Course ID: ${cert.course?._id}`);
      console.log(`   Student ID: ${cert.student}`);
      console.log(`   Issue Date: ${cert.issueDate}`);
      console.log(`   Status: ${cert.status}`);
      console.log('');
    });

    // Get all courses
    const courses = await Course.find({});
    console.log(`📚 Available courses (${courses.length}):`);
    courses.forEach((course, i) => {
      console.log(`${i + 1}. ${course.title}`);
      console.log(`   ID: ${course._id}`);
      
      // Check if certificate exists for this course
      const cert = certificates.find(c => c.course?._id.toString() === course._id.toString());
      if (cert) {
        console.log(`   ✅ Certificate: ${cert.certificateId}`);
      } else {
        console.log(`   ❌ No certificate`);
      }
      console.log('');
    });

    // Test the API response format
    console.log('📤 API Response would be:');
    console.log(JSON.stringify({
      success: true,
      count: certificates.length,
      data: certificates.map(c => ({
        certificateId: c.certificateId,
        course: {
          _id: c.course?._id,
          title: c.course?.title
        },
        student: c.student,
        issueDate: c.issueDate,
        status: c.status
      }))
    }, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testCertificateAPI();
