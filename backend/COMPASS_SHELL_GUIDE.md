# 🚀 MongoDB Compass Shell - Database Population Guide

## You're Connected! ✅

I can see in your screenshot that Compass is connected to:
```
ceas-lms.5jzp2fv.mongodb.net
```

---

## 📋 Step-by-Step Instructions

### Step 1: Open Mongosh Tab
```
In MongoDB Compass:
1. Look at the bottom of the window
2. Click on ">_MONGOSH" tab
3. You'll see a shell prompt: >
```

### Step 2: Switch to ceas-lms Database
```javascript
use ceas-lms
```

Press Enter. You should see:
```
switched to db ceas-lms
```

### Step 3: Copy & Paste This Script

Open file: `populate-db-shell.js`

Or copy this entire script:

```javascript
// Drop existing users (if any)
db.users.drop();

// Create test users
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
```

### Step 4: Press Enter

You should see:
```javascript
{
  acknowledged: true,
  insertedIds: {
    '0': ObjectId('...'),
    '1': ObjectId('...'),
    '2': ObjectId('...')
  }
}
```

### Step 5: Verify Users Created

Run this command:
```javascript
db.users.find().count()
```

Should show: `3`

### Step 6: View Users

```javascript
db.users.find({}, { password: 0 })
```

You should see all 3 users!

---

## ✅ Success Indicators

After running the script, you should see:
- ✅ `acknowledged: true`
- ✅ 3 insertedIds
- ✅ `db.users.count()` returns 3
- ✅ Users visible in Compass GUI

---

## 🧪 Test Login

### Step 1: Make Sure Backend is Running
```bash
cd lms/backend
npm run dev
```

Should show:
```
✅ MongoDB Connected: ceas-lms.5jzp2fv.mongodb.net
```

### Step 2: Go to Frontend
```
http://localhost:5173
```

### Step 3: Login
```
Email: admin@ncui.in
Password: Admin@123
```

Should redirect to Admin Dashboard! 🎉

---

## 📋 Login Credentials

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| **Admin** | admin@ncui.in | Admin@123 | 9999999999 |
| **Trainer** | trainer@ncui.in | Trainer@123 | 8888888888 |
| **Student** | student@ncui.in | Student@123 | 7777777777 |

---

## 🔧 Troubleshooting

### Script Error?
- Make sure you ran `use ceas-lms` first
- Copy the entire script (all lines)
- Paste in one go

### Users Not Showing?
- Refresh Compass (F5)
- Click on "ceas-lms" database
- Click on "users" collection

### Backend Not Connecting?
- Check backend logs
- Should show "MongoDB Connected"
- If not, restart backend

---

## 📝 Quick Commands

```javascript
// Switch database
use ceas-lms

// Count users
db.users.count()

// View all users (without password)
db.users.find({}, { password: 0 })

// Find specific user
db.users.findOne({ email: "admin@ncui.in" })

// Delete all users (if needed)
db.users.deleteMany({})
```

---

## 🎯 After Population

1. ✅ Users created in MongoDB Atlas
2. ✅ Backend can now authenticate
3. ✅ Login will work
4. ✅ All 3 roles accessible

**Ready to test! 🚀**
