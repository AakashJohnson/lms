# 💳 Razorpay Payment Integration - Complete Guide

## 📋 Overview

CEAS-LMS में **Razorpay Payment Gateway** integrate किया गया है certificate download के लिए।

**Payment Flow:**
1. User course complete करता है
2. Admin/Trainer certificate generate करता है
3. User को certificate दिखता है (unpaid status)
4. User Rs. 50/- payment करता है
5. Payment verify होने के बाद certificate download होता है

---

## 🔑 Razorpay Account Setup

### Step 1: Razorpay Account बनाएं

1. Visit: https://razorpay.com/
2. "Sign Up" पर click करें
3. Business details भरें:
   - Business Name: NCUI CEAS
   - Email: your-email@ncui.in
   - Mobile: Your mobile number

### Step 2: KYC Complete करें

```
Dashboard → Account & Settings → Business Details
- PAN Card upload करें
- GST details (optional)
- Bank account details
```

### Step 3: API Keys प्राप्त करें

```
Dashboard → Settings → API Keys → Generate Test Keys
```

**आपको मिलेंगे:**
- `Key ID`: rzp_test_xxxxxxxxxxxxx
- `Key Secret`: xxxxxxxxxxxxxxxxxxxxxxxx

**⚠️ IMPORTANT:** Production में जाने से पहले "Generate Live Keys" करें!

---

## 🔧 Backend Configuration

### 1. Update `.env` File

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
CERTIFICATE_FEE=5000
```

**Note:** `CERTIFICATE_FEE` is in **paise** (5000 paise = Rs. 50.00)

### 2. Webhook Setup (Razorpay Dashboard)

```
Dashboard → Settings → Webhooks → Add New Webhook

Webhook URL: https://your-domain.com/api/v1/payments/webhook
Active Events:
  ✅ payment.captured
  ✅ payment.failed
  ✅ refund.created

Secret: Generate करें और .env में paste करें
```

---

## 🚀 API Endpoints

### 1. Create Payment Order

**Endpoint:** `POST /api/v1/payments/create-order`

**Headers:**
```json
{
  "Authorization": "Bearer <user_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "certificateId": "65abc123def456789"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "orderId": "order_xxxxxxxxxxxxx",
    "amount": 5000,
    "currency": "INR",
    "key": "rzp_test_xxxxxxxxxxxxx",
    "payment": {
      "_id": "65abc123def456789",
      "orderId": "ORD-1234567890-1234",
      "amount": 5000,
      "status": "pending"
    },
    "user": {
      "name": "Student Singh",
      "email": "student@ncui.in",
      "mobile": "7777777777"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Certificate payment already completed"
}
```

**Error Response (402):**
```json
{
  "success": false,
  "message": "Certificate not found"
}
```

---

### 2. Verify Payment

**Endpoint:** `POST /api/v1/payments/verify`

**Headers:**
```json
{
  "Authorization": "Bearer <user_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxxxxxxxxxxxx",
  "razorpay_payment_id": "pay_xxxxxxxxxxxxx",
  "razorpay_signature": "generated_signature_from_razorpay"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment verified successfully. Certificate is now available for download.",
  "data": {
    "paymentId": "65abc123def456789",
    "razorpayPaymentId": "pay_xxxxxxxxxxxxx",
    "status": "completed",
    "amount": 5000,
    "certificate": {
      "_id": "65abc123def456789",
      "isPaid": true,
      "downloadUrl": "/api/v1/certificates/65abc123def456789/download"
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Payment verification failed. Invalid signature."
}
```

---

### 3. Download Certificate (After Payment)

**Endpoint:** `GET /api/v1/certificates/:certificateId/download`

**Headers:**
```json
{
  "Authorization": "Bearer <user_jwt_token>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Certificate download authorized",
  "data": {
    "certificateNumber": "NCUI-CEAS-202405-12345",
    "userName": "Student Singh",
    "courseName": "Cooperative Management",
    "issueDate": "2024-05-03T10:30:00.000Z",
    "grade": "A",
    "qrCode": "https://s3.amazonaws.com/qrcodes/...",
    "verificationUrl": "https://verify.ncui.in/certificate/NCUI-CEAS-202405-12345",
    "pdfUrl": "https://s3.amazonaws.com/certificates/NCUI-CEAS-202405-12345.pdf"
  }
}
```

**Error Response (402 - Payment Required):**
```json
{
  "success": false,
  "message": "Payment required. Please complete the payment of Rs. 50/- to download your certificate.",
  "paymentRequired": true,
  "certificateId": "65abc123def456789",
  "amount": 5000,
  "createOrderUrl": "/api/v1/payments/create-order"
}
```

---

### 4. Get My Payments

**Endpoint:** `GET /api/v1/payments/my-payments`

**Query Parameters:**
- `status` (optional): pending, completed, failed, refunded
- `page` (optional): default 1
- `limit` (optional): default 10

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "totalPages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "65abc123def456789",
      "orderId": "ORD-1234567890-1234",
      "razorpayPaymentId": "pay_xxxxxxxxxxxxx",
      "amount": 5000,
      "status": "completed",
      "purpose": "certificate",
      "certificate": {
        "_id": "65abc123def456789",
        "certificateNumber": "NCUI-CEAS-202405-12345",
        "courseName": "Cooperative Management"
      },
      "completedAt": "2024-05-03T10:35:00.000Z",
      "createdAt": "2024-05-03T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Get All Payments (Admin)

**Endpoint:** `GET /api/v1/payments`

**Headers:**
```json
{
  "Authorization": "Bearer <admin_jwt_token>"
}
```

**Query Parameters:**
- `status`: pending, completed, failed, refunded
- `purpose`: certificate, course-enrollment
- `startDate`: 2024-01-01
- `endDate`: 2024-12-31
- `page`: 1
- `limit`: 20

**Success Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "totalPages": 8,
  "currentPage": 1,
  "statistics": [
    {
      "_id": "completed",
      "count": 120,
      "totalAmount": 600000
    },
    {
      "_id": "pending",
      "count": 20,
      "totalAmount": 100000
    },
    {
      "_id": "failed",
      "count": 10,
      "totalAmount": 50000
    }
  ],
  "data": [...]
}
```

---

### 6. Process Refund (Admin)

**Endpoint:** `POST /api/v1/payments/:paymentId/refund`

**Headers:**
```json
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "reason": "Certificate revoked due to policy violation",
  "amount": 5000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "rfnd_xxxxxxxxxxxxx",
    "amount": 5000,
    "status": "refunded"
  }
}
```

---

## 🎨 Frontend Integration (React)

### Install Razorpay Checkout

```bash
npm install react-razorpay
```

### Payment Component Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const CertificatePayment = ({ certificate, token }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Step 1: Create order
      const { data } = await axios.post(
        '/api/v1/payments/create-order',
        { certificateId: certificate._id },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Step 2: Initialize Razorpay
      const options = {
        key: data.data.key,
        amount: data.data.amount,
        currency: data.data.currency,
        name: 'NCUI CEAS',
        description: 'Certificate Download Fee',
        order_id: data.data.orderId,
        prefill: {
          name: data.data.user.name,
          email: data.data.user.email,
          contact: data.data.user.mobile
        },
        theme: {
          color: '#3399cc'
        },
        handler: async (response) => {
          // Step 3: Verify payment
          try {
            const verifyRes = await axios.post(
              '/api/v1/payments/verify',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );

            if (verifyRes.data.success) {
              alert('Payment successful! You can now download your certificate.');
              // Redirect to certificate download
              window.location.href = verifyRes.data.data.certificate.downloadUrl;
            }
          } catch (error) {
            alert('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      alert('Failed to create payment order');
      setLoading(false);
    }
  };

  return (
    <div className="certificate-payment">
      <h3>{certificate.courseName}</h3>
      <p>Certificate Number: {certificate.certificateNumber}</p>
      
      {!certificate.isPaid ? (
        <div>
          <p className="text-red-600">
            Payment Required: Rs. 50/-
          </p>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-green-600">✅ Payment Completed</p>
          <a
            href={`/api/v1/certificates/${certificate._id}/download`}
            className="btn btn-success"
          >
            Download Certificate
          </a>
        </div>
      )}
    </div>
  );
};

export default CertificatePayment;
```

### Add Razorpay Script to HTML

```html
<!-- public/index.html -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

## 🔒 Security Features

### 1. Signature Verification

```javascript
// Backend automatically verifies Razorpay signature
const generatedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

if (generatedSignature !== razorpay_signature) {
  // Payment rejected - Invalid signature
}
```

### 2. Payment Status Check

```javascript
// Certificate download blocked without payment
if (!certificate.isPaid) {
  return res.status(402).json({
    success: false,
    message: 'Payment required'
  });
}
```

### 3. Webhook Verification

```javascript
// Webhook signature verification
const webhookSignature = req.headers['x-razorpay-signature'];
const generatedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');
```

---

## 🧪 Testing

### Test Mode Credentials

**Test Card Details:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
Name: Any name
```

**Test UPI:**
```
UPI ID: success@razorpay
```

**Test Netbanking:**
```
Select any bank → Success
```

### Test Payment Flow

```bash
# 1. Login as student
POST /api/v1/auth/login
{
  "emailOrMobile": "student@ncui.in",
  "password": "Student@123"
}

# 2. Get certificates
GET /api/v1/certificates/my-certificates

# 3. Create payment order
POST /api/v1/payments/create-order
{
  "certificateId": "certificate_id_here"
}

# 4. Complete payment on Razorpay checkout

# 5. Verify payment
POST /api/v1/payments/verify
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}

# 6. Download certificate
GET /api/v1/certificates/:certificateId/download
```

---

## 📊 Payment Statistics

### Admin Dashboard Query

```javascript
// Get payment statistics
const stats = await Payment.aggregate([
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
      totalAmount: { $sum: '$amount' }
    }
  }
]);

// Result:
// [
//   { _id: 'completed', count: 120, totalAmount: 600000 },
//   { _id: 'pending', count: 20, totalAmount: 100000 },
//   { _id: 'failed', count: 10, totalAmount: 50000 }
// ]
```

---

## 🚨 Error Handling

### Common Errors

**1. Payment Already Exists**
```json
{
  "success": false,
  "message": "Payment already exists for this certificate"
}
```

**2. Invalid Signature**
```json
{
  "success": false,
  "message": "Payment verification failed. Invalid signature."
}
```

**3. Certificate Not Found**
```json
{
  "success": false,
  "message": "Certificate not found"
}
```

**4. Unauthorized Access**
```json
{
  "success": false,
  "message": "Not authorized to pay for this certificate"
}
```

---

## 📝 Database Schema

### Payment Model

```javascript
{
  user: ObjectId,
  orderId: "ORD-1234567890-1234",
  razorpayOrderId: "order_xxxxxxxxxxxxx",
  razorpayPaymentId: "pay_xxxxxxxxxxxxx",
  razorpaySignature: "signature_here",
  amount: 5000,
  currency: "INR",
  purpose: "certificate",
  certificate: ObjectId,
  status: "completed",
  paymentMethod: "card",
  completedAt: Date,
  metadata: {
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    email: "student@ncui.in",
    mobile: "7777777777"
  }
}
```

### Certificate Model (Payment Fields)

```javascript
{
  isPaid: true,
  payment: ObjectId,
  paidAt: Date,
  downloadCount: 5,
  firstDownloadedAt: Date,
  lastDownloadedAt: Date
}
```

---

## 🎯 Production Checklist

- [ ] Razorpay account KYC completed
- [ ] Live API keys generated
- [ ] Webhook URL configured with HTTPS
- [ ] Webhook secret added to .env
- [ ] Test payments successful
- [ ] Signature verification working
- [ ] Certificate download blocked without payment
- [ ] Refund process tested
- [ ] Error handling implemented
- [ ] Payment logs monitored
- [ ] SSL certificate installed
- [ ] CORS configured properly
- [ ] Rate limiting enabled

---

## 📞 Support

**Razorpay Support:**
- Email: support@razorpay.com
- Phone: 1800-120-020-020
- Docs: https://razorpay.com/docs/

**CEAS-LMS Support:**
- Email: support@ncui.in
- Check logs: `lms/backend/logs/error.log`

---

## ✅ Summary

✅ **Payment Gateway:** Razorpay integrated  
✅ **Certificate Fee:** Rs. 50/- (5000 paise)  
✅ **Security:** Signature verification enabled  
✅ **Download Block:** Certificate blocked until payment  
✅ **Webhook:** Auto-update payment status  
✅ **Refund:** Admin can process refunds  
✅ **Test Mode:** Ready for testing  

**Happy Coding! 💻**
