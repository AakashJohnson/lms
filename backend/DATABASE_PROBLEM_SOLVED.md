# ✅ Database Problem - Complete Solution

## 🎯 Problem Summary

**Issue:** MongoDB Atlas DNS resolution failing on Windows + Node.js  
**Error:** `Operation users.findOne() buffering timed out after 10000ms`  
**Root Cause:** Windows DNS cannot resolve MongoDB SRV records  
**Impact:** Login not working, all database operations failing  

---

## 🚀 Solution: Install MongoDB Locally (5 Minutes)

### **Method 1: Automatic Installation (Easiest)**

**Step 1:** Open PowerShell as Administrator
- Press `Win + X`
- Click "Windows PowerShell (Admin)" or "Terminal (Admin)"

**Step 2:** Navigate to backend folder
```powershell
cd C:\projects\lms\lms\backend
```

**Step 3:** Run installer script
```powershell
.\INSTALL_MONGODB_AUTO.ps1
```

**Step 4:** Wait 2-3 minutes for installation

---

### **Method 2: Manual Installation**

**Step 1:** Download MongoDB
- Go to: https://www.mongodb.com/try/download/community
- Version: 7.0 (latest)
- Platform: Windows
- Package: MSI
- Click "Download"

**Step 2:** Install
- Double-click downloaded file
- Choose "Complete" installation
- ✅ Check "Install MongoDB as a Service"
- ✅ Check "Install MongoDB Compass" (if not installed)
- Click "Install"
- Wait 5 minutes

**Step 3:** Verify Installation
```powershell
Get-Service MongoDB
```

Should show: **Status = Running**

---

## 📊 Populate Database

### **Step 1:** Open MongoDB Compass

### **Step 2:** Connect to Local MongoDB
```
mongodb://localhost:27017
```
Click "Connect"

### **Step 3:** Open Mongosh Tab
- Look at bottom of Compass window
- Click ">_MONGOSH" tab

### **Step 4:** Populate Data
1. Open file: `FINAL_COMPLETE_POPULATE.txt`
2. Copy ALL content (Ctrl+A, Ctrl+C)
3. Paste in Mongosh shell (Ctrl+V)
4. Press Enter

### **Step 5:** Verify Success
You should see:
```
✅ 2 Admins created!
✅ 3 Trainers created!
✅ 10 Students created!
```

**Check in Compass:**
```
Databases
└─ ceas-lms
   ├─ admins (2 documents)
   ├─ trainers (3 documents)
   └─ students (10 documents)
```

---

## 🔧 Backend Configuration

**Already Done!** `.env` is configured to use local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

**Server will auto-restart** (nodemon is watching)

---

## 🧪 Test Login

### **Method 1: Using curl**
```powershell
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "@test-login.json"
```

### **Method 2: Using Postman/Thunder Client**
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

### **Success Response:**
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

## 📋 Login Credentials

### **Admins:**
- `admin@ncui.in` / `Admin@123`
- `superadmin@ncui.in` / `Admin@123`

### **Trainers:**
- `trainer@ncui.in` / `Trainer@123`
- `rajesh.trainer@ncui.in` / `Trainer@123`
- `priya.trainer@ncui.in` / `Trainer@123`

### **Students (Approved):**
- `student@ncui.in` / `Student@123`
- `priya.student@ncui.in` / `Student@123`
- `rahul@ncui.in` / `Student@123`
- `sneha@ncui.in` / `Student@123`
- `vikram@ncui.in` / `Student@123`
- `anjali@ncui.in` / `Student@123`
- `karan@ncui.in` / `Student@123`
- `divya@ncui.in` / `Student@123`

### **Students (Pending Approval):**
- `amit.student@ncui.in` / `Student@123`
- `arjun@ncui.in` / `Student@123`

---

## ✅ Verification Checklist

After installation:

- [ ] MongoDB service running (`Get-Service MongoDB`)
- [ ] Compass connected to `localhost:27017`
- [ ] Database `ceas-lms` created
- [ ] Collections populated (admins, trainers, students)
- [ ] Backend server running (`npm run dev`)
- [ ] Login working (test with Postman/curl)

---

## 🐛 Troubleshooting

### **MongoDB service not starting**
```powershell
# Start manually
net start MongoDB

# Or check logs
Get-EventLog -LogName Application -Source MongoDB -Newest 10
```

### **Can't connect to localhost:27017**
```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort 27017

# Restart service
Restart-Service MongoDB
```

### **Database not populating**
- Make sure you're in Mongosh tab (not regular shell)
- Copy entire content from FINAL_COMPLETE_POPULATE.txt
- Paste and press Enter
- Check for error messages

### **Login still timing out**
```powershell
# Check server logs
Get-Content logs/error.log -Tail 20

# Restart server
# Press Ctrl+C in server terminal
# Run: npm run dev
```

---

## 🎯 Why Local MongoDB?

### **Advantages:**
✅ No internet dependency  
✅ Faster (no network latency)  
✅ Full control over data  
✅ No DNS issues  
✅ Works offline  
✅ Perfect for development  

### **For Production:**
- Use MongoDB Atlas
- Fix DNS issue on production server
- For now, local is best for development

---

## 📞 Need Help?

**If MongoDB won't install:**
1. Check Windows version (needs Windows 10/11)
2. Check disk space (needs 500MB)
3. Run installer as Administrator

**If database won't populate:**
1. Make sure Compass is connected
2. Use Mongosh tab (not regular shell)
3. Copy entire script
4. Check for syntax errors

**If login still fails:**
1. Check MongoDB service is running
2. Check .env has correct URI
3. Restart backend server
4. Check server logs

---

## ✅ Summary

**Problem:** MongoDB Atlas DNS resolution failing  
**Solution:** Install MongoDB locally  
**Time:** 5-10 minutes  
**Status:** Ready to install  

**Steps:**
1. ⏳ Install MongoDB (Method 1 or 2)
2. ⏳ Populate database (Compass)
3. ✅ Backend configured (already done)
4. ⏳ Test login

---

**Once MongoDB is installed and data is populated, everything will work perfectly!** 🚀

**Payment integration is 100% complete. Only database connection needs fixing.**
