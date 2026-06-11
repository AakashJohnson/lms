import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateParticipantToStudent = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    console.log('🔄 MIGRATING PARTICIPANT ROLE TO STUDENT ROLE');
    console.log('='.repeat(60));
    console.log('');

    // Find all users with role 'participant'
    const participants = await User.find({ role: 'participant' });
    
    console.log(`📊 Found ${participants.length} users with role 'participant'\n`);

    if (participants.length === 0) {
      console.log('✅ No participants found to migrate');
      await mongoose.connection.close();
      return;
    }

    // Update all participants to students
    const result = await User.updateMany(
      { role: 'participant' },
      { $set: { role: 'student' } }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} users from 'participant' to 'student'\n`);

    // Verify the migration
    console.log('🔍 VERIFICATION:');
    console.log('─'.repeat(60));
    
    const students = await User.find({ role: 'student' });
    const remainingParticipants = await User.find({ role: 'participant' });
    
    console.log(`✅ Students in database: ${students.length}`);
    console.log(`✅ Remaining participants: ${remainingParticipants.length}`);
    console.log('');

    // Show all students
    if (students.length > 0) {
      console.log('📋 MIGRATED USERS:');
      console.log('─'.repeat(60));
      for (const student of students) {
        console.log(`   ${student.firstName} ${student.lastName} (${student.email})`);
        console.log(`   Role: ${student.role}`);
        console.log('');
      }
    }

    // Show all roles in database
    console.log('📊 ROLE DISTRIBUTION:');
    console.log('─'.repeat(60));
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} users`);
    });
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('');
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Update User.model.js to change enum from "participant" to "student"');
    console.log('   2. Update all controllers, routes, and middleware files');
    console.log('   3. Update frontend code to use "student" instead of "participant"');
    console.log('   4. Restart the backend server');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

migrateParticipantToStudent();
