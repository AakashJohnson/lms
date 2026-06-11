import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import CourseQuery from './src/models/CourseQuery.model.js';

dotenv.config();

async function createSampleQueries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find trainer and students
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });
    const students = await User.find({ role: 'student' });
    const courses = await Course.find({ trainer: trainer._id });

    if (!trainer) {
      console.log('❌ Trainer not found');
      await mongoose.disconnect();
      return;
    }

    if (students.length === 0) {
      console.log('❌ No students found');
      await mongoose.disconnect();
      return;
    }

    if (courses.length === 0) {
      console.log('❌ No courses found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName}`);
    console.log(`👥 Students: ${students.length}`);
    console.log(`📚 Courses: ${courses.length}`);

    // Delete existing queries
    await CourseQuery.deleteMany({});
    console.log('\n🗑️  Deleted existing queries');

    // Create sample queries
    const sampleQueries = [
      {
        course: courses[0]._id,
        student: students[0]._id,
        trainer: trainer._id,
        question: 'What is the difference between cooperative management and traditional management?',
        category: 'course-content',
        lessonReference: 'Module 1 - Introduction',
        isPublic: true,
        status: 'pending'
      },
      {
        course: courses[0]._id,
        student: students[1] ? students[1]._id : students[0]._id,
        trainer: trainer._id,
        question: 'Can you explain the concept of member participation in cooperatives?',
        category: 'lesson',
        lessonReference: 'Module 2 - Principles',
        isPublic: true,
        status: 'pending'
      },
      {
        course: courses[1] ? courses[1]._id : courses[0]._id,
        student: students[2] ? students[2]._id : students[0]._id,
        trainer: trainer._id,
        question: 'How do I submit the assessment for this module?',
        category: 'assessment',
        isPublic: false,
        status: 'pending'
      },
      {
        course: courses[0]._id,
        student: students[0]._id,
        trainer: trainer._id,
        question: 'What are the key financial management practices for cooperatives?',
        category: 'general',
        isPublic: true,
        status: 'answered',
        replies: [{
          repliedBy: trainer._id,
          repliedByModel: 'User',
          reply: 'Key financial management practices include proper bookkeeping, regular audits, transparent reporting to members, and maintaining adequate reserves.',
          repliedAt: new Date()
        }]
      }
    ];

    console.log('\n📝 Creating sample queries...');
    for (const queryData of sampleQueries) {
      const query = await CourseQuery.create(queryData);
      console.log(`  ✅ Created query: "${query.question.substring(0, 50)}..."`);
    }

    // Verify
    const allQueries = await CourseQuery.find({ trainer: trainer._id })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');

    console.log(`\n✅ Total queries created: ${allQueries.length}`);
    console.log('\n📋 Queries:');
    allQueries.forEach(q => {
      console.log(`  - ${q.question.substring(0, 60)}...`);
      console.log(`    Student: ${q.student.firstName} ${q.student.lastName}`);
      console.log(`    Course: ${q.course.title}`);
      console.log(`    Status: ${q.status}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSampleQueries();
