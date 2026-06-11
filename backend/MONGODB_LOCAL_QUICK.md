# 🚀 MongoDB Local Setup - Quick Method

## Current Status
MongoDB Server installation is in progress (takes 5-10 minutes).

---

## ⚡ FASTEST METHOD: Portable MongoDB (2 minutes)

While winget installation is running, you can use portable version:

### Step 1: Download Portable MongoDB
1. Open: https://www.mongodb.com/try/download/community
2. Version: **8.0** (latest)
3. Platform: **Windows**
4. Package: **ZIP** (not MSI)
5. Click **Download**

### Step 2: Extract
1. Extract ZIP to: `C:\mongodb`
2. You should have: `C:\mongodb\bin\mongod.exe`

### Step 3: Create Data Directory
```powershell
mkdir C:\mongodb\data
```

### Step 4: Start MongoDB
```powershell
C:\mongodb\bin\mongod.exe --dbpath C:\mongodb\data
```

**Keep this terminal open!** MongoDB is now running.

### Step 5: Test Connection
Open new terminal:
```powershell
cd lms\backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/ceas-lms').then(() => console.log('✅ Connected!')).catch(e => console.log('❌', e.message));"
```

---

## 🔄 OR: Wait for winget Installation

The winget installation is running in background. It will:
1. Download MongoDB (759 MB)
2. Install MongoDB Server
3. Create Windows Service
4. Auto-start on boot

**Check status:**
```powershell
winget list | Select-String "MongoDB"
```

**When installed, start service:**
```powershell
# Run as Administrator
net start MongoDB
```

---

## ✅ After MongoDB is Running

### Your .env is Already Correct!
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

No changes needed! ✅

### Restart Backend
```powershell
cd lms\backend
# Stop current server (Ctrl+C)
npm run dev
```

### You Should See:
```
✅ MongoDB Connected: localhost
📦 Database: ceas-lms
```

### Create Test Users
```powershell
node create-test-users.js
```

### Test Login
Go to: http://localhost:5173
- Email: `admin@ncui.in`
- Password: `Admin@123`

Should work! 🎉

---

## 🎯 Recommendation

**Choose based on your preference:**

1. **Portable (Fastest - 2 min)**
   - Download ZIP
   - Extract & run
   - Manual start each time

2. **winget (Automatic - 10 min)**
   - Wait for installation
   - Windows Service
   - Auto-starts on boot

3. **MongoDB Atlas (Cloud - 5 min)**
   - No installation
   - Always available
   - Free forever
   - See: `SETUP_MONGODB_ATLAS_SIMPLE.md`

---

## 🆘 Need Help?

**Tell me which method you prefer:**
1. Portable (I'll guide you)
2. Wait for winget (I'll check status)
3. Atlas cloud (I'll setup for you)

**Or just wait 5 more minutes for winget to complete!** ⏳
