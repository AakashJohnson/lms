# 🚀 MongoDB Manual Installation - Step by Step

## ⚡ Quick Steps (5 Minutes)

### **Step 1: Download MongoDB**

**Option A: Direct Download Link**
```
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi
```
Copy paste this link in browser and download will start automatically.

**Option B: Official Website**
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0.5 (current)
   - Platform: Windows x64
   - Package: msi
3. Click "Download"

**File Size:** ~150 MB  
**Download Time:** 2-5 minutes (depending on internet)

---

### **Step 2: Install MongoDB**

1. **Find downloaded file** (usually in Downloads folder)
   - File name: `mongodb-windows-x86_64-7.0.5-signed.msi`

2. **Double-click** the file to start installation

3. **Setup Wizard:**
   - Click "Next"
   - Accept License → "Next"
   - Choose "Complete" installation → "Next"
   - **IMPORTANT:** Keep these checked ✅
     - ✅ "Install MongoDB as a Service"
     - ✅ "Run service as Network Service user"
   - Click "Next"
   - **Uncheck** "Install MongoDB Compass" (you already have it)
   - Click "Install"

4. **Wait 3-5 minutes** for installation

5. Click "Finish"

---

### **Step 3: Verify Installation**

**Open PowerShell and run:**
```powershell
Get-Service MongoDB
```

**Expected Output:**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB Server
```

**If Status is "Stopped":**
```powershell
Start-Service MongoDB
```

---

### **Step 4: Test Connection**

**Open MongoDB Compass:**
1. Click "New Connection"
2. Enter: `mongodb://localhost:27017`
3. Click "Connect"

**Should connect successfully!** ✅

---

### **Step 5: Populate Database**

**In MongoDB Compass:**

1. **Open Mongosh tab** (bottom of window)

2. **Copy content** from `FINAL_COMPLETE_POPULATE.txt`
   - Open the file
   - Press Ctrl+A (select all)
   - Press Ctrl+C (copy)

3. **Paste in Mongosh**
   - Click in Mongosh shell
   - Press Ctrl+V (paste)
   - Press Enter

4. **Wait for completion** (10-15 seconds)

**Success Messages:**
```
✅ 2 Admins created!
✅ 3 Trainers created!
✅ 10 Students created!
```

5. **Verify in Compass:**
   - Left sidebar → Databases
   - You should see `ceas-lms` database
   - Inside: `admins`, `trainers`, `students` collections

---

### **Step 6: Restart Backend Server**

**Your server will auto-restart** (nodemon is watching)

**Or manually restart:**
```powershell
# Press Ctrl+C in server terminal
# Then run:
npm run dev
```

**Look for:**
```
✅ MongoDB Local Connected: localhost
📦 Database: ceas-lms
🚀 Server ready!
```

---

### **Step 7: Test Login**

**Using curl:**
```powershell
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "@test-login.json"
```

**Using Postman:**
```
POST http://localhost:5000/api/v1/auth/login

Body (JSON):
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
    "lastName": "User",
    "email": "admin@ncui.in",
    "role": "administrator"
  }
}
```

---

## ✅ Verification Checklist

- [ ] MongoDB downloaded (150MB file)
- [ ] MongoDB installed (Complete installation)
- [ ] MongoDB service running (`Get-Service MongoDB`)
- [ ] Compass connected to `localhost:27017`
- [ ] Database populated (admins, trainers, students)
- [ ] Backend server restarted
- [ ] Login working ✅

---

## 🐛 Troubleshooting

### **Download is slow**
- Use direct link: https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi
- Or try different browser
- Or use download manager

### **Installation fails**
- Run installer as Administrator (Right-click → Run as Administrator)
- Check disk space (need 500MB free)
- Close antivirus temporarily

### **Service won't start**
```powershell
# Check if port 27017 is free
Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue

# If port is in use, kill the process
# Or restart computer
```

### **Can't connect in Compass**
- Make sure service is running: `Get-Service MongoDB`
- Try: `mongodb://127.0.0.1:27017` instead of localhost
- Restart Compass

### **Database won't populate**
- Make sure you're in **Mongosh tab** (not regular shell)
- Copy **entire content** from FINAL_COMPLETE_POPULATE.txt
- Paste and press Enter
- Wait for completion messages

### **Login still fails**
```powershell
# Check server logs
Get-Content logs/error.log -Tail 20

# Check if MongoDB is connected
# Look for: "✅ MongoDB Local Connected"

# Restart server
# Ctrl+C then npm run dev
```

---

## 📞 Alternative: Use MongoDB Atlas (If Local Fails)

If local installation doesn't work, we can try fixing Atlas connection:

1. **Restart computer** (clears DNS cache completely)
2. **Try different network** (mobile hotspot)
3. **Use VPN** (sometimes helps with DNS)

But **local MongoDB is recommended** for development!

---

## ✅ Summary

**Time Required:** 10-15 minutes total
- Download: 2-5 min
- Install: 3-5 min
- Populate: 1 min
- Test: 1 min

**Steps:**
1. Download MongoDB MSI
2. Install (Complete, as Service)
3. Verify service running
4. Connect Compass to localhost
5. Populate database
6. Test login

**Once done, everything will work perfectly!** 🚀

---

**Start with Step 1 and let me know when you reach each step!**
