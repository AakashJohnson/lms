const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
  const course = await Course.findById('6a213d7485fb6d4f3b36be0d').lean();
  if (!course) {
    console.log('Course not found');
    await mongoose.disconnect();
    return;
  }

  const section = (course.sections || []).find((s) => String(s._id) === '6a213d7485fb6d4f3b36be0e');
  const lesson = (section?.lessons || []).find((l) => String(l._id) === '6a213d7485fb6d4f3b36be0f');

  if (!lesson) {
    console.log('Lesson not found');
  } else {
    console.log('videoSummary in DB:', JSON.stringify(lesson.videoSummary, null, 2));
    console.log('transcript in DB:', !!lesson.transcript, lesson.transcript ? lesson.transcript.substring(0, 100) + '...' : 'none');
  }

  await mongoose.disconnect();
}

main().catch(console.error);
