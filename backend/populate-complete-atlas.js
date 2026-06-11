import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Override default DNS resolution servers in Node.js to handle MongoDB Atlas SRV query issues (ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('🌐 Overrode default DNS resolution servers with [8.8.8.8, 1.1.1.1] for reliable Atlas SRV connection.');
} catch (err) {
  console.warn(`⚠️ Custom DNS server configuration failed: ${err.message}`);
}

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MONGODB_URI is not defined in your backend/.env file!');
  process.exit(1);
}

console.log('\n🚀 Starting CEAS-LMS Complete Atlas Database Population...\n');
console.log(`🔌 Attempting to connect to: ${mongoUri.replace(/:[^:@]+@/, ':****@')}\n`);

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 15000,
  family: 4 // Force IPv4
})
.then(async () => {
  console.log('✅ Connected successfully to MongoDB Atlas!');
  await populateCompleteSystem();
})
.catch((error) => {
  console.error('❌ MongoDB Atlas connection failed:', error.message);
  console.error('💡 Please make sure your current IP address is whitelisted in MongoDB Atlas Network Access.');
  process.exit(1);
});

async function populateCompleteSystem() {
  try {
    const db = mongoose.connection.db;
    console.log(`📦 Targeted Database: ${mongoose.connection.name}\n`);
    
    console.log('🧹 Cleaning old data from all target collections...');
    const collectionsToDrop = ['users', 'admins', 'trainers', 'students', 'courses', 'assessments', 'queries', 'media'];
    const activeCollections = await db.listCollections().toArray();
    const activeCollectionNames = activeCollections.map(c => c.name);

    for (const name of collectionsToDrop) {
      if (activeCollectionNames.includes(name)) {
        await db.dropCollection(name);
        console.log(`   🗑️  Dropped collection: ${name}`);
      }
    }
    console.log('✅ Old data cleared!\n');
    
    console.log('🔐 Generating password hashes...');
    const adminHash = await bcrypt.hash('Admin@123', 12);
    const trainerHash = await bcrypt.hash('Trainer@123', 12);
    const studentHash = await bcrypt.hash('Student@123', 12);
    console.log('✅ Password hashes generated!\n');
    
    // ============================================
    // 1. ADMINS COLLECTION (admins)
    // ============================================
    console.log('👑 Seeding ADMINS collection...');
    const adminsCollection = db.collection('admins');
    const adminDocs = [
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
    ];
    const seededAdmins = await adminsCollection.insertMany(adminDocs);
    await adminsCollection.createIndex({ email: 1 }, { unique: true });
    await adminsCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log(`✅ Seeded ${seededAdmins.insertedCount} administrators.\n`);

    // ============================================
    // 2. TRAINERS COLLECTION (trainers)
    // ============================================
    console.log('👨‍🏫 Seeding TRAINERS collection...');
    const trainersCollection = db.collection('trainers');
    const trainerDocs = [
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
    ];
    const seededTrainers = await trainersCollection.insertMany(trainerDocs);
    await trainersCollection.createIndex({ email: 1 }, { unique: true });
    await trainersCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log(`✅ Seeded ${seededTrainers.insertedCount} trainers.\n`);

    // ============================================
    // 3. STUDENTS COLLECTION (students)
    // ============================================
    console.log('👨‍🎓 Seeding STUDENTS collection...');
    const studentsCollection = db.collection('students');
    const studentDocs = [
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
    const seededStudents = await studentsCollection.insertMany(studentDocs);
    await studentsCollection.createIndex({ email: 1 }, { unique: true });
    await studentsCollection.createIndex({ mobile: 1 }, { unique: true });
    console.log(`✅ Seeded ${seededStudents.insertedCount} students.\n`);

    // ============================================
    // 4. UNIFIED USERS COLLECTION (users)
    // ============================================
    console.log('👥 Seeding UNIFIED USERS collection...');
    const usersCollection = db.collection('users');
    
    // Map participant role to student for unified users
    const unifiedUserDocs = [
      ...adminDocs,
      ...trainerDocs,
      ...studentDocs.map(s => ({ ...s, role: s.role === 'participant' ? 'student' : s.role }))
    ];

    const seededUsers = await usersCollection.insertMany(unifiedUserDocs);
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ mobile: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    console.log(`✅ Seeded ${seededUsers.insertedCount} users into unified collection.\n`);

    // ============================================
    // 5. COURSES COLLECTION (courses)
    // ============================================
    console.log('📚 Seeding COURSES collection...');
    const coursesCollection = db.collection('courses');
    
    // Retrieve one trainer id from unified users
    const dbTrainer = await usersCollection.findOne({ role: 'trainer' });
    const dbAdmin = await usersCollection.findOne({ role: 'administrator' });
    const trainerId = dbTrainer ? dbTrainer._id : new mongoose.Types.ObjectId();
    const adminId = dbAdmin ? dbAdmin._id : new mongoose.Types.ObjectId();

    const courseDocs = [
      {
        title: "Introduction to Cooperative Management",
        slug: "introduction-to-cooperative-management",
        description: "Learn the fundamentals of cooperative management, including principles, governance, and best practices.",
        shortDescription: "Master the basics of cooperative management",
        category: "cooperative-management",
        subcategory: "basics",
        level: "beginner",
        language: "en",
        thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
        coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200",
        instructor: trainerId,
        coInstructors: [],
        modules: [
          {
            _id: new mongoose.Types.ObjectId(),
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
        targetAudience: [
          "Cooperative members",
          "Aspiring cooperative managers",
          "Students of cooperative management"
        ],
        tags: ["cooperative", "management", "governance"],
        isPublished: true,
        publishedAt: new Date(),
        enrollmentType: "open",
        currentEnrollments: 0,
        startDate: new Date(),
        endDate: null,
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
        reviews: [],
        assessments: [],
        batches: [
          {
            batchName: "Batch 2024-01",
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            maxParticipants: 100,
            currentParticipants: 0,
            isActive: true
          }
        ],
        statistics: {
          totalViews: 0,
          totalEnrollments: 0,
          totalCompletions: 0
        },
        isActive: true,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Financial Literacy for Cooperatives",
        slug: "financial-literacy-for-cooperatives",
        description: "Essential financial management skills for cooperative members and leaders.",
        shortDescription: "Master financial management basics",
        category: "financial-literacy",
        subcategory: "basics",
        level: "intermediate",
        language: "en",
        thumbnail: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
        coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200",
        instructor: trainerId,
        coInstructors: [],
        modules: [
          {
            _id: new mongoose.Types.ObjectId(),
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
        targetAudience: [
          "Cooperative secretaries",
          "Cooperative treasurers",
          "Members interested in finance"
        ],
        tags: ["finance", "literacy", "budgeting"],
        isPublished: true,
        publishedAt: new Date(),
        enrollmentType: "open",
        currentEnrollments: 0,
        startDate: new Date(),
        endDate: null,
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
        reviews: [],
        assessments: [],
        batches: [
          {
            batchName: "Batch 2024-02",
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            maxParticipants: 100,
            currentParticipants: 0,
            isActive: true
          }
        ],
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
    ];

    const seededCourses = await coursesCollection.insertMany(courseDocs);
    await coursesCollection.createIndex({ slug: 1 }, { unique: true });
    await coursesCollection.createIndex({ category: 1, isPublished: 1 });
    console.log(`✅ Seeded ${seededCourses.insertedCount} courses.\n`);

    // ============================================
    // 6. ASSESSMENTS COLLECTION (assessments)
    // ============================================
    console.log('📝 Seeding ASSESSMENTS collection...');
    const assessmentsCollection = db.collection('assessments');
    const dbCourse = await coursesCollection.findOne({ slug: "introduction-to-cooperative-management" });
    const courseId = dbCourse ? dbCourse._id : new mongoose.Types.ObjectId();
    const moduleId = dbCourse && dbCourse.modules && dbCourse.modules[0] ? dbCourse.modules[0]._id : new mongoose.Types.ObjectId();

    const assessmentDocs = [
      {
        title: "Module 1 Quiz: Understanding Cooperatives",
        description: "Test your knowledge about cooperative basics and principles",
        course: courseId,
        module: moduleId,
        assessmentType: "quiz",
        questions: [
          {
            questionNumber: 1,
            questionText: "What is a cooperative?",
            questionType: "mcq-single",
            options: [
              {
                optionNumber: 1,
                optionText: "A business owned and controlled by its members",
                isCorrect: true,
                isDeleted: false
              },
              {
                optionNumber: 2,
                optionText: "A government organization",
                isCorrect: false,
                isDeleted: false
              },
              {
                optionNumber: 3,
                optionText: "A private limited company",
                isCorrect: false,
                isDeleted: false
              },
              {
                optionNumber: 4,
                optionText: "A non-profit NGO",
                isCorrect: false,
                isDeleted: false
              }
            ],
            marks: 2,
            negativeMarks: 0,
            explanation: "A cooperative is a business owned and democratically controlled by its members.",
            difficulty: "easy",
            tags: ["basics", "definition"],
            isActive: true
          },
          {
            questionNumber: 2,
            questionText: "How many cooperative principles are there?",
            questionType: "mcq-single",
            options: [
              {
                optionNumber: 1,
                optionText: "Five",
                isCorrect: false,
                isDeleted: false
              },
              {
                optionNumber: 2,
                optionText: "Seven",
                isCorrect: true,
                isDeleted: false
              },
              {
                optionNumber: 3,
                optionText: "Ten",
                isCorrect: false,
                isDeleted: false
              }
            ],
            marks: 2,
            negativeMarks: 0,
            explanation: "There are seven internationally recognized cooperative principles.",
            difficulty: "easy",
            tags: ["principles"],
            isActive: true
          },
          {
            questionNumber: 3,
            questionText: "Cooperatives are democratic organizations.",
            questionType: "true-false",
            options: [
              {
                optionNumber: 1,
                optionText: "True",
                isCorrect: true,
                isDeleted: false
              },
              {
                optionNumber: 2,
                optionText: "False",
                isCorrect: false,
                isDeleted: false
              }
            ],
            marks: 1,
            negativeMarks: 0,
            explanation: "Democratic member control is one of the seven cooperative principles.",
            difficulty: "easy",
            tags: ["principles", "democracy"],
            isActive: true
          }
        ],
        totalMarks: 5,
        passingMarks: 3,
        passingPercentage: 60,
        duration: 10,
        attemptsAllowed: 3,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultsImmediately: true,
        showCorrectAnswers: false,
        evaluationType: "automatic",
        startDate: new Date(),
        endDate: null,
        isPublished: true,
        publishedAt: new Date(),
        instructions: [
          "Read each question carefully",
          "You have 10 minutes to complete this quiz",
          "You can attempt this quiz up to 3 times",
          "Passing score is 60%"
        ],
        createdBy: trainerId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const seededAssessments = await assessmentsCollection.insertMany(assessmentDocs);
    await assessmentsCollection.createIndex({ course: 1 });
    console.log(`✅ Seeded ${seededAssessments.insertedCount} assessments.\n`);

    // ============================================
    // 7. QUERIES COLLECTION (queries)
    // ============================================
    console.log('❓ Seeding QUERIES collection...');
    const queriesCollection = db.collection('queries');
    const studentUser = await usersCollection.findOne({ email: "student@ncui.in" });

    const queryDocs = [
      {
        title: "How to enroll in a course?",
        description: "I am unable to find the enrollment button for the cooperative management course.",
        category: "course-content",
        priority: "medium",
        status: "resolved",
        askedBy: {
          userId: studentUser ? studentUser._id : new mongoose.Types.ObjectId(),
          userType: "student",
          name: "Student Singh",
          email: "student@ncui.in"
        },
        assignedTo: {
          userId: adminId,
          userType: "admin",
          name: "Admin User",
          email: "admin@ncui.in"
        },
        responses: [
          {
            respondedBy: {
              userId: adminId,
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
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ];

    const seededQueries = await queriesCollection.insertMany(queryDocs);
    await queriesCollection.createIndex({ status: 1, priority: 1 });
    await queriesCollection.createIndex({ category: 1 });
    console.log(`✅ Seeded ${seededQueries.insertedCount} queries.\n`);

    // ============================================
    // 8. MEDIA COLLECTION (media)
    // ============================================
    console.log('🎬 Seeding MEDIA collection...');
    const mediaCollection = db.collection('media');

    const mediaDocs = [
      {
        title: "Introduction to Cooperatives - Video Lecture",
        description: "A comprehensive video lecture on cooperative principles and practices.",
        mediaType: "video",
        fileUrl: "https://example.com/media/intro-cooperatives.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400",
        fileName: "intro-cooperatives.mp4",
        fileSize: 157286400,
        mimeType: "video/mp4",
        duration: 1800,
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
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        title: "Financial Management Webinar Recording",
        description: "Recording of the live webinar on financial management for cooperatives.",
        mediaType: "video",
        fileUrl: "https://example.com/media/financial-webinar.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400",
        fileName: "financial-webinar.mp4",
        fileSize: 209715200,
        mimeType: "video/mp4",
        duration: 3600,
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
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      },
      {
        title: "Cooperative Governance Audio Guide",
        description: "Audio guide explaining cooperative governance structures.",
        mediaType: "audio",
        fileUrl: "https://example.com/media/governance-guide.mp3",
        fileName: "governance-guide.mp3",
        fileSize: 15728640,
        mimeType: "audio/mpeg",
        duration: 900,
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
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      }
    ];

    const seededMedia = await mediaCollection.insertMany(mediaDocs);
    await mediaCollection.createIndex({ mediaType: 1, category: 1 });
    await mediaCollection.createIndex({ tags: 1 });
    console.log(`✅ Seeded ${seededMedia.insertedCount} media items.\n`);

    // Summary
    console.log('='.repeat(60));
    console.log('🎉 CEAS-LMS Atlas Complete System Seeding Done!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary of Collections in MongoDB Atlas:');
    console.log(`   - users (unified) : ${await usersCollection.countDocuments()} docs`);
    console.log(`   - admins          : ${await adminsCollection.countDocuments()} docs`);
    console.log(`   - trainers        : ${await trainersCollection.countDocuments()} docs`);
    console.log(`   - students        : ${await studentsCollection.countDocuments()} docs`);
    console.log(`   - courses         : ${await coursesCollection.countDocuments()} docs`);
    console.log(`   - assessments     : ${await assessmentsCollection.countDocuments()} docs`);
    console.log(`   - queries         : ${await queriesCollection.countDocuments()} docs`);
    console.log(`   - media           : ${await mediaCollection.countDocuments()} docs`);
    console.log('\n✅ Seed process completed successfully! Connection closing...');
    
  } catch (error) {
    console.error('❌ Error during population:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Connection closed. Seeder exited.\n');
    process.exit(0);
  }
}
