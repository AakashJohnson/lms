# 🎯 FINAL SOLUTION - Local MongoDB Setup

## Current Situation

✅ **What's Working:**
- MongoDB Compass connects to Atlas
- Users created in Atlas database
- Frontend running
- Backend running (but not connected to DB)

❌ **What's NOT Working:**
- Node.js backend cannot connect to Atlas
- Network/Firewall blocking MongoDB from Node.js
- Login API returns 404 (routes not loaded without DB)

## Root Cause

**Compass uses different network stack than Node.js**
- Compass: Can connect ✅
- Node.js: Cannot connect ❌
- This is a firewall/antivirus/corporate network issue

---

## ✅ SOLUTION: Local MongoDB

Since Atlas works in Compass but not in Node.js, we need local MongoDB.

### Option 1: MongoDB Community Server (Recommended)

#### Download
1. Go to: https://www.mongodb.com/try/download/community
2. Version: 8.0 (latest)
3. Platform: Windows
4. Package: **MSI** (not ZIP)
5. Click Download

#### Install
1. Run the MSI file
2. Choose "Complete" installation
3. ✅ Check "Install MongoDB as a Service"
4. ✅ Check "Install MongoDB Compass" (optional, you have it)
5. Click Install
6. Wait 5-10 minutes

#### Start Service
```powershell
# Run PowerShell as Administrator
net start MongoDB
```

#### Update .env
```env
# Change this line:
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms

# To this:
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

#### Copy Data from Atlas to Local

**In MongoDB Compass:**

1. **Export from Atlas:**
   - Connect to Atlas (already connected)
   - Click on `ceas-lms` database
   - Click on `users` collection
   - Click "..." menu → "Export Collection"
   - Format: JSON
   - Save as: `users-export.json`

2. **Connect to Local:**
   - New Connection
   - URI: `mongodb://localhost:27017`
   - Click Connect

3. **Import to Local:**
   - Click on `ceas-lms` database (create if not exists)
   - Click on `users` collection (create if not exists)
   - Click "Add Data" → "Import File"
   - Select `users-export.json`
   - Click Import

#### Restart Backend
```bash
cd lms/backend
npm run dev
```

Should show:
```
✅ MongoDB Connected: localhost
📦 Database: ceas-lms
```

#### Test Login
```
http://localhost:5173
Email: admin@ncui.in
Password: Admin@123
```

---

### Option 2: Portable MongoDB (Faster)

#### Download
1. Go to: https://www.mongodb.com/try/download/community
2. Package: **ZIP**
3. Download

#### Extract
```
Extract to: C:\mongodb
```

#### Create Data Directory
```powershell
mkdir C:\mongodb\data
```

#### Start MongoDB
```powershell
C:\mongodb\bin\mongod.exe --dbpath C:\mongodb\data
```

**Keep this terminal open!**

#### Copy Users (Same as Option 1)
Use Compass to export from Atlas and import to local.

#### Update .env & Restart
Same as Option 1.

---

## 🔄 Alternative: Export/Import Script

If you want to automate the data copy:

### Export from Atlas (in Compass Mongosh)
```javascript
// Connect to Atlas first
use ceas-lms
db.users.find().forEach(function(doc) {
  printjson(doc);
});
```

Copy the output and save to a file.

### Import to Local (after local MongoDB is running)
```javascript
// Connect to localhost
use ceas-lms
db.users.insertMany([
  // Paste the users here
]);
```

---

## 📋 Summary

**Steps:**
1. ✅ Install MongoDB locally (MSI or ZIP)
2. ✅ Start MongoDB service
3. ✅ Export users from Atlas (Compass)
4. ✅ Import users to local (Compass)
5. ✅ Update .env to use localhost
6. ✅ Restart backend
7. ✅ Test login

**Time:** 15-20 minutes

**Result:** Everything working locally! 🎉

---

## 🆘 Need Help?

Tell me:
- "Downloaded MSI" - I'll guide through installation
- "Downloaded ZIP" - I'll guide through portable setup
- "Stuck" - I'll help troubleshoot

---

**Let's get this working! 🚀**
