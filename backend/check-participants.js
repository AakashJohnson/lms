import mongoose from 'mongoose';
import Participant from './src/models/Participant.model.js';

const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

async function checkParticipants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const participants = await Participant.find({})
      .select('firstName lastName email mobile isApproved isActive')
      .limit(10);

    console.log(`📊 Total Participants: ${await Participant.countDocuments()}\n`);

    if (participants.length === 0) {
      console.log('❌ No participants found in database!');
    } else {
      console.log('✅ Sample Participants:');
      participants.forEach((p, idx) => {
        console.log(`\n${idx + 1}. ${p.firstName} ${p.lastName}`);
        console.log(`   Email: ${p.email}`);
        console.log(`   Mobile: ${p.mobile}`);
        console.log(`   Approved: ${p.isApproved}`);
        console.log(`   Active: ${p.isActive}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkParticipants();
