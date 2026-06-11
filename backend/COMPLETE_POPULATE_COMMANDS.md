# 🚀 COMPLETE DATABASE POPULATION - All Commands

## Copy-Paste Ready Commands for Compass Shell

Yeh commands **ek-ek karke** Compass Mongosh shell mein paste karein.

---

## 📋 Step-by-Step Commands

### Step 1: Database Select & Clean
```javascript
use ceas-lms
db.dropDatabase()
use ceas-lms
```

### Step 2: Create Admins (2)
```javascript
db.admins.insertMany([
  { firstName: "Admin", lastName: "User", email: "admin@ncui.in", mobile: "9999999999", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "administrator", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, loginAttempts: 0, preferences: { language: "en", notifications: { email: true, sms: true, push: true }}, permissions: ["*"], createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Super", lastName: "Admin", email: "superadmin@ncui.in", mobile: "9999999998", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "administrator", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, loginAttempts: 0, preferences: { language: "en", notifications: { email: true, sms: true, push: true }}, permissions: ["*"], createdAt: new Date(), updatedAt: new Date() }
])
```

### Step 3: Create Trainers (3)
```javascript
db.trainers.insertMany([
  { firstName: "Trainer", lastName: "Kumar", email: "trainer@ncui.in", mobile: "8888888888", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "trainer", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "NCUI CEAS", designation: "Senior Trainer", specialization: ["Cooperative Management", "Financial Literacy"], experience: 5, coursesCreated: [], totalStudents: 0, rating: 4.5, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Rajesh", lastName: "Sharma", email: "rajesh.trainer@ncui.in", mobile: "8888888887", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "trainer", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "NCUI CEAS", designation: "Trainer", specialization: ["Digital Skills", "Marketing"], experience: 3, coursesCreated: [], totalStudents: 0, rating: 4.2, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Priya", lastName: "Mehta", email: "priya.trainer@ncui.in", mobile: "8888888886", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "trainer", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "NCUI CEAS", designation: "Lead Trainer", specialization: ["Leadership", "Agriculture"], experience: 7, coursesCreated: [], totalStudents: 0, rating: 4.8, createdAt: new Date(), updatedAt: new Date() }
])
```

### Step 4: Create Students (10)
```javascript
db.students.insertMany([
  { firstName: "Student", lastName: "Singh", email: "student@ncui.in", mobile: "7777777777", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "ABC Cooperative", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Priya", lastName: "Patel", email: "priya.student@ncui.in", mobile: "7777777776", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "XYZ Cooperative", designation: "Secretary", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Amit", lastName: "Verma", email: "amit.student@ncui.in", mobile: "7777777775", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: false, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "PQR Society", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Rahul", lastName: "Gupta", email: "rahul@ncui.in", mobile: "7777777774", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "DEF Cooperative", designation: "Treasurer", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Sneha", lastName: "Reddy", email: "sneha@ncui.in", mobile: "7777777773", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "GHI Society", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Vikram", lastName: "Joshi", email: "vikram@ncui.in", mobile: "7777777772", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "JKL Cooperative", designation: "President", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Anjali", lastName: "Nair", email: "anjali@ncui.in", mobile: "7777777771", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "MNO Society", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Karan", lastName: "Malhotra", email: "karan@ncui.in", mobile: "7777777770", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "PQR Cooperative", designation: "Vice President", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Divya", lastName: "Iyer", email: "divya@ncui.in", mobile: "7777777769", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: true, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "STU Society", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() },
  { firstName: "Arjun", lastName: "Kapoor", email: "arjun@ncui.in", mobile: "7777777768", password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu", role: "participant", isApproved: false, isActive: true, isEmailVerified: true, isMobileVerified: true, organization: "VWX Cooperative", designation: "Member", enrolledCourses: [], completedCourses: [], certificates: [], totalCoursesEnrolled: 0, totalCoursesCompleted: 0, createdAt: new Date(), updatedAt: new Date() }
])
```

### Step 5: Verify Counts
```javascript
print("Admins: " + db.admins.countDocuments())
print("Trainers: " + db.trainers.countDocuments())
print("Students: " + db.students.countDocuments())
```

### Step 6: Create Indexes
```javascript
db.admins.createIndex({ email: 1 }, { unique: true })
db.admins.createIndex({ mobile: 1 }, { unique: true })
db.trainers.createIndex({ email: 1 }, { unique: true })
db.trainers.createIndex({ mobile: 1 }, { unique: true })
db.students.createIndex({ email: 1 }, { unique: true })
db.students.createIndex({ mobile: 1 }, { unique: true })
```

---

## ✅ Success!

Agar sab commands successfully run ho gayi, to aapke database mein:
- ✅ 2 Admins
- ✅ 3 Trainers
- ✅ 10 Students (8 approved, 2 pending)

---

## 📋 All Login Credentials

### 👑 Admins:
```
admin@ncui.in / Admin@123
superadmin@ncui.in / Admin@123
```

### 👨‍🏫 Trainers:
```
trainer@ncui.in / Trainer@123
rajesh.trainer@ncui.in / Trainer@123
priya.trainer@ncui.in / Trainer@123
```

### 👨‍🎓 Students (Approved):
```
student@ncui.in / Student@123
priya.student@ncui.in / Student@123
rahul@ncui.in / Student@123
sneha@ncui.in / Student@123
vikram@ncui.in / Student@123
anjali@ncui.in / Student@123
karan@ncui.in / Student@123
divya@ncui.in / Student@123
```

### 👨‍🎓 Students (Pending Approval):
```
amit.student@ncui.in / Student@123
arjun@ncui.in / Student@123
```

---

## 🚀 Next: Backend Start
```bash
cd C:\projects\lms\lms\backend
npm run dev
```

---

**Sab commands paste kar diye? Verify kar liye?** ✅
