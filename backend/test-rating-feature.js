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

const testRatingFeature = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🌟 RATING FEATURE TEST\n');
    console.log('='.repeat(60));

    // Find a student
    const student = await User.findOne({ role: 'student', email: 'student@ncui.in' });
    if (!student) {
      console.log('❌ Student not found. Please create a student first.');
      return;
    }
    console.log(`\n👤 Student: ${student.firstName} ${student.lastName} (${student.email})`);

    // Find a course
    const course = await Course.findOne({ isPublished: true });
    if (!course) {
      console.log('❌ No published course found.');
      return;
    }
    console.log(`📚 Course: ${course.title}`);

    // Check if student is enrolled
    let enrollment = await Enrollment.findOne({
      user: student._id,
      course: course._id
    });

    if (!enrollment) {
      console.log('\n📝 Creating enrollment...');
      enrollment = await Enrollment.create({
        user: student._id,
        course: course._id,
        status: 'completed',
        progressPercent: 100,
        enrolledAt: new Date(),
        completedAt: new Date()
      });
      console.log('✅ Enrollment created (100% completed)');
    } else {
      console.log(`\n📊 Enrollment exists: ${enrollment.status} (${enrollment.progressPercent}%)`);
    }

    // Check existing rating
    let rating = await CourseRating.findOne({
      course: course._id,
      student: student._id
    });

    if (rating) {
      console.log('\n⭐ Existing Rating Found:');
      console.log(`   Rating: ${rating.rating}/5`);
      console.log(`   Review: ${rating.review || 'No review'}`);
      console.log(`   Created: ${rating.createdAt}`);
      
      // Update rating
      console.log('\n🔄 Updating rating...');
      rating.rating = 5;
      rating.review = 'Updated review - Excellent course! Highly recommended.';
      await rating.save();
      console.log('✅ Rating updated successfully!');
    } else {
      // Create new rating
      console.log('\n✨ Creating new rating...');
      rating = await CourseRating.create({
        course: course._id,
        student: student._id,
        rating: 5,
        review: 'Excellent course! Learned a lot about cooperative management.'
      });
      console.log('✅ Rating created successfully!');
    }

    // Fetch updated course to see rating statistics
    const updatedCourse = await Course.findById(course._id);
    console.log('\n📊 Course Rating Statistics:');
    console.log(`   Average Rating: ${updatedCourse.ratings?.average || 0}/5`);
    console.log(`   Total Ratings: ${updatedCourse.ratings?.count || 0}`);
    console.log(`   Distribution:`);
    console.log(`     5 stars: ${updatedCourse.ratings?.distribution?.[5] || 0}`);
    console.log(`     4 stars: ${updatedCourse.ratings?.distribution?.[4] || 0}`);
    console.log(`     3 stars: ${updatedCourse.ratings?.distribution?.[3] || 0}`);
    console.log(`     2 stars: ${updatedCourse.ratings?.distribution?.[2] || 0}`);
    console.log(`     1 star:  ${updatedCourse.ratings?.distribution?.[1] || 0}`);

    // Fetch all ratings for this course
    const allRatings = await CourseRating.find({ course: course._id })
      .populate('student', 'firstName lastName email')
      .sort('-createdAt');

    console.log(`\n📝 All Ratings for "${course.title}":`);
    if (allRatings.length === 0) {
      console.log('   No ratings yet');
    } else {
      allRatings.forEach((r, idx) => {
        console.log(`\n   ${idx + 1}. ${r.student.firstName} ${r.student.lastName}`);
        console.log(`      Rating: ${'⭐'.repeat(r.rating)} (${r.rating}/5)`);
        console.log(`      Review: ${r.review || 'No review'}`);
        console.log(`      Date: ${r.createdAt.toLocaleDateString()}`);
      });
    }

    // Test recent ratings query (for admin dashboard)
    console.log('\n\n📊 RECENT RATINGS (Admin Dashboard):');
    console.log('='.repeat(60));
    const recentRatings = await CourseRating.find({
      isApproved: true,
      isVisible: true
    })
      .populate('student', 'firstName lastName profilePicture')
      .populate('course', 'title thumbnail')
      .sort('-createdAt')
      .limit(5)
      .lean();

    if (recentRatings.length === 0) {
      console.log('No recent ratings found');
    } else {
      recentRatings.forEach((r, idx) => {
        console.log(`\n${idx + 1}. ${r.student.firstName} ${r.student.lastName}`);
        console.log(`   Course: ${r.course.title}`);
        console.log(`   Rating: ${'⭐'.repeat(r.rating)} (${r.rating}/5)`);
        if (r.review) {
          console.log(`   Review: "${r.review.substring(0, 60)}${r.review.length > 60 ? '...' : ''}"`);
        }
        const timeAgo = (() => {
          const diff = Date.now() - new Date(r.createdAt).getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
          if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
          return 'Just now';
        })();
        console.log(`   Time: ${timeAgo}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Rating Feature Test Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Restart backend server: cd backend && npm start');
    console.log('   2. Login as student: student@ncui.in / Student@123');
    console.log('   3. Go to My Courses and click "Rate" on completed course');
    console.log('   4. Login as admin to see ratings on dashboard');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testRatingFeature();
