import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from './src/models/User.model.js';
import Course from './src/models/Course.model.js';
import Enrollment from './src/models/Enrollment.model.js';
import Certificate from './src/models/Certificate.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const testAdminDashboard = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📊 ADMIN DASHBOARD DATA TEST\n');
    console.log('='.repeat(60));

    // Test User counts by role
    const adminCount = await User.countDocuments({ role: 'administrator', isActive: true });
    const trainerCount = await User.countDocuments({ role: 'trainer', isActive: true });
    const studentCount = await User.countDocuments({ role: 'student', isActive: true });
    const pendingTrainers = await User.countDocuments({ role: 'trainer', isApproved: false });
    const pendingStudents = await User.countDocuments({ role: 'student', isApproved: false });

    console.log('\n👥 USER STATISTICS:');
    console.log(`   Administrators: ${adminCount}`);
    console.log(`   Trainers: ${trainerCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   Total Users: ${adminCount + trainerCount + studentCount}`);
    console.log(`   Pending Approvals: ${pendingTrainers + pendingStudents} (${pendingTrainers} trainers, ${pendingStudents} students)`);

    // Test Course counts
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ isPublished: true });

    console.log('\n📚 COURSE STATISTICS:');
    console.log(`   Total Courses: ${totalCourses}`);
    console.log(`   Published: ${publishedCourses}`);
    console.log(`   Draft: ${totalCourses - publishedCourses}`);

    // Test Enrollment counts
    const enrollmentCount = await Enrollment.countDocuments();
    const completedCount = await Enrollment.countDocuments({ status: 'completed' });

    console.log('\n🎓 ENROLLMENT STATISTICS:');
    console.log(`   Total Enrollments: ${enrollmentCount}`);
    console.log(`   Completed: ${completedCount}`);
    console.log(`   In Progress: ${enrollmentCount - completedCount}`);

    // Test Certificate counts
    const totalCertificates = await Certificate.countDocuments();

    console.log('\n🏆 CERTIFICATE STATISTICS:');
    console.log(`   Total Certificates: ${totalCertificates}`);

    // Test Recent Registrations
    const recentTrainers = await User.find({ role: 'trainer' })
      .sort('-createdAt')
      .limit(5)
      .select('firstName lastName email isApproved createdAt role');
    
    const recentStudents = await User.find({ role: 'student' })
      .sort('-createdAt')
      .limit(5)
      .select('firstName lastName email isApproved createdAt role');

    const allRecentRegistrations = [...recentTrainers, ...recentStudents]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    console.log('\n📝 RECENT REGISTRATIONS (Last 10):');
    allRecentRegistrations.forEach((user, idx) => {
      const timeAgo = (() => {
        const diff = Date.now() - new Date(user.createdAt).getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return 'Just now';
      })();
      
      console.log(`   ${idx + 1}. ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
      console.log(`      Approved: ${user.isApproved ? '✅' : '❌'} | Registered: ${timeAgo}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Admin Dashboard Data Test Complete!');
    console.log('\n💡 If all counts show 0, you need to:');
    console.log('   1. Create users with different roles');
    console.log('   2. Create courses');
    console.log('   3. Create enrollments');
    console.log('   4. Restart the backend server');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

testAdminDashboard();
