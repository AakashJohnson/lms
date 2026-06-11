import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.model.js';
import Participant from '../src/models/Participant.model.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms';

async function printHash(email) {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email }).select('+password');
    const participant = await Participant.findOne({ email }).select('+password');

    console.log('\nUser collection:');
    if (user) console.log({ email: user.email, password: user.password });
    else console.log('No user in User collection');

    console.log('\nParticipant collection:');
    if (participant) console.log({ email: participant.email, password: participant.password });
    else console.log('No user in Participant collection');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

const arg = process.argv[2] || 'student@ncui.in';
printHash(arg);
