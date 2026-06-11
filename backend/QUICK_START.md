# 🚀 Quick Start Guide - NCUI CEAS LMS Backend

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] MongoDB 5+ installed and running
- [ ] Redis 6+ installed and running
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

---

## 1️⃣ Installation (5 minutes)

### Step 1: Navigate to Backend Directory
```bash
cd lms/backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages including:
- Express.js, Mongoose, Redis
- JWT, bcrypt, OTP generator
- AWS SDK, Razorpay, Twilio
- Winston, Helmet, and more

---

## 2️⃣ Configuration (10 minutes)

### Step 1: Create Environment File
```bash
cp .env.example .env
```

### Step 2: Edit .env File

**Minimum Required Configuration:**

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database (Local MongoDB)
MONGODB_URI=mongodb://localhost:27017/ceas-lms

# JWT
JWT_SECRET=your_super_secret_key_min_32_characters_long
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Frontend
FRONTEND_URL=http://localhost:5173
```

**Optional (for full functionality):**

```env
# AWS S3 (for content storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Payment (Razorpay)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
```

---

## 3️⃣ Start Services (2 minutes)

### Start MongoDB
```bash
# Windows
mongod --dbpath C:\data\db

# macOS/Linux
mongod --dbpath /data/db
```

### Start Redis
```bash
# Windows (if installed via WSL or native)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

---

## 4️⃣ Run the Backend (1 minute)

### Development Mode (with Nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

You should see:
```
✅ MongoDB Connected: localhost
✅ Redis connected successfully
🚀 CEAS-LMS Backend Server running on port 5000 in development mode
```

---

## 5️⃣ Test the API (2 minutes)

### Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "CEAS-LMS Backend is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

### Get Dashboard Stats
```bash
curl http://localhost:5000/api/v1/dashboard/stats
```

### Register a Test User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "mobile": "9876543210",
    "password": "Test@1234",
    "role": "participant"
  }'
```

---

## 6️⃣ API Testing with Postman/Thunder Client

### Import Collection

Create a new collection with these endpoints:

#### 1. Register User
```
POST http://localhost:5000/api/v1/auth/register
Body (JSON):
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "mobile": "9876543210",
  "password": "Password@123"
}
```

#### 2. Verify OTP
```
POST http://localhost:5000/api/v1/auth/verify-otp
Body (JSON):
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

#### 3. Login
```
POST http://localhost:5000/api/v1/auth/login
Body (JSON):
{
  "emailOrMobile": "john@example.com",
  "password": "Password@123"
}
```

#### 4. Get Current User (Protected)
```
GET http://localhost:5000/api/v1/auth/me
Headers:
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 7️⃣ Create Admin User (Manual)

Since the first user needs admin approval, create an admin directly in MongoDB:

```bash
# Open MongoDB shell
mongosh

# Switch to database
use ceas-lms

# Create admin user
db.users.insertOne({
  firstName: "Admin",
  lastName: "User",
  email: "admin@ncui.in",
  mobile: "9999999999",
  password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEjqK", // Password@123
  role: "administrator",
  isApproved: true,
  isActive: true,
  isEmailVerified: true,
  isMobileVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

Now login with:
- Email: `admin@ncui.in`
- Password: `Password@123`

---

## 8️⃣ Common Issues & Solutions

### Issue: MongoDB Connection Failed
```
Solution:
1. Check if MongoDB is running: mongod --version
2. Verify connection string in .env
3. Check if port 27017 is available
```

### Issue: Redis Connection Failed
```
Solution:
1. Check if Redis is running: redis-cli ping
2. Should return: PONG
3. Verify REDIS_HOST and REDIS_PORT in .env
```

### Issue: Port 5000 Already in Use
```
Solution:
1. Change PORT in .env to 5001 or another port
2. Or kill the process using port 5000:
   - Windows: netstat -ano | findstr :5000
   - macOS/Linux: lsof -ti:5000 | xargs kill
```

### Issue: OTP Not Sending
```
Solution:
1. Check Twilio credentials in .env
2. For development, check console logs for OTP
3. OTP is logged in development mode
```

### Issue: Email Not Sending
```
Solution:
1. Check SMTP credentials
2. For Gmail, use App Password (not regular password)
3. Enable "Less secure app access" or use OAuth2
```

---

## 9️⃣ Development Workflow

### File Structure You'll Work With
```
src/
├── controllers/     # Add business logic here
├── routes/          # Define API endpoints here
├── models/          # Create database schemas here
├── middlewares/     # Add custom middlewares here
└── utils/           # Add utility functions here
```

### Adding a New Feature

1. **Create Model** (if needed)
```javascript
// src/models/Feature.model.js
import mongoose from 'mongoose';

const featureSchema = new mongoose.Schema({
  name: String,
  // ... other fields
});

export default mongoose.model('Feature', featureSchema);
```

2. **Create Controller**
```javascript
// src/controllers/feature.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';

export const getFeatures = asyncHandler(async (req, res) => {
  // Your logic here
  res.json({ success: true, data: [] });
});
```

3. **Create Routes**
```javascript
// src/routes/feature.routes.js
import express from 'express';
import { getFeatures } from '../controllers/feature.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();
router.get('/', protect, getFeatures);

export default router;
```

4. **Register Routes in server.js**
```javascript
import featureRoutes from './src/routes/feature.routes.js';
app.use(`${API_PREFIX}/features`, featureRoutes);
```

---

## 🔟 Next Steps

### For Development
1. ✅ Set up all external services (AWS, Twilio, Razorpay)
2. ✅ Implement remaining controller logic
3. ✅ Add input validation
4. ✅ Write unit tests
5. ✅ Set up CI/CD pipeline

### For Production
1. ✅ Use production MongoDB (MongoDB Atlas)
2. ✅ Use production Redis (AWS ElastiCache)
3. ✅ Set up load balancer
4. ✅ Configure CDN
5. ✅ Set up monitoring (New Relic/Datadog)
6. ✅ Enable HTTPS
7. ✅ Set up automated backups

---

## 📚 Useful Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start

# Run tests
npm test

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check outdated packages
npm outdated
```

---

## 🆘 Getting Help

### Documentation
- Main README: `README.md`
- Architecture: `ARCHITECTURE.md`
- API Docs: Check Postman collection

### Logs
- Combined logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console: Check terminal output

### Debug Mode
```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm run dev
```

---

## ✅ Verification Checklist

Before considering setup complete:

- [ ] MongoDB connected successfully
- [ ] Redis connected successfully
- [ ] Server running on specified port
- [ ] Health check endpoint working
- [ ] Can register a new user
- [ ] Can login with credentials
- [ ] JWT token generated correctly
- [ ] Protected routes require authentication
- [ ] Dashboard stats endpoint working

---

**You're all set! Start building amazing features! 🚀**

For questions or issues, refer to the main README.md or ARCHITECTURE.md files.
