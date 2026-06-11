# 🔌 Connect MongoDB - Quick Fix

## Current Problem

Your `.env` has:
```
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

But you don't have local MongoDB running, and your Atlas connection is failing.

---

## ✅ Solution: Use Your Existing MongoDB Atlas Connection

I can see from your Compass screenshot you have a connection to `cluster.mongodb.net`. Let's use that!

### Step 1: Get Your Atlas Connection String

**Option A: From MongoDB Compass**
1. Open MongoDB Compass
2. Click on the `cluster.mongodb.net` connection
3. Look for the connection string (should look like):
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```
4. Copy it!

**Option B: From MongoDB Atlas Website**
1. Go to: https://cloud.mongodb.com/
2. Login to your account
3. Click on your cluster
4. Click "Connect" button
5. Choose "Connect your application"
6. Copy the connection string

### Step 2: Update .env File

Open `lms/backend/.env` and replace this line:
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

With your Atlas connection string (add `/ceas-lms` before the `?`):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

**Important:**
- Replace `YOUR_USERNAME` with your actual username
- Replace `YOUR_PASSWORD` with your actual password
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
- Make sure `/ceas-lms` is there (database name)

### Step 3: Check Network Access

1. Go to MongoDB Atlas: https://cloud.mongodb.com/
2. Click "Network Access" in left sidebar
3. Make sure your IP is whitelisted OR add `0.0.0.0/0` (allow all)

### Step 4: Restart Backend

```bash
# Stop current server (Ctrl+C in the terminal)
# Or kill the process
npm run dev
```

### Step 5: Verify Connection

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
📦 Database: ceas-lms
```

---

## 🆘 If You Don't Have MongoDB Atlas Yet

### Create New Atlas Account (5 minutes)

1. **Sign up**: https://www.mongodb.com/cloud/atlas/register
2. **Create free cluster**:
   - Choose M0 FREE tier
   - Provider: AWS
   - Region: Mumbai (ap-south-1)
3. **Create database user**:
   - Username: `ceasadmin`
   - Password: Click "Autogenerate" and COPY IT!
4. **Network access**:
   - Add IP: `0.0.0.0/0` (allow all)
5. **Get connection string**:
   - Click "Connect" → "Connect your application"
   - Copy the string

Then follow Step 2 above to update `.env`

---

## 🧪 Test Connection

### Test 1: Check Backend Logs
```bash
# Look for this in backend logs:
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
```

### Test 2: Health Check
```bash
curl http://localhost:5000/health
```

Should show MongoDB connected.

### Test 3: Create Test Users
```bash
cd lms/backend
node create-test-users.js
```

Should create 3 test users successfully.

### Test 4: Try Login
Go to: http://localhost:5173
- Email: `admin@ncui.in`
- Password: `Admin@123`

Should work! 🎉

---

## 📋 Common Issues

### Issue 1: "Authentication failed"
**Problem**: Wrong username or password in connection string

**Solution**:
1. Go to Atlas → Database Access
2. Check your username
3. Reset password if needed
4. Update `.env` with new password

### Issue 2: "IP not whitelisted"
**Problem**: Your IP is not allowed

**Solution**:
1. Go to Atlas → Network Access
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
4. Wait 2 minutes for changes to apply

### Issue 3: "Connection timeout"
**Problem**: Can't reach MongoDB Atlas

**Solution**:
- Check internet connection
- Check firewall settings
- Try different network (mobile hotspot)

### Issue 4: Still showing localhost:27017
**Problem**: `.env` file not updated or server not restarted

**Solution**:
1. Double-check `.env` file has Atlas connection string
2. Save the file
3. Restart backend server
4. Check logs again

---

## 🎯 Quick Checklist

- [ ] Got MongoDB Atlas connection string
- [ ] Updated `MONGODB_URI` in `.env` file
- [ ] Added `/ceas-lms` database name in connection string
- [ ] Network access allows your IP (or 0.0.0.0/0)
- [ ] Restarted backend server
- [ ] See "MongoDB Connected" in logs
- [ ] Created test users with `node create-test-users.js`
- [ ] Login works at http://localhost:5173

---

## 💡 Need Your Connection String?

If you can't find your Atlas connection string, I can help! Just:

1. Open MongoDB Compass
2. Click on the `cluster.mongodb.net` connection
3. Copy the connection string
4. Share it with me (I'll help format it for `.env`)

**OR**

Tell me:
- Your Atlas username
- Your cluster URL (from Compass)
- I'll help you format the connection string

---

**Let's get MongoDB connected! 🚀**
