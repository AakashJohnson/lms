# 🚀 Install MongoDB Locally - Quick Guide

## ⚠️ Current Issue

**Problem:** Windows DNS cannot resolve MongoDB Atlas SRV records  
**Solution:** Use local MongoDB for development

---

## 📥 Install MongoDB (5 Minutes)

### Option 1: Download Installer (Recommended)

**Step 1:** Download MongoDB Community Server  
https://www.mongodb.com/try/download/community

**Step 2:** Run installer
- Choose "Complete" installation
- Install as Windows Service ✅
- Install MongoDB Compass ✅ (if not already installed)

**Step 3:** MongoDB will start automatically

---

### Option 2: Using Chocolatey

```powershell
# Run PowerShell as Administrator
choco install mongodb

# Start MongoDB service
net start MongoDB
```

---

## ✅ Verify Installation

```powershell
# Check if MongoDB is running
Get-Service MongoDB

# Should show: Status = Running
```

---

## 🔧 Configure Backend

**Update `.env`:**
```env
# Comment out Atlas (add # at start)
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms

# Use local MongoDB
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

**Server will auto-restart** (nodemon is watching)

---

## 📊 Populate Database

### Method 1: Using MongoDB Compass (Easiest)

**Step 1:** Open MongoDB Compass

**Step 2:** Connect to local MongoDB
```
mongodb://localhost:27017
```

**Step 3:** Click "Mongosh" tab at bottom

**Step 4:** Copy entire content from `FINAL_COMPLETE_POPULATE.txt`

**Step 5:** Paste in Mongosh shell

**Step 6:** Press Enter

**You should see:**
```
✅ 2 Admins created!
✅ 3 Trainers created!
✅ 10 Students created!
```

---

### Method 2: Using Command Line

```powershell
# Open MongoDB shell
mongosh

# Paste content from FINAL_COMPLETE_POPULATE.txt
# Press Enter
```

---

## 🧪 Test Login

```powershell
# Test login
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "@test-login.json"
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "role": "administrator"
  }
}
```

---

## ✅ Summary

**Steps:**
1. ✅ Install MongoDB locally
2. ✅ Update `.env` to use `mongodb://localhost:27017/ceas-lms`
3. ✅ Populate database using Compass
4. ✅ Test login

**Time:** 5-10 minutes total

---

## 🎯 Why Local MongoDB?

**Advantages:**
- ✅ No internet dependency
- ✅ Faster (no network latency)
- ✅ Full control
- ✅ No DNS issues
- ✅ Works offline

**For Production:**
- Use MongoDB Atlas
- Fix DNS issue later
- For now, local is perfect for development

---

## 📞 Need Help?

**MongoDB not starting?**
```powershell
# Check service
Get-Service MongoDB

# Start manually
net start MongoDB

# Or start mongod directly
mongod --dbpath C:\data\db
```

**Can't connect?**
```
Check: MongoDB Compass can connect to localhost:27017
Check: Firewall not blocking port 27017
Check: MongoDB service is running
```

---

**🚀 Once installed, your backend will work perfectly!**
