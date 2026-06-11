import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.model.js';
import Certificate from '../models/Certificate.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import logger from '../config/logger.js';

// Initialize Razorpay instance (only if credentials are configured)
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && 
    process.env.RAZORPAY_KEY_SECRET && 
    process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  logger.info('✅ Razorpay initialized successfully');
} else {
  logger.warn('⚠️  Razorpay not configured. Payment features disabled.');
  logger.warn('💡 Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
}

/**
 * @desc    Create Razorpay order for certificate payment
 * @route   POST /api/v1/payments/create-order
 * @access  Private (Participant)
 */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  // Check if Razorpay is configured
  if (!razorpay) {
    return res.status(503).json({
      success: false,
      message: 'Payment gateway not configured. Please contact administrator.',
      error: 'RAZORPAY_NOT_CONFIGURED'
    });
  }

  const { certificateId } = req.body;

  // Validate certificate ID
  if (!certificateId) {
    return res.status(400).json({
      success: false,
      message: 'Certificate ID is required'
    });
  }

  // Check if certificate exists and belongs to user
  const certificate = await Certificate.findById(certificateId);
  
  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: 'Certificate not found'
    });
  }

  if (certificate.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to pay for this certificate'
    });
  }

  // Check if certificate is already paid
  if (certificate.isPaid) {
    return res.status(400).json({
      success: false,
      message: 'Certificate payment already completed'
    });
  }

  // Check if payment already exists for this certificate
  const existingPayment = await Payment.findOne({
    certificate: certificateId,
    status: { $in: ['completed', 'processing'] }
  });

  if (existingPayment) {
    return res.status(400).json({
      success: false,
      message: 'Payment already exists for this certificate',
      payment: existingPayment
    });
  }

  // Get certificate fee from env (in paise)
  const amount = parseInt(process.env.CERTIFICATE_FEE) || 5000; // Rs. 50.00

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: amount, // Amount in paise
    currency: 'INR',
    receipt: `cert_${certificateId}_${Date.now()}`,
    notes: {
      certificateId: certificateId.toString(),
      userId: req.user._id.toString(),
      purpose: 'certificate_download'
    }
  });

  // Create payment record in database
  const payment = await Payment.create({
    user: req.user._id,
    orderId: razorpayOrder.receipt,
    razorpayOrderId: razorpayOrder.id,
    amount: amount,
    currency: 'INR',
    purpose: 'certificate',
    certificate: certificateId,
    status: 'pending',
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      email: req.user.email,
      mobile: req.user.mobile
    }
  });

  logger.info(`Payment order created: ${payment.orderId} for user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Payment order created successfully',
    data: {
      orderId: razorpayOrder.id,
      amount: amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      payment: {
        _id: payment._id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status
      },
      user: {
        name: req.user.fullName,
        email: req.user.email,
        mobile: req.user.mobile
      }
    }
  });
});

/**
 * @desc    Verify Razorpay payment signature
 * @route   POST /api/v1/payments/verify
 * @access  Private (Participant)
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature 
  } = req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: 'Missing payment verification parameters'
    });
  }

  // Find payment by Razorpay order ID
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment record not found'
    });
  }

  // Verify payment belongs to the user
  if (payment.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized payment verification attempt'
    });
  }

  // CRITICAL SECURITY: Verify Razorpay signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    // Signature verification failed - mark payment as failed
    payment.status = 'failed';
    payment.failureReason = 'Invalid payment signature';
    await payment.save();

    logger.error(`Payment signature verification failed for order: ${razorpay_order_id}`);

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed. Invalid signature.'
    });
  }

  // Signature verified successfully
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status = 'completed';
  payment.completedAt = new Date();
  await payment.save();

  // Update certificate payment status
  const certificate = await Certificate.findById(payment.certificate);
  if (certificate) {
    certificate.isPaid = true;
    certificate.paidAt = new Date();
    certificate.paymentId = payment._id;
    await certificate.save();
  }

  logger.info(`Payment verified successfully: ${razorpay_payment_id} for user: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully. Certificate is now available for download.',
    data: {
      paymentId: payment._id,
      razorpayPaymentId: razorpay_payment_id,
      status: payment.status,
      amount: payment.amount,
      certificate: {
        _id: certificate._id,
        isPaid: certificate.isPaid,
        downloadUrl: `/api/v1/certificates/${certificate._id}/download`
      }
    }
  });
});

/**
 * @desc    Get user's payment history
 * @route   GET /api/v1/payments/my-payments
 * @access  Private (Participant)
 */
export const getMyPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { user: req.user._id };
  
  if (status) {
    query.status = status;
  }

  const payments = await Payment.find(query)
    .populate('certificate', 'certificateNumber courseName issuedDate')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Payment.countDocuments(query);

  res.status(200).json({
    success: true,
    count: payments.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: payments
  });
});

/**
 * @desc    Get payment details by ID
 * @route   GET /api/v1/payments/:paymentId
 * @access  Private
 */
export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId)
    .populate('user', 'firstName lastName email mobile')
    .populate('certificate', 'certificateNumber courseName issuedDate')
    .populate('course', 'title');

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  // Check authorization
  if (
    req.user.role !== 'administrator' && 
    payment.user._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this payment'
    });
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

/**
 * @desc    Get all payments (Admin only)
 * @route   GET /api/v1/payments
 * @access  Private (Administrator)
 */
export const getAllPayments = asyncHandler(async (req, res) => {
  const { 
    status, 
    purpose, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 20 
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (purpose) query.purpose = purpose;
  
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
  }

  const payments = await Payment.find(query)
    .populate('user', 'firstName lastName email mobile role')
    .populate('certificate', 'certificateNumber courseName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Payment.countDocuments(query);

  // Calculate statistics
  const stats = await Payment.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: payments.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    statistics: stats,
    data: payments
  });
});

/**
 * @desc    Process refund (Admin only)
 * @route   POST /api/v1/payments/:paymentId/refund
 * @access  Private (Administrator)
 */
export const processRefund = asyncHandler(async (req, res) => {
  // Check if Razorpay is configured
  if (!razorpay) {
    return res.status(503).json({
      success: false,
      message: 'Payment gateway not configured. Please contact administrator.'
    });
  }

  const { reason, amount } = req.body;
  const payment = await Payment.findById(req.params.paymentId);

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  if (payment.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Only completed payments can be refunded'
    });
  }

  if (payment.status === 'refunded') {
    return res.status(400).json({
      success: false,
      message: 'Payment already refunded'
    });
  }

  // Process refund with Razorpay
  const refundAmount = amount || payment.amount;
  
  const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
    amount: refundAmount,
    notes: {
      reason: reason || 'Refund requested by admin',
      refundedBy: req.user._id.toString()
    }
  });

  // Update payment record
  payment.status = 'refunded';
  payment.refundId = refund.id;
  payment.refundAmount = refundAmount;
  payment.refundedAt = new Date();
  payment.failureReason = reason;
  await payment.save();

  // Update certificate if exists
  if (payment.certificate) {
    const certificate = await Certificate.findById(payment.certificate);
    if (certificate) {
      certificate.isPaid = false;
      certificate.paidAt = null;
      await certificate.save();
    }
  }

  logger.info(`Refund processed: ${refund.id} for payment: ${payment._id}`);

  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: {
      refundId: refund.id,
      amount: refundAmount,
      status: payment.status
    }
  });
});

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Razorpay only)
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  const generatedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (generatedSignature !== webhookSignature) {
    logger.error('Invalid webhook signature');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const event = req.body.event;
  const paymentEntity = req.body.payload.payment.entity;

  logger.info(`Webhook received: ${event}`);

  // Handle different webhook events
  switch (event) {
    case 'payment.captured':
      await handlePaymentCaptured(paymentEntity);
      break;
    
    case 'payment.failed':
      await handlePaymentFailed(paymentEntity);
      break;
    
    case 'refund.created':
      await handleRefundCreated(req.body.payload.refund.entity);
      break;
    
    default:
      logger.info(`Unhandled webhook event: ${event}`);
  }

  res.status(200).json({ success: true });
});

// Helper function: Handle payment captured
async function handlePaymentCaptured(paymentEntity) {
  const payment = await Payment.findOne({ 
    razorpayOrderId: paymentEntity.order_id 
  });

  if (payment && payment.status === 'pending') {
    payment.razorpayPaymentId = paymentEntity.id;
    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.paymentMethod = paymentEntity.method;
    await payment.save();

    // Update certificate
    if (payment.certificate) {
      await Certificate.findByIdAndUpdate(payment.certificate, {
        isPaid: true,
        paidAt: new Date(),
        paymentId: payment._id
      });
    }

    logger.info(`Payment captured via webhook: ${paymentEntity.id}`);
  }
}

// Helper function: Handle payment failed
async function handlePaymentFailed(paymentEntity) {
  const payment = await Payment.findOne({ 
    razorpayOrderId: paymentEntity.order_id 
  });

  if (payment) {
    payment.status = 'failed';
    payment.failureReason = paymentEntity.error_description || 'Payment failed';
    await payment.save();

    logger.error(`Payment failed via webhook: ${paymentEntity.id}`);
  }
}

// Helper function: Handle refund created
async function handleRefundCreated(refundEntity) {
  const payment = await Payment.findOne({ 
    razorpayPaymentId: refundEntity.payment_id 
  });

  if (payment) {
    payment.status = 'refunded';
    payment.refundId = refundEntity.id;
    payment.refundAmount = refundEntity.amount;
    payment.refundedAt = new Date();
    await payment.save();

    // Update certificate
    if (payment.certificate) {
      await Certificate.findByIdAndUpdate(payment.certificate, {
        isPaid: false,
        paidAt: null
      });
    }

    logger.info(`Refund processed via webhook: ${refundEntity.id}`);
  }
}
