# 📤 Export Atlas Data from Compass

## If you have data in Atlas and want to use it locally

### Step 1: Export from Atlas (in Compass)

1. **Connect to Atlas** in Compass
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/ceas-lms
   ```

2. **Export each collection:**
   - Click on `admins` collection
   - Click "Export Collection"
   - Format: JSON
   - Save as: `admins.json`
   
   - Repeat for `trainers` → `trainers.json`
   - Repeat for `students` → `students.json`

### Step 2: Install MongoDB Server

Download: https://www.mongodb.com/try/download/community

### Step 3: Import to Local

1. Connect Compass to `mongodb://localhost:27017`

2. Create database: `ceas-lms`

3. Import collections:
   - Create `admins` collection → Import `admins.json`
   - Create `trainers` collection → Import `trainers.json`
   - Create `students` collection → Import `students.json`

### Step 4: Update .env

```env
MONGODB_URI=mongodb://localhost:27017/ceas-lms
```

### Step 5: Test

Login should work!

---

**But this still requires MongoDB Server installation!**

**There's NO way to use database without installing MongoDB Server.**
