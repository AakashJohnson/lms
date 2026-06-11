/**
 * Reset Student Attempts - Testing Script
 * 
 * This script helps you reset/delete student attempts for testing purposes
 * 
 * Usage:
 * 1. Reset all attempts for a specific student:
 *    node reset-student-attempts.js --student student@ncui.in
 * 
 * 2. Reset all attempts for a specific assessment:
 *    node reset-student-attempts.js --assessment ASSESSMENT_ID
 * 
 * 3. Reset specific student's attempts for specific assessment:
 *    node reset-student-attempts.js --student student@ncui.in --assessment ASSESSMENT_ID
 * 
 * 4. Reset ALL attempts (dangerous!):
 *    node reset-student-attempts.js --all
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentAssessment from './src/models/StudentAssessment.model.js';
import User from './src/models/User.model.js';
import Assessment from './src/models/Assessment.model.js';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    options[key] = value;
    if (value !== true) i++;
  }
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function resetAttempts() {
  await connectDB();

  try {
    console.log('\n🔄 Reset Student Attempts Script\n');
    console.log('Options:', options);
    console.log('');

    // Option 1: Reset all attempts (dangerous!)
    if (options.all) {
      console.log('⚠️  WARNING: This will delete ALL student attempts!');
      console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const result = await StudentAssessment.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} student assessment documents`);
      console.log('✅ All attempts have been reset!\n');
      return;
    }

    // Option 2: Reset by student email
    if (options.student) {
      const user = await User.findOne({ email: options.student });
      
      if (!user) {
        console.log(`❌ Student not found: ${options.student}`);
        return;
      }

      console.log(`👤 Found student: ${user.name} (${user.email})`);

      // If assessment ID is also provided
      if (options.assessment) {
        const assessment = await Assessment.findById(options.assessment);
        
        if (!assessment) {
          console.log(`❌ Assessment not found: ${options.assessment}`);
          return;
        }

        console.log(`📝 Found assessment: ${assessment.title}`);

        const studentAssessment = await StudentAssessment.findOne({
          user: user._id,
          assessment: options.assessment
        });

        if (!studentAssessment) {
          console.log(`❌ No attempts found for this student and assessment`);
          return;
        }

        console.log(`\n📊 Current state:`);
        console.log(`   Total attempts: ${studentAssessment.attempts.length}`);
        console.log(`   Best score: ${studentAssessment.bestScore}%`);
        console.log(`   Status: ${studentAssessment.status}`);

        console.log(`\n🗑️  Deleting attempts...`);
        await StudentAssessment.deleteOne({ _id: studentAssessment._id });
        console.log(`✅ Deleted all attempts for ${user.name} on "${assessment.title}"\n`);
      } else {
        // Reset all attempts for this student
        const result = await StudentAssessment.deleteMany({ user: user._id });
        console.log(`✅ Deleted ${result.deletedCount} assessment documents for ${user.name}\n`);
      }
      return;
    }

    // Option 3: Reset by assessment ID
    if (options.assessment) {
      const assessment = await Assessment.findById(options.assessment);
      
      if (!assessment) {
        console.log(`❌ Assessment not found: ${options.assessment}`);
        return;
      }

      console.log(`📝 Found assessment: ${assessment.title}`);

      const studentAssessments = await StudentAssessment.find({ 
        assessment: options.assessment 
      }).populate('user', 'name email');

      console.log(`\n📊 Found ${studentAssessments.length} student(s) with attempts:`);
      studentAssessments.forEach((sa, index) => {
        console.log(`   ${index + 1}. ${sa.user.name} - ${sa.attempts.length} attempt(s)`);
      });

      console.log(`\n🗑️  Deleting all attempts for this assessment...`);
      const result = await StudentAssessment.deleteMany({ assessment: options.assessment });
      console.log(`✅ Deleted ${result.deletedCount} student assessment documents\n`);
      return;
    }

    // No valid options provided
    console.log('❌ No valid options provided!\n');
    console.log('Usage:');
    console.log('  node reset-student-attempts.js --student student@ncui.in');
    console.log('  node reset-student-attempts.js --assessment ASSESSMENT_ID');
    console.log('  node reset-student-attempts.js --student student@ncui.in --assessment ASSESSMENT_ID');
    console.log('  node reset-student-attempts.js --all\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
resetAttempts();
