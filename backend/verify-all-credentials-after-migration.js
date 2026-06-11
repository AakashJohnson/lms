import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const verifyCredentials = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 VERIFYING ALL USER CREDENTIALS AFTER MIGRATION');
    console.log('='.repeat(70));
    console.log('');

    // Get all users
    const users = await User.find({}).select('+password');
    
    console.log(`📊 Total users in database: ${users.length}\n`);

    // Test credentials for each role
    const testCredentials = [
      { email: 'admin@ncui.in', password: 'Admin@123', expectedRole: 'administrator' },
      { email: 'trainer@ncui.in', password: 'Trainer@123', expectedRole: 'trainer' },
      { email: 'student@ncui.in', password: 'Student@123', expectedRole: 'student' },
      { email: 'pratham@ncui.in', password: 'Student@123', expectedRole: 'student' },
      { email: 'pratham.sharma@ncui.in', password: 'Student@123', expectedRole: 'student' }
    ];

    console.log('🔐 TESTING CREDENTIALS:');
    console.log('─'.repeat(70));
    console.log('');

    for (const cred of testCredentials) {
      const user = await User.findOne({ email: cred.email }).select('+password');
      
      if (!user) {
        console.log(`❌ ${cred.email} - USER NOT FOUND`);
        console.log('');
        continue;
      }

      const isPasswordCorrect = await user.comparePassword(cred.password);
      const roleMatches = user.role === cred.expectedRole;

      console.log(`📧 ${cred.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role} ${roleMatches ? '✅' : `❌ (expected: ${cred.expectedRole})`}`);
      console.log(`   Password: ${isPasswordCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      console.log(`   Approved: ${user.isApproved ? '✅' : '❌'}`);
      console.log(`   Active: ${user.isActive ? '✅' : '❌'}`);
      console.log(`   Locked: ${user.isLocked ? '❌ YES' : '✅ NO'}`);
      
      if (isPasswordCorrect && roleMatches && user.isApproved && user.isActive && !user.isLocked) {
        console.log(`   ✅ LOGIN WILL WORK`);
      } else {
        console.log(`   ❌ LOGIN WILL FAIL`);
      }
      console.log('');
    }

    // Show role distribution
    console.log('📊 ROLE DISTRIBUTION:');
    console.log('─'.repeat(70));
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    roleStats.forEach(stat => {
      console.log(`   ${stat._id}:`);
      console.log(`      Total: ${stat.count}`);
      console.log(`      Approved: ${stat.approved}`);
      console.log(`      Active: ${stat.active}`);
      console.log('');
    });

    // Check for any remaining 'participant' roles (should be 0)
    const remainingParticipants = await User.countDocuments({ role: 'participant' });
    
    console.log('🎯 MIGRATION VERIFICATION:');
    console.log('─'.repeat(70));
    console.log(`   Remaining 'participant' roles: ${remainingParticipants}`);
    
    if (remainingParticipants === 0) {
      console.log('   ✅ ALL PARTICIPANTS SUCCESSFULLY MIGRATED TO STUDENTS');
    } else {
      console.log('   ❌ MIGRATION INCOMPLETE - SOME PARTICIPANTS REMAIN');
    }
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('');
    console.log('🎉 VERIFICATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

verifyCredentials();
