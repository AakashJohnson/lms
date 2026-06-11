import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Connect to local MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

console.log('\n🔌 Connecting to local MongoDB...\n');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})
.then(async () => {
  console.log('✅ Connected to MongoDB!\n');
  await populateDatabase();
})
.catch((error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

async function populateDatabase() {
  try {
    console.log('🧹 Cleaning old data...\n');
    
    // Drop existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`   Dropped: ${collection.name}`);
    }
    
    console.log('\n✅ Old data cleaned!\n');
    
    // Generate password hashes
    console.log('🔐 Generating password hashes...\n');
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const trainerHash = await bcrypt.hash('Trainer@123', 12);
    const studentHash = await bcrypt.hash('Student@123', 12);
    console.log('✅ Password hashes generated!\n');
    
    // Create users collection
    console.log('👥 Creating users collection...\n');
    const usersCollection = mongoose.connection.db.collection('users');
    
    const users = [
      // ============================================
      // ADMINS (2)
      // ============================================
      {
        firstName: "Admin",
        lastName: "User",
        email: "admin@ncui.in",
        mobile: "9999999999",
        password: adminHash,
        role: "administrator",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        loginAttempts: 0,
        preferences: {
          language: "en",
          notifications: { email: true, sms: true, push: true }
        },
        permissions: ["*"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Super",
        lastName: "Admin",
        email: "superadmin@ncui.in",
        mobile: "9999999998",
        password: adminHash,
        role: "administrator",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        loginAttempts: 0,
        preferences: {
          language: "en",
          notifications: { email: true, sms: true, push: true }
        },
        permissions: ["*"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // ============================================
      // TRAINERS (3)
      // ============================================
      {
        firstName: "Trainer",
        lastName: "Kumar",
        email: "trainer@ncui.in",
        mobile: "8888888888",
        password: trainerHash,
        role: "trainer",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "NCUI CEAS",
        designation: "Senior Trainer",
        specialization: ["Cooperative Management", "Financial Literacy"],
        experience: 5,
        coursesCreated: [],
        totalStudents: 0,
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Rajesh",
        lastName: "Sharma",
        email: "rajesh.trainer@ncui.in",
        mobile: "8888888887",
        password: trainerHash,
        role: "trainer",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "NCUI CEAS",
        designation: "Trainer",
        specialization: ["Digital Skills", "Marketing"],
        experience: 3,
        coursesCreated: [],
        totalStudents: 0,
        rating: 4.2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Priya",
        lastName: "Mehta",
        email: "priya.trainer@ncui.in",
        mobile: "8888888886",
        password: trainerHash,
        role: "trainer",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "NCUI CEAS",
        designation: "Lead Trainer",
        specialization: ["Leadership", "Agriculture"],
        experience: 7,
        coursesCreated: [],
        totalStudents: 0,
        rating: 4.8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // ============================================
      // STUDENTS (10)
      // ============================================
      {
        firstName: "Student",
        lastName: "Singh",
        email: "student@ncui.in",
        mobile: "7777777777",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "ABC Cooperative",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.student@ncui.in",
        mobile: "7777777776",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "XYZ Cooperative",
        designation: "Secretary",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Amit",
        lastName: "Verma",
        email: "amit.student@ncui.in",
        mobile: "7777777775",
        password: studentHash,
        role: "participant",
        isApproved: false,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "PQR Society",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Rahul",
        lastName: "Gupta",
        email: "rahul@ncui.in",
        mobile: "7777777774",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "DEF Cooperative",
        designation: "Treasurer",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Sneha",
        lastName: "Reddy",
        email: "sneha@ncui.in",
        mobile: "7777777773",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "GHI Society",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Vikram",
        lastName: "Joshi",
        email: "vikram@ncui.in",
        mobile: "7777777772",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "JKL Cooperative",
        designation: "President",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Anjali",
        lastName: "Nair",
        email: "anjali@ncui.in",
        mobile: "7777777771",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "MNO Society",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Karan",
        lastName: "Malhotra",
        email: "karan@ncui.in",
        mobile: "7777777770",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "PQR Cooperative",
        designation: "Vice President",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Divya",
        lastName: "Iyer",
        email: "divya@ncui.in",
        mobile: "7777777769",
        password: studentHash,
        role: "participant",
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "STU Society",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: "Arjun",
        lastName: "Kapoor",
        email: "arjun@ncui.in",
        mobile: "7777777768",
        password: studentHash,
        role: "participant",
        isApproved: false,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        organization: "VWX Cooperative",
        designation: "Member",
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        totalCoursesEnrolled: 0,
        totalCoursesCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await usersCollection.insertMany(users);
    console.log('✅ Inserted 15 users!\n');
    
    // Create indexes
    console.log('⚡ Creating indexes...\n');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ mobile: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    console.log('✅ Indexes created!\n');
    
    // Summary
    const totalUsers = await usersCollection.countDocuments();
    const admins = await usersCollection.countDocuments({ role: "administrator" });
    const trainers = await usersCollection.countDocuments({ role: "trainer" });
    const students = await usersCollection.countDocuments({ role: "participant" });
    
    console.log('='.repeat(60));
    console.log('🎉 Database Population Complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Administrators: ${admins}`);
    console.log(`   Trainers: ${trainers}`);
    console.log(`   Participants: ${students}`);
    
    console.log('\n📋 Login Credentials:');
    console.log('\n👑 ADMINS:');
    console.log('   admin@ncui.in / Admin@123');
    console.log('   superadmin@ncui.in / Admin@123');
    
    console.log('\n👨‍🏫 TRAINERS:');
    console.log('   trainer@ncui.in / Trainer@123');
    console.log('   rajesh.trainer@ncui.in / Trainer@123');
    console.log('   priya.trainer@ncui.in / Trainer@123');
    
    console.log('\n👨‍🎓 STUDENTS (Approved - 8):');
    console.log('   student@ncui.in / Student@123');
    console.log('   priya.student@ncui.in / Student@123');
    console.log('   rahul@ncui.in / Student@123');
    console.log('   sneha@ncui.in / Student@123');
    console.log('   vikram@ncui.in / Student@123');
    console.log('   anjali@ncui.in / Student@123');
    console.log('   karan@ncui.in / Student@123');
    console.log('   divya@ncui.in / Student@123');
    
    console.log('\n👨‍🎓 STUDENTS (Pending - 2):');
    console.log('   amit.student@ncui.in / Student@123');
    console.log('   arjun@ncui.in / Student@123');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Backend is already running');
    console.log('   2. Test login: http://localhost:5173/login');
    console.log('   3. Use any credential above');
    console.log('   4. Enjoy! 🎉\n');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed. Done!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}
