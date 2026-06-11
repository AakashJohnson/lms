import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import Certificate from './src/models/Certificate.model.js';
import Course from './src/models/Course.model.js';
import dotenv from 'dotenv';

dotenv.config();

const testCompleteFlow = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Login Flow
    console.log('🔐 TEST 1: LOGIN FLOW');
    console.log('=' .repeat(50));
    
    const studentEmail = 'student@ncui.in';
    const studentPassword = 'Student@123';
    
    const user = await User.findOne({ email: studentEmail }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);
    
    const isPasswordMatch = await user.comparePassword(studentPassword);
    console.log(`${isPasswordMatch ? '✅' : '❌'} Password verification: ${isPasswordMatch}`);
    
    if (!isPasswordMatch) {
      console.log('❌ Login would fail - password mismatch');
      return;
    }
    
    // Test JWT generation
    const token = user.getSignedJwtToken();
    console.log(`✅ JWT Token generated: ${token.substring(0, 40)}...`);
    
    // Test 2: Certificate Retrieval
    console.log('\n🎓 TEST 2: CERTIFICATE RETRIEVAL');
    console.log('=' .repeat(50));
    
    const certificates = await Certificate.find({ student: user._id })
      .populate('course', 'title slug thumbnail');
    
    console.log(`Found ${certificates.length} certificate(s) for user ${user._id}`);
    
    if (certificates.length > 0) {
      certificates.forEach((cert, i) => {
        console.log(`\n✅ Certificate ${i + 1}:`);
        console.log(`   Certificate ID: ${cert.certificateId}`);
        console.log(`   Course: ${cert.course?.title || 'N/A'}`);
        console.log(`   Issue Date: ${cert.issueDate}`);
        console.log(`   Status: ${cert.status}`);
        console.log(`   PDF URL: ${cert.pdfUrl || 'Not generated'}`);
        console.log(`   Verification URL: ${cert.verificationUrl}`);
      });
    } else {
      console.log('⚠️  No certificates found for this user');
      
      // Check all certificates in DB
      console.log('\n📋 All certificates in database:');
      const allCerts = await Certificate.find({})
        .populate('student', 'firstName lastName email')
        .populate('course', 'title');
      
      allCerts.forEach((cert, i) => {
        console.log(`   ${i + 1}. ${cert.certificateId}`);
        console.log(`      Student: ${cert.student?.firstName} ${cert.student?.lastName} (${cert.student?.email})`);
        console.log(`      Student ID: ${cert.student?._id}`);
        console.log(`      Course: ${cert.course?.title}`);
      });
    }
    
    // Test 3: API Response Simulation
    console.log('\n📡 TEST 3: API RESPONSE SIMULATION');
    console.log('=' .repeat(50));
    
    const apiResponse = {
      success: true,
      token: token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profilePicture: user.profilePicture,
        isApproved: user.isApproved
      }
    };
    
    console.log('✅ Login API would return:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    const certApiResponse = {
      success: true,
      count: certificates.length,
      data: certificates.map(cert => ({
        certificateId: cert.certificateId,
        course: cert.course,
        issueDate: cert.issueDate,
        status: cert.status,
        pdfUrl: cert.pdfUrl,
        verificationUrl: cert.verificationUrl
      }))
    };
    
    console.log('\n✅ Certificate API would return:');
    console.log(JSON.stringify(certApiResponse, null, 2));
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Login: ${isPasswordMatch ? 'WORKING' : 'BROKEN'}`);
    console.log(`✅ JWT Generation: WORKING`);
    console.log(`${certificates.length > 0 ? '✅' : '⚠️ '} Certificates: ${certificates.length} found`);
    console.log(`✅ API Response: READY`);
    
    if (isPasswordMatch && certificates.length > 0) {
      console.log('\n🎉 COMPLETE FLOW IS WORKING!');
      console.log('   User can login and view certificates.');
    } else if (isPasswordMatch && certificates.length === 0) {
      console.log('\n⚠️  Login works but no certificates found.');
      console.log('   User needs to complete a course first.');
    } else {
      console.log('\n❌ Flow is broken - login not working.');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testCompleteFlow();
