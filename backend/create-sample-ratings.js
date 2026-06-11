import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import CourseRating from './src/models/CourseRating.model.js';
import Enrollment from './src/models/Enrollment.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const createSampleRatings = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('⭐ CREATING SAMPLE RATINGS\n');
    console.log('='.repeat(60));

    // Find students
    const students = await User.find({ role: 'student' }).limit(3);
    console.log(`\n👥 Found ${students.length} students`);

    if (students.length === 0) {
      console.log('❌ No students found. Please create students first.');
      return;
    }

    // Find courses
    const courses = await Course.find({ isPublished: true }).limit(2);
    console.log(`📚 Found ${courses.length} courses`);

    if (courses.length === 0) {
      console.log('❌ No published courses found.');
      return;
    }

    // Create enrollments and ratings
    let ratingsCreated = 0;

    for (const student of students) {
      for (const course of courses) {
        // Check if enrollment exists
        let enrollment = await Enrollment.findOne({
          user: student._id,
          course: course._id
        });

        if (!enrollment) {
          // Create enrollment
          enrollment = await Enrollment.create({
            user: student._id,
            course: course._id,
            status: 'completed',
            progressPercent: 100,
            enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            completedAt: new Date()
          });
          console.log(`\n✅ Created enrollment for ${student.firstName} in ${course.title}`);
        }

        // Check if rating exists
        const existingRating = await CourseRating.findOne({
          course: course._id,
          student: student._id
        });

        if (!existingRating) {
          // Create rating
          const rating = await CourseRating.create({
            course: course._id,
            student: student._id,
            rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
            review: [
              'Excellent course! Learned a lot about cooperative management.',
              'Very informative and well-structured. Highly recommended!',
              'Great content and presentation. The trainer was very knowledgeable.',
              'This course exceeded my expectations. Thank you!',
              'Practical examples made it easy to understand complex concepts.'
            ][Math.floor(Math.random() * 5)]
          });

          console.log(`⭐ Created rating: ${student.firstName} rated ${course.title} - ${rating.rating}/5`);
          ratingsCreated++;
        } else {
          console.log(`⏭️  Rating already exists for ${student.firstName} in ${course.title}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Created ${ratingsCreated} new ratings!`);

    // Fetch and display all ratings
    const allRatings = await CourseRating.find()
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .sort('-createdAt');

    console.log(`\n📊 Total Ratings in Database: ${allRatings.length}`);
    console.log('\nAll Ratings:');
    allRatings.forEach((r, idx) => {
      console.log(`\n${idx + 1}. ${r.student.firstName} ${r.student.lastName}`);
      console.log(`   Course: ${r.course.title}`);
      console.log(`   Rating: ${'⭐'.repeat(r.rating)} (${r.rating}/5)`);
      console.log(`   Review: ${r.review || 'No review'}`);
      console.log(`   Created: ${r.createdAt.toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Sample Ratings Created Successfully!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Restart backend if needed');
    console.log('   2. Login as admin: admin@ncui.in / Admin@123');
    console.log('   3. Check "Recent Comments & Feedback" on dashboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

createSampleRatings();
