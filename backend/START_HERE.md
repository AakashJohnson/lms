# 🚀 Quick Start - NCUI CEAS LMS Backend

## ⚠️ Current Status

✅ Dependencies installed (816 packages)  
✅ .env file created  
✅ Logs folder created  
❌ MongoDB not installed locally  
⚠️ Redis installed but not running properly  

---

## 🎯 Option 1: Quick Start with MongoDB Atlas (Recommended)

### Step 1: Create Free MongoDB Atlas Account

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (Free tier - No credit card needed)
3. Create a cluster (takes 3-5 minutes)
4. Click "Connect" → "Connect your application"
5. Copy the connection string

### Step 2: Update .env File

Replace this line in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

With your Atlas connection string:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
```

### Step 3: Start Backend Server

```bash
npm run dev
```

---

## 🎯 Option 2: Install MongoDB Locally

### For Windows:

1. Download MongoDB Community Server:
   https://www.mongodb.com/try/download/community

2. Install with default settings

3. MongoDB will run as a Windows Service automatically

4. Verify installation:
```bash
mongod --version
```

5. Start backend:
```bash
npm run dev
```

---

## 🎯 Option 3: Use Docker (Easiest)

### If you have Docker installed:

```bash
# Start MongoDB and Redis
docker-compose up -d

# Start backend
npm run dev
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: ceas-lms
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:
```

---

## 🔧 Fix Redis Issue (Optional)

Redis is installed but not starting properly. Try:

### Option A: Start Redis manually
```bash
redis-server --port 6379
```

### Option B: Use Redis Cloud (Free)
1. Sign up: https://redis.com/try-free/
2. Get connection details
3. Update .env:
```
REDIS_HOST=redis-xxxxx.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your_password
```

### Option C: Disable Redis for Development
Comment out Redis initialization in `server.js`:
```javascript
// initRedis(); // Temporarily disabled
```

---

## ✅ Verify Setup

Once MongoDB is connected, test the API:

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "CEAS-LMS Backend is running"
}
```

### 2. Dashboard Stats
```bash
curl http://localhost:5000/api/v1/dashboard/stats
```

### 3. Register Test User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "mobile": "9876543210",
    "password": "Test@1234"
  }'
```

---

## 🎓 Next Steps

1. ✅ Get MongoDB running (Atlas or Local)
2. ✅ Start backend server: `npm run dev`
3. ✅ Test health endpoint
4. ✅ Test registration endpoint
5. ✅ Read API_ENDPOINTS.md for all available APIs

---

## 🆘 Common Issues

### Issue: "Cannot connect to MongoDB"
**Solution**: Use MongoDB Atlas (cloud) - it's free and easier

### Issue: "Redis connection failed"
**Solution**: Redis is optional for development. Comment out `initRedis()` in server.js

### Issue: "Port 5000 already in use"
**Solution**: Change PORT in .env to 5001

### Issue: "Module not found"
**Solution**: Run `npm install` again

---

## 📞 Need Help?

1. Check `QUICK_START.md` for detailed guide
2. Check `README.md` for complete documentation
3. Check `API_ENDPOINTS.md` for API reference

---

**Recommendation**: Use MongoDB Atlas (Option 1) - it's the fastest way to get started! 🚀
