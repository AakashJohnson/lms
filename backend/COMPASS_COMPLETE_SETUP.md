# 🧭 MongoDB Compass - Complete Setup Guide (Hindi + English)

## 📌 Aapko Kya Karna Hai

Aap MongoDB Compass se hi sab kuch setup karenge - **Atlas ya Local dono se kaam chalega!**

---

## 🎯 Option 1: Local MongoDB (Agar Install Hai)

### Step 1: MongoDB Compass Open Karein
```
1. MongoDB Compass application open karein
2. Connection string dekho: mongodb://localhost:27017
3. "Connect" button click karein
```

### Step 2: Database Banayein
```
1. Left sidebar mein "+" button click karein (Create Database)
2. Database Name: ceas-lms
3. Collection Name: users
4. "Create Database" click karein
```

### Step 3: Mongosh Shell Open Karein
```
1. Compass ke neeche dekho
2. ">_MONGOSH" tab click karein
3. Shell prompt dikhega: >
```

### Step 4: Database Select Karein
```javascript
use ceas-lms
```
Press Enter. Dikhega: `switched to db ceas-lms`

### Step 5: Test Users Create Karein

**Yeh poora script copy karein aur paste karein:**

```javascript
// Pehle purane users delete karein (agar hain)
db.users.drop();

// Naye users create karein
db.users.insertMany([
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

print("✅ 3 Users successfully created!");
print("📋 Login Credentials:");
print("Admin: admin@ncui.in / Admin@123");
print("Trainer: trainer@ncui.in / Trainer@123");
print("Student: student@ncui.in / Student@123");
```

### Step 6: Verify Karein

```javascript
// Users count check karein
db.users.countDocuments()
```
**Output hona chahiye:** `3`

```javascript
// Users dekho (password chhod ke)
db.users.find({}, { password: 0 }).pretty()
```

---

## 🎯 Option 2: MongoDB Atlas (Cloud - Free)

### Step 1: Atlas Connection String Copy Karein

Aapki Atlas connection string:
```
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### Step 2: Compass Mein Connect Karein
```
1. MongoDB Compass open karein
2. "New Connection" click karein
3. Connection string paste karein (upar wali)
4. "Connect" button click karein
```

### Step 3: Database Select Karein
```
1. Left sidebar mein "ceas-lms" database dikhega
2. Agar nahi dikha, to "+" se create karein
```

### Step 4: Mongosh Shell Open Karein
```
1. Neeche ">_MONGOSH" tab click karein
2. Shell prompt: >
```

### Step 5: Same Script Run Karein
```javascript
use ceas-lms

// Upar wala poora script paste karein (Step 5 se)
```

---

## 🚀 Backend Start Karein

### Terminal Mein Jaayein:
```bash
cd lms/backend
npm run dev
```

### Success Message Dikhna Chahiye:
```
✅ MongoDB Connected: localhost:27017/ceas-lms
🚀 CEAS-LMS Backend Server running on port 5000
```

**Agar Atlas use kar rahe hain:**
```
✅ MongoDB Connected: ceas-lms.5jzp2fv.mongodb.net
```

---

## 🧪 Test Login

### Method 1: Postman/Thunder Client

**POST Request:**
```
URL: http://localhost:5000/api/v1/auth/login
Method: POST
Headers: Content-Type: application/json

Body (JSON):
{
  "emailOrMobile": "admin@ncui.in",
  "password": "Admin@123"
}
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "role": "administrator"
  }
}
```

### Method 2: Frontend (Agar Hai)
```
1. Frontend start karein: npm run dev
2. Browser mein jaayein: http://localhost:5173
3. Login karein:
   Email: admin@ncui.in
   Password: Admin@123
```

---

## 📋 Login Credentials (Yaad Rakhein)

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| **Admin** | admin@ncui.in | Admin@123 | 9999999999 |
| **Trainer** | trainer@ncui.in | Trainer@123 | 8888888888 |
| **Student** | student@ncui.in | Student@123 | 7777777777 |

---

## 🔧 Agar Problem Aaye

### Problem 1: "Connection Failed"
**Solution:**
- Local MongoDB: Check karo MongoDB service chal rahi hai
  ```bash
  # Windows
  net start MongoDB
  
  # Mac/Linux
  sudo systemctl start mongod
  ```
- Atlas: Internet connection check karo

### Problem 2: "Authentication Failed"
**Solution:**
- Atlas password check karo: `<password>`
- IP whitelist check karo (Atlas dashboard mein)

### Problem 3: "Users Not Created"
**Solution:**
```javascript
// Mongosh mein check karein
use ceas-lms
db.users.countDocuments()

// Agar 0 hai, to script phir se run karein
```

### Problem 4: "Backend Not Connecting"
**Solution:**
- `.env` file check karo
- `MONGODB_URI` sahi hai ya nahi
- Backend restart karo: `npm run dev`

---

## 📊 Additional Collections Create Karein (Optional)

Agar aap courses, assessments bhi create karna chahte hain:

### Sample Course Create Karein:
```javascript
use ceas-lms

db.courses.insertOne({
  title: "Introduction to Cooperatives",
  slug: "introduction-to-cooperatives",
  description: "Learn the basics of cooperative management",
  category: "cooperative-management",
  level: "beginner",
  language: "en",
  thumbnail: "https://via.placeholder.com/400x300",
  instructor: db.users.findOne({ role: "trainer" })._id,
  modules: [
    {
      title: "Module 1: Basics",
      description: "Understanding cooperatives",
      order: 1,
      duration: 60,
      topics: [
        {
          title: "What is a Cooperative?",
          description: "Introduction to cooperatives",
          order: 1,
          contentType: "video",
          contentUrl: "https://example.com/video1.mp4",
          duration: 15,
          isDownloadable: false
        }
      ],
      isPublished: true
    }
  ],
  totalDuration: 60,
  isPublished: true,
  publishedAt: new Date(),
  enrollmentType: "open",
  currentEnrollments: 0,
  ratings: { average: 0, count: 0 },
  statistics: {
    totalViews: 0,
    totalEnrollments: 0,
    totalCompletions: 0
  },
  isActive: true,
  createdBy: db.users.findOne({ role: "administrator" })._id,
  createdAt: new Date(),
  updatedAt: new Date()
});

print("✅ Sample course created!");
```

---

## ✅ Final Checklist

- [ ] MongoDB Compass connected (Local ya Atlas)
- [ ] `ceas-lms` database created
- [ ] 3 users created (Admin, Trainer, Student)
- [ ] `db.users.countDocuments()` returns 3
- [ ] Backend running (`npm run dev`)
- [ ] Backend shows "MongoDB Connected"
- [ ] Login test successful (Postman ya Frontend)

---

## 🎉 Sab Set Hai!

Agar sab steps follow kiye, to:
- ✅ Database ready hai
- ✅ Users created hain
- ✅ Backend connected hai
- ✅ Login kaam kar raha hai

**Ab aap development start kar sakte hain!** 🚀

---

## 📞 Quick Commands Reference

```javascript
// Database switch
use ceas-lms

// Count users
db.users.countDocuments()

// View all users
db.users.find().pretty()

// Find specific user
db.users.findOne({ email: "admin@ncui.in" })

// Delete all users (careful!)
db.users.deleteMany({})

// View all collections
show collections

// Drop entire database (very careful!)
db.dropDatabase()
```

---

**Happy Coding! 💻**
