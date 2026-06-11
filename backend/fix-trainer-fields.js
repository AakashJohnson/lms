import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';

dotenv.config();

async function fixTrainerFields() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all trainers
    const trainers = await Trainer.find({});
    console.log(`📋 Found ${trainers.length} trainers\n`);

    let updated = 0;
    for (const trainer of trainers) {
      let needsUpdate = false;
      const updates = {};

      // Add fullName if missing
      if (!trainer.fullName) {
        updates.fullName = `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim();
        needsUpdate = true;
      }

      // Add name if missing
      if (!trainer.name) {
        updates.name = `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim();
        needsUpdate = true;
      }

      // Add organization if missing
      if (!trainer.organization) {
        updates.organization = '';
        needsUpdate = true;
      }

      // Add designation if missing
      if (!trainer.designation) {
        updates.designation = '';
        needsUpdate = true;
      }

      // Add location if missing
      if (!trainer.location) {
        updates.location = '';
        needsUpdate = true;
      }

      // Add specialization if missing
      if (!trainer.specialization || !Array.isArray(trainer.specialization)) {
        updates.specialization = [];
        needsUpdate = true;
      }

      // Add experience if missing
      if (trainer.experience === undefined || trainer.experience === null) {
        updates.experience = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Trainer.findByIdAndUpdate(trainer._id, { $set: updates });
        console.log(`✅ Updated trainer: ${trainer.email}`);
        console.log(`   Added fields:`, Object.keys(updates));
        updated++;
      } else {
        console.log(`✓ Trainer ${trainer.email} already has all fields`);
      }
    }

    console.log(`\n✅ Updated ${updated} trainers`);
    console.log('✅ All trainers now have required fields');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTrainerFields();
