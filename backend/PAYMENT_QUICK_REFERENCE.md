# 💳 Payment Integration - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Razorpay Account Setup
```
1. Visit: https://razorpay.com/
2. Sign Up → Get Test Keys
3. Copy: Key ID & Key Secret
```

### 2. Update .env
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
CERTIFICATE_FEE=5000
```

### 3. Test
```bash
npm run dev
node test-payment-flow.js
```

---

## 📋 API Endpoints Cheat Sheet

### Payment APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/create-order` | User | Create payment order |
| POST | `/api/v1/payments/verify` | User | Verify payment |
| GET | `/api/v1/payments/my-payments` | User | Payment history |
| GET | `/api/v1/payments/:id` | User/Admin | Payment details |
| GET | `/api/v1/payments` | Admin | All payments |
| POST | `/api/v1/payments/:id/refund` | Admin | Process refund |
| POST | `/api/v1/payments/webhook` | Public | Razorpay webhook |

### Certificate APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/certificates/my-certificates` | User | My certificates |
| GET | `/api/v1/certificates/:id` | User | Certificate details |
| GET | `/api/v1/certificates/:id/download` | User | **Download (PAYMENT REQUIRED)** |
| GET | `/api/v1/certificates/verify/:number` | Public | Verify certificate |
| POST | `/api/v1/certificates/generate` | Admin | Generate certificate |
| PUT | `/api/v1/certificates/:id/revoke` | Admin | Revoke certificate |
| GET | `/api/v1/certificates` | Admin | All certificates |

---

## 🔑 Test Credentials

### Login
```json
{
  "emailOrMobile": "student@ncui.in",
  "password": "Student@123"
}
```

### Test Cards (Razorpay)
```
Success: 4111 1111 1111 1111
Failure: 4000 0000 0000 0002
CVV: 123
Expiry: 12/25
```

### Test UPI
```
UPI ID: success@razorpay
```

---

## 💰 Payment Flow (Quick)

```
1. Create Order    → POST /payments/create-order
2. Pay on Razorpay → Razorpay Checkout
3. Verify Payment  → POST /payments/verify
4. Download Cert   → GET /certificates/:id/download
```

---

## 🔒 Security Checks

### ✅ Implemented
- [x] Razorpay signature verification
- [x] Certificate download blocked without payment
- [x] Payment status double-check
- [x] Webhook signature verification
- [x] User authorization
- [x] Rate limiting

### ⚠️ Critical
```javascript
// Signature verification (NEVER skip)
if (generatedSignature !== razorpaySignature) {
  return "Invalid payment - REJECTED"
}

// Download protection (NEVER skip)
if (!certificate.isPaid) {
  return "402 Payment Required"
}
```

---

## 📊 Payment Status

| Status | Description | Action |
|--------|-------------|--------|
| `pending` | Order created, payment not done | Wait for payment |
| `completed` | Payment successful ✅ | Allow download |
| `failed` | Payment failed ❌ | Retry payment |
| `refunded` | Refund processed 💸 | Block download |

---

## 🧪 Testing Commands

```bash
# Start backend
npm run dev

# Run test script
node test-payment-flow.js

# Check logs
tail -f logs/error.log
```

---

## 📁 Important Files

### Controllers
```
src/controllers/payment.controller.js       (450 lines)
src/controllers/certificate.controller.js   (350 lines)
```

### Routes
```
src/routes/payment.routes.js
src/routes/certificate.routes.js
```

### Models
```
src/models/Payment.model.js
src/models/Certificate.model.js
```

### Documentation
```
RAZORPAY_INTEGRATION_GUIDE.md      (Complete guide)
PAYMENT_INTEGRATION_SUMMARY.md     (Quick summary)
PAYMENT_KAISE_KAAM_KARTA_HAI.md   (Hindi explanation)
PAYMENT_COMPLETE.md                (Implementation status)
PAYMENT_QUICK_REFERENCE.md         (This file)
```

### Testing
```
test-payment-flow.js               (Automated test)
```

---

## 🎨 Frontend Integration (React)

### Install
```bash
npm install react-razorpay
```

### Add Script
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Payment Button
```jsx
const handlePayment = async () => {
  // 1. Create order
  const { data } = await axios.post('/api/v1/payments/create-order', {
    certificateId: cert._id
  });

  // 2. Open Razorpay
  const options = {
    key: data.data.key,
    amount: data.data.amount,
    order_id: data.data.orderId,
    handler: async (response) => {
      // 3. Verify payment
      await axios.post('/api/v1/payments/verify', response);
      alert('Payment successful!');
    }
  };
  
  const razorpay = new window.Razorpay(options);
  razorpay.open();
};
```

---

## 🐛 Troubleshooting

### Payment Not Creating
```
Check: RAZORPAY_KEY_ID in .env
Check: RAZORPAY_KEY_SECRET in .env
Check: Backend logs
```

### Signature Verification Failed
```
Check: RAZORPAY_KEY_SECRET is correct
Check: Response from Razorpay is complete
Check: No modification in payment data
```

### Download Still Blocked
```
Check: certificate.isPaid === true
Check: payment.status === "completed"
Check: User is logged in
Check: Certificate belongs to user
```

### Webhook Not Working
```
Check: Webhook URL is correct
Check: RAZORPAY_WEBHOOK_SECRET in .env
Check: Webhook events are enabled
Check: URL is HTTPS (production)
```

---

## 📞 Quick Help

### Razorpay
- Dashboard: https://dashboard.razorpay.com
- Docs: https://razorpay.com/docs/
- Support: support@razorpay.com

### Backend
- Logs: `lms/backend/logs/error.log`
- Test: `node test-payment-flow.js`
- Docs: `RAZORPAY_INTEGRATION_GUIDE.md`

---

## ✅ Pre-Production Checklist

- [ ] Razorpay KYC completed
- [ ] Live API keys generated
- [ ] .env updated with live keys
- [ ] Webhook configured (HTTPS)
- [ ] Test payments successful
- [ ] Signature verification working
- [ ] Download protection tested
- [ ] Refund process tested
- [ ] Error handling verified
- [ ] Logs monitored
- [ ] SSL certificate installed
- [ ] CORS configured
- [ ] Rate limiting enabled

---

## 💡 Pro Tips

### Development
```
✅ Use test keys
✅ Test with test cards
✅ Check logs frequently
✅ Run test script
```

### Production
```
✅ Use live keys
✅ Enable webhook
✅ Monitor payments
✅ Setup alerts
```

### Security
```
✅ Never skip signature verification
✅ Always check payment status
✅ Validate user authorization
✅ Log all payment attempts
```

---

## 🎯 Key Numbers

| Item | Value |
|------|-------|
| Certificate Fee | Rs. 50.00 |
| Amount in Paise | 5000 |
| Currency | INR |
| Payment Gateway | Razorpay |
| Webhook Events | 3 (captured, failed, refund) |
| Test Cards | 2 (success, failure) |

---

## 📈 Admin Queries

### Total Revenue
```javascript
const stats = await Payment.aggregate([
  { $match: { status: 'completed' } },
  { $group: { _id: null, total: { $sum: '$amount' } } }
]);
// Result: { total: 600000 } = Rs. 6,000/-
```

### Pending Payments
```javascript
const pending = await Payment.countDocuments({ 
  status: 'pending' 
});
```

### Failed Payments
```javascript
const failed = await Payment.find({ 
  status: 'failed' 
}).populate('user', 'email');
```

---

## 🔄 Common Workflows

### Student Workflow
```
1. Complete course
2. View certificate (unpaid)
3. Click "Pay Now"
4. Complete payment
5. Download certificate
```

### Admin Workflow
```
1. Generate certificate
2. Monitor payments
3. Process refunds (if needed)
4. View statistics
```

### Trainer Workflow
```
1. Generate certificate for student
2. Notify student
3. Track completion
```

---

## 🎊 Summary

### ✅ Complete
- Backend implementation
- Security features
- Download protection
- Webhook handler
- Admin refund system
- Complete documentation
- Test script

### ⏳ Pending
- Razorpay account setup
- API keys configuration
- Webhook setup
- Frontend integration

---

**🚀 Quick Start: 5 minutes to setup!**

**📖 Full Guide: RAZORPAY_INTEGRATION_GUIDE.md**

**🧪 Test: node test-payment-flow.js**

**Happy Coding! 💻**
