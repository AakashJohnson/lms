import mongoose from 'mongoose';
import User from './src/models/User.model.js';
import dotenv from 'dotenv';

dotenv.config();

const updateTrainerName = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB\n');

    // Find the trainer with email trainer@ncui.in
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });
    
    if (!trainer) {
      console.log('❌ Trainer not found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Current Trainer Details:');
    console.log(`   Name: ${trainer.firstName} ${trainer.lastName}`);
    console.log(`   Email: ${trainer.email}`);
    console.log(`   Role: ${trainer.role}`);
    console.log('');

    // Update the name
    trainer.firstName = 'Vikas';
    trainer.lastName = 'Kumar';
    await trainer.save();

    console.log('✅ Trainer name updated successfully!');
    console.log('');
    console.log('📋 New Trainer Details:');
    console.log(`   Name: ${trainer.firstName} ${trainer.lastName}`);
    console.log(`   Email: ${trainer.email}`);
    console.log(`   Role: ${trainer.role}`);
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateTrainerName();
