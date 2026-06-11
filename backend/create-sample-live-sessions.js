import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import LiveSession from './src/models/LiveSession.model.js';

dotenv.config();

async function createSampleLiveSessions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find trainer and courses
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });
    const courses = await Course.find({ trainer: trainer._id });
    const students = await User.find({ role: 'student' });

    if (!trainer) {
      console.log('❌ Trainer not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName}`);
    console.log(`📚 Courses: ${courses.length}`);
    console.log(`👥 Students: ${students.length}`);

    // Delete existing sessions
    await LiveSession.deleteMany({});
    console.log('\n🗑️  Deleted existing live sessions');

    // Create sample sessions
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sampleSessions = [
      {
        title: 'Introduction to Cooperative Management',
        course: courses[0]?._id,
        module: 'Module 1',
        description: 'Learn the fundamentals of cooperative management',
        agenda: '1. Welcome\n2. Overview of cooperatives\n3. Management principles\n4. Q&A',
        date: tomorrow,
        startTime: '10:00',
        duration: 60,
        platform: 'Zoom',
        joinLink: 'https://zoom.us/j/123456789',
        meetingId: '123 456 789',
        passcode: 'coop123',
        trainer: trainer._id,
        hostEmail: trainer.email,
        maxCapacity: 50,
        status: 'scheduled',
        requireRegistration: false,
        allowRecording: true,
        waitingRoom: false,
        sendReminder: true,
        reminderMinutes: 30,
        tags: ['management', 'introduction'],
        enrolledStudents: students.slice(0, 2).map(s => ({
          student: s._id,
          enrolledAt: new Date(),
          attended: false
        }))
      },
      {
        title: 'Financial Planning for Cooperatives',
        course: courses[1] ? courses[1]._id : courses[0]._id,
        module: 'Module 2',
        description: 'Understanding financial management in cooperatives',
        agenda: '1. Financial basics\n2. Budgeting\n3. Financial reporting\n4. Case studies',
        date: nextWeek,
        startTime: '14:00',
        duration: 90,
        platform: 'Google Meet',
        joinLink: 'https://meet.google.com/abc-defg-hij',
        trainer: trainer._id,
        hostEmail: trainer.email,
        maxCapacity: 30,
        status: 'scheduled',
        requireRegistration: true,
        allowRecording: true,
        waitingRoom: true,
        sendReminder: true,
        reminderMinutes: 60,
        tags: ['finance', 'planning'],
        enrolledStudents: students.map(s => ({
          student: s._id,
          enrolledAt: new Date(),
          attended: false
        }))
      },
      {
        title: 'Past Session: Governance Workshop',
        course: courses[0]?._id,
        module: 'Module 3',
        description: 'Workshop on cooperative governance',
        agenda: '1. Governance structures\n2. Board responsibilities\n3. Member participation',
        date: yesterday,
        startTime: '11:00',
        duration: 120,
        platform: 'Zoom',
        joinLink: 'https://zoom.us/j/987654321',
        trainer: trainer._id,
        hostEmail: trainer.email,
        maxCapacity: 40,
        status: 'completed',
        requireRegistration: false,
        allowRecording: true,
        recordingAvailable: true,
        recordingUrl: 'https://example.com/recording/governance-workshop',
        tags: ['governance', 'workshop'],
        enrolledStudents: students.map(s => ({
          student: s._id,
          enrolledAt: new Date(yesterday),
          attended: Math.random() > 0.3 // 70% attendance rate
        }))
      }
    ];

    console.log('\n📝 Creating sample live sessions...');
    for (const sessionData of sampleSessions) {
      const session = await LiveSession.create(sessionData);
      console.log(`  ✅ Created: "${session.title}"`);
      console.log(`     Date: ${session.date.toDateString()}`);
      console.log(`     Status: ${session.status}`);
      console.log(`     Enrolled: ${session.enrolledStudents.length} students`);
    }

    // Verify
    const allSessions = await LiveSession.find()
      .populate('trainer', 'firstName lastName email')
      .populate('course', 'title')
      .populate('enrolledStudents.student', 'firstName lastName email');

    console.log(`\n✅ Total sessions created: ${allSessions.length}`);
    console.log('\n📋 Sessions:');
    allSessions.forEach(s => {
      console.log(`\n  - ${s.title}`);
      console.log(`    Date: ${s.date.toDateString()} at ${s.startTime}`);
      console.log(`    Platform: ${s.platform}`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Trainer: ${s.trainer.firstName} ${s.trainer.lastName}`);
      console.log(`    Course: ${s.course?.title || 'N/A'}`);
      console.log(`    Enrolled: ${s.enrolledStudents.length}/${s.maxCapacity}`);
      if (s.enrolledStudents.length > 0) {
        console.log(`    Students:`);
        s.enrolledStudents.forEach(e => {
          console.log(`      - ${e.student.firstName} ${e.student.lastName} (Attended: ${e.attended})`);
        });
      }
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createSampleLiveSessions();
