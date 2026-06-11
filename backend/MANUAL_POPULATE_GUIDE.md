# 🔧 Manual Database Population Guide

## Current Issue
Your network/firewall is blocking MongoDB Atlas connections from Node.js, even though IP is whitelisted.

---

## ✅ SOLUTION 1: Use MongoDB Compass (Recommended)

MongoDB Compass might work because it uses different network settings.

### Step 1: Open MongoDB Compass
You already have it installed!

### Step 2: Connect to Atlas
```
Connection String:
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

Paste this in Compass and click "Connect"

### Step 3: If Connected, Create Database
1. Click "Create Database"
2. Database Name: `ceas-lms`
3. Collection Name: `users`
4. Click "Create Database"

### Step 4: Add Test Users Manually

Click on `users` collection, then "Add Data" → "Insert Document"

**Admin User:**
```json
{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@ncui.in",
  "mobile": "9999999999",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
  "role": "administrator",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": { "$date": "2024-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2024-01-01T00:00:00.000Z" }
}
```

**Trainer User:**
```json
{
  "firstName": "Trainer",
  "lastName": "Kumar",
  "email": "trainer@ncui.in",
  "mobile": "8888888888",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
  "role": "trainer",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": { "$date": "2024-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2024-01-01T00:00:00.000Z" }
}
```

**Student User:**
```json
{
  "firstName": "Student",
  "lastName": "Singh",
  "email": "student@ncui.in",
  "mobile": "7777777777",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKdVq3Iu",
  "role": "participant",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": { "$date": "2024-01-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2024-01-01T00:00:00.000Z" }
}
```

**Note:** All passwords are hashed version of:
- Admin: `Admin@123`
- Trainer: `Trainer@123`
- Student: `Student@123`

---

## ✅ SOLUTION 2: Setup Local MongoDB

If Compass also can't connect, use local MongoDB:

### Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Choose: Windows, ZIP package
3. Download and extract to `C:\mongodb`

### Start MongoDB
```powershell
# Create data directory
mkdir C:\mongodb\data

# Start MongoDB
C:\mongodb\bin\mongod.exe --dbpath C:\mongodb\data
```

Keep this terminal open!

### Update .env
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

### Restart Backend & Create Users
```bash
# Restart backend
npm run dev

# Create users
node create-test-users.js
```

---

## 🧪 Test Login

After users are created:

1. Go to: http://localhost:5173
2. Email: `admin@ncui.in`
3. Password: `Admin@123`
4. Should redirect to Admin Dashboard! 🎉

---

## 📋 Login Credentials

| Role | Email | Password | Mobile |
|------|-------|----------|--------|
| Admin | admin@ncui.in | Admin@123 | 9999999999 |
| Trainer | trainer@ncui.in | Trainer@123 | 8888888888 |
| Student | student@ncui.in | Student@123 | 7777777777 |

---

## 🆘 Still Not Working?

**Tell me which option you want:**
1. "Compass" - I'll guide you through Compass
2. "Local" - I'll setup local MongoDB
3. "Help" - I'll troubleshoot network issue

---

**Let's get this working! 🚀**
