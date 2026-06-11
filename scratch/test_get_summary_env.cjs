const fs = require('fs');
const mongoose = require('mongoose');

// Search for .env
let dotenvContent = '';
if (fs.existsSync('.env')) {
  dotenvContent = fs.readFileSync('.env', 'utf8');
} else if (fs.existsSync('../.env')) {
  dotenvContent = fs.readFileSync('../.env', 'utf8');
} else if (fs.existsSync('backend/.env')) {
  dotenvContent = fs.readFileSync('backend/.env', 'utf8');
} else if (fs.existsSync('../backend/.env')) {
  dotenvContent = fs.readFileSync('../backend/.env', 'utf8');
}

let uri = '';
dotenvContent.split('\n').forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.substring('MONGODB_URI='.length).trim();
  }
});

if (!uri) {
  console.error('Could not find MONGODB_URI');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);
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
