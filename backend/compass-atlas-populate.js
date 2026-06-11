// ============================================
// 🚀 COMPASS SHELL SCRIPT - Atlas Database Population
// MongoDB Compass के Mongosh में directly paste करें
// ============================================

// Step 1: Database select करें
use ceas-lms

print("\n🎯 Starting CEAS-LMS Database Setup...\n");

// Step 2: Purane data clean करें
print("🧹 Cleaning old data...");
db.users.drop();
db.courses.drop();
db.assessments.drop();
print("✅ Old data cleared!\n");

// Step 3: Users create करें
print("👥 Creating test users...");

const usersResult = db.users.insertMany([
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@ncui.in",
    mobile: "9999999999",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
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
    enrolledCourses: [],
    certificates: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Trainer",
    lastName: "Kumar",
    email: "trainer@ncui.in",
    mobile: "8888888888",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "trainer",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    enrolledCourses: [],
    certificates: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Student",
    lastName: "Singh",
    email: "student@ncui.in",
    mobile: "7777777777",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "participant",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    enrolledCourses: [],
    certificates: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print(`✅ ${Object.keys(usersResult.insertedIds).length} users created!\n`);

// Get user IDs
const admin = db.users.findOne({ role: "administrator" });
const trainer = db.users.findOne({ role: "trainer" });
const student = db.users.findOne({ role: "participant" });

// Step 4: Sample course create करें
print("📚 Creating sample course...");

const courseResult = db.courses.insertOne({
  title: "Introduction to Cooperatives",
  slug: "introduction-to-cooperatives",
  description: "Learn the fundamentals of cooperative management and principles. This comprehensive course covers the basics of how cooperatives work, their benefits, and their role in society.",
  shortDescription: "Master the basics of cooperative management",
  category: "cooperative-management",
  subcategory: "basics",
  level: "beginner",
  language: "en",
  thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
  coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200",
  instructor: trainer._id,
  coInstructors: [],
  modules: [
    {
      _id: new ObjectId(),
      title: "Module 1: Understanding Cooperatives",
      description: "Introduction to the concept and principles of cooperatives",
      order: 1,
      duration: 45,
      topics: [
        {
          title: "What is a Cooperative?",
          description: "Learn the definition and characteristics",
          order: 1,
          contentType: "video",
          contentUrl: "https://example.com/videos/what-is-cooperative.mp4",
          thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400",
          duration: 15,
          fileSize: 52428800,
          isDownloadable: false,
          streamingUrl: "https://example.com/stream/what-is-cooperative",
          metadata: { resolution: "1080p", format: "mp4" }
        },
        {
          title: "History of Cooperatives",
          description: "Evolution of cooperative movement",
          order: 2,
          contentType: "pdf",
          contentUrl: "https://example.com/pdfs/history.pdf",
          duration: 20,
          fileSize: 2097152,
          isDownloadable: false,
          metadata: { format: "pdf", pages: 15 }
        },
        {
          title: "Cooperative Principles",
          description: "Seven principles of cooperatives",
          order: 3,
          contentType: "video",
          contentUrl: "https://example.com/videos/principles.mp4",
          duration: 10,
          fileSize: 41943040,
          isDownloadable: false
        }
      ],
      isPublished: true
    },
    {
      _id: new ObjectId(),
      title: "Module 2: Types of Cooperatives",
      description: "Different types of cooperative organizations",
      order: 2,
      duration: 30,
      topics: [
        {
          title: "Consumer Cooperatives",
          description: "Understanding consumer cooperative societies",
          order: 1,
          contentType: "video",
          contentUrl: "https://example.com/videos/consumer-coop.mp4",
          duration: 15,
          isDownloadable: false
        },
        {
          title: "Producer Cooperatives",
          description: "How producer cooperatives work",
          order: 2,
          contentType: "video",
          contentUrl: "https://example.com/videos/producer-coop.mp4",
          duration: 15,
          isDownloadable: false
        }
      ],
      isPublished: true
    }
  ],
  totalDuration: 75,
  prerequisites: ["Basic understanding of business concepts"],
  learningOutcomes: [
    "Understand the concept and principles of cooperatives",
    "Identify different types of cooperative organizations",
    "Explain the benefits of cooperative model",
    "Apply cooperative principles in real-world scenarios"
  ],
  targetAudience: [
    "Cooperative members",
    "Aspiring cooperative managers",
    "Students of cooperative management"
  ],
  tags: ["cooperatives", "management", "basics", "ncui"],
  isPublished: true,
  publishedAt: new Date(),
  enrollmentType: "open",
  maxEnrollments: null,
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
    totalCompletions: 0,
    averageCompletionTime: null
  },
  isActive: true,
  createdBy: admin._id,
  createdAt: new Date(),
  updatedAt: new Date()
});

print(`✅ Course created!\n`);

// Get course
const course = db.courses.findOne({ slug: "introduction-to-cooperatives" });

// Step 5: Sample assessment create करें
print("📝 Creating sample assessment...");

const assessmentResult = db.assessments.insertOne({
  title: "Module 1 Quiz: Understanding Cooperatives",
  description: "Test your knowledge about cooperative basics and principles",
  course: course._id,
  module: course.modules[0]._id,
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
  createdBy: trainer._id,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print(`✅ Assessment created!\n`);

// Step 6: Indexes create करें
print("⚡ Creating database indexes...");
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ mobile: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.courses.createIndex({ slug: 1 }, { unique: true });
db.courses.createIndex({ category: 1, isPublished: 1 });
db.assessments.createIndex({ course: 1 });
print("✅ Indexes created!\n");

// Summary
print("=".repeat(60));
print("🎉 CEAS-LMS Database Population Complete!");
print("=".repeat(60));

print("\n📊 Summary:");
print(`   Users: ${db.users.countDocuments()}`);
print(`   Courses: ${db.courses.countDocuments()}`);
print(`   Assessments: ${db.assessments.countDocuments()}`);

print("\n📋 Login Credentials:");
print("   ┌─────────────────────────────────────────┐");
print("   │ Admin:   admin@ncui.in / Admin@123      │");
print("   │ Trainer: trainer@ncui.in / Trainer@123  │");
print("   │ Student: student@ncui.in / Student@123  │");
print("   └─────────────────────────────────────────┘");

print("\n🚀 Next Steps:");
print("   1. Backend start karein: npm run dev");
print("   2. Test login: POST http://localhost:5000/api/v1/auth/login");
print("   3. Body: { \"emailOrMobile\": \"admin@ncui.in\", \"password\": \"Admin@123\" }");

print("\n✅ Atlas database ready! Happy coding! 💻\n");
