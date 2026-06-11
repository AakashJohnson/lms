import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Trainer from './src/models/Trainer.model.js';
import Batch from './src/models/Batch.model.js';
import Department from './src/models/Department.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const checkTrainersData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check trainers
    const trainers = await Trainer.find().select('-password');
    console.log(`📊 Total Trainers: ${trainers.length}\n`);

    if (trainers.length > 0) {
      console.log('👥 Trainer List:');
      trainers.forEach((trainer, index) => {
        console.log(`${index + 1}. ${trainer.firstName} ${trainer.lastName}`);
        console.log(`   ID: ${trainer._id}`);
        console.log(`   Email: ${trainer.email}`);
        console.log(`   Mobile: ${trainer.mobile}`);
        console.log(`   Approved: ${trainer.isApproved}`);
        console.log(`   Active: ${trainer.isActive}`);
        console.log(`   Specialization: ${trainer.specialization?.join(', ') || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No trainers found in database');
    }

    // Check batches
    const batches = await Batch.find()
      .populate('trainers', 'firstName lastName email')
      .populate('department', 'name code');
    
    console.log(`\n📚 Total Batches: ${batches.length}\n`);

    if (batches.length > 0) {
      console.log('📋 Batch List:');
      batches.forEach((batch, index) => {
        console.log(`${index + 1}. ${batch.name} (${batch.code})`);
        console.log(`   ID: ${batch._id}`);
        console.log(`   Department: ${batch.department?.name || 'N/A'}`);
        console.log(`   Year: ${batch.year}`);
        console.log(`   Assigned Trainers: ${batch.trainers?.length || 0}`);
        if (batch.trainers && batch.trainers.length > 0) {
          batch.trainers.forEach(trainer => {
            console.log(`     - ${trainer.firstName} ${trainer.lastName} (${trainer.email})`);
          });
        }
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkTrainersData();
