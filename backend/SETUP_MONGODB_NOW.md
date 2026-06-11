# 🚀 Setup MongoDB in 5 Minutes - LOGIN FIX

## Why Login Not Working?
- Backend running ✅
- Frontend working ✅  
- **MongoDB NOT connected** ❌ ← This is the problem!
- Login needs database to check credentials

---

## 🎯 Quick Fix (Choose One)

### Option A: MongoDB Atlas (Cloud - FREE) ⭐ RECOMMENDED

**Time: 5 minutes**

#### Step 1: Create Account (1 min)
1. Open: https://www.mongodb.com/cloud/atlas/register
2. Sign up with Google (fastest)

#### Step 2: Create Free Cluster (2 min)
1. Click **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. Region: **Mumbai (ap-south-1)** or closest to you
4. Click **"Create Cluster"** (wait 3 mins)

#### Step 3: Create User (1 min)
1. Go to **"Database Access"** → **"Add New Database User"**
2. Username: `ceasadmin`
3. Password: Click **"Autogenerate"** and **COPY IT!**
   - Example: `<password>`
4. Privilege: "Read and write to any database"
5. Click **"Add User"**

#### Step 4: Allow Network Access (30 sec)
1. Go to **"Network Access"** → **"Add IP Address"**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
3. Click **"Confirm"**

#### Step 5: Get Connection String (30 sec)
1. Go to **"Database"** → Click **"Connect"**
2. Choose **"Connect your application"**
3. Copy the connection string:
   ```
   mongodb+srv://ceasadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

#### Step 6: Update .env File
Open `backend/.env` and replace this line:
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

With your connection string (replace `<password>` with actual password):
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

**Example:**
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

---

### Option B: Local MongoDB (If you have it installed)

**Time: 2 minutes**

#### Step 1: Start MongoDB Service
```bash
# Windows (Run as Administrator)
net start MongoDB

# Or if using MongoDB Compass, just open it
```

#### Step 2: .env is already configured
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

---

## 🎬 Final Steps (After MongoDB Setup)

### 1. Stop Current Server
Press `Ctrl+C` in the terminal running backend

### 2. Start Full Server (with MongoDB)
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
📦 Database: ceas-lms
🚀 CEAS-LMS Backend Server running on port 5000
```

### 3. Create Test Users
```bash
node create-test-users.js
```

Output:
```
✅ Test users created successfully!
📧 Admin: admin@ncui.in / Admin@123
📧 Trainer: trainer@ncui.in / Trainer@123
📧 Student: student@ncui.in / Student@123
```

### 4. Test Login
Go to: http://localhost:5173

Try logging in with:
- **Email**: `admin@ncui.in`
- **Password**: `Admin@123`

Should redirect to Admin Dashboard! 🎉

---

## 🔍 Verify Everything Works

### Check Backend Health
```bash
curl http://localhost:5000/health
```

Should show:
```json
{
  "success": true,
  "message": "Server is running",
  "mongodb": "✅ Connected",
  "redis": "⚠️ Not configured (optional)"
}
```

### Check Login API
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrMobile":"admin@ncui.in","password":"Admin@123"}'
```

Should return token and user data!

---

## ❌ Troubleshooting

### "Authentication failed"
- Check password has no spaces
- Check username is correct
- Special characters in password? URL encode them

### "IP not whitelisted"
- Go to Network Access in Atlas
- Add 0.0.0.0/0

### "Connection timeout"
- Check internet connection
- Try different Atlas region
- Check firewall

### Still not working?
1. Check `.env` file has correct connection string
2. Check MongoDB service is running (local) or cluster is active (Atlas)
3. Check backend logs for errors
4. Try restarting backend server

---

## 📞 Need Help?

**Common Issues:**

1. **"Cannot connect to server"** → Backend not running
2. **"Login endpoint not found"** → MongoDB not connected
3. **"Invalid credentials"** → Test users not created yet
4. **"Account not approved"** → User `isApproved` is false

**Solution Order:**
1. Setup MongoDB (this file)
2. Start backend with `npm run dev`
3. Create test users with `node create-test-users.js`
4. Try login again

---

## ✅ Success Checklist

- [ ] MongoDB Atlas account created (or local MongoDB running)
- [ ] Connection string added to `.env`
- [ ] Backend started with `npm run dev`
- [ ] See "MongoDB Connected" message
- [ ] Test users created with `create-test-users.js`
- [ ] Login works at http://localhost:5173
- [ ] Redirects to correct dashboard based on role

**All done? You're ready to build! 🚀**
