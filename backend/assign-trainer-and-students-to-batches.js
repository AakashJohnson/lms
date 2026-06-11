import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Batch from './src/models/Batch.model.js';
import Department from './src/models/Department.model.js';

dotenv.config();

async function assignTrainerAndStudents() {
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

    console.log(`\n👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName} (${trainer._id})`);

    // Find all students
    const students = await User.find({ role: 'student' });
    console.log(`\n👥 Found ${students.length} students`);
    students.forEach(s => {
      console.log(`  - ${s.firstName} ${s.lastName} (${s.email})`);
    });

    // Get some batches to assign
    const batches = await Batch.find().limit(3).populate('department', 'name');
    console.log(`\n📚 Found ${batches.length} batches`);

    if (batches.length === 0) {
      console.log('❌ No batches found in the system');
      await mongoose.disconnect();
      return;
    }

    // Assign trainer to all batches
    console.log('\n🔧 Assigning trainer to batches...');
    for (const batch of batches) {
      if (!batch.trainers.includes(trainer._id)) {
        batch.trainers.push(trainer._id);
        await batch.save();
        console.log(`  ✅ Assigned trainer to ${batch.name} (${batch.code})`);
      }
    }

    // Assign students to batches (distribute evenly)
    console.log('\n🔧 Assigning students to batches...');
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const batch = batches[i % batches.length]; // Distribute students across batches
      
      student.batch = batch._id;
      student.department = batch.department._id;
      await student.save();
      
      // Update batch student count
      batch.currentStudents = (batch.currentStudents || 0) + 1;
      await batch.save();
      
      console.log(`  ✅ Assigned ${student.firstName} ${student.lastName} to ${batch.name}`);
    }

    // Verify the assignments
    console.log('\n\n✅ Verification:');
    console.log('='.repeat(80));
    
    const updatedBatches = await Batch.find({ trainers: trainer._id })
      .populate('department', 'name code');
    
    console.log(`\nTrainer has ${updatedBatches.length} batches assigned:`);
    for (const batch of updatedBatches) {
      console.log(`  - ${batch.name} (${batch.code}) - ${batch.currentStudents} students`);
    }

    const updatedStudents = await User.find({ 
      role: 'student',
      batch: { $in: updatedBatches.map(b => b._id) }
    })
      .populate('batch', 'name code');
    
    console.log(`\nStudents in trainer's batches: ${updatedStudents.length}`);
    updatedStudents.forEach(s => {
      console.log(`  - ${s.firstName} ${s.lastName} - Batch: ${s.batch?.name}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignTrainerAndStudents();
