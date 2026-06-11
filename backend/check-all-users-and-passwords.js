import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function checkAllUsersAndPasswords() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get ALL users
    const users = await User.find({}).select('+password');

    console.log(`👥 Total users in database: ${users.length}\n`);
    console.log('='.repeat(80));

    for (const user of users) {
      console.log(`\n📋 ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Approved: ${user.isApproved}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      
      if (user.password) {
        // Test common passwords
        const testPasswords = [
          'admin123', 'Admin@123',
          'trainer123', 'Trainer@123',
          'student123', 'Student@123',
          'pratham123', 'Pratham@123'
        ];
        
        for (const pwd of testPasswords) {
          try {
            const match = await bcrypt.compare(pwd, user.password);
            if (match) {
              console.log(`   ✅ PASSWORD FOUND: ${pwd}`);
              break;
            }
          } catch (error) {
            // Silent
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total Users: ${users.length}`);
    console.log(`Administrators: ${users.filter(u => u.role === 'administrator').length}`);
    console.log(`Trainers: ${users.filter(u => u.role === 'trainer').length}`);
    console.log(`Participants: ${users.filter(u => u.role === 'participant').length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkAllUsersAndPasswords();
