# NCUI CEAS Learning Management System - Backend API

## 🏗️ Architecture Overview

A production-ready, scalable backend API for the NCUI CEAS Learning Management System built with Node.js, Express.js, MongoDB, and Redis. Designed to handle **1 lakh (100,000) concurrent users** with high availability and security.

---

## 📁 Folder Structure

```
backend/
├── server.js                      # Main entry point
├── package.json                   # Dependencies
├── .env.example                   # Environment variables template
├── logs/                          # Application logs
│   ├── combined.log
│   ├── error.log
│   └── exceptions.log
├── src/
│   ├── config/                    # Configuration files
│   │   ├── database.js           # MongoDB connection
│   │   ├── redis.js              # Redis cache configuration
│   │   └── logger.js             # Winston logger setup
│   │
│   ├── models/                    # Mongoose schemas
│   │   ├── User.model.js         # User schema with RBAC
│   │   ├── Course.model.js       # Course with modules & topics
│   │   ├── Assessment.model.js   # Assessment with auto-numbering
│   │   ├── AssessmentAttempt.model.js
│   │   ├── Certificate.model.js  # Certificate with QR codes
│   │   └── Payment.model.js      # Payment transactions
│   │
│   ├── controllers/               # Business logic
│   │   ├── auth.controller.js    # Authentication & OTP
│   │   ├── user.controller.js    # User management
│   │   ├── course.controller.js  # Course CRUD
│   │   ├── assessment.controller.js
│   │   ├── certificate.controller.js
│   │   ├── payment.controller.js
│   │   ├── dashboard.controller.js
│   │   └── ...
│   │
│   ├── routes/                    # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── course.routes.js
│   │   ├── assessment.routes.js
│   │   ├── certificate.routes.js
│   │   ├── payment.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── qms.routes.js
│   │   ├── media.routes.js
│   │   ├── liveSession.routes.js
│   │   ├── report.routes.js
│   │   └── notification.routes.js
│   │
│   ├── middlewares/               # Express middlewares
│   │   ├── auth.js               # JWT & OTP verification
│   │   ├── rbac.js               # Role-based access control
│   │   ├── rateLimiter.js        # Redis-based rate limiting
│   │   └── errorHandler.js       # Global error handler
│   │
│   └── utils/                     # Utility functions
│       ├── asyncHandler.js       # Async wrapper
│       ├── errorResponse.js      # Custom error class
│       ├── sendEmail.js          # Nodemailer integration
│       ├── sendSMS.js            # Twilio SMS
│       ├── generateOTP.js        # OTP generation
│       └── streamContent.js      # Secure S3 streaming
```

---

## 🚀 Key Features Implemented

### 1. **Authentication & Authorization**
- ✅ Mobile/Email registration with OTP verification
- ✅ Dual login: Password-based & OTP-based
- ✅ JWT token authentication
- ✅ Admin approval workflow for new registrations
- ✅ Forgot password with email reset link
- ✅ Account lockout after failed login attempts
- ✅ Role-Based Access Control (RBAC)

### 2. **Role-Based Access Control (RBAC)**
Three primary roles:
- **Administrator**: Full system access, user approval, reporting
- **Trainer/Faculty**: Content management, assessment creation, session management
- **Participant/Trainee**: Course enrollment, assessment attempts, certificate downloads

### 3. **Course Management**
- ✅ Modular course structure with topics
- ✅ Support for multiple content types (video, audio, PDF, PPT)
- ✅ Batch-wise program management
- ✅ Progress tracking per user
- ✅ Course ratings and reviews

### 4. **Secure Content Streaming**
- ✅ **CRITICAL SECURITY**: Content streaming without download option
- ✅ AWS S3 integration with signed URLs
- ✅ Adaptive bitrate streaming for videos
- ✅ Range request support for video seeking
- ✅ Throttled streaming to prevent abuse

### 5. **Assessment System**
- ✅ **Auto-numbering**: Questions start from 1
- ✅ **Auto-numbering**: Answer options auto-numbered
- ✅ **Soft delete**: Deleted options don't reappear
- ✅ MCQ (single/multiple), True/False, Short Answer
- ✅ Automated and manual evaluation
- ✅ Instant feedback support
- ✅ Multiple attempts with tracking

### 6. **Payment Gateway Integration**
- ✅ Razorpay integration
- ✅ Fixed Rs. 50/- fee for certificate downloads
- ✅ Payment verification and webhook handling
- ✅ Transaction history and receipts

### 7. **Certificate Generation**
- ✅ Auto-generated certificate numbers
- ✅ QR code for verification
- ✅ Digital signatures and logos
- ✅ Multi-language support (vernacular)
- ✅ Payment-gated downloads
- ✅ Certificate revocation system

### 8. **Dashboard & Analytics**
- ✅ Real-time statistics (cached)
- ✅ User-specific dashboards
- ✅ Admin analytics with trends
- ✅ Trainer performance metrics

### 9. **Communication**
- ✅ Email notifications (Nodemailer)
- ✅ SMS notifications (Twilio)
- ✅ Automated reminders
- ✅ Broadcast messaging

### 10. **Live Sessions**
- ✅ Video conferencing integration (Zoom/Webex/Google Meet)
- ✅ Session scheduling
- ✅ Biometric attendance tracking
- ✅ Automated notifications

---

## 🔐 Security Features

1. **Authentication Security**
   - JWT with secure httpOnly cookies
   - OTP expiry (10 minutes)
   - Account lockout after 5 failed attempts
   - Password hashing with bcrypt (12 rounds)

2. **API Security**
   - Helmet.js for HTTP headers
   - CORS configuration
   - Rate limiting (Redis-based)
   - MongoDB injection prevention
   - Input validation

3. **Content Security**
   - Private S3 buckets
   - Signed URLs with expiry
   - No direct download links
   - Stream-only access
   - Content-Disposition: inline

4. **Data Security**
   - Server-side encryption (AES256)
   - Sensitive data excluded from responses
   - Audit logging

---

## 📊 Database Schemas

### User Schema
```javascript
{
  firstName, lastName, email, mobile, password,
  role: ['participant', 'trainer', 'administrator'],
  isApproved: Boolean,
  isEmailVerified, isMobileVerified,
  enrolledCourses: [{ course, progress, status }],
  certificates: [Certificate]
}
```

### Course Schema
```javascript
{
  title, slug, description, category, level, language,
  instructor, coInstructors,
  modules: [{
    title, order,
    topics: [{
      title, contentType, contentUrl, duration,
      isDownloadable: false, // CRITICAL
      streamingUrl
    }]
  }],
  batches: [{ batchName, startDate, maxParticipants }],
  certificateEligibility: { minCompletionPercentage, minAssessmentScore }
}
```

### Assessment Schema
```javascript
{
  title, course, assessmentType,
  questions: [{
    questionNumber, // Auto-numbered from 1
    questionText, questionType,
    options: [{
      optionNumber, // Auto-numbered
      optionText, isCorrect,
      isDeleted: Boolean // Soft delete
    }]
  }],
  duration, attemptsAllowed, passingPercentage
}
```

### Certificate Schema
```javascript
{
  certificateNumber, // Auto-generated: NCUI-CEAS-YYYYMM-XXXXX
  user, course, userName, courseName,
  issueDate, completionDate, grade, score,
  qrCode, verificationUrl,
  digitalSignature: { signatoryName, signatureUrl },
  isPaid: Boolean,
  payment: Payment
}
```

### Payment Schema
```javascript
{
  user, orderId, paymentId,
  razorpayOrderId, razorpayPaymentId, razorpaySignature,
  amount: 5000, // Rs. 50.00 in paise
  purpose: 'certificate',
  status: ['pending', 'completed', 'failed', 'refunded']
}
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- AWS S3 account (or Cloudinary)
- Razorpay account
- Twilio account (for SMS)
- SMTP server (for emails)

### Installation Steps

1. **Clone and Navigate**
```bash
cd backend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Start MongoDB and Redis**
```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

5. **Run Development Server**
```bash
npm run dev
```

6. **Run Production Server**
```bash
npm start
```

---

## 🌐 API Endpoints

### Authentication (`/api/v1/auth`)
```
POST   /register              - Register new user
POST   /verify-otp            - Verify mobile OTP
POST   /resend-otp            - Resend OTP
POST   /login                 - Login with password
POST   /login-otp             - Request login OTP
POST   /verify-login-otp      - Verify login OTP
GET    /me                    - Get current user
POST   /logout                - Logout
POST   /forgot-password       - Request password reset
PUT    /reset-password/:token - Reset password
```

### Users (`/api/v1/users`)
```
GET    /profile               - Get user profile
PUT    /profile               - Update profile
PUT    /change-password       - Change password
GET    /                      - Get all users (Admin)
GET    /pending-approvals     - Get pending approvals (Admin)
PUT    /:userId/approve       - Approve user (Admin)
PUT    /:userId/reject        - Reject user (Admin)
```

### Courses (`/api/v1/courses`)
```
GET    /                      - Get all courses
GET    /:courseId             - Get course details
POST   /                      - Create course (Trainer/Admin)
PUT    /:courseId             - Update course
DELETE /:courseId             - Delete course (Admin)
POST   /:courseId/enroll      - Enroll in course
GET    /:courseId/progress    - Get progress
GET    /:courseId/content/:contentId/stream - Stream content
```

### Assessments (`/api/v1/assessments`)
```
POST   /                      - Create assessment
GET    /:assessmentId         - Get assessment
POST   /:assessmentId/start   - Start assessment
POST   /:assessmentId/submit  - Submit assessment
GET    /:assessmentId/attempts - Get attempts
POST   /attempts/:attemptId/evaluate - Evaluate (Trainer)
```

### Certificates (`/api/v1/certificates`)
```
GET    /verify/:certificateNumber - Verify certificate (Public)
GET    /my-certificates       - Get my certificates
GET    /:certificateId        - Get certificate details
GET    /:certificateId/download - Download (requires payment)
POST   /generate              - Generate certificate (Admin)
PUT    /:certificateId/revoke - Revoke certificate (Admin)
```

### Payments (`/api/v1/payments`)
```
POST   /create-order          - Create payment order
POST   /verify                - Verify payment
GET    /my-payments           - Get my payments
POST   /:paymentId/refund     - Process refund (Admin)
```

### Dashboard (`/api/v1/dashboard`)
```
GET    /stats                 - Get public stats
GET    /my-dashboard          - Get user dashboard
GET    /admin                 - Get admin dashboard
GET    /trainer               - Get trainer dashboard
```

---

## 🚀 Scaling Strategy for 1 Lakh Concurrent Users

### 1. **Database Optimization**

#### MongoDB Indexing
```javascript
// User indexes
db.users.createIndex({ email: 1 })
db.users.createIndex({ mobile: 1 })
db.users.createIndex({ role: 1, isApproved: 1 })

// Course indexes
db.courses.createIndex({ slug: 1 })
db.courses.createIndex({ category: 1, isPublished: 1 })
db.courses.createIndex({ 'ratings.average': -1 })
db.courses.createIndex({ title: 'text', description: 'text' })

// Assessment indexes
db.assessments.createIndex({ course: 1 })
db.assessmentAttempts.createIndex({ assessment: 1, user: 1 })
```

#### MongoDB Sharding
```javascript
// Shard by user ID for horizontal scaling
sh.enableSharding("ceas-lms")
sh.shardCollection("ceas-lms.users", { "_id": "hashed" })
sh.shardCollection("ceas-lms.courses", { "_id": "hashed" })
```

#### Read Replicas
```javascript
// Configure read preference for non-critical reads
mongoose.connect(uri, {
  readPreference: 'secondaryPreferred'
})
```

### 2. **Redis Caching Strategy**

```javascript
// Cache frequently accessed data
- User sessions: 1 hour TTL
- Dashboard stats: 5 minutes TTL
- Course listings: 10 minutes TTL
- Assessment questions: 30 minutes TTL

// Cache keys structure
user:{userId}
course:{courseId}
dashboard:stats
courses:list:page:{pageNum}
```

### 3. **Load Balancing**

```nginx
# Nginx configuration
upstream backend {
    least_conn;
    server backend1:5000 weight=3;
    server backend2:5000 weight=3;
    server backend3:5000 weight=2;
    server backend4:5000 weight=2;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. **Content Delivery**

#### AWS CloudFront CDN
```javascript
// Serve static content via CDN
- Course thumbnails
- Profile pictures
- Certificates (after generation)
- Static media files
```

#### Adaptive Streaming
```javascript
// HLS/DASH for video content
- Multiple bitrate variants
- Automatic quality switching
- Reduced bandwidth usage
```

### 5. **Microservices Architecture** (Future)

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┬──────────┐
    │         │        │          │          │
┌───▼───┐ ┌──▼──┐ ┌───▼────┐ ┌───▼────┐ ┌──▼──────┐
│ Auth  │ │User │ │Course  │ │Payment │ │Streaming│
│Service│ │Svc  │ │Service │ │Service │ │Service  │
└───────┘ └─────┘ └────────┘ └────────┘ └─────────┘
```

### 6. **Queue Management**

```javascript
// Bull queue for background jobs
- Email sending
- SMS notifications
- Certificate generation
- Report generation
- Video transcoding

// Example
import Bull from 'bull';
const emailQueue = new Bull('email', {
  redis: { host: 'localhost', port: 6379 }
});

emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

### 7. **Database Connection Pooling**

```javascript
// MongoDB connection pool
mongoose.connect(uri, {
  maxPoolSize: 100,  // Max connections
  minPoolSize: 10,   // Min connections
  socketTimeoutMS: 45000
})
```

### 8. **Rate Limiting**

```javascript
// Distributed rate limiting with Redis
- General API: 100 req/15min per IP
- Auth endpoints: 5 req/15min per IP
- OTP requests: 3 req/5min per mobile
- Payment: 5 req/min per user
```

### 9. **Monitoring & Logging**

```javascript
// Tools
- Winston for logging
- PM2 for process management
- New Relic / Datadog for APM
- Prometheus + Grafana for metrics
- Sentry for error tracking
```

### 10. **Infrastructure Recommendations**

#### Development
```
- 1 Node.js server (2 vCPU, 4GB RAM)
- 1 MongoDB instance (2 vCPU, 4GB RAM)
- 1 Redis instance (1 vCPU, 2GB RAM)
```

#### Production (1 Lakh Users)
```
- 10-15 Node.js servers (4 vCPU, 8GB RAM each)
- MongoDB Cluster (3 nodes, 8 vCPU, 16GB RAM each)
- Redis Cluster (3 nodes, 4 vCPU, 8GB RAM each)
- Load Balancer (Nginx/AWS ALB)
- CDN (CloudFront/Cloudflare)
- S3 for content storage
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📝 Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `RAZORPAY_KEY_ID` - Payment gateway
- `TWILIO_ACCOUNT_SID` - SMS service
- `SMTP_HOST` - Email service

---

## 🔒 Security Best Practices

1. Never commit `.env` file
2. Use strong JWT secrets (32+ characters)
3. Enable HTTPS in production
4. Regular security audits
5. Keep dependencies updated
6. Implement CSRF protection
7. Use prepared statements (Mongoose does this)
8. Sanitize user inputs
9. Implement request signing for webhooks
10. Regular backups

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Redis Documentation](https://redis.io/docs/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Razorpay API](https://razorpay.com/docs/api/)

---

## 👥 Support

For issues and questions:
- Email: support@ncui.in
- Documentation: [Internal Wiki]

---

## 📄 License

Proprietary - NCUI CEAS © 2024

---

**Built with ❤️ for NCUI CEAS**
