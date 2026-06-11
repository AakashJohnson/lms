import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Course from '../models/Course.model.js';
import Query from '../models/Query.model.js';
import Media from '../models/Media.model.js';
import Certificate from '../models/Certificate.model.js';
import Payment from '../models/Payment.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import sendEmail from '../utils/sendEmail.js';
import sendSMS from '../utils/sendSMS.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import csv from 'csv-parser';

/**
 * @desc    Get all users with filters
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  const { role, status, isApproved, search, page = 1, limit = 10 } = req.query;

  // Build query for unified User model
  const query = buildUserQuery(req.query);
  
  // Add role filter if specified
  if (role) {
    query.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort('-createdAt'),
    User.countDocuments(query)
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    },
    data: users
  });
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res, next) => {
  // Find in unified User model / Participant collections
  const user = await findUserById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Populate based on role with safe try-catch block
  try {
    if (user.role === 'trainer') {
      if (typeof user.populate === 'function') {
        await user.populate('coursesCreated', 'title thumbnail');
      }
    } else if (user.role === 'student' || user.role === 'participant') {
      if (typeof user.populate === 'function') {
        await user.populate('enrolledCourses', 'title thumbnail');
        await user.populate('completedCourses', 'title thumbnail');
        await user.populate('certificates');
      }
    }
  } catch (err) {
    console.error('Error populating user references in getUserById:', err);
  }

  // Exclude password from response
  const responseData = user.toObject ? user.toObject() : user;
  if (responseData.password) {
    delete responseData.password;
  }

  res.status(200).json({
    success: true,
    data: responseData
  });
});

/**
 * @desc    Approve user
 * @route   PUT /api/v1/admin/users/:id/approve
 * @access  Private/Admin
 */
export const approveUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.isApproved) {
    return next(new ErrorResponse('User is already approved', 400));
  }

  user.isApproved = true;
  user.isActive = true;
  await user.save();

  // Send approval email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Account Approved - NCUI CEAS LMS',
      html: `
        <h2>Congratulations ${user.firstName}!</h2>
        <p>Your account has been approved by the administrator.</p>
        <p>You can now login and access all features of NCUI CEAS Learning Management System.</p>
        <p><a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Login Now</a></p>
        <p>Thank you for joining us!</p>
      `
    });

    await sendSMS({
      mobile: user.mobile,
      message: `Dear ${user.firstName}, your NCUI CEAS LMS account has been approved. Login now at ${process.env.FRONTEND_URL}/login`
    });
  } catch (error) {
    console.error('Notification error:', error);
  }

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('user-approved', {
      userId: user._id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role
    });
  }

  res.status(200).json({
    success: true,
    message: 'User approved successfully',
    data: user
  });
});

/**
 * @desc    Reject user
 * @route   PUT /api/v1/admin/users/:id/reject
 * @access  Private/Admin
 */
export const rejectUser = asyncHandler(async (req, res, next) => {
  const { reason, deleteAccount } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Send rejection email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Account Registration - NCUI CEAS LMS',
      html: `
        <h2>Dear ${user.firstName},</h2>
        <p>Thank you for your interest in NCUI CEAS Learning Management System.</p>
        <p>Unfortunately, we are unable to approve your account at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions, please contact our support team.</p>
      `
    });
  } catch (error) {
    console.error('Email error:', error);
  }

  if (deleteAccount) {
    await Model.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User rejected and account deleted'
    });
  }

  user.isApproved = false;
  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User rejected successfully',
    data: user
  });
});

/**
 * @desc    Activate user
 * @route   PUT /api/v1/admin/users/:id/activate
 * @access  Private/Admin
 */
export const activateUser = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User activated successfully',
    data: user
  });
});

/**
 * @desc    Deactivate user
 * @route   PUT /api/v1/admin/users/:id/deactivate
 * @access  Private/Admin
 */
export const deactivateUser = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  user.isActive = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
    data: user
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const user = await findUserById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Fields that can be updated
  const allowedFields = ['firstName', 'lastName', 'email', 'mobile', 'organization', 'designation', 'isActive', 'isApproved'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/v1/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  // Try to find and delete from all collections
  let deleted = await User.findByIdAndDelete(req.params.id);

  if (!deleted) {
    const Participant = (await import('../models/Participant.model.js')).default;
    deleted = await Participant.findByIdAndDelete(req.params.id);
  }

  if (!deleted) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard/stats
 * @access  Private/Admin
 */
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get counts from unified User model
  const [
    adminCount,
    trainerCount,
    studentCount,
    pendingTrainers,
    pendingStudents,
    totalCourses,
    publishedCourses,
    totalQueries,
    openQueries,
    totalMedia,
    totalCertificates,
    totalPayments,
    totalRevenue
  ] = await Promise.all([
    User.countDocuments({ role: 'administrator', isActive: true }),
    User.countDocuments({ role: 'trainer', isActive: true }),
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'trainer', isApproved: false }),
    User.countDocuments({ role: 'student', isApproved: false }),
    Course.countDocuments(),
    Course.countDocuments({ isPublished: true }),
    Query.countDocuments(),
    Query.countDocuments({ status: 'open' }),
    Media.countDocuments({ isActive: true, source: 'media_library' }),
    Certificate.countDocuments(),
    Payment.countDocuments(),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  // Get recent registrations
  const recentRegistrations = await Promise.all([
    User.find({ role: 'trainer' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt'),
    User.find({ role: 'student' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt role')
  ]);

  const allRecentRegistrations = [...recentRegistrations[0], ...recentRegistrations[1]]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  // Get enrollment count from enrolledCourses array in User model
  const enrollmentCount = await User.aggregate([
    { $match: { role: 'student' } },
    { $project: { count: { $size: '$enrolledCourses' } } },
    { $group: { _id: null, total: { $sum: '$count' } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: adminCount + trainerCount + studentCount,
        admins: adminCount,
        trainers: trainerCount,
        students: studentCount,
        pendingApprovals: pendingTrainers + pendingStudents
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: totalCourses - publishedCourses
      },
      enrollments: {
        total: enrollmentCount[0]?.total || 0
      },
      queries: {
        total: totalQueries,
        open: openQueries,
        resolved: totalQueries - openQueries
      },
      media: {
        total: totalMedia
      },
      certificates: {
        total: totalCertificates
      },
      payments: {
        total: totalPayments,
        revenue: totalRevenue[0]?.total || 0
      },
      recentRegistrations: allRecentRegistrations
    }
  });
});

// Helper function to build user query
function buildUserQuery(queryParams) {
  const { status, isApproved, search } = queryParams;
  let query = {};

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  if (isApproved === 'true') {
    query.isApproved = true;
  } else if (isApproved === 'false') {
    query.isApproved = false;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } }
    ];
  }

  return query;
}

/**
 * @desc    Bulk import users from CSV
 * @route   POST /api/v1/admin/users/bulk-import
 * @access  Private/Admin
 */
export const bulkImportUsers = asyncHandler(async (req, res, next) => {
  const { role, users } = req.body;

  if (!role || !users || !Array.isArray(users)) {
    return next(new ErrorResponse('Role and users array are required', 400));
  }

  if (!['trainer', 'participant'].includes(role)) {
    return next(new ErrorResponse('Role must be either trainer or participant', 400));
  }

  const results = {
    success: [],
    errors: [],
    total: users.length
  };

  // Determine which collection to use
  const Model = role === 'trainer' ? Trainer : Participant;
  const defaultPassword = role === 'trainer' ? 'Trainer@123' : 'Participant@123';

  for (let i = 0; i < users.length; i++) {
    const userData = users[i];
    
    try {
      // Validate required fields
      if (!userData.firstName || !userData.email || !userData.mobile) {
        results.errors.push({
          row: i + 1,
          data: { name: `${userData.firstName} ${userData.lastName}`, email: userData.email },
          error: 'Missing required fields (firstName, email, mobile)'
        });
        continue;
      }

      // Ensure lastName is never empty
      if (!userData.lastName || userData.lastName === '-') {
        userData.lastName = userData.firstName;
      }

      // Validate mobile is 10 digits
      const cleanMobile = String(userData.mobile).replace(/\D/g, '').slice(-10);
      if (cleanMobile.length !== 10) {
        results.errors.push({
          row: i + 1,
          data: { name: `${userData.firstName} ${userData.lastName}`, email: userData.email },
          error: `Invalid mobile number: "${userData.mobile}" — must be 10 digits`
        });
        continue;
      }
      userData.mobile = cleanMobile;

      // Check if user already exists
      const existingUser = await Model.findOne({
        $or: [{ email: userData.email }, { mobile: userData.mobile }]
      });

      if (existingUser) {
        results.errors.push({
          row: i + 1,
          data: userData,
          error: 'User with this email or mobile already exists'
        });
        continue;
      }

      // Set password (will be hashed by model's pre-save hook)
      const password = userData.password || defaultPassword;

      // Create user object
      const userObj = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.toLowerCase().trim(),
        mobile: userData.mobile.trim(),
        password: password, // Plain text - model will hash it
        role: role,
        organization: userData.organization || '',
        designation: userData.designation || '',
        isApproved: false, // All bulk imported users need approval
        isActive: true,
        isEmailVerified: false,
        isMobileVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add role-specific fields
      if (role === 'trainer') {
        userObj.specialization = userData.specialization ? userData.specialization.split(',').map(s => s.trim()) : [];
        userObj.experience = parseInt(userData.experience) || 0;
        userObj.coursesCreated = [];
        userObj.totalStudents = 0;
        userObj.rating = 0;
      } else {
        userObj.enrolledCourses = [];
        userObj.completedCourses = [];
        userObj.certificates = [];
        userObj.totalCoursesEnrolled = 0;
        userObj.totalCoursesCompleted = 0;
      }

      // Create user
      const newUser = await Model.create(userObj);

      results.success.push({
        row: i + 1,
        data: {
          id: newUser._id,
          name: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          mobile: newUser.mobile,
          role: newUser.role
        }
      });

    } catch (error) {
      results.errors.push({
        row: i + 1,
        data: userData,
        error: error.message
      });
    }
  }

  // Emit socket event for real-time updates
  const io = req.app.get('io');
  if (io) {
    io.emit('bulk-import-completed', {
      role,
      total: results.total,
      success: results.success.length,
      errors: results.errors.length
    });
  }

  res.status(200).json({
    success: true,
    message: `Bulk import completed. ${results.success.length} users created, ${results.errors.length} errors.`,
    data: results
  });
});

/**
 * @desc    Download CSV template for bulk import
 * @route   GET /api/v1/admin/users/bulk-import/template/:role
 * @access  Private/Admin
 */
export const downloadCSVTemplate = asyncHandler(async (req, res, next) => {
  const { role } = req.params;

  if (!['trainer', 'participant'].includes(role)) {
    return next(new ErrorResponse('Role must be either trainer or participant', 400));
  }

  let csvHeaders;
  let sampleData;

  if (role === 'trainer') {
    csvHeaders = 'firstName,lastName,email,mobile,organization,designation,specialization,experience,password';
    sampleData = [
      'John,Doe,john.doe@example.com,9876543210,ABC Cooperative,Senior Trainer,"Cooperative Management,Financial Literacy",5,Trainer@123',
      'Jane,Smith,jane.smith@example.com,9876543211,XYZ Society,Trainer,"Digital Skills,Marketing",3,Trainer@123'
    ];
  } else {
    csvHeaders = 'firstName,lastName,email,mobile,organization,designation,password';
    sampleData = [
      'Raj,Kumar,raj.kumar@example.com,9876543212,DEF Cooperative,Member,Participant@123',
      'Priya,Sharma,priya.sharma@example.com,9876543213,GHI Society,Secretary,Participant@123'
    ];
  }

  const csvContent = [csvHeaders, ...sampleData].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${role}-import-template.csv"`);
  res.send(csvContent);
});

// Helper function to find user by ID in all collections
async function findUserById(id) {
  let user = await User.findById(id);
  if (!user) {
    const Participant = (await import('../models/Participant.model.js')).default;
    user = await Participant.findById(id);
  }
  return user;
}

export default {
  getAllUsers,
  getUserById,
  approveUser,
  rejectUser,
  activateUser,
  deactivateUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  bulkImportUsers,
  downloadCSVTemplate
};


/**
 * @desc    Get all students with enrollment statistics
 * @route   GET /api/v1/admin/students-with-stats
 * @access  Private/Admin
 */
export const getStudentsWithStats = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 1000 } = req.query;

  // Import models
  const Enrollment = (await import('../models/Enrollment.model.js')).default;
  const Participant = (await import('../models/Participant.model.js')).default;

  // Get students from both User and Participant models
  const [userStudents, participantStudents] = await Promise.all([
    User.find({ role: 'student' })
      .populate('department', 'name code')
      .populate('batch', 'name code year')
      .select('-password')
      .lean(),
    Participant.find({ role: 'student', isActive: true })
      .populate('department', 'name code')
      .populate('batch', 'name code year')
      .select('-password')
      .lean()
  ]);

  // Combine both, removing duplicates by email
  const studentsMap = new Map();
  userStudents.forEach(s => studentsMap.set(s.email?.toLowerCase(), { ...s, source: 'User' }));
  participantStudents.forEach(s => {
    if (!studentsMap.has(s.email?.toLowerCase())) {
      studentsMap.set(s.email?.toLowerCase(), { ...s, source: 'Participant' });
    }
  });

  // Apply pagination
  const allStudents = Array.from(studentsMap.values());
  const totalStudents = allStudents.length;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginatedStudents = allStudents.slice(skip, skip + parseInt(limit));

  // For each student, calculate enrollment statistics
  const studentsWithStats = await Promise.all(
    paginatedStudents.map(async (student) => {
      // Get all enrollments for this student
      const enrollments = await Enrollment.find({ user: student._id })
        .populate('course', 'title')
        .lean();

      // Calculate statistics
      const enrolledCourses = enrollments.length;
      const completedCourses = enrollments.filter(e => e.status === 'completed').length;
      const inProgressCourses = enrollments.filter(e => e.status === 'in-progress').length;
      
      // Calculate average progress
      const totalProgress = enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0);
      const avgProgress = enrolledCourses > 0 ? Math.round(totalProgress / enrolledCourses) : 0;

      // Calculate total time spent (sum of all watched seconds converted to hours)
      const totalTimeSpent = enrollments.reduce((sum, e) => {
        const lessonTime = e.lessonProgress?.reduce((lSum, l) => lSum + (l.watchedSeconds || 0), 0) || 0;
        return sum + lessonTime;
      }, 0);
      const totalTimeSpentHours = (totalTimeSpent / 3600).toFixed(1); // Convert seconds to hours

      // Calculate average time per course
      const avgTimePerCourse = enrolledCourses > 0 
        ? (totalTimeSpent / enrolledCourses / 3600).toFixed(1) 
        : 0;

      // Count certificates
      const certificatesEarned = enrollments.filter(e => e.certificateIssued).length;

      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        mobile: student.mobile,
        department: student.department,
        batch: student.batch,
        organization: student.organization,
        designation: student.designation,
        isActive: student.isActive,
        isApproved: student.isApproved,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        lastLogin: student.lastLogin,
        // Statistics
        enrolledCourses,
        completedCourses,
        inProgressCourses,
        avgProgress,
        totalTimeSpent: parseFloat(totalTimeSpentHours),
        avgTimePerCourse: parseFloat(avgTimePerCourse),
        certificatesEarned,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: studentsWithStats.length,
    total: totalStudents,
    data: studentsWithStats,
  });
});


/**
 * @desc    Get student details with course progress
 * @route   GET /api/v1/admin/students/:id/details
 * @access  Private/Admin
 */
export const getStudentDetails = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Import models
  const Enrollment = (await import('../models/Enrollment.model.js')).default;
  const Participant = (await import('../models/Participant.model.js')).default;

  // Try to find student in User model first, then Participant
  let student = await User.findById(id)
    .populate('department', 'name code')
    .populate('batch', 'name code year')
    .select('-password')
    .lean();

  // If not found in User, try Participant
  if (!student) {
    student = await Participant.findById(id)
      .populate('department', 'name code')
      .populate('batch', 'name code year')
      .select('-password')
      .lean();
  }

  if (!student) {
    return next(new ErrorResponse('Student not found', 404));
  }

  // Get all enrollments with course details
  const enrollments = await Enrollment.find({ user: id })
    .populate('course', 'title slug')
    .lean();

  // Transform enrollments to course progress format
  const courses = enrollments.map(enrollment => {
    // Calculate time spent from lesson progress
    const timeSpent = enrollment.lessonProgress?.reduce((sum, lesson) => {
      return sum + (lesson.watchedSeconds || 0);
    }, 0) || 0;
    const timeSpentHours = (timeSpent / 3600).toFixed(1);

    return {
      courseId: enrollment.course._id,
      courseName: enrollment.course.title,
      progress: enrollment.progressPercent || 0,
      timeSpent: parseFloat(timeSpentHours),
      status: enrollment.status,
      enrolledDate: enrollment.enrolledAt,
      completedDate: enrollment.completedAt,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      student,
      courses,
    },
  });
});


/**
 * @desc    Get all trainers with their batch and student statistics
 * @route   GET /api/v1/admin/trainers-overview
 * @access  Private/Admin
 */
export const getTrainersOverview = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 1000 } = req.query;

  // Import Batch model
  const Batch = (await import('../models/Batch.model.js')).default;

  // Get all trainers
  const trainers = await User.find({ role: 'trainer' })
    .select('-password')
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort('-createdAt')
    .lean();

  // For each trainer, calculate statistics
  const trainersWithStats = await Promise.all(
    trainers.map(async (trainer) => {
      // Find all batches assigned to this trainer
      const batches = await Batch.find({
        trainers: trainer._id
      }).lean();

      const totalBatches = batches.length;

      // Calculate total students across all batches
      const batchIds = batches.map(b => b._id);
      const Participant = mongoose.models.Participant || (await import('../models/Participant.model.js')).default;
      const [userCount, participantCount] = await Promise.all([
        User.countDocuments({ role: 'student', batch: { $in: batchIds } }),
        Participant ? Participant.countDocuments({ role: 'student', batch: { $in: batchIds } }) : 0
      ]);
      const totalStudents = Math.max(
        userCount + participantCount,
        batches.reduce((sum, batch) => sum + (batch.currentStudents || batch.studentCount || 0), 0)
      );

      // For courses, count courses where this trainer is set
      const totalCourses = await Course.countDocuments({
        $or: [
          { trainer: trainer._id },
          { createdBy: trainer._id }
        ]
      });

      return {
        _id: trainer._id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        mobile: trainer.mobile,
        phone: trainer.mobile, // Alias for compatibility
        organization: trainer.organization,
        specialization: trainer.specialization,
        isActive: trainer.isActive,
        isApproved: trainer.isApproved,
        createdAt: trainer.createdAt,
        totalCourses,
        totalBatches,
        totalStudents,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: trainersWithStats.length,
    data: trainersWithStats,
  });
});


/**
 * @desc    Get all students for a specific trainer
 * @route   GET /api/v1/admin/trainer/:id/students
 * @access  Private/Admin
 */
export const getTrainerStudents = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Import Batch model
  const Batch = (await import('../models/Batch.model.js')).default;

  // Find all batches assigned to this trainer
  const batches = await Batch.find({
    trainers: id
  }).populate('department', 'name code').lean();

  if (batches.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
      message: 'No batches assigned to this trainer'
    });
  }

  // Get all students from these batches
  const allStudents = [];
  
  for (const batch of batches) {
    // Find all participants in this batch
    const students = await User.find({
      role: 'student',
      batch: batch._id
    })
    .populate('department', 'name code')
    .populate('batch', 'name code year')
    .select('-password')
    .lean();

    // Add batch info to each student
    students.forEach(student => {
      allStudents.push({
        ...student,
        batchName: batch.name,
        batchCode: batch.code,
      });
    });
  }

  // Remove duplicates (if a student is in multiple batches)
  const uniqueStudents = Array.from(
    new Map(allStudents.map(s => [s._id.toString(), s])).values()
  );

  res.status(200).json({
    success: true,
    count: uniqueStudents.length,
    data: uniqueStudents,
  });
});
