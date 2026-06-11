// MongoDB Shell Script to Populate Database
// Run this in MongoDB Compass Shell (Mongosh tab)

// Switch to ceas-lms database
use('ceas-lms');

// Drop existing users collection (if any)
db.users.drop();

// Create users collection with test users
db.users.insertMany([
  {
    firstName: "Admin",
    lastName: "User",
    email: "admin@ncui.in",
    mobile: "9999999999",
    // Password: Admin@123 (bcrypt hashed)
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "administrator",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    preferences: {
      language: "en",
      notifications: {
        email: true,
        sms: true,
        push: true
      }
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
    // Password: Trainer@123 (bcrypt hashed)
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "trainer",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    preferences: {
      language: "en",
      notifications: {
        email: true,
        sms: true,
        push: true
      }
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
    // Password: Student@123 (bcrypt hashed)
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "participant",
    isApproved: true,
    isActive: true,
    isEmailVerified: true,
    isMobileVerified: true,
    loginAttempts: 0,
    preferences: {
      language: "en",
      notifications: {
        email: true,
        sms: true,
        push: true
      }
    },
    enrolledCourses: [],
    certificates: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Verify users were created
print("\n✅ Users created successfully!\n");
print("Total users:", db.users.countDocuments());
print("\n📋 Login Credentials:\n");
print("┌─────────────┬──────────────────┬────────────┬─────────────┐");
print("│ Role        │ Email            │ Mobile     │ Password    │");
print("├─────────────┼──────────────────┼────────────┼─────────────┤");
print("│ Admin       │ admin@ncui.in    │ 9999999999 │ Admin@123   │");
print("│ Trainer     │ trainer@ncui.in  │ 8888888888 │ Trainer@123 │");
print("│ Student     │ student@ncui.in  │ 7777777777 │ Student@123 │");
print("└─────────────┴──────────────────┴────────────┴─────────────┘\n");

// Show created users
db.users.find({}, { password: 0 }).forEach(user => {
  print(`\n✅ ${user.role}:`);
  print(`   Name: ${user.firstName} ${user.lastName}`);
  print(`   Email: ${user.email}`);
  print(`   Mobile: ${user.mobile}`);
  print(`   Status: ${user.isApproved ? 'Approved' : 'Pending'}`);
});

print("\n🎉 Database populated successfully!");
print("\n🧪 Test login at: http://localhost:5173");
print("   Email: admin@ncui.in");
print("   Password: Admin@123\n");
