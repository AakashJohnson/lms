import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Course from './src/models/Course.model.js';
import dotenv from 'dotenv';

dotenv.config();

const removeInvalidCertificates = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Check if pratham.sharma@ncui.in user exists
    const user = await User.findOne({ email: 'pratham.sharma@ncui.in' });
    
    if (!user) {
      console.log('❌ User pratham.sharma@ncui.in does NOT exist in database');
      console.log('🔍 Finding certificates for this email...\n');
      
      // Find all certificates with this email in student field
      const certificates = await Certificate.find({})
        .populate('student', 'firstName lastName email');
      
      const invalidCerts = certificates.filter(cert => 
        cert.student && cert.student.email === 'pratham.sharma@ncui.in'
      );
      
      if (invalidCerts.length === 0) {
        console.log('✅ No certificates found for pratham.sharma@ncui.in');
      } else {
        console.log(`Found ${invalidCerts.length} certificate(s) for pratham.sharma@ncui.in:`);
        
        for (const cert of invalidCerts) {
          console.log(`\n📜 Certificate: ${cert.certificateId}`);
          console.log(`   Student: ${cert.student.firstName} ${cert.student.lastName}`);
          console.log(`   Email: ${cert.student.email}`);
          console.log(`   Course: ${cert.course}`);
          console.log(`   Issue Date: ${cert.issueDate}`);
          console.log(`   Status: ${cert.status}`);
          
          // Delete the certificate
          await Certificate.findByIdAndDelete(cert._id);
          console.log(`   ✅ DELETED`);
        }
        
        console.log(`\n✅ Successfully removed ${invalidCerts.length} certificate(s)`);
      }
    } else {
      console.log('✅ User pratham.sharma@ncui.in EXISTS in database');
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log('\n⚠️  No certificates will be removed since user exists');
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

removeInvalidCertificates();
