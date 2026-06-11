# 🎯 MongoDB Compass - Step by Step Visual Guide

## ⚠️ IMPORTANT: Yeh file Node.js se RUN NAHI karni!

**`compass-atlas-populate.js`** file ko **Compass Shell में PASTE** karna hai!

---

## 📸 Step-by-Step Instructions

### Step 1: MongoDB Compass खोलें

```
Windows: Start Menu → MongoDB Compass
Mac: Applications → MongoDB Compass
```

---

### Step 2: Connection String Paste करें

**Connection String:**
```
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

**Kahan paste karein:**
```
┌─────────────────────────────────────────────────────┐
│ New Connection                                      │
│                                                     │
│ URI: [mongodb+srv://ceas-lms:<password>...] │
│                                                     │
│                    [Connect] [Cancel]               │
└─────────────────────────────────────────────────────┘
```

**"Connect" button click karein!**

---

### Step 3: Mongosh Shell खोलें

**Compass window के नीचे देखें:**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  [Databases] [Performance] [>_MONGOSH] ← Click!    │
│                                                     │
│  >                                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**">_MONGOSH" tab पर click करें!**

Shell prompt दिखेगा: `>`

---

### Step 4: File Content Copy करें

**File खोलें:**
```
C:\projects\lms\lms\backend\compass-atlas-populate.js
```

**VS Code या Notepad में खोलें:**
- Right click → Open with → VS Code
- या Notepad में खोलें

**सारी content select करें:**
- `Ctrl + A` (Select All)
- `Ctrl + C` (Copy)

---

### Step 5: Compass Shell में Paste करें

**Compass के Mongosh shell में जाएं:**

```
>  ← यहाँ cursor होगा
```

**Paste करें:**
- `Ctrl + V` (Paste)

**पूरा script paste हो जाएगा:**

```
> use ceas-lms
  
  print("\n🎯 Starting CEAS-LMS Database Setup...\n");
  
  print("🧹 Cleaning old data...");
  db.users.drop();
  db.courses.drop();
  ...
  (बहुत सारी lines)
```

---

### Step 6: Enter दबाएं!

**Script execute होगा और messages दिखेंगे:**

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
```

---

## ✅ Verification

### Compass GUI में देखें:

**Left Sidebar:**
```
┌─────────────────────┐
│ Databases           │
│                     │
│ ▼ ceas-lms         │
│   ├─ users (3)     │ ← 3 documents
│   ├─ courses (1)   │ ← 1 document
│   └─ assessments(1)│ ← 1 document
└─────────────────────┘
```

### Shell में Verify करें:

```javascript
// Users count
db.users.countDocuments()
// Output: 3

// View users
db.users.find({}, { password: 0 }).pretty()

// View courses
db.courses.find().pretty()
```

---

## 🚀 Backend Start करें

**अब Terminal खोलें (नया terminal):**

```bash
cd C:\projects\lms\lms\backend
npm run dev
```

**Success Message:**
```
✅ MongoDB Connected: ceas-lms.5jzp2fv.mongodb.net
🚀 CEAS-LMS Backend Server running on port 5000
```

---

## 🧪 Login Test करें

**Postman/Thunder Client:**

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

---

## ❌ Common Mistakes (Galtiyan)

### ❌ **WRONG: Node.js se run karna**
```bash
node compass-atlas-populate.js  ← GALAT!
```
**Error:** `SyntaxError: Unexpected identifier 'ceas'`

### ✅ **RIGHT: Compass shell mein paste karna**
```
1. Compass खोलो
2. Mongosh tab खोलो
3. File content copy karo
4. Shell mein paste karo
5. Enter dabao
```

---

## 🔧 Troubleshooting

### Problem: "Connection Failed"
**Solution:**
1. Internet connection check करें
2. Connection string सही है verify करें
3. Atlas dashboard खोलें: https://cloud.mongodb.com
4. Network Access → Add IP Address → 0.0.0.0/0 (Allow all)
5. 2 minutes wait करें
6. Compass में फिर से connect करें

### Problem: "Script paste नहीं हो रहा"
**Solution:**
1. File को Notepad में खोलें
2. Ctrl+A करें (सब select करें)
3. Ctrl+C करें (copy करें)
4. Compass shell में click करें
5. Ctrl+V करें (paste करें)
6. Enter दबाएं

### Problem: "Users नहीं बने"
**Solution:**
```javascript
// Shell में check करें
use ceas-lms
db.users.countDocuments()

// अगर 0 है तो script फिर से paste करें
```

---

## 📋 Quick Reference

### Files:
```
compass-atlas-populate.js  ← Compass shell में paste करें
populate-atlas-db.js       ← Node.js से run करें (network issue)
```

### Connection String:
```
mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### Login Credentials:
```
Admin:   admin@ncui.in   / Admin@123
Trainer: trainer@ncui.in / Trainer@123
Student: student@ncui.in / Student@123
```

---

## ✅ Final Checklist

- [ ] Compass खोला
- [ ] Atlas से connected
- [ ] Mongosh tab खोला
- [ ] Script paste किया
- [ ] Enter दबाया
- [ ] Success messages दिखे
- [ ] Collections बने (users, courses, assessments)
- [ ] Backend start किया (`npm run dev`)
- [ ] "MongoDB Connected" message दिखा
- [ ] Login test किया (Postman)
- [ ] Token मिला

---

## 🎉 Done!

**अब आप ready हैं development के लिए!** 🚀

**Happy Coding! 💻**
