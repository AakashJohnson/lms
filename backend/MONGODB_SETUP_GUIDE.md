# 🗄️ MongoDB Atlas Setup - Step by Step

## 📝 Quick Setup (5 minutes)

### Step 1: Create Account

1. **Open**: https://www.mongodb.com/cloud/atlas/register
2. **Sign up with**:
   - Google account (fastest) ✅
   - Or GitHub account
   - Or email

### Step 2: Create Free Cluster

1. After login, click **"Build a Database"**
2. Choose **"M0 FREE"** tier
3. **Cloud Provider**: AWS (recommended)
4. **Region**: Choose closest to you:
   - India: `Mumbai (ap-south-1)` ✅
   - Or any other region
5. **Cluster Name**: Keep default or name it `ceas-lms`
6. Click **"Create Cluster"** (takes 3-5 minutes)

### Step 3: Create Database User

1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `ceas-admin`
5. **Password**: Click "Autogenerate Secure Password" and **COPY IT!**
   - Example: `<password>`
   - **Save this password!** You'll need it
6. **Database User Privileges**: 
   - Select "Read and write to any database"
7. Click **"Add User"**

### Step 4: Setup Network Access

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - This adds `0.0.0.0/0`
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 5.5 or later
6. **Copy the connection string**:
   ```
   mongodb+srv://ceas-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 6: Update .env File

1. Open `backend/.env` file
2. Find this line:
   ```
   MONGODB_URI=mongodb://localhost:27017/ceas-lms
   ```
3. Replace with your connection string:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```
   
   **Important**:
   - Replace `<password>` with your actual password
   - Add `/ceas-lms` before the `?` (database name)
   - Remove any `<>` brackets

### Step 7: Start Full Server

```bash
# Stop test server (Ctrl+C)
# Start full server
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
📦 Database: ceas-lms
🚀 CEAS-LMS Backend Server running on port 5000
```

---

## ✅ Verification

Test MongoDB connection:
```bash
curl http://localhost:5000/health
```

Should show:
```json
{
  "success": true,
  "mongodb": "✅ Connected"
}
```

---

## 🔧 Troubleshooting

### Error: "Authentication failed"
- Check username is `ceas-admin`
- Check password is correct (no spaces)
- Password mein special characters ho to URL encode karo

### Error: "IP not whitelisted"
- Go to Network Access
- Add `0.0.0.0/0` (allow all)

### Error: "Connection timeout"
- Check internet connection
- Check firewall settings
- Try different region

---

## 📝 Example .env Configuration

```env
# Working example
MONGODB_URI=mongodb+srv://ceas-admin:<password>@cluster0.abc123.mongodb.net/ceas-lms?retryWrites=true&w=majority

# Breakdown:
# mongodb+srv://           - Protocol
# ceas-admin               - Username
# <password>        - Password
# @cluster0.abc123.mongodb.net - Cluster URL
# /ceas-lms                - Database name
# ?retryWrites=true&w=majority - Options
```

---

## 🎉 Success!

Once connected, you can:
- ✅ Register users
- ✅ Login
- ✅ Create courses
- ✅ Everything!

**Next**: See `LOGIN_GUIDE.md` for creating test users
