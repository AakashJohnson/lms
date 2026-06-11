# 🧭 MongoDB Compass - Atlas Database Setup

## 🎯 बस 3 Steps में Atlas Database Ready!

---

## Step 1: Compass में Atlas से Connect करें

### 1.1 MongoDB Compass खोलें

### 1.2 Connection String paste करें:
```
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### 1.3 "Connect" button click करें

✅ **Connected!** अब आप Atlas database से जुड़ गए हैं।

---

## Step 2: Mongosh Shell खोलें

### 2.1 Compass के नीचे देखें
- ">_MONGOSH" tab दिखेगा
- उस पर click करें

### 2.2 Shell prompt दिखेगा:
```
>
```

---

## Step 3: Database Populate करें

### 3.1 File खोलें:
```
lms/backend/compass-atlas-populate.js
```

### 3.2 पूरी file की content copy करें (Ctrl+A, Ctrl+C)

### 3.3 Compass shell में paste करें (Ctrl+V)

### 3.4 Enter दबाएं!

---

## ✅ Success Messages दिखेंगे:

```
🎯 Starting CEAS-LMS Database Setup...

🧹 Cleaning old data...
✅ Old data cleared!

👥 Creating test users...
✅ 3 users created!

📚 Creating sample course...
✅ Course created!

📝 Creating sample assessment...
✅ Assessment created!

⚡ Creating database indexes...
✅ Indexes created!

============================================================
🎉 CEAS-LMS Database Population Complete!
============================================================

📊 Summary:
   Users: 3
   Courses: 1
   Assessments: 1

📋 Login Credentials:
   ┌─────────────────────────────────────────┐
   │ Admin:   admin@ncui.in / Admin@123      │
   │ Trainer: trainer@ncui.in / Trainer@123  │
   │ Student: student@ncui.in / Student@123  │
   └─────────────────────────────────────────┘

🚀 Next Steps:
   1. Backend start karein: npm run dev
   2. Test login: POST http://localhost:5000/api/v1/auth/login
   3. Body: { "emailOrMobile": "admin@ncui.in", "password": "Admin@123" }

✅ Atlas database ready! Happy coding! 💻
```

---

## 🔍 Verify करें

### Compass GUI में देखें:
1. Left sidebar में "ceas-lms" database
2. Collections:
   - ✅ users (3 documents)
   - ✅ courses (1 document)
   - ✅ assessments (1 document)

### Shell में check करें:
```javascript
// Users count
db.users.countDocuments()  // Should show: 3

// View users (without password)
db.users.find({}, { password: 0 }).pretty()

// View courses
db.courses.find().pretty()

// View assessments
db.assessments.find().pretty()
```

---

## 🚀 Backend Start करें

### Terminal खोलें:
```bash
cd lms/backend
npm run dev
```

### Success Message:
```
✅ MongoDB Connected: ceas-lms.5jzp2fv.mongodb.net
🚀 CEAS-LMS Backend Server running on port 5000
```

---

## 🧪 Login Test करें

### Postman/Thunder Client में:

```
POST http://localhost:5000/api/v1/auth/login

Headers:
Content-Type: application/json

Body:
{
  "emailOrMobile": "admin@ncui.in",
  "password": "Admin@123"
}
```

### Success Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "role": "administrator",
    "isApproved": true
  }
}
```

---

## 📋 Login Credentials

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| **Admin** | admin@ncui.in | Admin@123 | 9999999999 |
| **Trainer** | trainer@ncui.in | Trainer@123 | 8888888888 |
| **Student** | student@ncui.in | Student@123 | 7777777777 |

---

## ❓ Troubleshooting

### Problem 1: Connection Failed
**Solution:**
1. Internet connection check करें
2. Connection string सही है verify करें
3. Atlas dashboard में Network Access check करें
4. IP whitelist में add करें (0.0.0.0/0)

### Problem 2: Script Error
**Solution:**
1. पूरी file copy की है check करें
2. Shell में एक साथ paste करें (parts में नहीं)
3. Enter दबाने के बाद wait करें

### Problem 3: Users नहीं बने
**Solution:**
```javascript
// Shell में check करें
use ceas-lms
db.users.countDocuments()

// अगर 0 है तो script फिर से चलाएं
```

### Problem 4: Backend connect नहीं हो रहा
**Solution:**
1. `.env` file check करें:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```
2. Backend restart करें:
   ```bash
   npm run dev
   ```

---

## 📊 Database में क्या बना?

### 1. Users Collection (3 documents)
```javascript
{
  firstName: "Admin",
  email: "admin@ncui.in",
  role: "administrator",
  isApproved: true,
  isActive: true
}
// + Trainer + Student
```

### 2. Courses Collection (1 document)
```javascript
{
  title: "Introduction to Cooperatives",
  slug: "introduction-to-cooperatives",
  modules: [
    {
      title: "Module 1: Understanding Cooperatives",
      topics: [
        { title: "What is a Cooperative?", contentType: "video" },
        { title: "History of Cooperatives", contentType: "pdf" },
        { title: "Cooperative Principles", contentType: "video" }
      ]
    },
    {
      title: "Module 2: Types of Cooperatives",
      topics: [
        { title: "Consumer Cooperatives", contentType: "video" },
        { title: "Producer Cooperatives", contentType: "video" }
      ]
    }
  ],
  isPublished: true
}
```

### 3. Assessments Collection (1 document)
```javascript
{
  title: "Module 1 Quiz: Understanding Cooperatives",
  questions: [
    {
      questionNumber: 1,
      questionText: "What is a cooperative?",
      questionType: "mcq-single",
      options: [...]
    },
    // + 2 more questions
  ],
  totalMarks: 5,
  passingMarks: 3,
  duration: 10
}
```

---

## ✅ Final Checklist

- [ ] Compass से Atlas connected
- [ ] Script successfully चली
- [ ] 3 users बने
- [ ] 1 course बना
- [ ] 1 assessment बना
- [ ] Indexes बने
- [ ] Backend start हो गया
- [ ] "MongoDB Connected" message दिखा
- [ ] Login test successful
- [ ] Token मिल गया

---

## 🎉 Congratulations!

**Your Atlas database is now:**
- ✅ Fully populated
- ✅ Ready for development
- ✅ Connected to backend
- ✅ Login working perfectly

**Ab development शुरू करें!** 🚀

---

## 📞 Quick Reference

### Atlas Connection
```
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### Useful Shell Commands
```javascript
// Switch database
use ceas-lms

// Count documents
db.users.countDocuments()
db.courses.countDocuments()
db.assessments.countDocuments()

// View data
db.users.find().pretty()
db.courses.find().pretty()
db.assessments.find().pretty()

// Find specific user
db.users.findOne({ email: "admin@ncui.in" })

// Delete all (careful!)
db.users.deleteMany({})
```

### Backend Commands
```bash
# Start backend
npm run dev

# Check health
curl http://localhost:5000/health

# View logs
cat logs/combined.log
```

---

**Happy Coding! 💻🚀**
