import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.model.js';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';

dotenv.config();

const approveUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    const email = process.argv[2];

    if (!email) {
      console.log('❌ Please provide email address');
      console.log('Usage: node backend/approve-user.js <email>');
      console.log('Example: node backend/approve-user.js roytripathi@gmail.com');
      process.exit(1);
    }

    console.log(`🔍 Searching for user: ${email}\n`);

    // Check in all collections
    let user = await Admin.findOne({ email });
    let userType = 'Admin';
    let Model = Admin;

    if (!user) {
      user = await Trainer.findOne({ email });
      userType = 'Trainer';
      Model = Trainer;
    }

    if (!user) {
      user = await Participant.findOne({ email });
      userType = 'Participant';
      Model = Participant;
    }

    if (!user) {
      console.log('❌ USER NOT FOUND');
      process.exit(1);
    }

    console.log(`✅ Found ${userType}: ${user.firstName} ${user.lastName}`);
    console.log(`Current Status: ${user.isApproved ? 'Approved ✅' : 'Pending ⏳'}\n`);

    if (user.isApproved) {
      console.log('ℹ️  User is already approved. No action needed.');
      process.exit(0);
    }

    // Approve the user
    await Model.findByIdAndUpdate(user._id, {
      isApproved: true,
      isActive: true
    });

    console.log('✅ USER APPROVED SUCCESSFULLY!');
    console.log('─────────────────────────────────────────');
    console.log(`Name:     ${user.firstName} ${user.lastName}`);
    console.log(`Email:    ${user.email}`);
    console.log(`Role:     ${user.role}`);
    console.log(`Status:   Approved ✅`);
    console.log('─────────────────────────────────────────');
    console.log('\n🎉 User can now login with their credentials!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

approveUser();
