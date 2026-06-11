# 🇮🇳 MongoDB Compass - आसान हिंदी गाइड

## 📱 सबसे पहले क्या करें?

### 1️⃣ MongoDB Compass खोलें
- अपने कंप्यूटर में MongoDB Compass application खोलें
- अगर install नहीं है तो: https://www.mongodb.com/try/download/compass

### 2️⃣ Database से Connect करें

**दो तरीके हैं:**

#### तरीका A: Local MongoDB (अगर आपके computer में है)
```
Connection String: mongodb://localhost:27017
"Connect" बटन दबाएं
```

#### तरीका B: MongoDB Atlas (Cloud - Free)
```
Connection String: 
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms

"Connect" बटन दबाएं
```

---

## 🎯 Database Setup करें (बहुत आसान!)

### Step 1: Shell खोलें
```
1. Compass के नीचे देखें
2. ">_MONGOSH" tab पर click करें
3. एक काला screen दिखेगा जहाँ > symbol होगा
```

### Step 2: Database चुनें
Shell में type करें:
```javascript
use ceas-lms
```
Enter दबाएं। दिखेगा: `switched to db ceas-lms`

### Step 3: Setup Script चलाएं

**Option A: पूरा Setup (Recommended)**

File खोलें: `compass-quick-setup.js`

या फिर Compass shell में ये command चलाएं:
```javascript
load("compass-quick-setup.js")
```

**Option B: सिर्फ Users बनाएं (Quick)**

नीचे दिया हुआ पूरा script copy करें और Compass shell में paste करें:

```javascript
use ceas-lms

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

print("✅ 3 Users बन गए!");
```

Enter दबाएं!

### Step 4: Check करें कि Users बने या नहीं

```javascript
db.users.countDocuments()
```

**दिखना चाहिए:** `3`

```javascript
db.users.find().pretty()
```

**तीनों users की details दिखेंगी!**

---

## 🚀 Backend चालू करें

### Terminal खोलें और type करें:

```bash
cd lms/backend
npm run dev
```

### Success Message दिखना चाहिए:
```
✅ MongoDB Connected: localhost:27017/ceas-lms
🚀 CEAS-LMS Backend Server running on port 5000
```

---

## 🧪 Login Test करें

### तरीका 1: Postman/Thunder Client से

**Request बनाएं:**
```
URL: http://localhost:5000/api/v1/auth/login
Method: POST
Headers: 
  Content-Type: application/json

Body (JSON):
{
  "emailOrMobile": "admin@ncui.in",
  "password": "Admin@123"
}
```

**Send करें!**

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "firstName": "Admin",
    "email": "admin@ncui.in",
    "role": "administrator"
  }
}
```

### तरीका 2: Browser से (अगर Frontend है)

```
1. http://localhost:5173 खोलें
2. Login करें:
   Email: admin@ncui.in
   Password: Admin@123
3. Dashboard दिखना चाहिए!
```

---

## 📋 Login की जानकारी (याद रखें!)

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| **Admin** | admin@ncui.in | Admin@123 | 9999999999 |
| **Trainer** | trainer@ncui.in | Trainer@123 | 8888888888 |
| **Student** | student@ncui.in | Student@123 | 7777777777 |

---

## ❓ अगर Problem आए तो?

### Problem 1: "Connection Failed" दिख रहा है
**Solution:**
- Local MongoDB: Check करें कि MongoDB service चल रही है
  ```bash
  # Windows में
  net start MongoDB
  ```
- Atlas: Internet connection check करें

### Problem 2: Users नहीं बने
**Solution:**
```javascript
// Shell में check करें
use ceas-lms
db.users.countDocuments()

// अगर 0 है तो script फिर से चलाएं
```

### Problem 3: Backend connect नहीं हो रहा
**Solution:**
1. `.env` file खोलें
2. Check करें: `MONGODB_URI=mongodb://localhost:27017/ceas-lms`
3. Backend restart करें: `npm run dev`

### Problem 4: Login काम नहीं कर रहा
**Solution:**
1. Backend चल रहा है check करें
2. URL सही है: `http://localhost:5000/api/v1/auth/login`
3. Password सही है: `Admin@123` (capital A)

---

## 🎯 आसान Commands (याद रखें)

```javascript
// Database बदलें
use ceas-lms

// Users गिनें
db.users.countDocuments()

// सभी users देखें
db.users.find().pretty()

// Specific user ढूंढें
db.users.findOne({ email: "admin@ncui.in" })

// सभी users delete करें (सावधान!)
db.users.deleteMany({})

// Collections देखें
show collections

// Database देखें
show dbs
```

---

## ✅ Final Checklist

- [ ] MongoDB Compass खुला है
- [ ] Database से connected है (Local या Atlas)
- [ ] `ceas-lms` database बना है
- [ ] 3 users बने हैं
- [ ] Backend चल रहा है (`npm run dev`)
- [ ] "MongoDB Connected" message दिख रहा है
- [ ] Login test successful है

---

## 🎉 बधाई हो! सब तैयार है!

अगर सभी steps follow किए तो:
- ✅ Database ready है
- ✅ Users बन गए हैं
- ✅ Backend connected है
- ✅ Login काम कर रहा है

**अब आप development शुरू कर सकते हैं!** 🚀

---

## 📞 मदद चाहिए?

1. `COMPASS_COMPLETE_SETUP.md` पढ़ें (detailed English guide)
2. `compass-quick-setup.js` चलाएं (automatic setup)
3. Backend logs देखें: `lms/backend/logs/error.log`

**Happy Coding! 💻**
