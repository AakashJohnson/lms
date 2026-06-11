import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Course from './src/models/Course.model.js';
import dotenv from 'dotenv';

dotenv.config();

const forceDeleteCertificates = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    const user = await User.findOne({ email: 'pratham.sharma@ncui.in' });
    
    if (!user) {
      console.log('❌ User pratham.sharma@ncui.in does NOT exist');
      console.log('⚠️  Cannot delete certificates - user not found');
      await mongoose.connection.close();
      return;
    }
    
    console.log('📋 User found:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}\n`);
    
    // Find certificates for this user
    const certificates = await Certificate.find({ student: user._id })
      .populate('course', 'title');
    
    if (certificates.length === 0) {
      console.log('✅ No certificates found for this user');
    } else {
      console.log(`🔍 Found ${certificates.length} certificate(s) for pratham.sharma@ncui.in:\n`);
      
      for (const cert of certificates) {
        console.log(`📜 Certificate: ${cert.certificateId}`);
        console.log(`   Course: ${cert.course?.title}`);
        console.log(`   Issue Date: ${cert.issueDate}`);
        console.log(`   Status: ${cert.status}`);
        console.log(`   PDF: ${cert.pdfUrl}`);
        
        // Delete the certificate
        await Certificate.findByIdAndDelete(cert._id);
        console.log(`   ✅ DELETED\n`);
      }
      
      console.log(`✅ Successfully deleted ${certificates.length} certificate(s) for pratham.sharma@ncui.in`);
    }
    
    // Show remaining certificates
    console.log('\n📊 REMAINING CERTIFICATES IN DATABASE:');
    console.log('=' .repeat(60));
    
    const allCerts = await Certificate.find({})
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');
    
    console.log(`Total certificates: ${allCerts.length}\n`);
    
    allCerts.forEach((cert, i) => {
      console.log(`${i + 1}. ${cert.certificateId}`);
      console.log(`   Student: ${cert.student?.firstName} ${cert.student?.lastName} (${cert.student?.email})`);
      console.log(`   Course: ${cert.course?.title}`);
      console.log(`   Status: ${cert.status}`);
      console.log('');
    });
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

forceDeleteCertificates();
