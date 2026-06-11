# 🚀 Database Populate करें - Simple Method

## ✅ Ye Script Kya Karega:

1. Local MongoDB se connect karega
2. Purane collections delete karega
3. Correct password hashes generate karega
4. `users` collection create karega
5. 15 users insert karega (2 admins, 3 trainers, 10 students)
6. Indexes create karega

---

## 🎯 Ek Command Mein Ho Jayega:

### Terminal mein run karein:

```bash
cd lms/backend
node populate-local-db.js
```

---

## ✅ Success Output:

```
🔌 Connecting to local MongoDB...
✅ Connected to MongoDB!

🧹 Cleaning old data...
   Dropped: users
   Dropped: admins
   Dropped: trainers
   Dropped: students
✅ Old data cleaned!

🔐 Generating password hashes...
✅ Password hashes generated!

👥 Creating users collection...
✅ Inserted 15 users!

⚡ Creating indexes...
✅ Indexes created!

============================================================
🎉 Database Population Complete!
============================================================

📊 Summary:
   Total Users: 15
   Administrators: 2
   Trainers: 3
   Participants: 10

📋 Login Credentials:

👑 ADMINS:
   admin@ncui.in / Admin@123
   superadmin@ncui.in / Admin@123

👨‍🏫 TRAINERS:
   trainer@ncui.in / Trainer@123
   rajesh.trainer@ncui.in / Trainer@123
   priya.trainer@ncui.in / Trainer@123

👨‍🎓 STUDENTS (Approved - 8):
   student@ncui.in / Student@123
   priya.student@ncui.in / Student@123
   rahul@ncui.in / Student@123
   sneha@ncui.in / Student@123
   vikram@ncui.in / Student@123
   anjali@ncui.in / Student@123
   karan@ncui.in / Student@123
   divya@ncui.in / Student@123

👨‍🎓 STUDENTS (Pending - 2):
   amit.student@ncui.in / Student@123
   arjun@ncui.in / Student@123

🚀 Next Steps:
   1. Backend is already running
   2. Test login: http://localhost:5173/login
   3. Use any credential above
   4. Enjoy! 🎉

✅ Connection closed. Done!
```

---

## 🧪 Login Test Karein:

### Browser mein:
```
http://localhost:5173/login
Email: admin@ncui.in
Password: Admin@123
```

**Dashboard khul jayega!** ✅

### Ya Terminal mein:
```bash
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\":\"admin@ncui.in\",\"password\":\"Admin@123\"}"
```

**JWT token milega!** ✅

---

## 📊 Kya Create Hoga:

### Database: `ceas-lms`

### Collection: `users` (15 documents)
```
├── Administrators (2)
│   ├── admin@ncui.in
│   └── superadmin@ncui.in
│
├── Trainers (3)
│   ├── trainer@ncui.in
│   ├── rajesh.trainer@ncui.in
│   └── priya.trainer@ncui.in
│
└── Participants (10)
    ├── student@ncui.in (Approved)
    ├── priya.student@ncui.in (Approved)
    ├── rahul@ncui.in (Approved)
    ├── sneha@ncui.in (Approved)
    ├── vikram@ncui.in (Approved)
    ├── anjali@ncui.in (Approved)
    ├── karan@ncui.in (Approved)
    ├── divya@ncui.in (Approved)
    ├── amit.student@ncui.in (Pending)
    └── arjun@ncui.in (Pending)
```

### Indexes:
- `email` (unique)
- `mobile` (unique)
- `role`

---

## 🔍 Verify Karein:

### MongoDB Compass mein:
```
1. Refresh करें
2. ceas-lms database खोलें
3. users collection देखें
4. 15 documents होने चाहिए
```

### Terminal mein:
```bash
# Backend health check
curl http://localhost:5000/health

# Login test
curl.exe -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"emailOrMobile\":\"admin@ncui.in\",\"password\":\"Admin@123\"}"
```

---

## ⏱️ Time Required:

- Script run: 5-10 seconds
- Verification: 30 seconds
- Login test: 30 seconds

**Total: ~1 minute! 🚀**

---

## 🆘 Agar Error Aaye:

### Error: "Cannot connect to MongoDB"
```bash
# Check MongoDB service
Get-Service MongoDB

# Should show: Status = Running
# If not, start it:
Start-Service MongoDB
```

### Error: "Port already in use"
```bash
# Backend already running hai, no problem!
# Script sirf database populate karega
```

### Error: "Collection already exists"
```bash
# Script automatically purane collections delete kar dega
# No manual action needed
```

---

## 💡 Kya Special Hai Is Script Mein:

1. **Correct Password Hashes**: Real-time bcrypt hash generate karta hai
2. **Clean Start**: Purane data automatically delete karta hai
3. **Proper Indexes**: Performance ke liye indexes create karta hai
4. **No Manual Work**: Ek command, sab kuch ho jata hai
5. **Safe**: Local database pe kaam karta hai, production safe hai

---

## 🎯 Success Checklist:

Script run karne ke baad:

- [x] MongoDB connected
- [x] Old collections dropped
- [x] Password hashes generated
- [x] Users collection created
- [x] 15 users inserted
- [x] Indexes created
- [x] Login working
- [x] Dashboard loading

---

## 🎊 Ye Ho Jayega:

- ✅ Complete database setup
- ✅ Working login system
- ✅ All 3 roles ready
- ✅ Correct password hashes
- ✅ Proper indexes
- ✅ Ready to use!

---

**Bas ek command: `node populate-local-db.js` 🚀**
