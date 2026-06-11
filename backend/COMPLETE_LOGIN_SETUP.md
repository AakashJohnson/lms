# 🎯 Complete Login Setup - Student, Trainer, Admin

## 📋 Overview

Aapko 3 steps follow karne hain:
1. ✅ MongoDB Atlas setup (5 min)
2. ✅ Test users create (1 min)
3. ✅ Login test (1 min)

**Total Time: 7 minutes** ⏱️

---

## Step 1: MongoDB Atlas Setup (5 minutes)

### Quick Steps:

1. **Sign up**: https://www.mongodb.com/cloud/atlas/register
   - Use Google account (fastest)

2. **Create Free Cluster**:
   - Choose "M0 FREE"
   - Region: Mumbai (India) or closest
   - Click "Create"
   - Wait 3-5 minutes

3. **Create Database User**:
   - Go to "Database Access"
   - Add user: `ceas-admin`
   - Auto-generate password
   - **COPY PASSWORD!** Example: `<password>`

4. **Allow Network Access**:
   - Go to "Network Access"
   - Add IP: "Allow from Anywhere" (0.0.0.0/0)

5. **Get Connection String**:
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy string:
     ```
     mongodb+srv://ceas-admin:<password>@cluster0.xxxxx.mongodb.net/
     ```

6. **Update .env**:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```
   
   Replace:
   - `<password>` with your actual password
   - `cluster0.xxxxx` with your cluster name
   - Add `/ceas-lms` before `?`

**Detailed guide**: See `MONGODB_SETUP_GUIDE.md`

---

## Step 2: Create Test Users (1 minute)

### Option A: Automatic (Recommended) ✅

```bash
# Run the script
node create-test-users.js
```

**Output:**
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

📝 Login Credentials:

┌─────────────┬──────────────────┬────────────┬─────────────┐
│ Role        │ Email            │ Mobile     │ Password    │
├─────────────┼──────────────────┼────────────┼─────────────┤
│ Admin       │ admin@ncui.in    │ 9999999999 │ Admin@123   │
│ Trainer     │ trainer@ncui.in  │ 8888888888 │ Trainer@123 │
│ Student     │ student@ncui.in  │ 7777777777 │ Student@123 │
└─────────────┴──────────────────┴────────────┴─────────────┘
```

### Option B: Manual (MongoDB Compass)

See `LOGIN_GUIDE.md` for manual creation steps.

---

## Step 3: Start Server & Login (1 minute)

### Start Full Server:

```bash
# Stop test server if running (Ctrl+C)

# Start full server with MongoDB
npm run dev
```

**Expected Output:**
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
📦 Database: ceas-lms
🚀 CEAS-LMS Backend Server running on port 5000
```

---

## 🔐 Login Testing

### Test 1: Admin Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "admin@ncui.in",
    "password": "Admin@123"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWE...",
  "user": {
    "_id": "675a1b2c3d4e5f6g7h8i9j0k",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "mobile": "9999999999",
    "role": "administrator",
    "isApproved": true
  }
}
```

**Copy the token!** You'll need it for authenticated requests.

### Test 2: Trainer Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "trainer@ncui.in",
    "password": "Trainer@123"
  }'
```

### Test 3: Student Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrMobile": "student@ncui.in",
    "password": "Student@123"
  }'
```

### Test 4: Get Current User (Authenticated)

```bash
# Replace YOUR_TOKEN with actual token from login response
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Quick Reference

### Test Users:

| Role | Email | Mobile | Password |
|------|-------|--------|----------|
| **Admin** | admin@ncui.in | 9999999999 | Admin@123 |
| **Trainer** | trainer@ncui.in | 8888888888 | Trainer@123 |
| **Student** | student@ncui.in | 7777777777 | Student@123 |

### Login Endpoints:

```bash
# Password Login
POST /api/v1/auth/login
Body: { "emailOrMobile": "email", "password": "pass" }

# OTP Login (Step 1)
POST /api/v1/auth/login-otp
Body: { "mobile": "9999999999" }

# OTP Login (Step 2)
POST /api/v1/auth/verify-login-otp
Body: { "mobile": "9999999999", "otp": "123456" }

# Get Current User
GET /api/v1/auth/me
Header: Authorization: Bearer <token>

# Logout
POST /api/v1/auth/logout
Header: Authorization: Bearer <token>
```

---

## 🧪 Using Postman

### Import Collection:

1. **Create New Collection**: "NCUI CEAS LMS"

2. **Add Environment**:
   - Variable: `baseUrl`
   - Value: `http://localhost:5000/api/v1`
   - Variable: `token`
   - Value: (empty, will be set after login)

3. **Add Requests**:

#### Login Request:
- **Name**: Login
- **Method**: POST
- **URL**: `{{baseUrl}}/auth/login`
- **Body** (JSON):
  ```json
  {
    "emailOrMobile": "admin@ncui.in",
    "password": "Admin@123"
  }
  ```
- **Tests** (to auto-save token):
  ```javascript
  if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.token);
    console.log("Token saved:", response.token);
  }
  ```

#### Get Me Request:
- **Name**: Get Current User
- **Method**: GET
- **URL**: `{{baseUrl}}/auth/me`
- **Headers**:
  - Key: `Authorization`
  - Value: `Bearer {{token}}`

---

## 🔧 Troubleshooting

### Error: "Cannot connect to MongoDB"
```bash
# Check .env file
cat .env | grep MONGODB_URI

# Test connection
node create-test-users.js
```

### Error: "User already exists"
```bash
# Delete existing users
node create-test-users.js
# (Script automatically deletes and recreates)
```

### Error: "Your account is pending approval"
```bash
# Run create-test-users.js again
# It creates pre-approved users
node create-test-users.js
```

### Error: "Invalid credentials"
- Check email/password spelling
- Passwords are case-sensitive
- Use exact credentials from table above

---

## ✅ Success Checklist

- [ ] MongoDB Atlas account created
- [ ] Connection string updated in .env
- [ ] Test users created (run `create-test-users.js`)
- [ ] Server running (`npm run dev`)
- [ ] Admin login successful
- [ ] Trainer login successful
- [ ] Student login successful
- [ ] Token received and saved
- [ ] Authenticated endpoint tested (`/auth/me`)

---

## 🎉 You're Ready!

Ab aap:
- ✅ Admin ke tarah login kar sakte ho
- ✅ Trainer ke tarah login kar sakte ho
- ✅ Student ke tarah login kar sakte ho
- ✅ Authenticated APIs use kar sakte ho
- ✅ Dashboard access kar sakte ho

**Next Steps**:
1. Test different user roles
2. Create courses (as Trainer/Admin)
3. Enroll in courses (as Student)
4. Explore all APIs

---

## 📚 Additional Resources

- **Complete API Reference**: `API_ENDPOINTS.md`
- **MongoDB Setup**: `MONGODB_SETUP_GUIDE.md`
- **Detailed Login Guide**: `LOGIN_GUIDE.md`
- **Troubleshooting**: `TROUBLESHOOTING.md`

---

**Happy Testing! 🚀**
