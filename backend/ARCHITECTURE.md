# NCUI CEAS LMS - Backend Architecture

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Web App │  │ Mobile   │  │  Admin   │  │  Trainer │       │
│  │ (React)  │  │   App    │  │  Panel   │  │  Portal  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │     LOAD BALANCER         │
        │   (Nginx / AWS ALB)       │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────────────────────┐
        │         API GATEWAY LAYER                  │
        │  ┌──────────────────────────────────┐     │
        │  │  Rate Limiting (Redis)           │     │
        │  │  Authentication (JWT)            │     │
        │  │  Request Validation              │     │
        │  └──────────────────────────────────┘     │
        └─────────────┬─────────────────────────────┘
                      │
        ┌─────────────▼─────────────────────────────┐
        │         APPLICATION LAYER                  │
        │  ┌────────────────────────────────────┐   │
        │  │  Express.js Servers (Cluster)      │   │
        │  │  ┌──────┐ ┌──────┐ ┌──────┐       │   │
        │  │  │Node 1│ │Node 2│ │Node N│       │   │
        │  │  └──────┘ └──────┘ └──────┘       │   │
        │  └────────────────────────────────────┘   │
        │                                            │
        │  ┌────────────────────────────────────┐   │
        │  │         CONTROLLERS                │   │
        │  │  • Auth    • Course   • Payment    │   │
        │  │  • User    • Assessment            │   │
        │  │  • Certificate • Dashboard         │   │
        │  └────────────────────────────────────┘   │
        │                                            │
        │  ┌────────────────────────────────────┐   │
        │  │         MIDDLEWARES                │   │
        │  │  • Authentication (JWT/OTP)        │   │
        │  │  • RBAC (Role-Based Access)        │   │
        │  │  • Rate Limiting                   │   │
        │  │  • Error Handling                  │   │
        │  └────────────────────────────────────┘   │
        └─────────────┬─────────────────────────────┘
                      │
        ┌─────────────▼─────────────────────────────┐
        │         DATA LAYER                         │
        │                                            │
        │  ┌────────────────┐  ┌────────────────┐   │
        │  │   MongoDB      │  │     Redis      │   │
        │  │   (Primary)    │  │    (Cache)     │   │
        │  │                │  │                │   │
        │  │  • Users       │  │  • Sessions    │   │
        │  │  • Courses     │  │  • Rate Limits │   │
        │  │  • Assessments │  │  • Dashboard   │   │
        │  │  • Certificates│  │  • Temp Data   │   │
        │  │  • Payments    │  │                │   │
        │  └────────────────┘  └────────────────┘   │
        └────────────────────────────────────────────┘
                      │
        ┌─────────────▼─────────────────────────────┐
        │      EXTERNAL SERVICES LAYER               │
        │                                            │
        │  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
        │  │   AWS    │  │ Razorpay │  │ Twilio  │ │
        │  │    S3    │  │ Payment  │  │   SMS   │ │
        │  └──────────┘  └──────────┘  └─────────┘ │
        │                                            │
        │  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
        │  │   SMTP   │  │   Zoom   │  │ Webex   │ │
        │  │  Email   │  │   Meet   │  │  Meet   │ │
        │  └──────────┘  └──────────┘  └─────────┘ │
        └────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. User Registration Flow
```
User → POST /api/v1/auth/register
  ↓
Validate Input (express-validator)
  ↓
Check Existing User (MongoDB)
  ↓
Hash Password (bcrypt)
  ↓
Create User (isApproved: false)
  ↓
Generate OTP
  ↓
Send SMS (Twilio) ──→ User receives OTP
  ↓
Send Welcome Email (Nodemailer)
  ↓
Return Response
```

### 2. Login Flow (OTP-based)
```
User → POST /api/v1/auth/login-otp
  ↓
Find User by Mobile
  ↓
Check Account Status (active, approved, not locked)
  ↓
Generate OTP
  ↓
Save OTP to User (with expiry)
  ↓
Send SMS ──→ User receives OTP
  ↓
User → POST /api/v1/auth/verify-login-otp
  ↓
Verify OTP
  ↓
Generate JWT Token
  ↓
Cache User Data (Redis)
  ↓
Return Token + User Data
```

### 3. Course Enrollment Flow
```
User → POST /api/v1/courses/:courseId/enroll
  ↓
Authenticate (JWT)
  ↓
Check User Approval
  ↓
Fetch Course (MongoDB)
  ↓
Check Enrollment Eligibility
  ↓
Add to enrolledCourses Array
  ↓
Increment Course.currentEnrollments
  ↓
Send Confirmation Email
  ↓
Invalidate Cache
  ↓
Return Success
```

### 4. Secure Content Streaming Flow
```
User → GET /api/v1/courses/:courseId/content/:contentId/stream
  ↓
Authenticate (JWT)
  ↓
Check Course Enrollment
  ↓
Fetch Content Metadata (MongoDB)
  ↓
Generate Signed S3 URL (15 min expiry)
  ↓
Stream Content with Range Support
  ↓
Set Headers (Content-Disposition: inline)
  ↓
Throttle Stream (prevent abuse)
  ↓
Track Progress
  ↓
Return Stream
```

### 5. Assessment Submission Flow
```
User → POST /api/v1/assessments/:assessmentId/start
  ↓
Authenticate
  ↓
Check Attempts Remaining
  ↓
Create AssessmentAttempt (status: in-progress)
  ↓
Return Questions (shuffled if enabled)
  ↓
User Answers Questions
  ↓
User → POST /api/v1/assessments/:assessmentId/submit
  ↓
Validate Submission
  ↓
Calculate Score (auto for MCQ)
  ↓
Update Attempt (status: submitted/evaluated)
  ↓
Check Pass/Fail
  ↓
Update Course Progress
  ↓
Send Result Notification
  ↓
Return Results
```

### 6. Certificate Generation & Download Flow
```
Admin → POST /api/v1/certificates/generate
  ↓
Authenticate (Admin only)
  ↓
Check Eligibility (completion %, assessment score)
  ↓
Generate Certificate Number
  ↓
Create QR Code (verification URL)
  ↓
Generate PDF (PDFKit)
  ↓
Upload to S3
  ↓
Save Certificate (isPaid: false)
  ↓
Notify User
  ↓
User → GET /api/v1/certificates/:certificateId/download
  ↓
Check Payment Status
  ↓
If not paid → Redirect to Payment
  ↓
User → POST /api/v1/payments/create-order
  ↓
Create Razorpay Order (Rs. 50)
  ↓
Return Order Details
  ↓
User Completes Payment
  ↓
User → POST /api/v1/payments/verify
  ↓
Verify Razorpay Signature
  ↓
Update Payment Status
  ↓
Update Certificate (isPaid: true)
  ↓
Allow Download
  ↓
Track Download Count
  ↓
Return Certificate PDF
```

---

## 🔐 Security Architecture

### Authentication Layers
```
┌─────────────────────────────────────┐
│  Layer 1: Rate Limiting             │
│  • IP-based throttling              │
│  • Redis-backed distributed limits  │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Layer 2: Input Validation          │
│  • express-validator                │
│  • Sanitization                     │
│  • Type checking                    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Layer 3: Authentication            │
│  • JWT verification                 │
│  • OTP validation                   │
│  • Session management               │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Layer 4: Authorization (RBAC)      │
│  • Role checking                    │
│  • Permission validation            │
│  • Resource ownership               │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Layer 5: Business Logic            │
│  • Controller execution             │
│  • Data validation                  │
└─────────────────────────────────────┘
```

### Content Security
```
┌──────────────────────────────────────┐
│  S3 Bucket (Private)                 │
│  • No public access                  │
│  • Server-side encryption (AES256)   │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│  Signed URLs                         │
│  • 15-minute expiry                  │
│  • User-specific                     │
│  • Single-use tokens                 │
└─────────────┬────────────────────────┘
              │
┌─────────────▼────────────────────────┐
│  Streaming Endpoint                  │
│  • Content-Disposition: inline       │
│  • No download headers               │
│  • Range request support             │
│  • Throttled bandwidth               │
└──────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### User Approval Workflow
```
New User Registration
        ↓
  [Pending Approval]
        ↓
Admin Reviews ──→ Reject ──→ [Account Inactive]
        ↓
     Approve
        ↓
  [Account Active]
        ↓
User Can Login & Enroll
```

### Course Progress Tracking
```
User Enrolls in Course
        ↓
enrolledCourses: [{
  course: ObjectId,
  progress: 0,
  status: 'enrolled'
}]
        ↓
User Watches Content
        ↓
Update Progress (%)
        ↓
Complete All Modules
        ↓
Take Assessment
        ↓
Pass Assessment
        ↓
status: 'completed'
        ↓
Eligible for Certificate
```

---

## 🚀 Scaling Patterns

### Horizontal Scaling
```
┌─────────────────────────────────────┐
│  Load Balancer                      │
└──┬────┬────┬────┬────┬────┬────┬───┘
   │    │    │    │    │    │    │
┌──▼─┐┌─▼─┐┌─▼─┐┌─▼─┐┌─▼─┐┌─▼─┐┌▼──┐
│App1││App2││App3││App4││App5││...││AppN│
└────┘└───┘└───┘└───┘└───┘└───┘└───┘
   │    │    │    │    │    │    │
   └────┴────┴────┴────┴────┴────┘
              │
    ┌─────────▼─────────┐
    │  Shared Resources │
    │  • MongoDB        │
    │  • Redis          │
    │  • S3             │
    └───────────────────┘
```

### Caching Strategy
```
Request → Check Redis Cache
              ↓
         Cache Hit? ──Yes──→ Return Cached Data
              ↓ No
         Query MongoDB
              ↓
         Cache Result (with TTL)
              ↓
         Return Data
```

### Database Sharding
```
┌─────────────────────────────────────┐
│  MongoDB Router (mongos)            │
└──┬────────────┬────────────┬────────┘
   │            │            │
┌──▼──────┐ ┌──▼──────┐ ┌──▼──────┐
│ Shard 1 │ │ Shard 2 │ │ Shard 3 │
│ Users   │ │ Courses │ │ Assess. │
│ 0-33%   │ │ 34-66%  │ │ 67-100% │
└─────────┘ └─────────┘ └─────────┘
```

---

## 🔧 Technology Stack

### Core
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES6+)

### Database
- **Primary DB**: MongoDB 5.x
- **Cache**: Redis 6.x
- **ODM**: Mongoose 8.x

### Authentication
- **JWT**: jsonwebtoken
- **Password**: bcryptjs
- **OTP**: otp-generator

### Security
- **Headers**: helmet
- **CORS**: cors
- **Sanitization**: express-mongo-sanitize
- **Rate Limiting**: express-rate-limit + Redis

### File Storage
- **Cloud**: AWS S3
- **Alternative**: Cloudinary

### Communication
- **Email**: Nodemailer
- **SMS**: Twilio

### Payment
- **Gateway**: Razorpay

### Utilities
- **Logging**: Winston
- **Validation**: express-validator, Joi
- **PDF**: PDFKit
- **QR Code**: qrcode
- **Image**: Sharp

### DevOps
- **Process Manager**: PM2
- **Dev Server**: Nodemon
- **Testing**: Jest, Supertest

---

## 📈 Performance Metrics

### Target Performance
- **Response Time**: < 200ms (95th percentile)
- **Throughput**: 10,000 req/sec
- **Concurrent Users**: 100,000
- **Database Queries**: < 50ms average
- **Cache Hit Rate**: > 80%
- **Uptime**: 99.9%

### Monitoring
- **APM**: New Relic / Datadog
- **Logs**: Winston → ELK Stack
- **Metrics**: Prometheus + Grafana
- **Errors**: Sentry
- **Uptime**: Pingdom / UptimeRobot

---

## 🔄 CI/CD Pipeline

```
Developer Push
      ↓
GitHub/GitLab
      ↓
Webhook Trigger
      ↓
CI Server (Jenkins/GitHub Actions)
      ↓
┌─────┴─────┐
│   Build   │
│   • npm i │
│   • lint  │
│   • test  │
└─────┬─────┘
      ↓
┌─────┴─────┐
│  Deploy   │
│   • Dev   │
│   • Stage │
│   • Prod  │
└───────────┘
```

---

**Architecture designed for scalability, security, and maintainability.**
