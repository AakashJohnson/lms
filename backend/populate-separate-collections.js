// ============================================
// 🚀 CEAS-LMS - Separate Collections Population
// Compass Mongosh Shell में paste करें
// ============================================

// Database select करें
use ceas-lms

print("\n🎯 Starting CEAS-LMS Database Setup (Separate Collections)...\n");

// Purane collections delete करें
print("🧹 Cleaning old data...");
db.students.drop();
db.trainers.drop();
db.admins.drop();
db.courses.drop();
db.assessments.drop();
print("✅ Old data cleared!\n");

// ============================================
// 1. ADMINS COLLECTION
// ============================================
print("👑 Creating Admins...");

const adminsResult = db.admins.insertMany([
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@ncui.in",
    mobile: "9999999999",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Admin@123
    role: "administrator",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    permissions: [
      "users:create", "users:read", "users:update", "users:delete", "users:approve",
      "courses:create", "courses:read", "courses:update", "courses:delete", "courses:publish",
      "certificates:generate", "certificates:revoke",
      "reports:view", "reports:export",
      "payments:view-all", "payments:refund"
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Super",
    lastName: "Admin",
    email: "superadmin@ncui.in",
    mobile: "9999999998",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Admin@123
    role: "administrator",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    permissions: ["*"], // All permissions
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print(`✅ ${Object.keys(adminsResult.insertedIds).length} Admins created!\n`);

// ============================================
// 2. TRAINERS COLLECTION
// ============================================
print("👨‍🏫 Creating Trainers...");

const trainersResult = db.trainers.insertMany([
  {
    firstName: "Trainer",
    lastName: "Kumar",
    email: "trainer@ncui.in",
    mobile: "8888888888",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Trainer@123
    role: "trainer",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    organization: "NCUI CEAS",
    designation: "Senior Trainer",
    specialization: ["Cooperative Management", "Financial Literacy"],
    experience: 5, // years
    qualifications: ["MBA", "Certified Cooperative Trainer"],
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    permissions: [
      "courses:create", "courses:read", "courses:update", "courses:publish",
      "content:upload", "content:update", "content:delete",
      "assessments:create", "assessments:update", "assessments:evaluate",
      "reports:view"
    ],
    coursesCreated: [],
    totalStudents: 0,
    rating: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Rajesh",
    lastName: "Sharma",
    email: "rajesh.trainer@ncui.in",
    mobile: "8888888887",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Trainer@123
    role: "trainer",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    organization: "NCUI CEAS",
    designation: "Trainer",
    specialization: ["Digital Skills", "Marketing"],
    experience: 3,
    qualifications: ["B.Tech", "Digital Marketing Certified"],
    preferences: {
      language: "hi",
      notifications: { email: true, sms: true, push: true }
    },
    permissions: [
      "courses:create", "courses:read", "courses:update",
      "content:upload", "content:update",
      "assessments:create", "assessments:update"
    ],
    coursesCreated: [],
    totalStudents: 0,
    rating: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print(`✅ ${Object.keys(trainersResult.insertedIds).length} Trainers created!\n`);

// ============================================
// 3. STUDENTS COLLECTION
// ============================================
print("👨‍🎓 Creating Students...");

const studentsResult = db.students.insertMany([
  {
    firstName: "Student",
    lastName: "Singh",
    email: "student@ncui.in",
    mobile: "7777777777",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Student@123
    role: "participant",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    dateOfBirth: new Date("1995-05-15"),
    gender: "male",
    address: {
      street: "123 Main Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India"
    },
    organization: "ABC Cooperative Society",
    designation: "Member",
    preferences: {
      language: "en",
      notifications: { email: true, sms: true, push: true }
    },
    enrolledCourses: [],
    completedCourses: [],
    certificates: [],
    totalCoursesEnrolled: 0,
    totalCoursesCompleted: 0,
    totalCertificates: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Priya",
    lastName: "Patel",
    email: "priya.student@ncui.in",
    mobile: "7777777776",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Student@123
    role: "participant",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    dateOfBirth: new Date("1998-08-20"),
    gender: "female",
    address: {
      street: "456 Park Road",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380001",
      country: "India"
    },
    organization: "XYZ Cooperative",
    designation: "Secretary",
    preferences: {
      language: "gu",
      notifications: { email: true, sms: true, push: true }
    },
    enrolledCourses: [],
    completedCourses: [],
    certificates: [],
    totalCoursesEnrolled: 0,
    totalCoursesCompleted: 0,
    totalCertificates: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    firstName: "Amit",
    lastName: "Verma",
    email: "amit.student@ncui.in",
    mobile: "7777777775",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Student@123
    role: "participant",
    isApproved: false, // Pending approval
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    lastLogin: null,
    dateOfBirth: new Date("2000-03-10"),
    gender: "male",
    address: {
      street: "789 Lake View",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      country: "India"
    },
    organization: "PQR Society",
    designation: "Member",
    preferences: {
      language: "mr",
      notifications: { email: true, sms: true, push: true }
    },
    enrolledCourses: [],
    completedCourses: [],
    certificates: [],
    totalCoursesEnrolled: 0,
    totalCoursesCompleted: 0,
    totalCertificates: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print(`✅ ${Object.keys(studentsResult.insertedIds).length} Students created!\n`);

// Get IDs for course creation
const admin = db.admins.findOne({ email: "admin@ncui.in" });
const trainer = db.trainers.findOne({ email: "trainer@ncui.in" });
const student = db.students.findOne({ email: "student@ncui.in" });

// ============================================
// 4. COURSES COLLECTION
// ============================================
print("📚 Creating sample course...");

const courseResult = db.courses.insertOne({
  title: "Introduction to Cooperatives",
  slug: "introduction-to-cooperatives",
  description: "Learn the fundamentals of cooperative management and principles.",
  shortDescription: "Master the basics of cooperative management",
  category: "cooperative-management",
  level: "beginner",
  language: "en",
  thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
  instructor: trainer._id,
  instructorCollection: "trainers", // Reference to trainers collection
  modules: [
    {
      _id: new ObjectId(),
      title: "Module 1: Understanding Cooperatives",
      order: 1,
      duration: 45,
      topics: [
        {
          title: "What is a Cooperative?",
          order: 1,
          contentType: "video",
          contentUrl: "https://example.com/videos/what-is-cooperative.mp4",
          duration: 15,
          isDownloadable: false
        },
        {
          title: "History of Cooperatives",
          order: 2,
          contentType: "pdf",
          contentUrl: "https://example.com/pdfs/history.pdf",
          duration: 20,
          isDownloadable: false
        }
      ],
      isPublished: true
    }
  ],
  totalDuration: 45,
  isPublished: true,
  publishedAt: new Date(),
  enrollmentType: "open",
  currentEnrollments: 0,
  certificateEligibility: {
    minCompletionPercentage: 80,
    minAssessmentScore: 60
  },
  pricing: { isFree: true, amount: 0, currency: "INR" },
  ratings: { average: 0, count: 0 },
  statistics: {
    totalViews: 0,
    totalEnrollments: 0,
    totalCompletions: 0
  },
  isActive: true,
  createdBy: admin._id,
  createdByCollection: "admins", // Reference to admins collection
  createdAt: new Date(),
  updatedAt: new Date()
});

print(`✅ Course created!\n`);

// ============================================
// 5. ASSESSMENTS COLLECTION
// ============================================
print("📝 Creating sample assessment...");

const course = db.courses.findOne({ slug: "introduction-to-cooperatives" });

const assessmentResult = db.assessments.insertOne({
  title: "Module 1 Quiz",
  description: "Test your knowledge about cooperative basics",
  course: course._id,
  assessmentType: "quiz",
  questions: [
    {
      questionNumber: 1,
      questionText: "What is a cooperative?",
      questionType: "mcq-single",
      options: [
        { optionNumber: 1, optionText: "A business owned by members", isCorrect: true, isDeleted: false },
        { optionNumber: 2, optionText: "A government organization", isCorrect: false, isDeleted: false },
        { optionNumber: 3, optionText: "A private company", isCorrect: false, isDeleted: false }
      ],
      marks: 2,
      difficulty: "easy",
      isActive: true
    },
    {
      questionNumber: 2,
      questionText: "How many cooperative principles are there?",
      questionType: "mcq-single",
      options: [
        { optionNumber: 1, optionText: "Five", isCorrect: false, isDeleted: false },
        { optionNumber: 2, optionText: "Seven", isCorrect: true, isDeleted: false },
        { optionNumber: 3, optionText: "Ten", isCorrect: false, isDeleted: false }
      ],
      marks: 2,
      difficulty: "easy",
      isActive: true
    }
  ],
  totalMarks: 4,
  passingMarks: 2,
  passingPercentage: 50,
  duration: 10,
  attemptsAllowed: 3,
  isPublished: true,
  createdBy: trainer._id,
  createdByCollection: "trainers",
  createdAt: new Date(),
  updatedAt: new Date()
});

print(`✅ Assessment created!\n`);

// ============================================
// 6. CREATE INDEXES
// ============================================
print("⚡ Creating database indexes...");

// Admins indexes
db.admins.createIndex({ email: 1 }, { unique: true });
db.admins.createIndex({ mobile: 1 }, { unique: true });
db.admins.createIndex({ isActive: 1 });

// Trainers indexes
db.trainers.createIndex({ email: 1 }, { unique: true });
db.trainers.createIndex({ mobile: 1 }, { unique: true });
db.trainers.createIndex({ isActive: 1, isApproved: 1 });
db.trainers.createIndex({ specialization: 1 });

// Students indexes
db.students.createIndex({ email: 1 }, { unique: true });
db.students.createIndex({ mobile: 1 }, { unique: true });
db.students.createIndex({ isActive: 1, isApproved: 1 });
db.students.createIndex({ organization: 1 });

// Courses indexes
db.courses.createIndex({ slug: 1 }, { unique: true });
db.courses.createIndex({ category: 1, isPublished: 1 });
db.courses.createIndex({ instructor: 1 });

// Assessments indexes
db.assessments.createIndex({ course: 1 });

print("✅ Indexes created!\n");

// ============================================
// SUMMARY
// ============================================
print("=".repeat(60));
print("🎉 CEAS-LMS Database Population Complete!");
print("=".repeat(60));

print("\n📊 Summary:");
print(`   Admins: ${db.admins.countDocuments()}`);
print(`   Trainers: ${db.trainers.countDocuments()}`);
print(`   Students: ${db.students.countDocuments()}`);
print(`   Courses: ${db.courses.countDocuments()}`);
print(`   Assessments: ${db.assessments.countDocuments()}`);

print("\n📋 Login Credentials:");
print("\n👑 ADMINS:");
print("   ┌─────────────────────────────────────────────┐");
print("   │ Admin:       admin@ncui.in / Admin@123      │");
print("   │ Super Admin: superadmin@ncui.in / Admin@123 │");
print("   └─────────────────────────────────────────────┘");

print("\n👨‍🏫 TRAINERS:");
print("   ┌──────────────────────────────────────────────────┐");
print("   │ Trainer:       trainer@ncui.in / Trainer@123     │");
print("   │ Rajesh Sharma: rajesh.trainer@ncui.in / Trainer@123 │");
print("   └──────────────────────────────────────────────────┘");

print("\n👨‍🎓 STUDENTS:");
print("   ┌──────────────────────────────────────────────────┐");
print("   │ Student:    student@ncui.in / Student@123        │");
print("   │ Priya Patel: priya.student@ncui.in / Student@123 │");
print("   │ Amit Verma:  amit.student@ncui.in / Student@123  │");
print("   │             (Pending Approval)                   │");
print("   └──────────────────────────────────────────────────┘");

print("\n🗂️  Collections Structure:");
print("   ├─ admins (2 documents)");
print("   ├─ trainers (2 documents)");
print("   ├─ students (3 documents)");
print("   ├─ courses (1 document)");
print("   └─ assessments (1 document)");

print("\n🚀 Next Steps:");
print("   1. Backend start karein: npm run dev");
print("   2. Test login with any credential above");
print("   3. POST http://localhost:5000/api/v1/auth/login");

print("\n✅ Database ready with separate collections! 💻\n");
