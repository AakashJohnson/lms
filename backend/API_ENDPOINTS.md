# 🌐 NCUI CEAS LMS - Complete API Endpoints Reference

## Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.ncui-lms.in/api/v1
```

---

## 🔐 Authentication Endpoints

### Public Routes

#### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "mobile": "9876543210",
  "password": "Password@123",
  "role": "participant",
  "organization": "ABC Cooperative",
  "designation": "Manager"
}

Response: 201 Created
{
  "success": true,
  "message": "Registration successful. Please verify your mobile number and wait for admin approval.",
  "data": {
    "userId": "64abc123...",
    "mobile": "9876543210",
    "isApproved": false
  }
}
```

#### Verify Mobile OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}

Response: 200 OK
{
  "success": true,
  "message": "Mobile number verified successfully"
}
```

#### Resend OTP
```http
POST /auth/resend-otp
Content-Type: application/json

{
  "mobile": "9876543210"
}

Response: 200 OK
{
  "success": true,
  "message": "OTP sent successfully"
}
```

#### Login with Password
```http
POST /auth/login
Content-Type: application/json

{
  "emailOrMobile": "john@example.com",
  "password": "Password@123"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64abc123...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "role": "participant",
    "isApproved": true
  }
}
```

#### Request Login OTP
```http
POST /auth/login-otp
Content-Type: application/json

{
  "mobile": "9876543210"
}

Response: 200 OK
{
  "success": true,
  "message": "OTP sent to your mobile number"
}
```

#### Verify Login OTP
```http
POST /auth/verify-login-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "otp": "123456"
}

Response: 200 OK
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}

Response: 200 OK
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### Reset Password
```http
PUT /auth/reset-password/:resetToken
Content-Type: application/json

{
  "password": "NewPassword@123"
}

Response: 200 OK
{
  "success": true,
  "token": "...",
  "user": { ... }
}
```

### Protected Routes

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "mobile": "9876543210",
    "role": "participant",
    "enrolledCourses": [...],
    "certificates": [...]
  }
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👥 User Management Endpoints

### User Profile

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

#### Update User Profile
```http
PUT /users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

#### Change Password
```http
PUT /users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123"
}

Response: 200 OK
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Admin Only

#### Get All Users
```http
GET /users?page=1&limit=20&role=participant&isApproved=true
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "count": 150,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "data": [...]
}
```

#### Get Pending Approvals
```http
GET /users/pending-approvals
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "count": 25,
  "data": [...]
}
```

#### Approve User
```http
PUT /users/:userId/approve
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "message": "User approved successfully"
}
```

#### Reject User
```http
PUT /users/:userId/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Incomplete information"
}

Response: 200 OK
{
  "success": true,
  "message": "User rejected"
}
```

---

## 📚 Course Management Endpoints

### Public Routes

#### Get All Courses
```http
GET /courses?page=1&limit=12&category=cooperative-management&level=beginner
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "success": true,
  "count": 45,
  "pagination": { ... },
  "data": [
    {
      "_id": "64abc...",
      "title": "Introduction to Cooperatives",
      "slug": "introduction-to-cooperatives",
      "description": "...",
      "thumbnail": "https://...",
      "instructor": { ... },
      "totalDuration": 180,
      "ratings": {
        "average": 4.5,
        "count": 120
      },
      "currentEnrollments": 450
    }
  ]
}
```

#### Get Course Details
```http
GET /courses/:courseId
Authorization: Bearer <token> (optional)

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "64abc...",
    "title": "Introduction to Cooperatives",
    "description": "...",
    "modules": [
      {
        "title": "Module 1: Basics",
        "topics": [
          {
            "title": "What is a Cooperative?",
            "contentType": "video",
            "duration": 15,
            "isDownloadable": false
          }
        ]
      }
    ],
    "assessments": [...],
    "reviews": [...]
  }
}
```

### Protected Routes

#### Enroll in Course
```http
POST /courses/:courseId/enroll
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Successfully enrolled in course",
  "data": {
    "courseId": "64abc...",
    "enrolledAt": "2024-01-15T10:30:00.000Z",
    "progress": 0
  }
}
```

#### Get Course Progress
```http
GET /courses/:courseId/progress
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "courseId": "64abc...",
    "progress": 45,
    "completedTopics": 12,
    "totalTopics": 27,
    "lastAccessedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Update Progress
```http
PUT /courses/:courseId/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "topicId": "64xyz...",
  "completed": true,
  "timeSpent": 900
}

Response: 200 OK
{
  "success": true,
  "data": {
    "progress": 48
  }
}
```

#### Stream Content (SECURE)
```http
GET /courses/:courseId/content/:contentId/stream
Authorization: Bearer <token>
Range: bytes=0-1023

Response: 206 Partial Content
Content-Type: video/mp4
Content-Range: bytes 0-1023/1048576
Content-Disposition: inline
X-Content-Type-Options: nosniff

[Binary stream data]
```

### Trainer/Admin Routes

#### Create Course
```http
POST /courses
Authorization: Bearer <trainer-token>
Content-Type: application/json

{
  "title": "Advanced Cooperative Management",
  "description": "...",
  "category": "cooperative-management",
  "level": "advanced",
  "language": "en",
  "thumbnail": "https://...",
  "modules": [...]
}

Response: 201 Created
{
  "success": true,
  "data": { ... }
}
```

#### Update Course
```http
PUT /courses/:courseId
Authorization: Bearer <trainer-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "..."
}

Response: 200 OK
{
  "success": true,
  "data": { ... }
}
```

#### Publish Course
```http
PUT /courses/:courseId/publish
Authorization: Bearer <trainer-token>

Response: 200 OK
{
  "success": true,
  "message": "Course published successfully"
}
```

---

## 📝 Assessment Endpoints

### Get Assessment
```http
GET /assessments/:assessmentId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "_id": "64abc...",
    "title": "Module 1 Quiz",
    "description": "...",
    "totalMarks": 50,
    "passingMarks": 30,
    "duration": 30,
    "attemptsAllowed": 3,
    "questions": [
      {
        "questionNumber": 1,
        "questionText": "What is a cooperative?",
        "questionType": "mcq-single",
        "options": [
          {
            "optionNumber": 1,
            "optionText": "A business owned by members"
          },
          {
            "optionNumber": 2,
            "optionText": "A government organization"
          }
        ],
        "marks": 2
      }
    ]
  }
}
```

### Start Assessment
```http
POST /assessments/:assessmentId/start
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "attemptId": "64xyz...",
    "attemptNumber": 1,
    "startedAt": "2024-01-15T10:30:00.000Z",
    "expiresAt": "2024-01-15T11:00:00.000Z",
    "questions": [...]
  }
}
```

### Submit Assessment
```http
POST /assessments/:assessmentId/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "attemptId": "64xyz...",
  "answers": [
    {
      "questionId": "64abc...",
      "selectedOptions": [1],
      "timeTaken": 45
    }
  ]
}

Response: 200 OK
{
  "success": true,
  "data": {
    "attemptId": "64xyz...",
    "score": {
      "obtained": 42,
      "total": 50,
      "percentage": 84
    },
    "isPassed": true,
    "feedback": "Excellent work!"
  }
}
```

---

## 🎓 Certificate Endpoints

### Verify Certificate (Public)
```http
GET /certificates/verify/:certificateNumber
No authentication required

Response: 200 OK
{
  "success": true,
  "data": {
    "certificateNumber": "NCUI-CEAS-202401-12345",
    "userName": "John Doe",
    "courseName": "Introduction to Cooperatives",
    "issueDate": "2024-01-15",
    "isValid": true,
    "isRevoked": false
  }
}
```

### Get My Certificates
```http
GET /certificates/my-certificates
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64abc...",
      "certificateNumber": "NCUI-CEAS-202401-12345",
      "courseName": "Introduction to Cooperatives",
      "issueDate": "2024-01-15",
      "grade": "A",
      "isPaid": true,
      "certificateUrl": "https://..."
    }
  ]
}
```

### Download Certificate
```http
GET /certificates/:certificateId/download
Authorization: Bearer <token>

If not paid:
Response: 402 Payment Required
{
  "success": false,
  "message": "Payment required to download certificate",
  "paymentRequired": true,
  "amount": 50
}

If paid:
Response: 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="certificate.pdf"

[PDF binary data]
```

---

## 💳 Payment Endpoints

### Create Payment Order
```http
POST /payments/create-order
Authorization: Bearer <token>
Content-Type: application/json

{
  "certificateId": "64abc...",
  "purpose": "certificate"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "orderId": "ORD-1705315800000-1234",
    "razorpayOrderId": "order_xyz123",
    "amount": 5000,
    "currency": "INR",
    "key": "rzp_test_..."
  }
}
```

### Verify Payment
```http
POST /payments/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "ORD-1705315800000-1234",
  "razorpayPaymentId": "pay_xyz123",
  "razorpaySignature": "abc123..."
}

Response: 200 OK
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "64abc...",
    "status": "completed",
    "certificateUrl": "https://..."
  }
}
```

---

## 📊 Dashboard Endpoints

### Get Public Stats
```http
GET /dashboard/stats
No authentication required

Response: 200 OK
{
  "success": true,
  "data": {
    "users": {
      "total": 5420,
      "registered": 5100,
      "pending": 320
    },
    "courses": {
      "total": 85,
      "published": 72
    },
    "enrollments": {
      "total": 12450,
      "completed": 3200
    },
    "certificates": {
      "issued": 2850
    }
  }
}
```

### Get My Dashboard
```http
GET /dashboard/my-dashboard
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... },
    "statistics": {
      "enrolledCourses": 5,
      "inProgressCourses": 3,
      "completedCourses": 2,
      "certificatesEarned": 2,
      "averageProgress": 65
    },
    "recentCourses": [...],
    "certificates": [...]
  }
}
```

### Get Admin Dashboard
```http
GET /dashboard/admin
Authorization: Bearer <admin-token>

Response: 200 OK
{
  "success": true,
  "data": {
    "users": {
      "byRole": [...],
      "pendingApprovals": 25
    },
    "courses": { ... },
    "enrollmentTrends": [...],
    "topCourses": [...],
    "recentRegistrations": [...]
  }
}
```

---

## 🔔 Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| OTP Requests | 3 requests | 5 minutes |
| Payment | 5 requests | 1 minute |
| File Upload | 50 requests | 1 hour |
| Assessment | 10 requests | 1 minute |

---

## 🔒 Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <your-jwt-token>
```

Or in cookie:
```
Cookie: token=<your-jwt-token>
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "User role 'participant' is not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server Error"
}
```

---

**For complete implementation details, refer to the route files in `src/routes/` directory.**
