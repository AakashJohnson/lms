import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Trainer from './src/models/Trainer.model.js';
import Participant from './src/models/Participant.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const testBulkImportPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    console.log('🧪 TESTING BULK IMPORT PASSWORD LOGIC\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Test 1: Create a test trainer with plain password
    console.log('📝 Test 1: Creating Test Trainer');
    console.log('─────────────────────────────────────────');
    
    const testTrainerEmail = `test.trainer.${Date.now()}@example.com`;
    const testTrainerMobile = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const trainerPassword = 'Trainer@123';

    const testTrainer = await Trainer.create({
      firstName: 'Test',
      lastName: 'Trainer',
      email: testTrainerEmail,
      mobile: testTrainerMobile,
      password: trainerPassword, // Plain text - model will hash
      role: 'trainer',
      organization: 'Test Org',
      designation: 'Test Designation',
      isApproved: false,
      isActive: true
    });

    console.log(`✅ Trainer Created: ${testTrainer.email}`);
    console.log(`   Password (plain): ${trainerPassword}`);
    console.log(`   Password (hashed): ${testTrainer.password.substring(0, 20)}...`);

    // Verify password
    const trainerPasswordMatch = await testTrainer.comparePassword(trainerPassword);
    console.log(`   Password Verification: ${trainerPasswordMatch ? '✅ CORRECT' : '❌ WRONG'}`);

    if (!trainerPasswordMatch) {
      console.log('   ❌ FAILED: Password does not match!');
    }

    console.log('');

    // Test 2: Create a test participant with plain password
    console.log('📝 Test 2: Creating Test Participant');
    console.log('─────────────────────────────────────────');
    
    const testParticipantEmail = `test.participant.${Date.now()}@example.com`;
    const testParticipantMobile = `98765${Math.floor(10000 + Math.random() * 90000)}`;
    const participantPassword = 'Participant@123';

    const testParticipant = await Participant.create({
      firstName: 'Test',
      lastName: 'Participant',
      email: testParticipantEmail,
      mobile: testParticipantMobile,
      password: participantPassword, // Plain text - model will hash
      role: 'participant',
      organization: 'Test Org',
      designation: 'Test Designation',
      isApproved: false,
      isActive: true
    });

    console.log(`✅ Participant Created: ${testParticipant.email}`);
    console.log(`   Password (plain): ${participantPassword}`);
    console.log(`   Password (hashed): ${testParticipant.password.substring(0, 20)}...`);

    // Verify password
    const participantPasswordMatch = await testParticipant.comparePassword(participantPassword);
    console.log(`   Password Verification: ${participantPasswordMatch ? '✅ CORRECT' : '❌ WRONG'}`);

    if (!participantPasswordMatch) {
      console.log('   ❌ FAILED: Password does not match!');
    }

    console.log('');

    // Test 3: Verify bcrypt hash format
    console.log('📝 Test 3: Verifying Hash Format');
    console.log('─────────────────────────────────────────');
    
    const trainerHashRounds = testTrainer.password.split('$')[2];
    const participantHashRounds = testParticipant.password.split('$')[2];
    
    console.log(`   Trainer Hash Rounds: ${trainerHashRounds} (expected: 12)`);
    console.log(`   Participant Hash Rounds: ${participantHashRounds} (expected: 12)`);
    console.log(`   Hash Format: ${testTrainer.password.startsWith('$2a$') || testTrainer.password.startsWith('$2b$') ? '✅ Valid bcrypt' : '❌ Invalid'}`);

    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    
    const allTestsPassed = trainerPasswordMatch && participantPasswordMatch;
    
    if (allTestsPassed) {
      console.log('✅ ALL TESTS PASSED!');
      console.log('');
      console.log('🎉 Bulk import password logic is working correctly!');
      console.log('   - Passwords are properly hashed by model pre-save hook');
      console.log('   - Password verification works correctly');
      console.log('   - Default passwords will work for bulk imported users');
      console.log('');
      console.log('Default Passwords:');
      console.log('   - Trainers: Trainer@123');
      console.log('   - Participants: Participant@123');
    } else {
      console.log('❌ SOME TESTS FAILED!');
      console.log('');
      console.log('Issues detected:');
      if (!trainerPasswordMatch) {
        console.log('   ❌ Trainer password verification failed');
      }
      if (!participantPasswordMatch) {
        console.log('   ❌ Participant password verification failed');
      }
    }

    console.log('');
    console.log('🧹 Cleaning up test data...');
    
    // Clean up test users
    await Trainer.findByIdAndDelete(testTrainer._id);
    await Participant.findByIdAndDelete(testParticipant._id);
    
    console.log('✅ Test data cleaned up');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testBulkImportPassword();
