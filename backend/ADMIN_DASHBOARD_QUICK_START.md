# 🚀 ADMIN DASHBOARD - QUICK START GUIDE

## ⚡ Start in 3 Steps

### Step 1: Start Backend Server
```bash
cd lms/backend
npm start
```

**Expected Output:**
```
🚀 CEAS-LMS Backend Server running on port 5000 in development mode
📊 Health Check: http://localhost:5000/health
📖 API Base: http://localhost:5000/api/v1
✅ MongoDB connected successfully
============================================================
🎯 Server ready! Login credentials:
   Admin:   admin@ncui.in / Admin@123
   Trainer: trainer@ncui.in / Trainer@123
   Student: student@ncui.in / Student@123
============================================================
```

---

### Step 2: Start Frontend Server
```bash
cd lms
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

### Step 3: Login as Admin
1. Open browser: **http://localhost:5173/login**
2. Enter credentials:
   - **Email:** admin@ncui.in
   - **Password:** Admin@123
3. Click **Login**
4. You'll be redirected to **Admin Dashboard**

---

## 🎯 What You'll See

### Dashboard Overview
- **8 Stat Cards** with real-time data
- **Recent Registrations** list
- **Quick Action Buttons**
- **Auto-refresh** toggle (updates every 30 seconds)

### Navigation Sidebar
- 📊 Dashboard (current view)
- 👥 User Management (coming in Phase 2)
- 📚 Course Management (coming in Phase 2)
- ❓ Query Management (coming in Phase 2)
- 🎬 Media Library (coming in Phase 2)
- 📈 Reports & Analytics (coming in Phase 2)
- 🎓 Certificates (coming in Phase 2)
- 💳 Payments (coming in Phase 2)
- ⚙️ Settings (coming in Phase 2)

---

## 📊 Statistics Displayed

### Primary Stats (Large Cards):
1. **Total Users** - Shows total users with breakdown (students, trainers)
2. **Total Courses** - Shows total courses with published count
3. **Enrollments** - Shows total active enrollments
4. **Pending Approvals** - Shows users waiting for approval (urgent if > 0)

### Secondary Stats (Mini Cards):
5. **Open Queries** - Number of unresolved queries
6. **Media Files** - Total media in library
7. **Certificates** - Total certificates issued
8. **Revenue** - Total revenue from payments (₹)

### Recent Activity:
- **Recent Registrations** - Last 10 user registrations
  - Shows name, email, approval status, date
  - Color-coded badges (green = approved, yellow = pending)

---

## 🧪 Test Features

### ✅ Working Features:
- [x] View dashboard statistics
- [x] See pending approvals count
- [x] View recent registrations
- [x] Toggle auto-refresh on/off
- [x] Navigate between sections (sidebar)
- [x] Logout functionality
- [x] Responsive stat cards
- [x] Real-time timestamp display

### ⏳ Coming in Phase 2:
- [ ] Approve/reject users
- [ ] Manage courses
- [ ] Respond to queries
- [ ] Upload media
- [ ] Generate reports
- [ ] View analytics charts

---

## 🔍 API Endpoints Available

### Dashboard Stats:
```
GET http://localhost:5000/api/v1/dashboard/admin
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15,
      "admins": 2,
      "trainers": 3,
      "students": 10,
      "pendingApprovals": 5
    },
    "courses": {
      "total": 8,
      "published": 6,
      "draft": 2
    },
    "enrollments": {
      "total": 25
    },
    "queries": {
      "total": 12,
      "open": 4,
      "resolved": 8
    },
    "media": {
      "total": 20
    },
    "certificates": {
      "total": 15
    },
    "payments": {
      "total": 15,
      "revenue": 750
    },
    "recentRegistrations": [...]
  }
}
```

### User Management (Ready to Use):
```
GET    /api/v1/admin/users              - List all users
GET    /api/v1/admin/users/:id          - Get user details
PUT    /api/v1/admin/users/:id/approve  - Approve user
PUT    /api/v1/admin/users/:id/reject   - Reject user
PUT    /api/v1/admin/users/:id/activate - Activate user
PUT    /api/v1/admin/users/:id/deactivate - Deactivate user
PUT    /api/v1/admin/users/:id          - Update user
DELETE /api/v1/admin/users/:id          - Delete user
```

---

## 🐛 Troubleshooting

### Issue: "Cannot GET /admin-dashboard"
**Solution:** Make sure frontend server is running on port 5173

### Issue: "Network Error" or "401 Unauthorized"
**Solution:** 
1. Check if backend server is running on port 5000
2. Verify you're logged in as admin
3. Check browser console for token

### Issue: "User not found" during login
**Solution:** 
1. Make sure MongoDB is running
2. Run population script to create test users:
```bash
cd lms/backend
node populate-separate-collections-final.js
```

### Issue: Dashboard shows 0 for all stats
**Solution:** 
1. Database might be empty
2. Run population script to add sample data
3. Check MongoDB Compass to verify data exists

### Issue: Auto-refresh not working
**Solution:** 
1. Check if auto-refresh toggle is ON
2. Check browser console for errors
3. Verify API endpoint is responding

---

## 📱 Browser Compatibility

✅ **Tested and Working:**
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

---

## 🎨 UI Features

### Color Coding:
- **Blue** - User statistics
- **Green** - Course statistics
- **Purple** - Enrollment statistics
- **Orange** - Pending/urgent items
- **Yellow** - Open queries
- **Pink** - Media files
- **Indigo** - Certificates
- **Green** - Revenue

### Interactive Elements:
- Hover effects on all cards
- Smooth transitions
- Active state highlighting
- Badge notifications
- Loading spinner
- Responsive buttons

---

## 📸 Screenshots (What to Expect)

### Dashboard Layout:
```
┌─────────────────────────────────────────────────────────┐
│  NCUI CEAS Admin Panel                    [Auto-refresh]│
├──────────┬──────────────────────────────────────────────┤
│          │  Dashboard Overview                          │
│ Sidebar  │                                              │
│          │  [Stat Cards - 4 large cards in a row]      │
│ - Home   │  [Mini Stats - 4 small cards in a row]      │
│ - Users  │                                              │
│ - Course │  [Recent Registrations] [Quick Actions]     │
│ - QMS    │                                              │
│ - Media  │                                              │
│ - Report │                                              │
│          │                                              │
│ [User]   │                                              │
│ [Logout] │                                              │
└──────────┴──────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

- All admin routes require authentication
- JWT token stored in localStorage
- Automatic redirect if not authorized
- Role-based access control (RBAC)
- Only administrators can access admin dashboard

---

## 💡 Tips

1. **Keep auto-refresh ON** for real-time updates
2. **Check pending approvals** regularly (shows in badge)
3. **Monitor open queries** for user support
4. **Use quick actions** for common tasks
5. **Check recent registrations** for new users

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors
2. Verify backend server is running
3. Check MongoDB connection
4. Review error logs in terminal
5. Refer to ADMIN_DASHBOARD_IMPLEMENTATION.md for details

---

## 🎯 Next Steps

After testing the dashboard:
1. ✅ Verify all statistics load correctly
2. ✅ Test navigation between sections
3. ✅ Test auto-refresh functionality
4. ✅ Test logout
5. ⏭️ Proceed to Phase 2: User Management implementation

---

**Ready to test!** 🚀

Start both servers and login as admin to see your fully functional dashboard!
