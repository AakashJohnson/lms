# 🔧 Fix "Invalid Credentials" Error

## ❌ The Problem:

You're getting **"Invalid credentials"** error even though the database was populated.

### Why?

**Wrong Collection Names!**

- **What you did:** Created separate collections: `admins`, `trainers`, `students`
- **What backend expects:** Single collection: `users`

The backend's `User` model looks for all users in the `users` collection, but your data is in separate collections.

---

## ✅ The Solution:

Re-populate the database with the **correct collection name**.

### Step 1: Open MongoDB Compass Mongosh

```
Already connected to: mongodb://localhost:27017
Click ">_MONGOSH" tab at bottom
```

### Step 2: Paste the Correct Script

```
1. Open file: POPULATE_USERS_COLLECTION.txt
2. Select ALL (Ctrl+A)
3. Copy (Ctrl+C)
4. Paste in Mongosh (Ctrl+V)
5. Press Enter
```

### Step 3: Wait for Success

```
🎉 Database Population Complete!

📊 Summary:
   Total Users: 15
   Administrators: 2
   Trainers: 3
   Participants: 10
```

---

## 🧪 Test Login:

### In Browser:
```
http://localhost:5173/login
Email: admin@ncui.in
Password: Admin@123
```

**Should work now!** ✅

### Or with curl:
```bash
cd lms/backend
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "@test-login.json"
```

---

## 📊 What Changed:

### Before (Wrong):
```
Database: ceas-lms
Collections:
  - admins (2 documents)      ❌
  - trainers (3 documents)    ❌
  - students (10 documents)   ❌
```

Backend looks for: `users` collection → **NOT FOUND** → "Invalid credentials"

### After (Correct):
```
Database: ceas-lms
Collections:
  - users (15 documents)      ✅
    - 2 administrators
    - 3 trainers
    - 10 participants
```

Backend looks for: `users` collection → **FOUND** → Login successful! 🎉

---

## 🔍 Technical Explanation:

### User Model (User.model.js):
```javascript
const User = mongoose.model('User', userSchema);
```

Mongoose automatically:
- Takes model name: `'User'`
- Converts to lowercase: `'user'`
- Pluralizes: `'users'`
- Uses collection: `'users'` ✅

### Auth Controller (auth.controller.js):
```javascript
const user = await User.findOne({
  $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
});
```

This searches in the `users` collection, not `admins`, `trainers`, or `students`.

---

## 📋 Login Credentials (After Fix):

### 👑 ADMINS (2):
```
admin@ncui.in / Admin@123
superadmin@ncui.in / Admin@123
```

### 👨‍🏫 TRAINERS (3):
```
trainer@ncui.in / Trainer@123
rajesh.trainer@ncui.in / Trainer@123
priya.trainer@ncui.in / Trainer@123
```

### 👨‍🎓 STUDENTS (10):
```
Approved (8):
- student@ncui.in / Student@123
- priya.student@ncui.in / Student@123
- rahul@ncui.in / Student@123
- sneha@ncui.in / Student@123
- vikram@ncui.in / Student@123
- anjali@ncui.in / Student@123
- karan@ncui.in / Student@123
- divya@ncui.in / Student@123

Pending Approval (2):
- amit.student@ncui.in / Student@123
- arjun@ncui.in / Student@123
```

---

## 🔍 Verify After Population:

### In Compass GUI:
```
Left sidebar → "ceas-lms" database
Should see:
  - users (15 documents) ✅
```

### In Mongosh:
```javascript
use ceas-lms
db.users.countDocuments()  // Should return: 15
db.users.countDocuments({ role: "administrator" })  // Should return: 2
db.users.countDocuments({ role: "trainer" })  // Should return: 3
db.users.countDocuments({ role: "participant" })  // Should return: 10

// Check admin user exists
db.users.findOne({ email: "admin@ncui.in" })
// Should return admin user object
```

---

## ⏱️ Time Required:

- Open Compass Mongosh: 10 seconds
- Copy & paste script: 10 seconds
- Execution: 2-3 seconds
- Test login: 30 seconds

**Total: ~1 minute! 🚀**

---

## 🎯 Success Checklist:

After running the correct script:

- [x] Old collections dropped (admins, trainers, students)
- [x] New `users` collection created
- [x] 15 users inserted
- [x] Indexes created
- [x] Login test successful
- [x] Dashboard loads

---

## 🆘 If Still Not Working:

### Check 1: Correct collection exists
```javascript
// In Mongosh:
db.getCollectionNames()
// Should include "users"
```

### Check 2: Users exist
```javascript
db.users.countDocuments()
// Should return: 15
```

### Check 3: Admin user exists
```javascript
db.users.findOne({ email: "admin@ncui.in" })
// Should return user object with hashed password
```

### Check 4: Backend is connected
```bash
# Check backend logs for:
✅ MongoDB Connected: localhost
📦 Database: ceas-lms
```

### Check 5: Test API directly
```bash
curl http://localhost:5000/health
# Should return: {"success": true}
```

---

## 💡 Why Separate Collections Don't Work:

The backend uses a **single User model** with a `role` field to differentiate between:
- `role: "administrator"` → Admins
- `role: "trainer"` → Trainers
- `role: "participant"` → Students

This is a common pattern called **Single Table Inheritance** or **Discriminator Pattern**.

All users share the same collection but have different roles and permissions.

---

## 🎊 What You'll Have After This:

- ✅ Working login for all 3 roles
- ✅ Role-based access control (RBAC)
- ✅ Dynamic dashboard redirect
- ✅ 15 test users ready to use
- ✅ Complete authentication system
- ✅ Ready to build features!

---

**Current Status: 99% Complete**
**Next Step: Re-populate with correct script (1 minute)**
**Then: 100% Working! 🚀**
