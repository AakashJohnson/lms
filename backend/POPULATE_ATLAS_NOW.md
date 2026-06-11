# 🚀 Atlas Database को अभी Populate करें

## ⚡ एक Command में सब हो जाएगा!

### Step 1: Terminal खोलें
```bash
cd lms/backend
```

### Step 2: Script चलाएं
```bash
node populate-atlas-db.js
```

### ✅ Success Message दिखेगा:
```
📡 Connecting to MongoDB Atlas...
✅ Connected to MongoDB Atlas!

🧹 Cleaning existing data...
✅ Old data cleared!

👥 Creating test users...
✅ 3 users created!

📚 Creating sample course...
✅ Course created: Introduction to Cooperatives

📝 Creating sample assessment...
✅ Assessment created: Module 1 Quiz: Understanding Cooperatives

⚡ Creating database indexes...
✅ Indexes created!

============================================================
🎉 CEAS-LMS Atlas Database Population Complete!
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

## 🧪 Backend Start करें

```bash
npm run dev
```

**Success Message:**
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

## 🔍 MongoDB Compass में Verify करें

### Step 1: Compass खोलें
```
Connection String:
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### Step 2: Connect करें और देखें
- **Database:** ceas-lms
- **Collections:** users, courses, assessments

### Step 3: Shell में Check करें
```javascript
use ceas-lms

// Users count
db.users.countDocuments()  // Should show: 3

// View users
db.users.find({}, { password: 0 }).pretty()

// View courses
db.courses.find().pretty()

// View assessments
db.assessments.find().pretty()
```

---

## ❓ अगर Error आए

### Error: "Connection Failed"
**Solution:**
```bash
# Internet connection check करें
ping google.com

# Script फिर से चलाएं
node populate-atlas-db.js
```

### Error: "Authentication Failed"
**Solution:**
- Username: `ceas-lms`
- Password: `<password>`
- Atlas dashboard में IP whitelist check करें

### Error: "Network Timeout"
**Solution:**
1. Atlas dashboard खोलें: https://cloud.mongodb.com
2. Network Access → Add IP Address
3. "Allow Access from Anywhere" select करें (0.0.0.0/0)
4. Save करें और 2 minutes wait करें
5. Script फिर से चलाएं

---

## ✅ Verification Checklist

- [ ] Script successfully चली
- [ ] "3 users created" message दिखा
- [ ] "Course created" message दिखा
- [ ] "Assessment created" message दिखा
- [ ] Backend start हो गया (`npm run dev`)
- [ ] "MongoDB Connected" message दिखा
- [ ] Login test successful (Postman)
- [ ] Token मिल गया

---

## 🎯 Database में क्या बना?

### 1. Users (3)
- ✅ Admin User (administrator role)
- ✅ Trainer Kumar (trainer role)
- ✅ Student Singh (participant role)

### 2. Course (1)
- ✅ Title: "Introduction to Cooperatives"
- ✅ 2 Modules
- ✅ 5 Topics (videos + PDFs)
- ✅ Published and active

### 3. Assessment (1)
- ✅ Title: "Module 1 Quiz"
- ✅ 3 Questions (MCQ + True/False)
- ✅ Auto-evaluation enabled
- ✅ 3 attempts allowed

### 4. Indexes
- ✅ User email (unique)
- ✅ User mobile (unique)
- ✅ Course slug (unique)
- ✅ Performance indexes

---

## 🚀 Ab Kya Karein?

1. **Backend चालू है?** ✅
2. **Login काम कर रहा है?** ✅
3. **Compass में data दिख रहा है?** ✅

**तो अब development शुरू करें!** 🎉

---

## 📞 Quick Commands

```bash
# Database populate करें
node populate-atlas-db.js

# Backend start करें
npm run dev

# Backend test करें
curl http://localhost:5000/health

# Logs देखें
cat logs/combined.log
```

---

## 🎉 Done!

**Your Atlas database is now:**
- ✅ Populated with test data
- ✅ Ready for development
- ✅ Connected to backend
- ✅ Login working

**Happy Coding! 🚀**
