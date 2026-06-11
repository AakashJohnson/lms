import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const fixAllBulkImportedPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    console.log('🔧 FIXING BULK IMPORTED USER PASSWORDS\n');
    console.log('═══════════════════════════════════════════════════\n');

    const stats = {
      trainers: { total: 0, fixed: 0, alreadyCorrect: 0, errors: 0 },
      participants: { total: 0, fixed: 0, alreadyCorrect: 0, errors: 0 }
    };

    // Fix Trainers
    console.log('👨‍🏫 Processing Trainers...');
    console.log('─────────────────────────────────────────');
    
    const trainers = await Trainer.find({ isApproved: false }).select('+password');
    stats.trainers.total = trainers.length;
    
    console.log(`Found ${trainers.length} unapproved trainers\n`);

    for (const trainer of trainers) {
      try {
        // Test if current password works
        const currentPasswordWorks = await bcrypt.compare('Trainer@123', trainer.password);
        
        if (currentPasswordWorks) {
          console.log(`✅ ${trainer.email} - Password already correct`);
          stats.trainers.alreadyCorrect++;
        } else {
          // Reset password
          trainer.password = 'Trainer@123';
          await trainer.save();
          
          // Verify it works now
          const newPasswordWorks = await trainer.comparePassword('Trainer@123');
          
          if (newPasswordWorks) {
            console.log(`🔧 ${trainer.email} - Password FIXED ✅`);
            stats.trainers.fixed++;
          } else {
            console.log(`❌ ${trainer.email} - Fix FAILED`);
            stats.trainers.errors++;
          }
        }
      } catch (error) {
        console.log(`❌ ${trainer.email} - Error: ${error.message}`);
        stats.trainers.errors++;
      }
    }

    console.log('');

    // Fix Participants
    console.log('👨‍🎓 Processing Participants...');
    console.log('─────────────────────────────────────────');
    
    const participants = await Participant.find({ isApproved: false }).select('+password');
    stats.participants.total = participants.length;
    
    console.log(`Found ${participants.length} unapproved participants\n`);

    for (const participant of participants) {
      try {
        // Test if current password works
        const currentPasswordWorks = await bcrypt.compare('Participant@123', participant.password);
        
        if (currentPasswordWorks) {
          console.log(`✅ ${participant.email} - Password already correct`);
          stats.participants.alreadyCorrect++;
        } else {
          // Reset password
          participant.password = 'Participant@123';
          await participant.save();
          
          // Verify it works now
          const newPasswordWorks = await participant.comparePassword('Participant@123');
          
          if (newPasswordWorks) {
            console.log(`🔧 ${participant.email} - Password FIXED ✅`);
            stats.participants.fixed++;
          } else {
            console.log(`❌ ${participant.email} - Fix FAILED`);
            stats.participants.errors++;
          }
        }
      } catch (error) {
        console.log(`❌ ${participant.email} - Error: ${error.message}`);
        stats.participants.errors++;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('👨‍🏫 TRAINERS:');
    console.log(`   Total:            ${stats.trainers.total}`);
    console.log(`   Already Correct:  ${stats.trainers.alreadyCorrect} ✅`);
    console.log(`   Fixed:            ${stats.trainers.fixed} 🔧`);
    console.log(`   Errors:           ${stats.trainers.errors} ❌`);
    console.log('');
    console.log('👨‍🎓 PARTICIPANTS:');
    console.log(`   Total:            ${stats.participants.total}`);
    console.log(`   Already Correct:  ${stats.participants.alreadyCorrect} ✅`);
    console.log(`   Fixed:            ${stats.participants.fixed} 🔧`);
    console.log(`   Errors:           ${stats.participants.errors} ❌`);
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    
    const totalFixed = stats.trainers.fixed + stats.participants.fixed;
    const totalErrors = stats.trainers.errors + stats.participants.errors;
    
    if (totalErrors === 0) {
      console.log('✅ ALL PASSWORDS FIXED SUCCESSFULLY!');
      console.log('');
      console.log('🎉 All bulk imported users can now login with:');
      console.log('   - Trainers: Trainer@123');
      console.log('   - Participants: Participant@123');
      console.log('');
      console.log('⚠️  Note: Users still need admin approval before login');
    } else {
      console.log(`⚠️  ${totalErrors} users had errors during fix`);
      console.log('   Please check the logs above for details');
    }
    
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixAllBulkImportedPasswords();
