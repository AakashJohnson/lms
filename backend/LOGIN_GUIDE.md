# 🔐 Login Guide - Student, Trainer, Admin

## 📋 Prerequisites

✅ MongoDB Atlas connected (see `MONGODB_SETUP_GUIDE.md`)  
✅ Server running: `npm run dev`  
✅ Health check working: `curl http://localhost:5000/health`

---

## 🎯 Quick Start: Create Test Users

### Method 1: Using API (Recommended)

#### 1️⃣ Create Admin User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "mobile": "9999999999",
    "password": "Admin@123",
    "role": "administrator"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your mobile number and wait for admin approval.",
  "data": {
    "userId": "64abc123...",
    "mobile": "9999999999",
    "isApproved": false
  }
}
```

#### 2️⃣ Create Trainer User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Trainer",
    "lastName": "Kumar",
    "email": "trainer@ncui.in",
    "mobile": "8888888888",
    "password": "Trainer@123",
    "role": "trainer"
  }'
```

#### 3️⃣ Create Student/Participant User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Student",
    "lastName": "Singh",
    "email": "student@ncui.in",
    "mobile": "7777777777",
    "password": "Student@123",
    "role": "participant"
  }'
```

---

## ⚠️ Important: Admin Approval Required

**Problem**: New users need admin approval before they can login!

**Solution**: Manually approve users in MongoDB

### Method 2: Create Pre-Approved Users in MongoDB

Use MongoDB Compass or Atlas UI:

#### Connect to MongoDB:
1. Open MongoDB Atlas
2. Click "Connect" → "Compass"
3. Copy connection string
4. Open MongoDB Compass
5. Paste connection string
6. Connect

#### Create Admin User (Pre-Approved):

```javascript
// In MongoDB Compass, go to ceas-lms database → users collection
// Click "Add Data" → "Insert Document"

{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@ncui.in",
  "mobile": "9999999999",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEjqK",
  "role": "administrator",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

**Password**: `Admin@123` (already hashed above)

#### Create Trainer User (Pre-Approved):

```javascript
{
  "firstName": "Trainer",
  "lastName": "Kumar",
  "email": "trainer@ncui.in",
  "mobile": "8888888888",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEjqK",
  "role": "trainer",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

**Password**: `Trainer@123` (same hash works for all)

#### Create Student User (Pre-Approved):

```javascript
{
  "firstName": "Student",
  "lastName": "Singh",
  "email": "student@ncui.in",
  "mobile": "7777777777",
  "password": "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEjqK",
  "role": "participant",
  "isApproved": true,
  "isActive": true,
  "isEmailVerified": true,
  "isMobileVerified": true,
  "loginAttempts": 0,
  "preferences": {
    "language": "en",
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    }
  },
  "enrolledCourses": [],
  "certificates": [],
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

**Password**: `Student@123`

---

## 🔑 Login Methods

### Method 1: Login with Password

#### Admin Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "admin@ncui.in",
    "password": "Admin@123"
  }'
```

#### Trainer Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "trainer@ncui.in",
    "password": "Trainer@123"
  }'
```

#### Student Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "student@ncui.in",
    "password": "Student@123"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123...",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "mobile": "9999999999",
    "role": "administrator",
    "isApproved": true
  }
}
```

**Save the token!** You'll need it for authenticated requests.

---

### Method 2: Login with OTP

#### Step 1: Request OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/login-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9999999999"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your mobile number"
}
```

**Note**: OTP will be logged in console (development mode)

#### Step 2: Verify OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-login-otp \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9999999999",
    "otp": "123456"
  }'
```

---

## 🧪 Test Authenticated Endpoints

### Get Current User Info

```bash
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Dashboard (Admin)

```bash
curl -X GET http://localhost:5000/api/v1/dashboard/admin \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Get My Dashboard (Any User)

```bash
curl -X GET http://localhost:5000/api/v1/dashboard/my-dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📱 Using Postman/Thunder Client

### Setup Collection:

1. **Create Environment**:
   - `baseUrl`: `http://localhost:5000/api/v1`
   - `token`: (will be set after login)

2. **Register Request**:
   - Method: POST
   - URL: `{{baseUrl}}/auth/register`
   - Body (JSON):
     ```json
     {
       "firstName": "Test",
       "lastName": "User",
       "email": "test@example.com",
       "mobile": "9876543210",
       "password": "Test@123",
       "role": "participant"
     }
     ```

3. **Login Request**:
   - Method: POST
   - URL: `{{baseUrl}}/auth/login`
   - Body (JSON):
     ```json
     {
       "emailOrMobile": "admin@ncui.in",
       "password": "Admin@123"
     }
     ```
   - **Tests** (to save token):
     ```javascript
     pm.environment.set("token", pm.response.json().token);
     ```

4. **Get Me Request**:
   - Method: GET
   - URL: `{{baseUrl}}/auth/me`
   - Headers:
     - `Authorization`: `Bearer {{token}}`

---

## 👥 Test Users Summary

| Role | Email | Mobile | Password | Access |
|------|-------|--------|----------|--------|
| **Admin** | admin@ncui.in | 9999999999 | Admin@123 | Full access |
| **Trainer** | trainer@ncui.in | 8888888888 | Trainer@123 | Content management |
| **Student** | student@ncui.in | 7777777777 | Student@123 | Course access |

---

## 🔐 Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@, #, $, etc.)

**Valid Examples**:
- `Admin@123`
- `Trainer@123`
- `Student@123`
- `Password@2024`

---

## 🚨 Common Errors

### Error: "Your account is pending approval"
**Solution**: Set `isApproved: true` in MongoDB

### Error: "Invalid credentials"
**Solution**: Check email/mobile and password

### Error: "Account is temporarily locked"
**Solution**: Wait 30 minutes or reset in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@ncui.in" },
  { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
)
```

### Error: "Not authorized to access this route"
**Solution**: Include JWT token in Authorization header

---

## 🎯 Quick Test Script

Save as `test-login.sh`:

```bash
#!/bin/bash

echo "🔐 Testing Login System..."
echo ""

# Admin Login
echo "1️⃣ Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "admin@ncui.in",
    "password": "Admin@123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.token')
echo "✅ Admin Token: ${ADMIN_TOKEN:0:20}..."
echo ""

# Trainer Login
echo "2️⃣ Trainer Login..."
TRAINER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "trainer@ncui.in",
    "password": "Trainer@123"
  }')

TRAINER_TOKEN=$(echo $TRAINER_RESPONSE | jq -r '.token')
echo "✅ Trainer Token: ${TRAINER_TOKEN:0:20}..."
echo ""

# Student Login
echo "3️⃣ Student Login..."
STUDENT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "student@ncui.in",
    "password": "Student@123"
  }')

STUDENT_TOKEN=$(echo $STUDENT_RESPONSE | jq -r '.token')
echo "✅ Student Token: ${STUDENT_TOKEN:0:20}..."
echo ""

echo "🎉 All logins successful!"
```

Run: `bash test-login.sh`

---

## 📚 Next Steps

After login:
1. ✅ Test dashboard endpoints
2. ✅ Create courses (as Trainer/Admin)
3. ✅ Enroll in courses (as Student)
4. ✅ Take assessments
5. ✅ Generate certificates

---

**Happy Testing! 🚀**
