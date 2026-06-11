# 🎯 Fix Login - Do This Now

## ❌ Problem:
**"Invalid credentials"** error

## 🔍 Why:
Wrong collection names!
- You created: `admins`, `trainers`, `students` ❌
- Backend needs: `users` ✅

---

## ✅ Solution (1 minute):

### 1. Open MongoDB Compass Mongosh
```
Click ">_MONGOSH" tab at bottom
```

### 2. Paste Correct Script
```
1. Open: POPULATE_USERS_COLLECTION.txt
2. Ctrl+A (select all)
3. Ctrl+C (copy)
4. Ctrl+V (paste in Mongosh)
5. Enter
```

### 3. Wait for Success
```
🎉 Database Population Complete!
Total Users: 15
```

---

## 🧪 Test Login:

```
http://localhost:5173/login
Email: admin@ncui.in
Password: Admin@123
```

**Should work now!** ✅

---

## 📊 What This Does:

- ❌ Deletes: `admins`, `trainers`, `students` collections
- ✅ Creates: `users` collection with all 15 users
- ✅ Sets correct roles: administrator, trainer, participant

---

## ⏱️ Time: 1 minute

## 📚 Details: `FIX_INVALID_CREDENTIALS.md`

---

**Fix it now! 🚀**
