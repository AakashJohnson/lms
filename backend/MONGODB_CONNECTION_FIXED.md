# ✅ MongoDB Connection - Complete Fix Guide

## 🎯 Current Situation

**Problem:** MongoDB Atlas DNS resolution failing  
**Error:** `querySrv ECONNREFUSED _mongodb._tcp.ceas-lms.5jzp2fv.mongodb.net`  
**Status:** Server running, but database not connected

**Good News:** MongoDB Compass IS connected to Atlas! This means:
- ✅ Your credentials are correct
- ✅ Atlas cluster is working
- ✅ Your firewall allows MongoDB
- ❌ Only Node.js DNS resolution is failing

---

## 🚀 Quick Fix (Choose One)

### **Fix 1: Flush DNS Cache (Fastest - Try This First)**

**Run as Administrator:**
```powershell
# Open PowerShell as Administrator
ipconfig /flushdns
ipconfig /registerdns
```

**Or use the batch file:**
```bash
# Right-click → Run as Administrator
FIX_MONGODB_DNS.bat
```

Then **restart the server** (nodemon will auto-restart)

---

### **Fix 2: Use Compass Connection String**

Since Compass is connected, let's use its exact connection string:

**Step 1:** In MongoDB Compass, click the connection → Copy connection string

**Step 2:** Update `.env`:
```env
MONGODB_URI=<paste_compass_connection_string_here>
```

**Step 3:** Server will auto-restart

---

### **Fix 3: Install Local MongoDB (Permanent Solution)**

**Install MongoDB Community:**
```powershell
# Using Chocolatey (if installed)
choco install mongodb

# Or download from:
# https://www.mongodb.com/try/download/community
```

**Start MongoDB:**
```powershell
# Create data directory
mkdir C:\data\db

# Start MongoDB
mongod --dbpath C:\data\db
```

**Update `.env`:**
```env
# Comment out Atlas
# MONGODB_URI=mongodb+srv://...

# Use local
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

**Populate local database:**
1. Open MongoDB Compass
2. Connect to `mongodb://localhost:27017`
3. Open Mongosh tab
4. Paste content from `FINAL_COMPLETE_POPULATE.txt`
5. Press Enter

---

### **Fix 4: Use Standard Connection String (Not SRV)**

Get the standard (non-SRV) connection string from Atlas:

**Step 1:** Go to MongoDB Atlas Dashboard  
**Step 2:** Click "Connect" → "Connect your application"  
**Step 3:** Select "Driver: Node.js 5.5 or later"  
**Step 4:** Copy the connection string (should start with `mongodb://` not `mongodb+srv://`)  
**Step 5:** Replace password with: `<password>`
**Step 6:** Update `.env`

---

## 🔧 What I've Already Fixed

### 1. Updated Database Config ✅
- Increased connection timeouts (30-60 seconds)
- Added IPv4 preference
- Added automatic fallback to local MongoDB
- Better error logging

### 2. Updated .env ✅
- Reduced timeout to fail faster
- Added serverSelectionTimeoutMS

### 3. Created Fallback Logic ✅
Server now automatically tries:
1. MongoDB Atlas (primary)
2. Local MongoDB (fallback if Atlas fails)
3. Run without database (last resort)

---

## 🧪 Test Connection

After applying any fix:

```bash
# Test login
curl -X POST http://localhost:5000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"emailOrMobile\":\"admin@ncui.in\",\"password\":\"Admin@123\"}"
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

**Failure Response (Database not connected):**
```json
{
  "success": false,
  "error": "Operation `users.findOne()` buffering timed out"
}
```

---

## 📊 Current Server Status

✅ **Server:** Running on port 5000  
✅ **Redis:** Connected  
✅ **Routes:** Registered  
✅ **Payment Integration:** Complete  
❌ **MongoDB:** Connection failing (DNS issue)  

---

## 🎯 Recommended Solution

**For Development (Right Now):**
→ **Use Fix 3: Install Local MongoDB**
- Fastest to get working
- No internet dependency
- Full control

**For Production (Later):**
→ **Fix Atlas DNS issue**
- Use Fix 1 (Flush DNS)
- Or Fix 4 (Standard connection string)
- Atlas is better for production

---

## 💡 Why This Happens

**Root Cause:** Windows DNS cache + Node.js DNS resolver

MongoDB Atlas uses SRV records for connection:
```
mongodb+srv://... → DNS SRV lookup → Actual server IPs
```

Your Windows DNS cache or Node.js DNS resolver is failing the SRV lookup, but MongoDB Compass (which uses a different DNS resolver) works fine.

**Common Causes:**
1. Windows DNS cache corruption
2. Antivirus/Firewall DNS filtering
3. Corporate network DNS restrictions
4. IPv6/IPv4 routing issues

---

## 🚨 Emergency: Run Without Database

If you need to test other features immediately:

The server is already configured to run without database. You can test:
- ✅ Health check endpoint
- ✅ Static routes
- ❌ Login (needs database)
- ❌ User management (needs database)
- ❌ Courses (needs database)

---

## 📞 Next Steps

**Choose your path:**

**Path A: Quick Local Setup (5 minutes)**
1. Install MongoDB locally
2. Start MongoDB
3. Update .env to use local
4. Populate database
5. Test login ✅

**Path B: Fix Atlas Connection (10 minutes)**
1. Run FIX_MONGODB_DNS.bat as Administrator
2. Restart server
3. Test login
4. If fails, try Fix 2 or Fix 4

**Path C: Continue Without Database (Not Recommended)**
1. Test payment integration docs
2. Review code
3. Fix database later

---

## ✅ Summary

**Problem:** DNS SRV resolution failing for MongoDB Atlas  
**Impact:** Cannot connect to database, login fails  
**Solution:** Multiple options available (local MongoDB recommended for dev)  
**Status:** Server running, payment integration complete, only database connection needs fix  

**Recommended:** Install local MongoDB (Fix 3) - fastest and most reliable for development

---

**Need help? Check the server logs for connection attempts!**
