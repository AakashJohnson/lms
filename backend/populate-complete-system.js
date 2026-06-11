import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

console.log('\n🔌 Connecting to local MongoDB...\n');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})
.then(async () => {
  console.log('✅ Connected to MongoDB!\n');
  await populateCompleteSystem();
})
.catch((error) => {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
});

async function populateCompleteSystem() {
  try {
    console.log('🧹 Cleaning old data...\n');
    
    // Drop all collections
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
    
    // ============================================
    // ADMINS COLLECTION
    // ============================================
    console.log('👑 Creating admins collection...\n');
    const adminsCollection = mongoose.connection.db.collection('admins');
    
    const adminDocs = await adminsCollection.insertMany([
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
      }
    ]);
    
    await adminsCollection.createIndex({ email: 1 }, { unique: true });
    await adminsCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log('✅ 2 Admins created!\n');
    
    // ============================================
    // TRAINERS COLLECTION
    // ============================================
    console.log('👨‍🏫 Creating trainers collection...\n');
    const trainersCollection = mongoose.connection.db.collection('trainers');
    
    const trainerDocs = await trainersCollection.insertMany([
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
      }
    ]);
    
    await trainersCollection.createIndex({ email: 1 }, { unique: true });
    await trainersCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log('✅ 3 Trainers created!\n');
    
    // ============================================
    // STUDENTS COLLECTION
    // ============================================
    console.log('👨‍🎓 Creating students collection...\n');
    const studentsCollection = mongoose.connection.db.collection('students');
    
    await studentsCollection.insertMany([
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
    ]);
    
    await studentsCollection.createIndex({ email: 1 }, { unique: true });
    await studentsCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log('✅ 10 Students created!\n');
    
    // ============================================
    // COURSES COLLECTION (Sample PDF-based courses)
    // ============================================
    console.log('📚 Creating courses collection...\n');
    const coursesCollection = mongoose.connection.db.collection('courses');
    
    const trainerId = trainerDocs.insertedIds[0];
    
    await coursesCollection.insertMany([
      {
        title: "Introduction to Cooperative Management",
        slug: "introduction-to-cooperative-management",
        description: "Learn the fundamentals of cooperative management, including principles, governance, and best practices.",
        shortDescription: "Master the basics of cooperative management",
        category: "cooperative-management",
        level: "beginner",
        language: "en",
        thumbnail: "https://example.com/thumbnails/coop-management.jpg",
        instructor: trainerId,
        modules: [
          {
            title: "Module 1: Cooperative Principles",
            description: "Understanding the seven cooperative principles",
            order: 1,
            duration: 120,
            topics: [
              {
                title: "Introduction to Cooperatives",
                description: "What are cooperatives and why they matter",
                order: 1,
                contentType: "pdf",
                contentUrl: "https://example.com/content/intro-cooperatives.pdf",
                duration: 30,
                fileSize: 2048000,
                isDownloadable: false,
                metadata: {
                  format: "PDF",
                  pages: 25
                }
              },
              {
                title: "The Seven Principles",
                description: "Detailed explanation of cooperative principles",
                order: 2,
                contentType: "pdf",
                contentUrl: "https://example.com/content/seven-principles.pdf",
                duration: 45,
                fileSize: 3072000,
                isDownloadable: false,
                metadata: {
                  format: "PDF",
                  pages: 35
                }
              }
            ],
            isPublished: true
          }
        ],
        totalDuration: 120,
        learningOutcomes: [
          "Understand cooperative principles",
          "Learn governance structures",
          "Apply best practices"
        ],
        tags: ["cooperative", "management", "governance"],
        isPublished: true,
        publishedAt: new Date(),
        enrollmentType: "open",
        currentEnrollments: 0,
        certificateEligibility: {
          minCompletionPercentage: 80,
          minAssessmentScore: 60
        },
        pricing: {
          isFree: true,
          amount: 0,
          currency: "INR"
        },
        ratings: {
          average: 0,
          count: 0
        },
        statistics: {
          totalViews: 0,
          totalEnrollments: 0,
          totalCompletions: 0
        },
        isActive: true,
        createdBy: trainerId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Financial Literacy for Cooperatives",
        slug: "financial-literacy-for-cooperatives",
        description: "Essential financial management skills for cooperative members and leaders.",
        shortDescription: "Master financial management basics",
        category: "financial-literacy",
        level: "intermediate",
        language: "en",
        thumbnail: "https://example.com/thumbnails/financial-literacy.jpg",
        instructor: trainerId,
        modules: [
          {
            title: "Module 1: Financial Basics",
            description: "Understanding financial statements and budgeting",
            order: 1,
            duration: 90,
            topics: [
              {
                title: "Reading Financial Statements",
                description: "How to read and understand financial reports",
                order: 1,
                contentType: "pdf",
                contentUrl: "https://example.com/content/financial-statements.pdf",
                duration: 45,
                fileSize: 2560000,
                isDownloadable: false,
                metadata: {
                  format: "PDF",
                  pages: 30
                }
              }
            ],
            isPublished: true
          }
        ],
        totalDuration: 90,
        learningOutcomes: [
          "Read financial statements",
          "Create budgets",
          "Manage cooperative finances"
        ],
        tags: ["finance", "literacy", "budgeting"],
        isPublished: true,
        publishedAt: new Date(),
        enrollmentType: "open",
        currentEnrollments: 0,
        certificateEligibility: {
          minCompletionPercentage: 80,
          minAssessmentScore: 60
        },
        pricing: {
          isFree: true,
          amount: 0,
          currency: "INR"
        },
        ratings: {
          average: 0,
          count: 0
        },
        statistics: {
          totalViews: 0,
          totalEnrollments: 0,
          totalCompletions: 0
        },
        isActive: true,
        createdBy: trainerId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    await coursesCollection.createIndex({ slug: 1 }, { unique: true });
    await coursesCollection.createIndex({ category: 1, isPublished: 1 });
    console.log('✅ 2 Sample courses created!\n');
    
    // ============================================
    // QUERIES COLLECTION (QMS - Query Management System)
    // ============================================
    console.log('❓ Creating queries collection...\n');
    const queriesCollection = mongoose.connection.db.collection('queries');
    
    await queriesCollection.insertMany([
      {
        title: "How to enroll in a course?",
        description: "I am unable to find the enrollment button for the cooperative management course.",
        category: "course-content",
        priority: "medium",
        status: "resolved",
        askedBy: {
          userId: new mongoose.Types.ObjectId(),
          userType: "student",
          name: "Student Singh",
          email: "student@ncui.in"
        },
        assignedTo: {
          userId: adminDocs.insertedIds[0],
          userType: "admin",
          name: "Admin User",
          email: "admin@ncui.in"
        },
        responses: [
          {
            respondedBy: {
              userId: adminDocs.insertedIds[0],
              userType: "admin",
              name: "Admin User",
              email: "admin@ncui.in"
            },
            response: "To enroll in a course, please click on the course card and then click the 'Enroll Now' button on the course details page.",
            attachments: [],
            isExpertResponse: true,
            respondedAt: new Date()
          }
        ],
        tags: ["enrollment", "course"],
        viewCount: 15,
        isPublic: true,
        resolvedAt: new Date(),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        updatedAt: new Date()
      },
      {
        title: "Certificate download issue",
        description: "I completed the course but cannot download my certificate.",
        category: "certificate",
        priority: "high",
        status: "open",
        askedBy: {
          userId: new mongoose.Types.ObjectId(),
          userType: "student",
          name: "Priya Patel",
          email: "priya.student@ncui.in"
        },
        tags: ["certificate", "download"],
        viewCount: 5,
        isPublic: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date()
      }
    ]);
    
    await queriesCollection.createIndex({ status: 1, priority: 1 });
    await queriesCollection.createIndex({ category: 1 });
    console.log('✅ 2 Sample queries created!\n');
    
    // ============================================
    // MEDIA COLLECTION (Media Library)
    // ============================================
    console.log('🎬 Creating media collection...\n');
    const mediaCollection = mongoose.connection.db.collection('media');
    
    await mediaCollection.insertMany([
      {
        title: "Introduction to Cooperatives - Video Lecture",
        description: "A comprehensive video lecture on cooperative principles and practices.",
        mediaType: "video",
        fileUrl: "https://example.com/media/intro-cooperatives.mp4",
        thumbnailUrl: "https://example.com/thumbnails/intro-video.jpg",
        fileName: "intro-cooperatives.mp4",
        fileSize: 157286400, // ~150MB
        mimeType: "video/mp4",
        duration: 1800, // 30 minutes
        category: "educational",
        tags: ["cooperative", "introduction", "principles"],
        uploadedBy: {
          userId: trainerId,
          userType: "trainer",
          name: "Trainer Kumar"
        },
        accessLevel: "enrolled",
        viewCount: 45,
        downloadCount: 12,
        likes: 23,
        isActive: true,
        isFeatured: true,
        metadata: {
          resolution: "1920x1080",
          bitrate: "5000kbps",
          codec: "H.264",
          aspectRatio: "16:9"
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        updatedAt: new Date()
      },
      {
        title: "Financial Management Webinar Recording",
        description: "Recording of the live webinar on financial management for cooperatives.",
        mediaType: "video",
        fileUrl: "https://example.com/media/financial-webinar.mp4",
        thumbnailUrl: "https://example.com/thumbnails/financial-webinar.jpg",
        fileName: "financial-webinar.mp4",
        fileSize: 209715200, // ~200MB
        mimeType: "video/mp4",
        duration: 3600, // 60 minutes
        category: "webinar",
        tags: ["finance", "webinar", "management"],
        uploadedBy: {
          userId: trainerId,
          userType: "trainer",
          name: "Trainer Kumar"
        },
        accessLevel: "public",
        viewCount: 128,
        downloadCount: 34,
        likes: 67,
        isActive: true,
        isFeatured: true,
        metadata: {
          resolution: "1920x1080",
          bitrate: "4000kbps",
          codec: "H.264",
          aspectRatio: "16:9"
        },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        updatedAt: new Date()
      },
      {
        title: "Cooperative Governance Audio Guide",
        description: "Audio guide explaining cooperative governance structures.",
        mediaType: "audio",
        fileUrl: "https://example.com/media/governance-guide.mp3",
        fileName: "governance-guide.mp3",
        fileSize: 15728640, // ~15MB
        mimeType: "audio/mpeg",
        duration: 900, // 15 minutes
        category: "tutorial",
        tags: ["governance", "audio", "guide"],
        uploadedBy: {
          userId: trainerId,
          userType: "trainer",
          name: "Trainer Kumar"
        },
        accessLevel: "enrolled",
        viewCount: 67,
        downloadCount: 45,
        likes: 34,
        isActive: true,
        isFeatured: false,
        metadata: {
          bitrate: "192kbps",
          codec: "MP3"
        },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
        updatedAt: new Date()
      }
    ]);
    
    await mediaCollection.createIndex({ mediaType: 1, category: 1 });
    await mediaCollection.createIndex({ tags: 1 });
    console.log('✅ 3 Sample media items created!\n');
    
    // Summary
    const totalAdmins = await adminsCollection.countDocuments();
    const totalTrainers = await trainersCollection.countDocuments();
    const totalStudents = await studentsCollection.countDocuments();
    const totalCourses = await coursesCollection.countDocuments();
    const totalQueries = await queriesCollection.countDocuments();
    const totalMedia = await mediaCollection.countDocuments();
    
    console.log('='.repeat(60));
    console.log('🎉 Complete System Population Done!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Admins: ${totalAdmins} (in 'admins' collection)`);
    console.log(`   Trainers: ${totalTrainers} (in 'trainers' collection)`);
    console.log(`   Students: ${totalStudents} (in 'students' collection)`);
    console.log(`   Courses: ${totalCourses} (in 'courses' collection)`);
    console.log(`   Queries: ${totalQueries} (in 'queries' collection)`);
    console.log(`   Media: ${totalMedia} (in 'media' collection)`);
    console.log(`   Total Users: ${totalAdmins + totalTrainers + totalStudents}`);
    
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
    
    console.log('\n📚 Features Available:');
    console.log('   ✅ LMS - Learning Management System (PDF-based courses)');
    console.log('   ✅ QMS - Query Management System (User queries & expert responses)');
    console.log('   ✅ Media Library - Audio-visual content');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Backend is running: http://localhost:5000');
    console.log('   2. Test login: http://localhost:5173/login');
    console.log('   3. Explore courses, queries, and media!');
    console.log('   4. Enjoy! 🎉\n');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed. Done!\n');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}
