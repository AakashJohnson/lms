# 🔧 MongoDB Connection Fix

## Current Issue
```
Operation `users.findOne()` buffering timed out after 10000ms
querySrv ECONNREFUSED _mongodb._tcp.ceas-lms.5jzp2fv.mongodb.net
```

## Quick Fixes

### Fix 1: Add directConnection=true (Try First)
Already applied in .env:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

**Restart server** (nodemon will auto-restart)

---

### Fix 2: Use Standard Connection String (If Fix 1 Fails)

Replace in `.env`:
```env
# Comment out SRV connection
# MONGODB_URI=mongodb+srv://...

# Use standard connection (get from Atlas dashboard)
MONGODB_URI=mongodb://ceas-lms:<password>@ceas-lms-shard-00-00.5jzp2fv.mongodb.net:27017,ceas-lms-shard-00-01.5jzp2fv.mongodb.net:27017,ceas-lms-shard-00-02.5jzp2fv.mongodb.net:27017/ceas-lms?ssl=true&replicaSet=atlas-xxxxx-shard-0&authSource=admin&retryWrites=true&w=majority
```

**To get the correct standard connection string:**
1. Go to MongoDB Atlas Dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Driver: Node.js"
5. Copy the connection string
6. Replace password with: <password>

---

### Fix 3: Check Internet & Firewall

**Test DNS:**
```powershell
nslookup ceas-lms.5jzp2fv.mongodb.net
```

**Test MongoDB Compass:**
1. Open MongoDB Compass
2. Connect with: `mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms`
3. If fails → Internet/Firewall issue
4. If works → Node.js DNS issue

**Firewall Check:**
- Windows Firewall might be blocking MongoDB
- Antivirus might be blocking outbound connections
- Corporate network might block MongoDB Atlas

---

### Fix 4: Use Local MongoDB (Temporary)

**Install MongoDB locally:**
```powershell
# Using Chocolatey
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community
```

**Update .env:**
```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

**Start MongoDB:**
```powershell
mongod --dbpath C:\data\db
```

**Populate local database:**
- Open MongoDB Compass
- Connect to: `mongodb://localhost:27017`
- Paste content from `FINAL_COMPLETE_POPULATE.txt`

---

### Fix 5: Flush DNS Cache

```powershell
# Run as Administrator
ipconfig /flushdns
```

Then restart server.

---

## Test Connection

After applying any fix, test:

```bash
# Login test
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrMobile":"admin@ncui.in","password":"Admin@123"}'
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "firstName": "Admin",
    "email": "admin@ncui.in",
    "role": "administrator"
  }
}
```

---

## Current Status

✅ Server running on port 5000
✅ Redis connected
✅ Routes registered
❌ MongoDB connection failing

**Most likely cause:** DNS resolution issue or firewall blocking Atlas

**Recommended:** Try Fix 1 first (already applied), then Fix 2 if needed
