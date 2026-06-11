# 🗂️ Separate Collections Architecture

## 📊 New Database Structure

### Collections:
1. **`admins`** - Administrators
2. **`trainers`** - Trainers/Faculty
3. **`students`** - Participants/Trainees
4. **`courses`** - Course content
5. **`assessments`** - Quizzes/Tests

---

## 🚀 Quick Setup

### Step 1: Compass Shell खोलें
```
MongoDB Compass → >_MONGOSH tab
```

### Step 2: Script Paste करें
```
File: populate-separate-collections.js
Copy सारी content → Compass shell में paste → Enter
```

### Step 3: Verify करें
```javascript
db.admins.countDocuments()    // 2
db.trainers.countDocuments()  // 2
db.students.countDocuments()  // 3
db.courses.countDocuments()   // 1
db.assessments.countDocuments() // 1
```

---

## 📋 Login Credentials

### 👑 ADMINS (admins collection)
```
Email: admin@ncui.in
Password: Admin@123
Mobile: 9999999999

Email: superadmin@ncui.in
Password: Admin@123
Mobile: 9999999998
```

### 👨‍🏫 TRAINERS (trainers collection)
```
Email: trainer@ncui.in
Password: Trainer@123
Mobile: 8888888888
Specialization: Cooperative Management, Financial Literacy

Email: rajesh.trainer@ncui.in
Password: Trainer@123
Mobile: 8888888887
Specialization: Digital Skills, Marketing
```

### 👨‍🎓 STUDENTS (students collection)
```
Email: student@ncui.in
Password: Student@123
Mobile: 7777777777
Status: Approved ✅

Email: priya.student@ncui.in
Password: Student@123
Mobile: 7777777776
Status: Approved ✅

Email: amit.student@ncui.in
Password: Student@123
Mobile: 7777777775
Status: Pending Approval ⏳
```

---

## 🗂️ Collection Schemas

### 1. Admins Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  mobile: String (unique),
  password: String (hashed),
  role: "administrator",
  isApproved: Boolean,
  isActive: Boolean,
  permissions: Array, // ["users:create", "courses:delete", ...]
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Trainers Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  mobile: String (unique),
  password: String (hashed),
  role: "trainer",
  organization: String,
  designation: String,
  specialization: Array, // ["Cooperative Management", ...]
  experience: Number, // years
  qualifications: Array,
  permissions: Array,
  coursesCreated: Array,
  totalStudents: Number,
  rating: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Students Collection
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  mobile: String (unique),
  password: String (hashed),
  role: "participant",
  dateOfBirth: Date,
  gender: String,
  address: Object,
  organization: String,
  designation: String,
  enrolledCourses: Array,
  completedCourses: Array,
  certificates: Array,
  totalCoursesEnrolled: Number,
  totalCoursesCompleted: Number,
  totalCertificates: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Backend Code Updates Needed

### 1. Update Models (Create 3 separate models)

**`src/models/Admin.model.js`:**
```javascript
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  password: { type: String, select: false },
  role: { type: String, default: 'administrator' },
  permissions: [String],
  isApproved: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  // ... other fields
}, { timestamps: true });

export default mongoose.model('Admin', adminSchema);
```

**`src/models/Trainer.model.js`:**
```javascript
import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  password: { type: String, select: false },
  role: { type: String, default: 'trainer' },
  specialization: [String],
  experience: Number,
  coursesCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  // ... other fields
}, { timestamps: true });

export default mongoose.model('Trainer', trainerSchema);
```

**`src/models/Student.model.js`:**
```javascript
import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  password: { type: String, select: false },
  role: { type: String, default: 'participant' },
  enrolledCourses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    progress: Number,
    enrolledAt: Date
  }],
  // ... other fields
}, { timestamps: true });

export default mongoose.model('Student', studentSchema);
```

### 2. Update Auth Controller

**`src/controllers/auth.controller.js`:**
```javascript
import Admin from '../models/Admin.model.js';
import Trainer from '../models/Trainer.model.js';
import Student from '../models/Student.model.js';

export const login = async (req, res) => {
  const { emailOrMobile, password } = req.body;
  
  // Search in all 3 collections
  let user = await Admin.findOne({
    $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
  }).select('+password');
  
  let userType = 'admin';
  
  if (!user) {
    user = await Trainer.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
    }).select('+password');
    userType = 'trainer';
  }
  
  if (!user) {
    user = await Student.findOne({
      $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
    }).select('+password');
    userType = 'student';
  }
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  // Generate token
  const token = user.generateAuthToken();
  
  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      userType // 'admin', 'trainer', or 'student'
    }
  });
};
```

---

## 🧪 Testing

### Test Admin Login:
```
POST http://localhost:5000/api/v1/auth/login

Body:
{
  "emailOrMobile": "admin@ncui.in",
  "password": "Admin@123"
}
```

### Test Trainer Login:
```
POST http://localhost:5000/api/v1/auth/login

Body:
{
  "emailOrMobile": "trainer@ncui.in",
  "password": "Trainer@123"
}
```

### Test Student Login:
```
POST http://localhost:5000/api/v1/auth/login

Body:
{
  "emailOrMobile": "student@ncui.in",
  "password": "Student@123"
}
```

---

## 📊 Compass Queries

### View all admins:
```javascript
db.admins.find({}, { password: 0 }).pretty()
```

### View all trainers:
```javascript
db.trainers.find({}, { password: 0 }).pretty()
```

### View all students:
```javascript
db.students.find({}, { password: 0 }).pretty()
```

### Find pending approval students:
```javascript
db.students.find({ isApproved: false })
```

### Find trainers by specialization:
```javascript
db.trainers.find({ specialization: "Cooperative Management" })
```

---

## ✅ Advantages of Separate Collections

1. **Better Organization** - Clear separation of user types
2. **Specific Fields** - Each collection has role-specific fields
3. **Easier Queries** - No need to filter by role
4. **Better Performance** - Smaller collection sizes
5. **Flexible Schema** - Different fields for different roles

---

## 🚀 Next Steps

1. ✅ Populate database (done)
2. ⏳ Update backend models (3 separate models)
3. ⏳ Update auth controller (search in 3 collections)
4. ⏳ Update middleware (handle 3 user types)
5. ⏳ Test all login flows

---

**Database ready with separate collections!** 🎉
