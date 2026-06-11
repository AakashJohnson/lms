# 🔧 Install MongoDB Locally - Quick Guide

## Current Status
MongoDB download ho raha hai (759 MB) - thoda time lagega.

---

## ⚡ Fast Option: Use MongoDB Compass (Already Installed!)

Aapke system pe MongoDB Compass already hai (screenshot se dikh raha hai).

### Step 1: Check if MongoDB is Running
```bash
# Open PowerShell as Administrator
Get-Service -Name MongoDB* | Select-Object Name, Status
```

### Step 2: If MongoDB Service Exists, Start It
```bash
# PowerShell as Administrator
Start-Service MongoDB
```

### Step 3: Test Connection
```bash
# In your project
cd lms/backend
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/ceas-lms').then(() => console.log('✅ Connected!')).catch(e => console.log('❌ Error:', e.message));"
```

---

## 🐳 Alternative: Use Docker (Fastest - 2 minutes)

Agar Docker installed hai:

```bash
# Start MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check if running
docker ps

# Backend will automatically connect!
```

---

## 💾 Manual Installation (If winget is slow)

### Option 1: Download Directly

1. **Download**: https://www.mongodb.com/try/download/community
   - Version: 8.0 or latest
   - Platform: Windows
   - Package: MSI

2. **Install**:
   - Run the MSI file
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Check "Install MongoDB Compass" (optional, you already have it)

3. **Start Service**:
```bash
# PowerShell as Administrator
net start MongoDB
```

### Option 2: Portable Version (No Installation)

1. **Download ZIP**: https://www.mongodb.com/try/download/community
   - Choose "ZIP" package

2. **Extract** to: `C:\mongodb`

3. **Create Data Directory**:
```bash
mkdir C:\mongodb\data
```

4. **Start MongoDB**:
```bash
C:\mongodb\bin\mongod.exe --dbpath C:\mongodb\data
```

Keep this terminal open!

---

## 🚀 After MongoDB is Running

### Step 1: Verify MongoDB is Running
```bash
# Check service
Get-Service -Name MongoDB

# Or check port
Test-NetConnection -ComputerName localhost -Port 27017
```

### Step 2: Your .env is Already Correct!
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

No changes needed! ✅

### Step 3: Restart Backend
```bash
cd lms/backend

# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Check Logs
You should see:
```
✅ MongoDB Connected: localhost
📦 Database: ceas-lms
```

### Step 5: Create Test Users
```bash
node create-test-users.js
```

### Step 6: Test Login
Go to: http://localhost:5173
- Email: `admin@ncui.in`
- Password: `Admin@123`

Should work! 🎉

---

## 🔍 Troubleshooting

### MongoDB Service Not Starting?

**Check if port 27017 is free:**
```bash
Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue
```

If something is using it:
```bash
# Find and kill the process
Get-NetTCPConnection -LocalPort 27017 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### MongoDB Not Installed Yet?

**Check installation status:**
```bash
winget list | Select-String "MongoDB"
```

**If still installing:**
- Wait for download to complete (759 MB)
- Or cancel and use Docker/Manual method

### Want to Use MongoDB Compass?

1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Create database: `ceas-lms`
4. Backend will automatically use it!

---

## ⏱️ Time Estimates

- **If MongoDB already installed**: 1 minute
- **Docker method**: 2 minutes
- **Manual download**: 5-10 minutes (depending on internet)
- **winget method**: 10-15 minutes (large download)

---

## 💡 Recommendation

**Fastest options in order:**
1. ✅ Check if MongoDB already running (1 min)
2. ✅ Use Docker if installed (2 min)
3. ✅ Manual download from MongoDB.com (5 min)
4. ⏳ Wait for winget installation (10-15 min)

**OR**

**Use MongoDB Atlas** (cloud, free, 2 minutes):
- No installation needed
- Always available
- Free forever (M0 tier)
- See: `FIX_LOGIN_NOW.md`

---

## 🎯 Current Status Check

Run this to see what's available:
```bash
# Check if MongoDB service exists
Get-Service -Name MongoDB* -ErrorAction SilentlyContinue

# Check if mongod.exe exists
Test-Path "C:\Program Files\MongoDB\Server\*\bin\mongod.exe"

# Check if Docker is available
docker --version

# Check winget installation status
winget list | Select-String "MongoDB"
```

Let me know the output and I'll guide you to the fastest solution! 🚀
