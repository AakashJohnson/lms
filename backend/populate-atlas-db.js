// ============================================
// 🚀 CEAS-LMS Atlas Database Population Script
// Direct MongoDB Atlas Connection
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB Atlas Connection String
const ATLAS_URI = 'mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms';

console.log('\n🚀 Starting CEAS-LMS Atlas Database Population...\n');

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  password: String,
  role: String,
  isApproved: Boolean,
  isActive: Boolean,
  isEmailVerified: Boolean,
  isMobileVerified: Boolean,
  loginAttempts: Number,
  preferences: {
    language: String,
    notifications: {
      email: Boolean,
      sms: Boolean,
      push: Boolean
    }
  },
  enrolledCourses: Array,
  certificates: Array,
  createdAt: Date,
  updatedAt: Date
});

// Course Schema
const courseSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  description: String,
  shortDescription: String,
  category: String,
  subcategory: String,
  level: String,
  language: String,
  thumbnail: String,
  coverImage: String,
  instructor: mongoose.Schema.Types.ObjectId,
  coInstructors: Array,
  modules: Array,
  totalDuration: Number,
  prerequisites: Array,
  learningOutcomes: Array,
  targetAudience: Array,
  tags: Array,
  isPublished: Boolean,
  publishedAt: Date,
  enrollmentType: String,
  maxEnrollments: Number,
  currentEnrollments: Number,
  startDate: Date,
  endDate: Date,
  certificateEligibility: Object,
  pricing: Object,
  ratings: Object,
  reviews: Array,
  assessments: Array,
  batches: Array,
  statistics: Object,
  isActive: Boolean,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

// Assessment Schema
const assessmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  course: mongoose.Schema.Types.ObjectId,
  module: mongoose.Schema.Types.ObjectId,
  assessmentType: String,
  questions: Array,
  totalMarks: Number,
  passingMarks: Number,
  passingPercentage: Number,
  duration: Number,
  attemptsAllowed: Number,
  shuffleQuestions: Boolean,
  shuffleOptions: Boolean,
  showResultsImmediately: Boolean,
  showCorrectAnswers: Boolean,
  evaluationType: String,
  startDate: Date,
  endDate: Date,
  isPublished: Boolean,
  publishedAt: Date,
  instructions: Array,
  createdBy: mongoose.Schema.Types.ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Assessment = mongoose.model('Assessment', assessmentSchema);

async function populateDatabase() {
  try {
    // Connect to MongoDB Atlas
    console.log('📡 Connecting to MongoDB Atlas...');
    await mongoose.connect(ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas!\n');

    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});
    await Assessment.deleteMany({});
    console.log('✅ Old data cleared!\n');

    // Create Users
    console.log('👥 Creating test users...');
    const users = await User.insertMany([
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
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Trainer@123
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
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", // Student@123
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
    console.log(`✅ ${users.length} users created!`);

    const admin = users.find(u => u.role === 'administrator');
    const trainer = users.find(u => u.role === 'trainer');
    const student = users.find(u => u.role === 'participant');

    // Create Sample Course
    console.log('\n📚 Creating sample course...');
    const course = await Course.create({
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
          _id: new mongoose.Types.ObjectId(),
          title: "Module 1: Understanding Cooperatives",
          description: "Introduction to the concept and principles of cooperatives",
          order: 1,
          duration: 45,
          topics: [
            {
              title: "What is a Cooperative?",
              description: "Learn the definition and characteristics of cooperatives",
              order: 1,
              contentType: "video",
              contentUrl: "https://example.com/videos/what-is-cooperative.mp4",
              thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400",
              duration: 15,
              fileSize: 52428800,
              isDownloadable: false,
              streamingUrl: "https://example.com/stream/what-is-cooperative",
              metadata: {
                resolution: "1080p",
                format: "mp4"
              }
            },
            {
              title: "History of Cooperatives",
              description: "Evolution of cooperative movement",
              order: 2,
              contentType: "pdf",
              contentUrl: "https://example.com/pdfs/history-of-cooperatives.pdf",
              duration: 20,
              fileSize: 2097152,
              isDownloadable: false,
              metadata: {
                format: "pdf",
                pages: 15
              }
            },
            {
              title: "Cooperative Principles",
              description: "Seven principles of cooperatives",
              order: 3,
              contentType: "video",
              contentUrl: "https://example.com/videos/cooperative-principles.mp4",
              duration: 10,
              fileSize: 41943040,
              isDownloadable: false,
              streamingUrl: "https://example.com/stream/cooperative-principles"
            }
          ],
          isPublished: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
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
              contentUrl: "https://example.com/videos/consumer-cooperatives.mp4",
              duration: 15,
              isDownloadable: false
            },
            {
              title: "Producer Cooperatives",
              description: "How producer cooperatives work",
              order: 2,
              contentType: "video",
              contentUrl: "https://example.com/videos/producer-cooperatives.mp4",
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
    console.log(`✅ Course created: ${course.title}`);

    // Create Sample Assessment
    console.log('\n📝 Creating sample assessment...');
    const assessment = await Assessment.create({
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
    console.log(`✅ Assessment created: ${assessment.title}`);

    // Create Indexes
    console.log('\n⚡ Creating database indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ mobile: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await Course.collection.createIndex({ slug: 1 }, { unique: true });
    await Course.collection.createIndex({ category: 1, isPublished: 1 });
    await Assessment.collection.createIndex({ course: 1 });
    console.log('✅ Indexes created!');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CEAS-LMS Atlas Database Population Complete!');
    console.log('='.repeat(60));
    
    console.log('\n📊 Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Courses: ${await Course.countDocuments()}`);
    console.log(`   Assessments: ${await Assessment.countDocuments()}`);
    
    console.log('\n📋 Login Credentials:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ Admin:   admin@ncui.in / Admin@123      │');
    console.log('   │ Trainer: trainer@ncui.in / Trainer@123  │');
    console.log('   │ Student: student@ncui.in / Student@123  │');
    console.log('   └─────────────────────────────────────────┘');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Backend start karein: npm run dev');
    console.log('   2. Test login: POST http://localhost:5000/api/v1/auth/login');
    console.log('   3. Body: { "emailOrMobile": "admin@ncui.in", "password": "Admin@123" }');
    
    console.log('\n✅ Atlas database ready! Happy coding! 💻\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check internet connection');
    console.error('   2. Verify Atlas connection string');
    console.error('   3. Check IP whitelist in Atlas dashboard');
    console.error('   4. Verify username/password: ceas-lms / <password>\n');
  } finally {
    await mongoose.connection.close();
    console.log('📡 Connection closed.\n');
    process.exit(0);
  }
}

// Run the population
populateDatabase();
