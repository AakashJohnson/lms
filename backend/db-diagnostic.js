import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Batch from './src/models/Batch.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Let's find all trainers in the system
    const trainers = await User.find({ role: 'trainer' }).select('_id firstName lastName email').lean();
    console.log('--- TRAINERS IN SYSTEM ---');
    console.log(trainers);

    // 2. Let's find all batches in the system
    const batches = await Batch.find({}).populate('trainers', 'firstName lastName').lean();
    console.log('\n--- BATCHES IN SYSTEM ---');
    batches.forEach(b => {
      console.log(`Batch: ${b.name} (${b.code}), Trainers Assigned:`, b.trainers.map(t => `${t.firstName} ${t.lastName} (${t._id})`));
    });

    // 3. Let's find students in the system
    const studentCount = await User.countDocuments({ role: 'student' });
    const participantCount = await User.countDocuments({ role: 'participant' });
    console.log(`\nStudents Count: ${studentCount}, Participants Count: ${participantCount}`);

    const sampleStudents = await User.find({ role: { $in: ['student', 'participant'] } }).limit(5).select('_id firstName lastName role batch').lean();
    console.log('\n--- SAMPLE STUDENTS/PARTICIPANTS ---');
    console.log(sampleStudents);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
