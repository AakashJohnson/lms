import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkParticipants = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    const Participant = mongoose.model('Participant', new mongoose.Schema({}, { strict: false }));
    
    const allParticipants = await Participant.find({}).lean();
    console.log('\n📊 All Participants:');
    console.log('Total:', allParticipants.length);
    
    allParticipants.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.firstName} ${p.lastName}`);
      console.log('   ID:', p._id);
      console.log('   Email:', p.email);
      console.log('   isActive:', p.isActive);
    });

    const activeParticipants = await Participant.find({ isActive: true }).lean();
    console.log('\n✅ Active Participants:', activeParticipants.length);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkParticipants();
