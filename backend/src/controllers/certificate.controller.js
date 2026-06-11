import Certificate from '../models/Certificate.model.js';
import { generateCertificate, regenerateCertificate } from '../services/certificateGenerator.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Get all certificates for logged-in student
 * @route   GET /api/v1/certificates/my-certificates
 * @access  Private (Student)
 */
export const getMyCertificates = asyncHandler(async (req, res, next) => {
  const userId = req.user.id || req.user._id;
  
  console.log('🎓 getMyCertificates called');
  console.log('   User ID:', userId);
  console.log('   User:', req.user);
  console.log('   User Name:', req.user.firstName, req.user.lastName);
  console.log('   User Email:', req.user.email);

  const certificates = await Certificate.find({ student: userId })
    .populate('course', 'title slug thumbnail')
    .sort('-issueDate');

  console.log('   Found certificates:', certificates.length);
  if (certificates.length > 0) {
    certificates.forEach((cert, i) => {
      console.log(`   Certificate ${i + 1}:`, {
        id: cert.certificateId,
        course: cert.course?.title,
        courseId: cert.course?._id,
        studentId: cert.student
      });
    });
  } else {
    console.log('   ⚠️ NO CERTIFICATES FOUND!');
    console.log('   Checking if user ID matches any certificates...');
    const allCerts = await Certificate.find({}).select('student certificateId');
    console.log('   All certificates in DB:', allCerts.map(c => ({ id: c.certificateId, student: c.student.toString() })));
  }

  res.status(200).json({
    success: true,
    count: certificates.length,
    data: certificates,
  });
});

/**
 * @desc    Get single certificate by ID
 * @route   GET /api/v1/certificates/:certificateId
 * @access  Private
 */
export const getCertificateById = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;
  const userId = req.user.id || req.user._id;

  const certificate = await Certificate.findOne({ certificateId })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title slug thumbnail');

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  // Check if user owns this certificate (unless admin)
  if (req.user.role !== 'administrator' && certificate.student._id.toString() !== userId.toString()) {
    return next(new ErrorResponse('Not authorized to access this certificate', 403));
  }

  res.status(200).json({
    success: true,
    data: certificate,
  });
});

/**
 * @desc    Download certificate PDF
 * @route   GET /api/v1/certificates/:certificateId/download
 * @access  Private
 */
export const downloadCertificate = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;
  const userId = req.user.id || req.user._id;

  const certificate = await Certificate.findOne({ certificateId });

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  // Check if user owns this certificate (unless admin)
  if (req.user.role !== 'administrator' && certificate.student.toString() !== userId.toString()) {
    return next(new ErrorResponse('Not authorized to download this certificate', 403));
  }

  if (!certificate.pdfUrl) {
    return next(new ErrorResponse('Certificate PDF not available', 404));
  }

  // Get file path
  const filePath = path.join(__dirname, '../..', certificate.pdfUrl);

  // Set headers for download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);

  // Send file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      return next(new ErrorResponse('Error downloading certificate', 500));
    }
  });
});

/**
 * @desc    Generate certificate manually (for testing or admin)
 * @route   POST /api/v1/certificates/generate
 * @access  Private (Admin or Student for their own)
 */
export const generateCertificateManually = asyncHandler(async (req, res, next) => {
  const { courseId } = req.body;
  const userId = req.user.id || req.user._id;

  if (!courseId) {
    return next(new ErrorResponse('Course ID is required', 400));
  }

  const result = await generateCertificate(userId, courseId);

  if (!result.success) {
    return next(new ErrorResponse(result.message, 400));
  }

  res.status(201).json({
    success: true,
    message: result.message,
    data: result.certificate,
  });
});

/**
 * @desc    Share certificate (get shareable link)
 * @route   POST /api/v1/certificates/:certificateId/share
 * @access  Private
 */
export const shareCertificate = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;
  const userId = req.user.id || req.user._id;

  const certificate = await Certificate.findOne({ certificateId });

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  // Check if user owns this certificate
  if (certificate.student.toString() !== userId.toString()) {
    return next(new ErrorResponse('Not authorized to share this certificate', 403));
  }

  // Return verification URL for sharing
  const shareUrl = certificate.verificationUrl;

  res.status(200).json({
    success: true,
    data: {
      shareUrl,
      certificateId: certificate.certificateId,
      verificationToken: certificate.verificationToken,
    },
  });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * @desc    Get all certificates (Admin)
 * @route   GET /api/v1/admin/certificates
 * @access  Private (Admin)
 */
export const getAllCertificates = asyncHandler(async (req, res, next) => {
  const { status, courseId, studentId, page = 1, limit = 20 } = req.query;

  // Build query
  const query = {};
  if (status) query.status = status;
  if (courseId) query.course = courseId;
  if (studentId) query.student = studentId;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [certificates, total] = await Promise.all([
    Certificate.find(query)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title slug')
      .sort('-issueDate')
      .skip(skip)
      .limit(parseInt(limit)),
    Certificate.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: certificates.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: certificates,
  });
});

/**
 * @desc    Revoke certificate (Admin)
 * @route   POST /api/v1/admin/certificates/:certificateId/revoke
 * @access  Private (Admin)
 */
export const revokeCertificate = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;
  const { reason } = req.body;
  const adminId = req.user.id || req.user._id;

  const certificate = await Certificate.findOne({ certificateId });

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  if (certificate.status === 'revoked') {
    return next(new ErrorResponse('Certificate is already revoked', 400));
  }

  // Revoke certificate
  await certificate.revoke(adminId, reason || 'No reason provided');

  res.status(200).json({
    success: true,
    message: 'Certificate revoked successfully',
    data: certificate,
  });
});

/**
 * @desc    Reissue certificate (Admin)
 * @route   POST /api/v1/admin/certificates/:certificateId/reissue
 * @access  Private (Admin)
 */
export const reissueCertificate = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;

  const certificate = await regenerateCertificate(certificateId);

  res.status(200).json({
    success: true,
    message: 'Certificate reissued successfully',
    data: certificate,
  });
});

/**
 * @desc    Get certificate analytics (Admin)
 * @route   GET /api/v1/admin/certificates/analytics
 * @access  Private (Admin)
 */
export const getCertificateAnalytics = asyncHandler(async (req, res, next) => {
  const [
    totalCertificates,
    validCertificates,
    revokedCertificates,
    thisMonthCertificates,
    totalVerifications,
  ] = await Promise.all([
    Certificate.countDocuments(),
    Certificate.countDocuments({ status: 'valid' }),
    Certificate.countDocuments({ status: 'revoked' }),
    Certificate.countDocuments({
      issueDate: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
    Certificate.aggregate([
      { $group: { _id: null, total: { $sum: '$verificationCount' } } },
    ]),
  ]);

  // Get top courses by certificates issued
  const topCourses = await Certificate.aggregate([
    { $match: { status: 'valid' } },
    { $group: { _id: '$course', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'courseDetails',
      },
    },
    { $unwind: '$courseDetails' },
    {
      $project: {
        courseName: '$courseDetails.title',
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalCertificates,
      validCertificates,
      revokedCertificates,
      thisMonthCertificates,
      totalVerifications: totalVerifications[0]?.total || 0,
      topCourses,
    },
  });
});
