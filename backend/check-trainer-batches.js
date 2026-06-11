import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Batch from './src/models/Batch.model.js';
import Department from './src/models/Department.model.js';

dotenv.config();

async function checkTrainerBatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the trainer@ncui.in user
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });
    
    if (!trainer) {
      console.log('❌ trainer@ncui.in not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName}`);
    console.log(`   Email: ${trainer.email}`);
    console.log(`   ID: ${trainer._id}`);

    // Find batches assigned to this trainer
    const batches = await Batch.find({ trainers: trainer._id })
      .populate('department', 'name code')
      .lean();

    console.log(`\n📚 Batches assigned to trainer: ${batches.length}`);
    console.log('='.repeat(80));
    
    if (batches.length === 0) {
      console.log('❌ No batches assigned to this trainer');
    } else {
      for (const batch of batches) {
        console.log(`\nBatch: ${batch.name} (${batch.code})`);
        console.log(`  Department: ${batch.department?.name || 'N/A'}`);
        console.log(`  Year: ${batch.year}`);
        console.log(`  Students: ${batch.students?.length || 0}`);
      }
    }

    // Find all students in these batches
    if (batches.length > 0) {
      const batchIds = batches.map(b => b._id);
      
      const students = await User.find({ 
        role: 'student',
        batch: { $in: batchIds } 
      })
        .select('firstName lastName email batch')
        .populate('batch', 'name code')
        .lean();

      console.log(`\n👥 Students in trainer's batches: ${students.length}`);
      console.log('='.repeat(80));
      
      if (students.length === 0) {
        console.log('❌ No students found in these batches');
      } else {
        students.forEach(student => {
          console.log(`- ${student.firstName} ${student.lastName} (${student.email})`);
          console.log(`  Batch: ${student.batch?.name || 'N/A'}`);
        });
      }
    }

    // Check all batches in the system
    console.log('\n\n📊 All Batches in System:');
    console.log('='.repeat(80));
    const allBatches = await Batch.find()
      .populate('department', 'name code')
      .populate('trainers', 'firstName lastName email')
      .lean();
    
    console.log(`Total batches: ${allBatches.length}`);
    
    for (const batch of allBatches) {
      console.log(`\nBatch: ${batch.name} (${batch.code})`);
      console.log(`  Department: ${batch.department?.name || 'N/A'}`);
      console.log(`  Year: ${batch.year}`);
      console.log(`  Trainers: ${batch.trainers?.length || 0}`);
      if (batch.trainers && batch.trainers.length > 0) {
        batch.trainers.forEach(t => {
          console.log(`    - ${t.firstName} ${t.lastName} (${t.email})`);
        });
      }
      console.log(`  Students: ${batch.students?.length || 0}`);
    }

    // Check all students in the system
    console.log('\n\n👥 All Students in System:');
    console.log('='.repeat(80));
    const allStudents = await User.find({ role: 'student' })
      .select('firstName lastName email batch')
      .populate('batch', 'name code')
      .lean();
    
    console.log(`Total students: ${allStudents.length}`);
    
    allStudents.forEach(student => {
      console.log(`- ${student.firstName} ${student.lastName} (${student.email})`);
      console.log(`  Batch: ${student.batch?.name || 'N/A'} (ID: ${student.batch?._id || 'N/A'})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTrainerBatches();
