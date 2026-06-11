# 🚀 Quick Test - Login with Separate Collections

## ✅ System Ready:

```
✅ Separate Collections: admins, trainers, students
✅ Backend Running: localhost:5000
✅ Login Working: All 3 roles
```

---

## 🧪 Test Login (Browser):

### Open:
```
http://localhost:5173/login
```

### Try These Credentials:

**👑 Admin:**
```
Email: admin@ncui.in
Password: Admin@123
```

**👨‍🏫 Trainer:**
```
Email: trainer@ncui.in
Password: Trainer@123
```

**👨‍🎓 Student:**
```
Email: student@ncui.in
Password: Student@123
```

---

## 🧪 Test Login (Terminal):

### Admin:
```bash
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\":\"admin@ncui.in\",\"password\":\"Admin@123\"}"
```

### Trainer:
```bash
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\":\"trainer@ncui.in\",\"password\":\"Trainer@123\"}"
```

### Student:
```bash
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\":\"student@ncui.in\",\"password\":\"Student@123\"}"
```

---

## ✅ Expected Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@ncui.in",
    "mobile": "9999999999",
    "role": "administrator",
    "isApproved": true
  }
}
```

---

## 📊 Verify in MongoDB Compass:

```
1. Open MongoDB Compass
2. Connect to: mongodb://localhost:27017
3. Open database: ceas-lms
4. Check collections:
   - admins (2 documents)
   - trainers (3 documents)
   - students (10 documents)
```

---

## 🔧 If Need to Re-populate:

```bash
cd lms/backend
node populate-separate-collections-final.js
npm run dev
```

---

**All working! 🎉**
