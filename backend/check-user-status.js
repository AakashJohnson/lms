import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.model.js';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const checkUserStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const email = 'roytripathi@gmail.com';
    const testPassword = 'Trainer@123';

    console.log(`🔍 Searching for user: ${email}\n`);

    // Check in Admin collection
    let user = await Admin.findOne({ email }).select('+password');
    let userType = 'Admin';

    // Check in Trainer collection
    if (!user) {
      user = await Trainer.findOne({ email }).select('+password');
      userType = 'Trainer';
    }

    // Check in Participant collection
    if (!user) {
      user = await Participant.findOne({ email }).select('+password');
      userType = 'Participant';
    }

    if (!user) {
      console.log('❌ USER NOT FOUND IN DATABASE');
      console.log('\n📋 Possible reasons:');
      console.log('   1. User was never created');
      console.log('   2. User was deleted');
      console.log('   3. Email is incorrect');
      console.log('\n💡 Solution: Create user via bulk import or registration');
      process.exit(0);
    }

    console.log(`✅ USER FOUND in ${userType} collection\n`);
    console.log('📊 User Details:');
    console.log('─────────────────────────────────────────');
    console.log(`Name:           ${user.firstName} ${user.lastName}`);
    console.log(`Email:          ${user.email}`);
    console.log(`Mobile:         ${user.mobile}`);
    console.log(`Role:           ${user.role}`);
    console.log(`Is Approved:    ${user.isApproved ? '✅ YES' : '❌ NO (PENDING APPROVAL)'}`);
    console.log(`Is Active:      ${user.isActive ? '✅ YES' : '❌ NO'}`);
    console.log(`Is Locked:      ${user.isLocked ? '❌ YES' : '✅ NO'}`);
    console.log(`Login Attempts: ${user.loginAttempts}`);
    console.log(`Last Login:     ${user.lastLogin || 'Never'}`);
    console.log('─────────────────────────────────────────\n');

    // Test password
    console.log('🔐 Testing Password...');
    const isPasswordMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Password "${testPassword}": ${isPasswordMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);

    // Diagnosis
    console.log('🩺 DIAGNOSIS:');
    console.log('─────────────────────────────────────────');
    
    if (!user.isApproved) {
      console.log('❌ LOGIN BLOCKED: Account is NOT APPROVED');
      console.log('   Error: "Your account is pending approval" (403)');
      console.log('\n💡 SOLUTION:');
      console.log('   Run this command to approve the user:');
      console.log(`   node backend/approve-user.js ${email}`);
    } else if (!user.isActive) {
      console.log('❌ LOGIN BLOCKED: Account is INACTIVE');
      console.log('   Error: "Your account has been deactivated" (403)');
      console.log('\n💡 SOLUTION: Activate the account from admin dashboard');
    } else if (user.isLocked) {
      console.log('❌ LOGIN BLOCKED: Account is LOCKED');
      console.log('   Error: "Account is temporarily locked" (423)');
      console.log(`   Lock expires: ${user.lockUntil}`);
      console.log('\n💡 SOLUTION: Wait for lock to expire or reset login attempts');
    } else if (!isPasswordMatch) {
      console.log('❌ LOGIN BLOCKED: Password is INCORRECT');
      console.log('   Error: "Invalid credentials" (401)');
      console.log('\n💡 SOLUTION: Reset password or use correct password');
    } else {
      console.log('✅ ALL CHECKS PASSED - Login should work!');
      console.log('   If still getting 401, check:');
      console.log('   - Frontend is sending correct credentials');
      console.log('   - Backend server is running');
      console.log('   - CORS is configured properly');
    }
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUserStatus();
