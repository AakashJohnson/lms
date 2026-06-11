import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import User from './src/models/User.model.js';  // Import User model so it's registered

dotenv.config();

async function testTrainerPopulate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a course and populate trainer
    const course = await Course.findOne()
      .populate('trainer', 'firstName lastName name email')
      .lean();
    
    if (!course) {
      console.log('❌ No courses found');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📚 Course with Populated Trainer:');
    console.log('='.repeat(60));
    console.log(`Course: ${course.title}`);
    console.log(`Trainer (raw): ${JSON.stringify(course.trainer, null, 2)}`);
    
    if (course.trainer) {
      if (typeof course.trainer === 'object') {
        console.log('\n✅ Trainer is populated as an object!');
        console.log(`  - firstName: ${course.trainer.firstName}`);
        console.log(`  - lastName: ${course.trainer.lastName}`);
        console.log(`  - name: ${course.trainer.name}`);
        console.log(`  - email: ${course.trainer.email}`);
        
        const displayName = course.trainer.name || 
                           `${course.trainer.firstName || ''} ${course.trainer.lastName || ''}`.trim() ||
                           course.trainer.email ||
                           '';
        console.log(`\n🎯 Display Name: "${displayName}"`);
      } else {
        console.log('\n⚠️  Trainer is still a string (not populated)');
      }
    } else {
      console.log('\n⚠️  No trainer assigned to this course');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testTrainerPopulate();
