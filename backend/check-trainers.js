import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';

dotenv.config();

async function checkTrainers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const trainers = await Trainer.find().select('firstName lastName email').lean();
    console.log(`\n📊 Found ${trainers.length} trainers:`);
    trainers.forEach((trainer, index) => {
      console.log(`${index + 1}. ${trainer.firstName} ${trainer.lastName} (${trainer.email})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTrainers();
