import Certificate from '../models/Certificate.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Verify certificate by token (Public)
 * @route   GET /api/v1/certificates/verify/:token
 * @access  Public
 */
export const verifyCertificate = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  console.log(`🔍 Verifying certificate with token: ${token.substring(0, 10)}...`);

  // Find certificate by verification token
  const certificate = await Certificate.findByVerificationToken(token);

  if (!certificate) {
    console.log('❌ Certificate not found');
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Certificate not found or invalid verification token',
    });
  }

  // Track verification
  await certificate.trackVerification();

  console.log(`✅ Certificate verified: ${certificate.certificateId}`);

  // Prepare response data
  const responseData = {
    verified: true,
    status: certificate.status,
    certificateId: certificate.certificateId,
    studentName: `${certificate.student.firstName} ${certificate.student.lastName}`,
    studentEmail: certificate.student.email,
    courseName: certificate.course.title,
    completionDate: certificate.completionDate,
    issueDate: certificate.issueDate,
    organizationName: process.env.ORGANIZATION_NAME || 'NCUI Training Center',
    verificationCount: certificate.verificationCount,
    lastVerifiedAt: certificate.lastVerifiedAt,
  };

  // Add revocation details if revoked
  if (certificate.status === 'revoked') {
    responseData.revokedAt = certificate.revokedAt;
    responseData.revokedReason = certificate.revokedReason;
  }

  res.status(200).json({
    success: true,
    verified: certificate.status === 'valid',
    data: responseData,
  });
});

/**
 * @desc    Get certificate verification details (Public)
 * @route   GET /api/v1/certificates/verify/:token/details
 * @access  Public
 */
export const getCertificateVerificationDetails = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const certificate = await Certificate.findByVerificationToken(token);

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  // Don't track verification for details endpoint
  // Only track when actually verifying

  res.status(200).json({
    success: true,
    data: {
      certificateId: certificate.certificateId,
      status: certificate.status,
      studentName: `${certificate.student.firstName} ${certificate.student.lastName}`,
      courseName: certificate.course.title,
      completionDate: certificate.completionDate,
      issueDate: certificate.issueDate,
      verificationCount: certificate.verificationCount,
      qrCodeUrl: certificate.qrCodeUrl,
      pdfUrl: certificate.pdfUrl,
    },
  });
});

/**
 * @desc    Track certificate verification (Public)
 * @route   POST /api/v1/certificates/verify/:token/track
 * @access  Public
 */
export const trackCertificateVerification = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const certificate = await Certificate.findOne({ verificationToken: token });

  if (!certificate) {
    return next(new ErrorResponse('Certificate not found', 404));
  }

  // Track verification
  await certificate.trackVerification();

  res.status(200).json({
    success: true,
    message: 'Verification tracked',
  });
});

/**
 * @desc    Verify certificate by certificate ID (Public)
 * @route   GET /api/v1/certificates/verify-by-id/:certificateId
 * @access  Public
 */
export const verifyCertificateById = asyncHandler(async (req, res, next) => {
  const { certificateId } = req.params;

  console.log(`🔍 Verifying certificate by ID: ${certificateId}`);

  const certificate = await Certificate.findOne({ certificateId })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title');

  if (!certificate) {
    console.log('❌ Certificate not found');
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Certificate not found',
    });
  }

  // Track verification
  await certificate.trackVerification();

  console.log(`✅ Certificate verified: ${certificate.certificateId}`);

  const responseData = {
    verified: true,
    status: certificate.status,
    certificateId: certificate.certificateId,
    studentName: `${certificate.student.firstName} ${certificate.student.lastName}`,
    studentEmail: certificate.student.email,
    courseName: certificate.course.title,
    completionDate: certificate.completionDate,
    issueDate: certificate.issueDate,
    organizationName: process.env.ORGANIZATION_NAME || 'NCUI Training Center',
    verificationCount: certificate.verificationCount,
  };

  if (certificate.status === 'revoked') {
    responseData.revokedAt = certificate.revokedAt;
    responseData.revokedReason = certificate.revokedReason;
  }

  res.status(200).json({
    success: true,
    verified: certificate.status === 'valid',
    data: responseData,
  });
});
