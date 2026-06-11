import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  amount: {
    type: Number,
    required: true,
    default: 5000 // Rs. 50.00 in paise
  },
  currency: {
    type: String,
    default: 'INR'
  },
  purpose: {
    type: String,
    enum: ['certificate', 'course-enrollment', 'other'],
    default: 'certificate'
  },
  certificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'netbanking', 'upi', 'wallet', 'other']
  },
  paymentGateway: {
    type: String,
    default: 'razorpay'
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failureReason: String,
  refundId: String,
  refundedAt: Date,
  refundAmount: Number,
  metadata: {
    ipAddress: String,
    userAgent: String,
    email: String,
    mobile: String
  },
  receipt: {
    receiptNumber: String,
    receiptUrl: String,
    generatedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ certificate: 1 });
paymentSchema.index({ transactionDate: -1 });

// Generate unique order ID
paymentSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.orderId = `ORD-${timestamp}-${random}`;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
