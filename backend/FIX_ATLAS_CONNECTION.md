# 🔧 Fix MongoDB Atlas Connection

## Current Error
```
querySrv ECONNREFUSED _mongodb._tcp.ceas-lms.5jzp2fv.mongodb.net
```

## Problem
Your IP address is not whitelisted in MongoDB Atlas.

---

## ✅ SOLUTION: Whitelist Your IP

### Step 1: Go to MongoDB Atlas
1. Open: https://cloud.mongodb.com/
2. Login with your account

### Step 2: Network Access
1. Click **"Network Access"** in left sidebar
2. You'll see list of allowed IPs

### Step 3: Add Your IP
1. Click **"Add IP Address"** button
2. Click **"Add Current IP Address"** (adds your current IP)
3. **ALSO** click **"Add IP Address"** again
4. Enter: `0.0.0.0/0` (allows from anywhere)
5. Click **"Confirm"**

### Step 4: Wait 2 Minutes
Network changes take 1-2 minutes to apply.

### Step 5: Restart Backend
```bash
# I'll do this automatically after you confirm
```

---

## 🎯 Alternative: Use Local MongoDB

While Atlas is being fixed, let's setup local MongoDB:

### Check Installation Status
```powershell
# Check if MongoDB installed
Test-Path "C:\Program Files\MongoDB\Server\*\bin\mongod.exe"
```

### If Installed, Start Service
```powershell
# Run as Administrator
net start MongoDB
```

### If Not Installed Yet
Installation is still running. Check status:
```powershell
Get-Process -Name msiexec
```

---

## 📋 What I'll Do

**After you whitelist IP in Atlas:**
1. ✅ Restart backend
2. ✅ Test Atlas connection
3. ✅ Create test users
4. ✅ Test login

**For Local MongoDB:**
1. ✅ Check installation status
2. ✅ Start MongoDB service
3. ✅ Update .env to use local
4. ✅ Restart backend
5. ✅ Create test users

---

## 🎯 Quick Actions

**Tell me:**
1. "Fixed Atlas" - After you whitelist IP
2. "Use Local" - I'll setup local MongoDB
3. "Both" - I'll setup both (recommended)

---

**Current .env has both configured:**
- Primary: MongoDB Atlas
- Backup: Local MongoDB (localhost:27017)

**Just tell me which one to use!** 🚀
