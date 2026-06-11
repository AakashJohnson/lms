import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';

dotenv.config();

async function fixTrainerName() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find trainer@ncui.in
    const trainer = await Trainer.findOne({ email: 'trainer@ncui.in' });
    
    if (!trainer) {
      console.log('❌ Trainer not found with email: trainer@ncui.in');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Current Trainer Data:');
    console.log(`   firstName: "${trainer.firstName}"`);
    console.log(`   lastName: "${trainer.lastName}"`);
    console.log(`   fullName: "${trainer.fullName || 'N/A'}"`);
    console.log(`   name: "${trainer.name || 'N/A'}"`);
    console.log('');

    // Update to Rahul Sharma
    trainer.firstName = 'Rahul';
    trainer.lastName = 'Sharma';
    trainer.fullName = 'Rahul Sharma';
    trainer.name = 'Rahul Sharma';
    
    await trainer.save();

    console.log('✅ Updated Trainer Data:');
    console.log(`   firstName: "${trainer.firstName}"`);
    console.log(`   lastName: "${trainer.lastName}"`);
    console.log(`   fullName: "${trainer.fullName}"`);
    console.log(`   name: "${trainer.name}"`);
    console.log('');
    console.log('✅ Trainer name updated successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: Please log out and log back in to see the changes in the UI');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTrainerName();
