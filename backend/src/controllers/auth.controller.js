import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import sendEmail from '../utils/sendEmail.js';
import sendSMS from '../utils/sendSMS.js';
import { generateOTP, getOTPExpiry } from '../utils/generateOTP.js';
import { cacheSet, cacheDel } from '../config/redis.js';
import { logStudentActivity } from '../services/activityLogger.service.js';
import crypto from 'crypto';

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, mobile, password, role, organization, designation } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
  
  if (existingUser) {
    return next(new ErrorResponse('User with this email or mobile already exists', 400));
  }

  // Create user (will be pending approval)
  const user = await User.create({
    firstName,
    lastName,
    email,
    mobile,
    password,
    role: role || 'student',
    organization,
    designation,
    isApproved: false // Requires admin approval
  });

  // Generate OTP for mobile verification
  const otp = generateOTP();
  user.mobileVerificationOTP = otp;
  user.mobileVerificationExpire = getOTPExpiry();
  await user.save();

  // Send OTP via SMS
  try {
    await sendSMS({
      mobile: user.mobile,
      message: `Your NCUI CEAS LMS verification OTP is: ${otp}. Valid for 10 minutes.`
    });
  } catch (error) {
    user.mobileVerificationOTP = undefined;
    user.mobileVerificationExpire = undefined;
    await user.save();
    return next(new ErrorResponse('Error sending OTP. Please try again.', 500));
  }

  // Send welcome email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Welcome to NCUI CEAS LMS',
      html: `
        <h2>Welcome ${user.firstName}!</h2>
        <p>Thank you for registering with NCUI CEAS Learning Management System.</p>
        <p>Your account is currently pending approval from our administrators.</p>
        <p>You will receive a notification once your account is approved.</p>
        <p>Please verify your mobile number using the OTP sent to ${user.mobile}</p>
      `
    });
  } catch (error) {
    // Email failure shouldn't stop registration
    console.error('Welcome email failed:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please verify your mobile number and wait for admin approval.',
    data: {
      userId: user._id,
      mobile: user.mobile,
      isApproved: user.isApproved
    }
  });
});

/**
 * @desc    Verify mobile OTP
 * @route   POST /api/v1/auth/verify-otp
 * @access  Public
 */
export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return next(new ErrorResponse('Please provide mobile number and OTP', 400));
  }

  const user = await User.findOne({ mobile }).select('+mobileVerificationOTP +mobileVerificationExpire');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!user.mobileVerificationExpire || user.mobileVerificationExpire < Date.now()) {
    return next(new ErrorResponse('OTP has expired', 400));
  }

  if (user.mobileVerificationOTP !== otp) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  user.mobileVerificationOTP = undefined;
  user.mobileVerificationExpire = undefined;
  user.isMobileVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Mobile number verified successfully'
  });
});

/**
 * @desc    Resend OTP
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
export const resendOTP = asyncHandler(async (req, res, next) => {
  const { mobile } = req.body;

  const user = await User.findOne({ mobile });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.isMobileVerified) {
    return next(new ErrorResponse('Mobile number already verified', 400));
  }

  const otp = generateOTP();
  user.mobileVerificationOTP = otp;
  user.mobileVerificationExpire = getOTPExpiry();
  await user.save();

  await sendSMS({
    mobile: user.mobile,
    message: `Your NCUI CEAS LMS verification OTP is: ${otp}. Valid for 10 minutes.`
  });

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully'
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { emailOrMobile, password } = req.body;

  console.log('🔍 Login attempt:', { emailOrMobile, passwordLength: password?.length });

  if (!emailOrMobile || !password) {
    return next(new ErrorResponse('Please provide email/mobile and password', 400));
  }

  const Trainer = (await import('../models/Trainer.model.js')).default;

  // Trainer data may exist in both collections during migration/imports.
  // Build candidates first, then authenticate against the matching password
  // instead of failing on the first duplicate email/mobile record.
  const candidates = [];

  const userCandidate = await User.findOne({
    $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
  }).select('+password');

  const trainerCandidate = await Trainer.findOne({
    $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
  }).select('+password');

  if (trainerCandidate) {
    candidates.push({ user: trainerCandidate, accountType: 'trainer' });
    console.log('👤 User found in Trainer collection:', `${trainerCandidate.email} (${trainerCandidate.role})`);
  }

  if (userCandidate) {
    candidates.push({ user: userCandidate, accountType: 'user' });
    console.log('👤 User found in User collection:', `${userCandidate.email} (${userCandidate.role})`);
  }

  if (!candidates.length) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  let matched = null;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const isPasswordMatch = await candidate.user.comparePassword(password);
    console.log('🔐 Password comparison:', {
      accountType: candidate.accountType,
      email: candidate.user.email,
      isMatch: isPasswordMatch,
      providedPasswordLength: password.length,
      storedHashLength: candidate.user.password.length
    });
    if (isPasswordMatch) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    await candidates[0].user.incLoginAttempts();
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  const { user, accountType } = matched;

  // Check if account is locked
  if (user.isLocked) {
    return next(new ErrorResponse('Account is temporarily locked. Please try again later.', 423));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated', 403));
  }

  if (!user.isApproved) {
    return next(new ErrorResponse(
      accountType === 'trainer' ? 'Your trainer account is pending approval' : 'Your account is pending approval',
      403
    ));
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  if (user.role === 'student') {
    logStudentActivity({
      req,
      studentId: user._id,
      activityType: 'login',
      title: 'Logged in',
      description: 'Student signed in with password',
      status: 'success',
    }).catch(() => {});
  }

  // Generate token
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Login with OTP
 * @route   POST /api/v1/auth/login-otp
 * @access  Public
 */
export const loginWithOTP = asyncHandler(async (req, res, next) => {
  const { mobile } = req.body;

  if (!mobile) {
    return next(new ErrorResponse('Mobile number is required', 400));
  }

  // First check User collection
  let user = await User.findOne({ mobile });
  let accountType = 'user';

  if (!user) {
    // If not found in User, check Trainer collection
    const Trainer = (await import('../models/Trainer.model.js')).default;
    user = await Trainer.findOne({ mobile });
    accountType = 'trainer';
  }

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated', 403));
  }

  if (!user.isApproved) {
    return next(new ErrorResponse(
      accountType === 'trainer' ? 'Your trainer account is pending approval' : 'Your account is pending approval',
      403
    ));
  }

  const otp = generateOTP();
  user.mobileVerificationOTP = otp;
  user.mobileVerificationExpire = getOTPExpiry();
  await user.save();

  await sendSMS({
    mobile: user.mobile,
    message: `Your NCUI CEAS LMS login OTP is: ${otp}. Valid for 10 minutes.`
  });

  res.status(200).json({
    success: true,
    message: 'OTP sent to your mobile number'
  });
});

/**
 * @desc    Verify login OTP
 * @route   POST /api/v1/auth/verify-login-otp
 * @access  Public
 */
export const verifyLoginOTP = asyncHandler(async (req, res, next) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return next(new ErrorResponse('Mobile number and OTP are required', 400));
  }

  // First check User collection
  let user = await User.findOne({ mobile }).select('+mobileVerificationOTP +mobileVerificationExpire');
  let accountType = 'user';

  if (!user) {
    // If not found in User, check Trainer collection
    const Trainer = (await import('../models/Trainer.model.js')).default;
    user = await Trainer.findOne({ mobile }).select('+mobileVerificationOTP +mobileVerificationExpire');
    accountType = 'trainer';
  }

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!user.mobileVerificationExpire || user.mobileVerificationExpire < Date.now()) {
    return next(new ErrorResponse('OTP has expired', 400));
  }

  if (user.mobileVerificationOTP !== otp) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  user.mobileVerificationOTP = undefined;
  user.mobileVerificationExpire = undefined;
  user.lastLogin = Date.now();
  await user.save();

  if (user.role === 'student') {
    logStudentActivity({
      req,
      studentId: user._id,
      activityType: 'login',
      title: 'Logged in',
      description: 'Student signed in with OTP',
      status: 'success',
    }).catch(() => {});
  }

  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res, next) => {
  const userRole = req.user?.role;

  let user = null;

  // If role is trainer, fetch from Trainer collection, otherwise from User collection
  if (userRole === 'trainer') {
    const Trainer = (await import('../models/Trainer.model.js')).default;
    user = await Trainer.findById(req.user._id).select('-password');
    if (!user) {
      user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpire');
    }
  } else {
    user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpire');
  }

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Update cache with fresh data
  await cacheSet(`user:${user._id}`, user, 3600);

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res, next) => {
  // Clear cache
  await cacheDel(`user:${req.user._id}`);

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your NCUI CEAS LMS account.</p>
    <p>Please click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 30 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html: message
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/reset-password/:resetToken
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resetToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Cache user data
  cacheSet(`user:${user._id}`, user, 3600);

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      profilePicture: user.profilePicture,
      isApproved: user.isApproved
    }
  });
};

export default {
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
};
