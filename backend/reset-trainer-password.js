import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import the actual Trainer model
import Trainer from './src/models/Trainer.model.js';

async function resetTrainerPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Find trainer by email
    const trainerEmail = 'trainer@ncui.in';
    console.log(`🔍 Looking for trainer: ${trainerEmail}`);
    
    let trainer = await Trainer.findOne({ email: trainerEmail });
    
    if (!trainer) {
      console.log('❌ Trainer not found. Creating new trainer...\n');
      
      // Create new trainer
      trainer = new Trainer({
        firstName: 'Trainer',
        lastName: 'Kumar',
        email: 'trainer@ncui.in',
        mobile: '8888888888',
        password: 'Trainer@123', // Will be hashed by pre-save hook
        role: 'trainer',
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: 'NCUI CEAS',
        designation: 'Senior Trainer',
        location: 'New Delhi',
        specialization: ['Cooperative Management', 'Financial Literacy'],
        experience: 5,
        loginAttempts: 0
      });
      
      await trainer.save();
      console.log('✅ New trainer created successfully!\n');
    } else {
      console.log('✅ Trainer found!\n');
      console.log('Current trainer details:');
      console.log(`   Name: ${trainer.firstName} ${trainer.lastName}`);
      console.log(`   Email: ${trainer.email}`);
      console.log(`   Mobile: ${trainer.mobile}`);
      console.log(`   Role: ${trainer.role}`);
      console.log(`   Approved: ${trainer.isApproved}`);
      console.log(`   Active: ${trainer.isActive}\n`);
      
      // Reset password
      console.log('🔄 Resetting password to: Trainer@123');
      trainer.password = 'Trainer@123'; // Will be hashed by pre-save hook
      trainer.loginAttempts = 0;
      trainer.lockUntil = undefined;
      await trainer.save();
      console.log('✅ Password reset successfully!\n');
    }

    // Verify the password works
    console.log('🧪 Testing password...');
    const isMatch = await trainer.comparePassword('Trainer@123');
    console.log(`   Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}\n`);

    console.log('📝 Login Credentials:\n');
    console.log('┌──────────────────┬────────────┬─────────────┐');
    console.log('│ Email            │ Mobile     │ Password    │');
    console.log('├──────────────────┼────────────┼─────────────┤');
    console.log('│ trainer@ncui.in  │ 8888888888 │ Trainer@123 │');
    console.log('└──────────────────┴────────────┴─────────────┘\n');

    console.log('🧪 Test Login Command:\n');
    console.log('curl -X POST http://localhost:5000/api/v1/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"emailOrMobile": "trainer@ncui.in", "password": "Trainer@123"}\'');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
resetTrainerPassword();
