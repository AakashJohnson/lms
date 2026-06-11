import express from 'express';
import {
  register,
  verifyOTP,
  resendOTP,
  login,
  loginWithOTP,
  verifyLoginOTP,
  getMe,
  logout,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { authRateLimiter, otpRateLimiter } from '../middlewares/rateLimiter.js';
import { checkDatabase } from '../middlewares/checkDatabase.js';

const router = express.Router();

// Apply database check to all routes that need database
router.use(checkDatabase);

// Public routes
router.post('/register', authRateLimiter, register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', otpRateLimiter, resendOTP);
router.post('/login', authRateLimiter, login);
router.post('/login-otp', otpRateLimiter, loginWithOTP);
router.post('/verify-login-otp', verifyLoginOTP);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
