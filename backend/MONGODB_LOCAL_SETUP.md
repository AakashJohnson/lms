# MongoDB Local Setup Guide

## ✅ Current Status
- MongoDB 8.2.7 is being installed
- Backend is configured to use local MongoDB: `mongodb://localhost:27017/ceas-lms`
- Test users script is ready to populate the database

---

## 📋 Step-by-Step Setup (After Installation Completes)

### Step 1: Complete MongoDB Installation

**During Installation:**
1. ✅ Choose "Complete" installation type
2. ✅ Install MongoDB as a Windows Service (IMPORTANT!)
3. ✅ Use default data directory: `C:\Program Files\MongoDB\Server\8.2\data`
4. ✅ Install MongoDB Compass (GUI tool) - Check this option
5. ✅ Click "Install" and wait for completion

**Important Settings:**
- Service Name: `MongoDB`
- Data Directory: `C:\Program Files\MongoDB\Server\8.2\data`
- Log Directory: `C:\Program Files\MongoDB\Server\8.2\log`
- Port: `27017` (default)

---

### Step 2: Verify MongoDB Service is Running

After installation completes, open PowerShell and run:

```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# If not running, start it
Start-Service -Name MongoDB

# Verify it's listening on port 27017
Test-NetConnection -ComputerName localhost -Port 27017
```

**Expected Output:**
```
Status   : Running
Name     : MongoDB
```

---

### Step 3: Create Test Users in Database

Navigate to the backend folder and run the user creation script:

```bash
cd C:\projects\lms\lms\backend
node create-test-users.js
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🗑️  Removing existing test users...
✅ Cleared existing test users

👥 Creating test users...

✅ Created administrator:
   Name: Admin User
   Email: admin@ncui.in
   Mobile: 9999999999
   Password: Admin@123
   Role: administrator
   Status: ✅ Approved

✅ Created trainer:
   Name: Trainer Kumar
   Email: trainer@ncui.in
   Mobile: 8888888888
   Password: Trainer@123
   Role: trainer
   Status: ✅ Approved

✅ Created participant:
   Name: Student Singh
   Email: student@ncui.in
   Mobile: 7777777777
   Password: Student@123
   Role: participant
   Status: ✅ Approved

🎉 All test users created successfully!
```

---

### Step 4: Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
🚀 CEAS-LMS Backend Server running on port 5000 in development mode
📊 Health Check: http://localhost:5000/health
✅ MongoDB connected successfully
✅ All routes loaded successfully
📖 API Base: http://localhost:5000/api/v1
```

---

### Step 5: Test Login

Open your browser and go to: **http://localhost:5173**

**Test Credentials:**

| Role          | Email              | Password     | Redirects To          |
|---------------|--------------------|--------------|-----------------------|
| Administrator | admin@ncui.in      | Admin@123    | /admin-dashboard      |
| Trainer       | trainer@ncui.in    | Trainer@123  | /trainer-dashboard    |
| Student       | student@ncui.in    | Student@123  | /student-dashboard    |

---

## 🔧 Troubleshooting

### Problem 1: MongoDB Service Not Starting

**Solution:**
```powershell
# Check service status
Get-Service -Name MongoDB

# Try to start manually
Start-Service -Name MongoDB

# If it fails, check logs at:
# C:\Program Files\MongoDB\Server\8.2\log\mongod.log
```

### Problem 2: Port 27017 Already in Use

**Solution:**
```powershell
# Find what's using port 27017
netstat -ano | findstr :27017

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Restart MongoDB service
Restart-Service -Name MongoDB
```

### Problem 3: Connection Refused Error

**Check:**
1. MongoDB service is running: `Get-Service -Name MongoDB`
2. Port 27017 is accessible: `Test-NetConnection localhost -Port 27017`
3. Firewall is not blocking: Add exception for MongoDB

### Problem 4: Users Not Created

**Solution:**
```bash
# Check if MongoDB is connected
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/ceas-lms').then(() => console.log('✅ Connected')).catch(err => console.log('❌ Error:', err.message))"

# If connected, run the script again
node create-test-users.js
```

---

## 🎯 Quick Commands Reference

```bash
# Check MongoDB service status
Get-Service -Name MongoDB

# Start MongoDB service
Start-Service -Name MongoDB

# Stop MongoDB service
Stop-Service -Name MongoDB

# Restart MongoDB service
Restart-Service -Name MongoDB

# Test connection
Test-NetConnection localhost -Port 27017

# Create test users
node create-test-users.js

# Start backend server
npm run dev

# Test API health
curl http://localhost:5000/health

# Test login API
curl -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\": \"admin@ncui.in\", \"password\": \"Admin@123\"}"
```

---

## 📊 MongoDB Compass (GUI)

If you installed MongoDB Compass:

1. Open MongoDB Compass
2. Connection String: `mongodb://localhost:27017`
3. Click "Connect"
4. You should see the `ceas-lms` database
5. Inside, you'll find the `users` collection with 3 test users

---

## 🔐 Login Flow

1. User opens: http://localhost:5173
2. Enters email/mobile and password
3. Backend validates credentials
4. Returns JWT token + user role
5. Frontend stores token in localStorage
6. Redirects based on role:
   - `administrator` → `/admin-dashboard`
   - `trainer` → `/trainer-dashboard`
   - `participant` → `/student-dashboard`

---

## ✅ Success Checklist

- [ ] MongoDB 8.2.7 installed successfully
- [ ] MongoDB service is running
- [ ] Port 27017 is accessible
- [ ] Test users created in database
- [ ] Backend server running on port 5000
- [ ] Frontend running on port 5173
- [ ] Login works for all 3 roles
- [ ] Dynamic redirect works correctly

---

## 📞 Need Help?

If you encounter any issues:

1. Check MongoDB service: `Get-Service -Name MongoDB`
2. Check backend logs: `lms/backend/logs/error.log`
3. Check MongoDB logs: `C:\Program Files\MongoDB\Server\8.2\log\mongod.log`
4. Verify .env file has: `MONGODB_URI=mongodb://localhost:27017/ceas-lms`

---

**Last Updated:** May 3, 2026
**MongoDB Version:** 8.2.7
**Node.js Version:** 18+
**Backend Port:** 5000
**Frontend Port:** 5173
