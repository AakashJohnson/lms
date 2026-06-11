import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Batch from './src/models/Batch.model.js';
import Department from './src/models/Department.model.js';
import Trainer from './src/models/Trainer.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const testBatchAPI = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Simulate the API call (skip coordinator and createdBy to avoid User model error)
    const batches = await Batch.find()
      .populate('department', 'name code')
      .populate('trainers', 'firstName lastName email')
      .sort({ year: -1, name: 1 })
      .lean();

    console.log(`📊 Total Batches: ${batches.length}\n`);

    // Check the CMS - Batch 1 specifically
    const cmsBatch = batches.find(b => b.code === 'CMS_B1_1778139180936');
    
    if (cmsBatch) {
      console.log('🔍 CMS - Batch 1 Details:');
      console.log('ID:', cmsBatch._id);
      console.log('Name:', cmsBatch.name);
      console.log('Code:', cmsBatch.code);
      console.log('Department:', cmsBatch.department);
      console.log('Year:', cmsBatch.year);
      console.log('Current Students:', cmsBatch.currentStudents);
      console.log('Trainers Array:', cmsBatch.trainers);
      console.log('Trainers Length:', cmsBatch.trainers?.length || 0);
      console.log('\nTrainers Details:');
      if (cmsBatch.trainers && cmsBatch.trainers.length > 0) {
        cmsBatch.trainers.forEach((trainer, idx) => {
          console.log(`  ${idx + 1}.`, trainer);
        });
      } else {
        console.log('  No trainers assigned');
      }
    } else {
      console.log('❌ CMS - Batch 1 not found');
    }

    console.log('\n📋 All Batches with Trainer Info:');
    batches.forEach((batch, idx) => {
      console.log(`\n${idx + 1}. ${batch.name} (${batch.code})`);
      console.log(`   Trainers: ${batch.trainers?.length || 0}`);
      if (batch.trainers && batch.trainers.length > 0) {
        batch.trainers.forEach(t => {
          console.log(`     - ${t.firstName} ${t.lastName} (${t.email})`);
        });
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testBatchAPI();
