import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import { cacheGet, cacheSet, isRedisReady } from '../config/redis.js';

/**
 * Protect routes - Verify JWT token
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Use _id from decoded token (supports both id and _id)
    const userId = decoded._id || decoded.id;
    const userRole = decoded.role;

    // Check Redis cache first for user data
    const cacheKey = `user:${userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      // If role is trainer, check Trainer collection, otherwise check User collection
      if (userRole === 'trainer') {
        const Trainer = (await import('../models/Trainer.model.js')).default;
        user = await Trainer.findById(userId).select('-password');
        if (!user) {
          user = await User.findById(userId).select('-password');
        }
      } else {
        user = await User.findById(userId).select('-password');
      }

      if (!user) {
        return next(new ErrorResponse('User not found', 404));
      }

      // Cache user data for 1 hour
      if (isRedisReady()) {
        await cacheSet(cacheKey, user, 3600);
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ErrorResponse('Your account has been deactivated', 403));
    }

    // Check if user is approved (for trainers and students)
    if ((user.role === 'trainer' || user.role === 'student') && !user.isApproved) {
      return next(new ErrorResponse('Your account is pending approval', 403));
    }

    // Check if account is locked
    if (user.isLocked) {
      return next(new ErrorResponse('Your account is temporarily locked due to multiple failed login attempts', 423));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Token expired, please login again', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ErrorResponse('Invalid token, please login again', 401));
    }
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
});

/**
 * Verify OTP for authentication
 */
export const verifyOTP = asyncHandler(async (req, res, next) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp) {
    return next(new ErrorResponse('Please provide mobile number and OTP', 400));
  }

  // Find user in unified User model
  const user = await User.findOne({ mobile }).select('+mobileVerificationOTP +mobileVerificationExpire');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if OTP is expired
  if (!user.mobileVerificationExpire || user.mobileVerificationExpire < Date.now()) {
    return next(new ErrorResponse('OTP has expired', 400));
  }

  // Verify OTP
  if (user.mobileVerificationOTP !== otp) {
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  // Clear OTP fields
  user.mobileVerificationOTP = undefined;
  user.mobileVerificationExpire = undefined;
  user.isMobileVerified = true;
  await user.save();

  req.user = user;
  next();
});

/**
 * Check if email is verified
 */
export const requireEmailVerification = asyncHandler(async (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(new ErrorResponse('Please verify your email address first', 403));
  }
  next();
});

/**
 * Check if mobile is verified
 */
export const requireMobileVerification = asyncHandler(async (req, res, next) => {
  if (!req.user.isMobileVerified) {
    return next(new ErrorResponse('Please verify your mobile number first', 403));
  }
  next();
});

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Use _id from decoded token (supports both id and _id)
      const userId = decoded._id || decoded.id;
      
      // Check Redis cache first for user data
      const cacheKey = `user:${userId}`;
      let user = await cacheGet(cacheKey);

      if (!user) {
        if (decoded.role === 'trainer') {
          const Trainer = (await import('../models/Trainer.model.js')).default;
          user = await Trainer.findById(userId).select('-password');
        }

        // Fall back to unified User model for migrated/imported trainer accounts.
        if (!user) {
          user = await User.findById(userId).select('-password');
        }
        
        if (user) {
          // Cache user data for 1 hour
          if (isRedisReady()) {
            await cacheSet(cacheKey, user, 3600);
          }
        }
      }
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }

  next();
});

export default { protect, verifyOTP, requireEmailVerification, requireMobileVerification, optionalAuth };
