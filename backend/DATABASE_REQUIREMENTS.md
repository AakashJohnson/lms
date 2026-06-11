# 📊 Complete Database Population Requirements

## ✅ Current Models Analysis

### Existing Models (6):
1. ✅ **User.model.js** - Users with roles
2. ✅ **Course.model.js** - Courses with modules
3. ✅ **Assessment.model.js** - Quizzes/Tests
4. ✅ **AssessmentAttempt.model.js** - Student attempts
5. ✅ **Certificate.model.js** - Certificates
6. ✅ **Payment.model.js** - Payment transactions

---

## 🗂️ Collections to Populate

### 1. **Users Collection** (या Separate: admins, trainers, students)
**Status:** ✅ Ready to populate

**Required Data:**
- ✅ 2 Admins (admin, superadmin)
- ✅ 2-3 Trainers (with specializations)
- ✅ 5-10 Students (some approved, some pending)

**Fields to populate:**
```javascript
{
  firstName, lastName, email, mobile, password,
  role, organization, designation,
  isApproved, isActive,
  preferences: { language, notifications },
  enrolledCourses: [], // Will be populated after enrollment
  certificates: [] // Will be populated after completion
}
```

---

### 2. **Courses Collection**
**Status:** ✅ Ready to populate

**Required Data:**
- ✅ 3-5 Courses (different categories)
- ✅ Each with 2-3 modules
- ✅ Each module with 3-5 topics
- ✅ Different content types (video, pdf, ppt)

**Categories to cover:**
- cooperative-management
- financial-literacy
- digital-skills
- leadership
- marketing

**Fields to populate:**
```javascript
{
  title, slug, description,
  category, level, language,
  thumbnail, instructor,
  modules: [
    {
      title, order, duration,
      topics: [
        { title, contentType, contentUrl, duration, isDownloadable: false }
      ]
    }
  ],
  isPublished: true,
  enrollmentType: 'open',
  certificateEligibility: { minCompletionPercentage: 80, minAssessmentScore: 60 },
  pricing: { isFree: true },
  batches: [{ batchName, startDate, endDate }]
}
```

---

### 3. **Assessments Collection**
**Status:** ✅ Ready to populate

**Required Data:**
- ✅ 1-2 assessments per course
- ✅ 5-10 questions per assessment
- ✅ Mix of MCQ, True/False
- ✅ Auto-numbering enabled

**Fields to populate:**
```javascript
{
  title, description, course,
  assessmentType: 'quiz',
  questions: [
    {
      questionNumber: 1, // Auto-numbered
      questionText,
      questionType: 'mcq-single',
      options: [
        { optionNumber: 1, optionText, isCorrect, isDeleted: false }
      ],
      marks, difficulty
    }
  ],
  totalMarks, passingMarks, duration,
  attemptsAllowed: 3,
  isPublished: true
}
```

---

### 4. **AssessmentAttempts Collection**
**Status:** ⏳ Populate after students enroll

**Required Data:**
- Sample attempts by students
- Some passed, some failed
- Some in-progress

**When to populate:**
- After users and assessments are created
- Simulate student attempts

---

### 5. **Certificates Collection**
**Status:** ⏳ Populate after course completion

**Required Data:**
- Certificates for completed courses
- Some paid, some unpaid
- QR codes and verification URLs

**When to populate:**
- After students complete courses
- After assessment attempts

**Fields to populate:**
```javascript
{
  certificateNumber: 'NCUI-CEAS-202401-12345',
  user, course,
  userName, courseName,
  issueDate, completionDate,
  grade, score,
  qrCode, verificationUrl,
  isPaid: false, // Initially
  isActive: true
}
```

---

### 6. **Payments Collection**
**Status:** ⏳ Populate after certificates

**Required Data:**
- Payment records for certificates
- Some completed, some pending
- Rs. 50 per certificate

**Fields to populate:**
```javascript
{
  user, certificate,
  orderId: 'ORD-timestamp-random',
  amount: 5000, // Rs. 50 in paise
  currency: 'INR',
  purpose: 'certificate',
  status: 'completed' or 'pending',
  paymentMethod: 'upi',
  transactionDate
}
```

---

## 🚀 Recommended Population Order

### Phase 1: Basic Setup ✅
```
1. Users (or admins, trainers, students)
2. Courses (with modules and topics)
3. Assessments (linked to courses)
```

### Phase 2: Student Activity ⏳
```
4. Enroll students in courses
   - Update user.enrolledCourses
   - Update course.currentEnrollments
   
5. Create assessment attempts
   - Students take quizzes
   - Some pass, some fail
   
6. Update course progress
   - user.enrolledCourses[].progress
   - user.enrolledCourses[].status
```

### Phase 3: Completion & Certification ⏳
```
7. Generate certificates
   - For students who completed courses
   - With QR codes
   
8. Create payment records
   - For certificate downloads
   - Some paid, some pending
```

---

## 📋 Minimum Required Data

### For Testing & Development:

**Users:**
- 2 Admins
- 2 Trainers
- 5 Students (3 approved, 2 pending)

**Courses:**
- 3 Courses (beginner, intermediate, advanced)
- Each with 2 modules
- Each module with 3 topics

**Assessments:**
- 1 assessment per course (3 total)
- 5 questions each

**Student Activity:**
- 3 students enrolled in Course 1
- 2 students enrolled in Course 2
- 1 student enrolled in Course 3
- 2 assessment attempts (1 passed, 1 failed)

**Certificates:**
- 1 certificate (for passed student)
- Unpaid initially

**Payments:**
- 1 payment record (pending)

---

## 🎯 What's Already Done

✅ **Phase 1 Scripts Created:**
- `populate-separate-collections.js` - Creates admins, trainers, students, 1 course, 1 assessment
- `compass-atlas-populate.js` - Creates users, 1 course, 1 assessment

---

## 🔧 What Needs to be Added

### Missing Collections/Data:

1. **More Courses** (currently only 1)
   - Need 2-3 more courses
   - Different categories
   - Different levels

2. **More Assessments** (currently only 1)
   - 1 assessment per course
   - More questions

3. **Student Enrollments** (currently none)
   - Enroll students in courses
   - Set initial progress

4. **Assessment Attempts** (currently none)
   - Students taking quizzes
   - Scores and results

5. **Certificates** (currently none)
   - For completed courses
   - With QR codes

6. **Payments** (currently none)
   - For certificate downloads
   - Payment records

---

## 📝 Additional Models Needed (Future)

Based on requirements, these models might be needed:

### 7. **LiveSession.model.js** ⏳
```javascript
{
  title, course, instructor,
  scheduledAt, duration,
  meetingLink, meetingId,
  platform: 'zoom' | 'webex' | 'google-meet',
  attendees: [{ user, joinedAt, leftAt, duration }],
  recording: { url, duration },
  status: 'scheduled' | 'live' | 'completed'
}
```

### 8. **Query.model.js** (QMS) ⏳
```javascript
{
  user, course,
  title, description,
  category, priority,
  status: 'open' | 'answered' | 'closed',
  responses: [{ user, message, createdAt }],
  assignedTo, resolvedAt
}
```

### 9. **Media.model.js** (Media Library) ⏳
```javascript
{
  title, description,
  mediaType: 'video' | 'audio' | 'document',
  url, thumbnailUrl,
  duration, fileSize,
  category, tags,
  uploadedBy, isPublic
}
```

### 10. **Notification.model.js** ⏳
```javascript
{
  user, title, message,
  type: 'email' | 'sms' | 'push',
  status: 'pending' | 'sent' | 'failed',
  sentAt, readAt
}
```

### 11. **Attendance.model.js** (Biometric) ⏳
```javascript
{
  user, liveSession,
  checkInTime, checkOutTime,
  biometricData, location,
  status: 'present' | 'absent' | 'late'
}
```

---

## 🎯 Immediate Action Items

### For Current Development:

1. ✅ **Populate Basic Data** (Done)
   - Users/Admins/Trainers/Students
   - 1 Course
   - 1 Assessment

2. ⏳ **Add More Sample Data**
   - 2 more courses
   - 2 more assessments
   - Enroll students
   - Create attempts

3. ⏳ **Test Complete Flow**
   - Student enrolls → Takes quiz → Passes → Gets certificate → Pays → Downloads

4. ⏳ **Create Additional Models**
   - LiveSession
   - Query (QMS)
   - Media
   - Notification
   - Attendance

---

## 📊 Summary

### ✅ Ready to Use:
- Users (3 collections or 1 with roles)
- Courses (1 sample)
- Assessments (1 sample)

### ⏳ Need More Data:
- More courses (2-3)
- More assessments (2-3)
- Student enrollments
- Assessment attempts
- Certificates
- Payments

### 🔮 Future Requirements:
- LiveSession model
- Query/QMS model
- Media Library model
- Notification model
- Attendance model

---

**Next Step:** Populate more sample data for testing complete user journey! 🚀
