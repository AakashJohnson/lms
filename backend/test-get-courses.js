import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function testGetCourses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get all courses without populate
    console.log('\n📚 Test 1: Get all courses (no populate)');
    console.log('='.repeat(60));
    const coursesRaw = await Course.find().limit(5).lean();
    console.log(`Found ${coursesRaw.length} courses`);
    coursesRaw.forEach(course => {
      console.log(`- ${course.title}`);
      console.log(`  Trainer: ${course.trainer}`);
      console.log(`  Status: ${course.status}`);
      console.log(`  Visibility: ${course.visibility}`);
    });

    // Test 2: Get all courses with populate
    console.log('\n📚 Test 2: Get all courses (with populate)');
    console.log('='.repeat(60));
    const coursesPopulated = await Course.find()
      .select('title subtitle slug category subCategory level language tags thumbnail status isPublished visibility pricing enrollmentType currentEnrollments trainer batches ratings statistics createdBy createdAt updatedAt sections')
      .populate('trainer', 'name email firstName lastName')
      .limit(5)
      .lean();
    
    console.log(`Found ${coursesPopulated.length} courses`);
    coursesPopulated.forEach(course => {
      console.log(`- ${course.title}`);
      console.log(`  Trainer: ${JSON.stringify(course.trainer, null, 2)}`);
      console.log(`  Status: ${course.status}`);
    });

    // Test 3: Check if trainer field exists and is valid
    console.log('\n📚 Test 3: Check trainer field validity');
    console.log('='.repeat(60));
    for (const course of coursesRaw) {
      if (course.trainer) {
        const trainerExists = await User.findById(course.trainer);
        console.log(`Course: ${course.title}`);
        console.log(`  Trainer ID: ${course.trainer}`);
        console.log(`  Trainer exists: ${!!trainerExists}`);
        if (trainerExists) {
          console.log(`  Trainer name: ${trainerExists.firstName} ${trainerExists.lastName}`);
        }
      }
    }

    // Test 4: Simulate the actual API query
    console.log('\n📚 Test 4: Simulate API query (trainer role, createdBy=me)');
    console.log('='.repeat(60));
    
    // Find a trainer user
    const trainer = await User.findOne({ role: 'trainer' });
    if (trainer) {
      console.log(`Testing with trainer: ${trainer.firstName} ${trainer.lastName} (${trainer._id})`);
      
      const filter = { createdBy: trainer._id };
      const trainerCourses = await Course.find(filter)
        .select('title subtitle slug category subCategory level language tags thumbnail status isPublished visibility pricing enrollmentType currentEnrollments trainer batches ratings statistics createdBy createdAt updatedAt sections')
        .populate('trainer', 'name email firstName lastName')
        .sort({ createdAt: -1 })
        .limit(20);
      
      console.log(`Found ${trainerCourses.length} courses for this trainer`);
      trainerCourses.forEach(course => {
        console.log(`- ${course.title} (Status: ${course.status})`);
      });
    } else {
      console.log('No trainer found in database');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testGetCourses();
