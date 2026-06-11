# 🔧 Troubleshooting Guide - NCUI CEAS LMS Backend

## ❌ Error: App Crashed - Waiting for file changes

### Problem:
```
[nodemon] app crashed - waiting for file changes before starting...
```

### Reason:
Main server (`server.js`) MongoDB se connect karne ki koshish kar raha hai, lekin MongoDB available nahi hai.

### ✅ Solution:

#### Option 1: Use Test Server (Recommended for Now)
```bash
# Test server use karo (MongoDB ki zarurat nahi)
node test-server.js
```

**Test server features:**
- ✅ No MongoDB needed
- ✅ No Redis needed
- ✅ Health check working
- ✅ Test API working
- ✅ Perfect for initial testing

#### Option 2: Setup MongoDB Atlas (5 minutes)
1. Sign up: https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Get connection string
4. Update `.env`:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```
5. Run: `npm run dev`

---

## ⚠️ Warning: Redis client not available

### Problem:
```
Redis client not available. Returning null.
```

### Reason:
Redis server nahi chal raha hai.

### ✅ Solution:

**Ignore karo!** Redis optional hai development ke liye.

**Kya hoga:**
- ❌ Caching disabled
- ❌ Rate limiting disabled
- ✅ Server chalega
- ✅ APIs kaam karenge

**Agar Redis chahiye:**
1. Redis Cloud use karo (free): https://redis.com/try-free/
2. Ya local Redis install karo
3. `.env` update karo

---

## ⚠️ Warning: Duplicate schema index

### Problem:
```
[MONGOOSE] Warning: Duplicate schema index on {"email":1} found
```

### Reason:
Schema mein `unique: true` aur `schema.index()` dono use ho rahe the.

### ✅ Solution:
**Already Fixed!** ✅

Agar phir bhi dikhe to ignore karo - yeh warning hai, error nahi.

---

## ❌ Error: Cannot connect to MongoDB

### Problem:
```
MongoDB Connection Error: connect ECONNREFUSED
```

### Reason:
Local MongoDB install nahi hai.

### ✅ Solution:

**Don't install MongoDB locally!** Use MongoDB Atlas instead:

1. **Free & Easy**: MongoDB Atlas (cloud)
2. **No installation**: Works immediately
3. **Better**: Production-ready setup

**Steps:**
1. https://www.mongodb.com/cloud/atlas/register
2. Create cluster (3-5 min)
3. Get connection string
4. Update `.env`
5. Done! ✅

---

## ❌ Error: Port 5000 already in use

### Problem:
```
Error: listen EADDRINUSE: address already in use :::5000
```

### Reason:
Koi aur process port 5000 use kar raha hai.

### ✅ Solution:

#### Option 1: Kill existing process
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill
```

#### Option 2: Use different port
Update `.env`:
```
PORT=5001
```

Then restart server.

---

## ❌ Error: Module not found

### Problem:
```
Error: Cannot find module 'express'
```

### Reason:
Dependencies install nahi hue.

### ✅ Solution:
```bash
npm install
```

---

## ❌ Error: Cannot find module './config/database.js'

### Problem:
```
Error: Cannot find module './src/config/database.js'
```

### Reason:
File path wrong hai ya file missing hai.

### ✅ Solution:
Check file exists:
```bash
ls src/config/database.js
```

Agar missing hai to project dobara clone karo.

---

## 🔥 Quick Fixes

### Server won't start?
```bash
# 1. Kill all node processes
taskkill /F /IM node.exe

# 2. Reinstall dependencies
npm install

# 3. Use test server
node test-server.js
```

### MongoDB issues?
```bash
# Use test server (no MongoDB needed)
node test-server.js

# Or setup MongoDB Atlas (5 min)
# https://www.mongodb.com/cloud/atlas/register
```

### Redis issues?
```bash
# Ignore Redis warnings
# Server will work without Redis
# Just caching will be disabled
```

### Everything broken?
```bash
# Nuclear option - fresh start
rm -rf node_modules
npm install
node test-server.js
```

---

## 📊 Server Status Check

### Test if server is running:
```bash
curl http://localhost:5000/health
```

### Expected response:
```json
{
  "success": true,
  "message": "🎉 CEAS-LMS Backend is running!"
}
```

### If you get response:
✅ **Server is working!**

### If connection refused:
❌ **Server not running**
- Check if process is running
- Check port number
- Check firewall

---

## 🎯 Recommended Workflow

### For Development (Right Now):

1. **Use Test Server**:
   ```bash
   node test-server.js
   ```
   - No MongoDB needed
   - No Redis needed
   - Perfect for testing

2. **Setup MongoDB Atlas** (when ready):
   - 5 minutes setup
   - Free forever
   - Production-ready

3. **Switch to Full Server**:
   ```bash
   npm run dev
   ```
   - All features available
   - Database connected
   - Full API working

---

## 🆘 Still Having Issues?

### Check Logs:
```bash
# Error logs
cat logs/error.log

# Combined logs
cat logs/combined.log
```

### Check Environment:
```bash
# Node version (should be 18+)
node --version

# NPM version
npm --version

# Check .env file exists
ls .env
```

### Common Mistakes:

1. ❌ **Forgot to create .env**
   - Copy from .env.example
   - Update values

2. ❌ **Wrong MongoDB connection string**
   - Check username/password
   - Check cluster name
   - URL encode special characters

3. ❌ **Port already in use**
   - Change PORT in .env
   - Or kill existing process

4. ❌ **Dependencies not installed**
   - Run `npm install`

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] .env file created
- [ ] Test server running (`node test-server.js`)
- [ ] Health check working (`curl http://localhost:5000/health`)
- [ ] MongoDB Atlas account created (optional)
- [ ] Connection string updated in .env (optional)
- [ ] Full server running (`npm run dev`) (optional)

---

## 🎓 Pro Tips

1. **Start Simple**: Use test server first
2. **Add MongoDB**: When you need database features
3. **Ignore Redis**: Optional for development
4. **Read Logs**: Check `logs/` folder for errors
5. **Use Atlas**: Don't install MongoDB locally

---

## 📞 Quick Reference

### Test Server (Simple):
```bash
node test-server.js
# No MongoDB, No Redis, Just works!
```

### Full Server (With Database):
```bash
npm run dev
# Needs MongoDB Atlas connection string
```

### Health Check:
```bash
curl http://localhost:5000/health
```

### Stop Server:
```
Ctrl + C
```

---

**Remember**: Test server is perfect for development without MongoDB! 🚀
