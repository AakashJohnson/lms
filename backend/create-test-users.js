import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple User Schema (without importing the full model)
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
  preferences: Object,
  enrolledCourses: Array,
  certificates: Array
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Test users data
const testUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@ncui.in',
    mobile: '9999999999',
    password: 'Admin@123',
    role: 'administrator'
  },
  {
    firstName: 'Trainer',
    lastName: 'Kumar',
    email: 'trainer@ncui.in',
    mobile: '8888888888',
    password: 'Trainer@123',
    role: 'trainer'
  },
  {
    firstName: 'Student',
    lastName: 'Singh',
    email: 'student@ncui.in',
    mobile: '7777777777',
    password: 'Student@123',
    role: 'participant'
  }
];

async function createTestUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Clear existing test users
    console.log('🗑️  Removing existing test users...');
    await User.deleteMany({
      email: { $in: ['admin@ncui.in', 'trainer@ncui.in', 'student@ncui.in'] }
    });
    console.log('✅ Cleared existing test users\n');

    console.log('👥 Creating test users...\n');

    for (const userData of testUsers) {
      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        isApproved: true,
        isActive: true,
        isEmailVerified: true,
        isMobileVerified: true,
        loginAttempts: 0,
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            sms: true,
            push: true
          }
        },
        enrolledCourses: [],
        certificates: []
      });

      console.log(`✅ Created ${userData.role}:`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Mobile: ${user.mobile}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.isApproved ? '✅ Approved' : '⏳ Pending'}\n`);
    }

    console.log('🎉 All test users created successfully!\n');
    console.log('📝 Login Credentials:\n');
    console.log('┌─────────────┬──────────────────┬────────────┬─────────────┐');
    console.log('│ Role        │ Email            │ Mobile     │ Password    │');
    console.log('├─────────────┼──────────────────┼────────────┼─────────────┤');
    console.log('│ Admin       │ admin@ncui.in    │ 9999999999 │ Admin@123   │');
    console.log('│ Trainer     │ trainer@ncui.in  │ 8888888888 │ Trainer@123 │');
    console.log('│ Student     │ student@ncui.in  │ 7777777777 │ Student@123 │');
    console.log('└─────────────┴──────────────────┴────────────┴─────────────┘\n');

    console.log('🧪 Test Login:\n');
    console.log('curl -X POST http://localhost:5000/api/v1/auth/login \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"emailOrMobile": "admin@ncui.in", "password": "Admin@123"}\'');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 11000) {
      console.log('\n💡 Tip: Users already exist. Delete them first or use different emails.');
    }
    
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n💡 Tip: Check your MongoDB connection string in .env file');
      console.log('   Make sure MongoDB Atlas is set up correctly.');
    }
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
createTestUsers();
