import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { paymentRateLimiter } from '../middlewares/rateLimiter.js';
import {
  createPaymentOrder,
  verifyPayment,
  getMyPayments,
  getPaymentById,
  getAllPayments,
  processRefund,
  handleWebhook
} from '../controllers/payment.controller.js';

const router = express.Router();

// Webhook route (must be before protect middleware)
router.post('/webhook', handleWebhook);

router.use(protect);

// Payment routes (Participant)
router.post('/create-order', paymentRateLimiter, createPaymentOrder);
router.post('/verify', paymentRateLimiter, verifyPayment);
router.get('/my-payments', getMyPayments);
router.get('/:paymentId', getPaymentById);

// Admin routes
router.get('/', authorize('administrator'), getAllPayments);
router.post('/:paymentId/refund', authorize('administrator'), processRefund);

export default router;
