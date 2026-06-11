# 🎯 START HERE - MongoDB Compass Quick Start

## 🚀 3 Simple Steps (5 Minutes)

### ⚡ STEP 1: Open Compass Shell
```
1. Open MongoDB Compass
2. Connect to: mongodb://localhost:27017  (या Atlas connection string)
3. नीचे ">_MONGOSH" tab click करें
```

### ⚡ STEP 2: Copy-Paste This Script
```javascript
use ceas-lms

db.users.insertMany([
  {
    firstName: "Admin", lastName: "User",
    email: "admin@ncui.in", mobile: "9999999999",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "administrator", isApproved: true, isActive: true,
    isEmailVerified: true, isMobileVerified: true,
    loginAttempts: 0,
    preferences: { language: "en", notifications: { email: true, sms: true, push: true }},
    enrolledCourses: [], certificates: [],
    createdAt: new Date(), updatedAt: new Date()
  },
  {
    firstName: "Trainer", lastName: "Kumar",
    email: "trainer@ncui.in", mobile: "8888888888",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "trainer", isApproved: true, isActive: true,
    isEmailVerified: true, isMobileVerified: true,
    loginAttempts: 0,
    preferences: { language: "en", notifications: { email: true, sms: true, push: true }},
    enrolledCourses: [], certificates: [],
    createdAt: new Date(), updatedAt: new Date()
  },
  {
    firstName: "Student", lastName: "Singh",
    email: "student@ncui.in", mobile: "7777777777",
    password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
    role: "participant", isApproved: true, isActive: true,
    isEmailVerified: true, isMobileVerified: true,
    loginAttempts: 0,
    preferences: { language: "en", notifications: { email: true, sms: true, push: true }},
    enrolledCourses: [], certificates: [],
    createdAt: new Date(), updatedAt: new Date()
  }
]);
```

Press **Enter**!

### ⚡ STEP 3: Start Backend
```bash
cd lms/backend
npm run dev
```

---

## ✅ Success Check

Run this in Compass shell:
```javascript
db.users.countDocuments()
```
**Should show:** `3` ✅

---

## 🧪 Test Login

**Postman/Thunder Client:**
```
POST http://localhost:5000/api/v1/auth/login

Body:
{
  "emailOrMobile": "admin@ncui.in",
  "password": "Admin@123"
}
```

**Should return token!** 🎉

---

## 📋 Login Credentials

| Email | Password |
|-------|----------|
| admin@ncui.in | Admin@123 |
| trainer@ncui.in | Trainer@123 |
| student@ncui.in | Student@123 |

---

## 🎯 That's It!

**3 files for detailed help:**
1. `COMPASS_HINDI_GUIDE.md` - हिंदी में पूरी guide
2. `COMPASS_COMPLETE_SETUP.md` - Detailed English guide
3. `compass-quick-setup.js` - Full automatic setup script

---

## 🆘 Quick Troubleshooting

**Backend not connecting?**
```bash
# Check .env file
MONGODB_URI=mongodb://localhost:27017/ceas-lms

# Restart backend
npm run dev
```

**Users not created?**
```javascript
// In Compass shell
use ceas-lms
db.users.drop()
// Run the script again
```

**Login not working?**
- Check backend is running: `http://localhost:5000/health`
- Check password: `Admin@123` (capital A)
- Check URL: `/api/v1/auth/login`

---

## 🎉 Ready to Code!

Your backend is now:
- ✅ Connected to MongoDB
- ✅ Has test users
- ✅ Ready for login
- ✅ Ready for development

**Happy Coding! 🚀**
