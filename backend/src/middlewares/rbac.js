import ErrorResponse from '../utils/errorResponse.js';

/**
 * Role-Based Access Control Middleware
 * Grant access to specific roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is not authorized to access this route`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Check if user is administrator
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'administrator') {
    return next(new ErrorResponse('Access denied. Administrator privileges required', 403));
  }
  next();
};

/**
 * Check if user is trainer/faculty
 */
export const isTrainer = (req, res, next) => {
  if (!req.user || !['trainer', 'administrator'].includes(req.user.role)) {
    return next(new ErrorResponse('Access denied. Trainer privileges required', 403));
  }
  next();
};

/**
 * Check if user is student
 */
export const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return next(new ErrorResponse('Access denied. Student access only', 403));
  }
  next();
};

/**
 * Check if user owns the resource or is admin
 */
export const isOwnerOrAdmin = (resourceUserIdField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized', 401));
    }

    // Admin can access everything
    if (req.user.role === 'administrator') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.resource?.[resourceUserIdField]?.toString() || 
                          req.params?.userId?.toString();

    if (resourceUserId && resourceUserId === req.user._id.toString()) {
      return next();
    }

    return next(new ErrorResponse('Not authorized to access this resource', 403));
  };
};

/**
 * Check if user is course instructor or admin
 */
export const isCourseInstructorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new ErrorResponse('Not authorized', 401));
  }

  // Admin can access everything
  if (req.user.role === 'administrator') {
    return next();
  }

  // Check if user is the course instructor
  const courseInstructorId = req.course?.instructor?.toString();
  const coInstructors = req.course?.coInstructors?.map(id => id.toString()) || [];

  if (
    courseInstructorId === req.user._id.toString() ||
    coInstructors.includes(req.user._id.toString())
  ) {
    return next();
  }

  return next(new ErrorResponse('Not authorized to manage this course', 403));
};

/**
 * Permission-based access control
 * More granular than role-based
 */
const permissions = {
  // User Management
  'users:create': ['administrator'],
  'users:read': ['administrator', 'trainer'],
  'users:update': ['administrator'],
  'users:delete': ['administrator'],
  'users:approve': ['administrator'],
  
  // Course Management
  'courses:create': ['administrator', 'trainer'],
  'courses:read': ['administrator', 'trainer', 'student'],
  'courses:update': ['administrator', 'trainer'],
  'courses:delete': ['administrator'],
  'courses:publish': ['administrator', 'trainer'],
  
  // Content Management
  'content:upload': ['administrator', 'trainer'],
  'content:update': ['administrator', 'trainer'],
  'content:delete': ['administrator', 'trainer'],
  
  // Assessment Management
  'assessments:create': ['administrator', 'trainer'],
  'assessments:update': ['administrator', 'trainer'],
  'assessments:delete': ['administrator', 'trainer'],
  'assessments:evaluate': ['administrator', 'trainer'],
  'assessments:attempt': ['student'],
  
  // Certificate Management
  'certificates:generate': ['administrator'],
  'certificates:download': ['student'],
  'certificates:revoke': ['administrator'],
  
  // Report Access
  'reports:view': ['administrator', 'trainer'],
  'reports:export': ['administrator'],
  
  // Payment Management
  'payments:process': ['student'],
  'payments:refund': ['administrator'],
  'payments:view-all': ['administrator']
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized', 401));
    }

    const allowedRoles = permissions[permission];

    if (!allowedRoles) {
      return next(new ErrorResponse('Invalid permission', 400));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `You do not have permission to perform this action`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Check multiple permissions (user must have at least one)
 */
export const hasAnyPermission = (...permissionList) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized', 401));
    }

    const hasAccess = permissionList.some(permission => {
      const allowedRoles = permissions[permission];
      return allowedRoles && allowedRoles.includes(req.user.role);
    });

    if (!hasAccess) {
      return next(
        new ErrorResponse(
          'You do not have permission to perform this action',
          403
        )
      );
    }

    next();
  };
};

export default {
  authorize,
  isAdmin,
  isTrainer,
  isStudent,
  isOwnerOrAdmin,
  isCourseInstructorOrAdmin,
  hasPermission,
  hasAnyPermission
};
