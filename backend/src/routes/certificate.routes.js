import express from 'express';
import {
  getMyCertificates,
  getCertificateById,
  downloadCertificate,
  generateCertificateManually,
  shareCertificate,
  getAllCertificates,
  revokeCertificate,
  reissueCertificate,
  getCertificateAnalytics,
} from '../controllers/certificate.controller.js';
import {
  verifyCertificate,
  getCertificateVerificationDetails,
  trackCertificateVerification,
  verifyCertificateById,
} from '../controllers/certificateVerification.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Verify certificate by token (from QR code)
router.get('/verify/:token', verifyCertificate);

// Verify certificate by certificate ID
router.get('/verify-by-id/:certificateId', verifyCertificateById);

// Get verification details
router.get('/verify/:token/details', getCertificateVerificationDetails);

// Track verification
router.post('/verify/:token/track', trackCertificateVerification);

// ============================================
// STUDENT ROUTES (Authentication required)
// ============================================

router.use(protect); // All routes below require authentication

// Get my certificates
router.get('/my-certificates', getMyCertificates);

// Get single certificate
router.get('/:certificateId', getCertificateById);

// Download certificate PDF
router.get('/:certificateId/download', downloadCertificate);

// Generate certificate manually (for testing)
router.post('/generate', generateCertificateManually);

// Share certificate
router.post('/:certificateId/share', shareCertificate);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all certificates
router.get('/admin/all', authorize('administrator'), getAllCertificates);

// Get certificate analytics
router.get('/admin/analytics', authorize('administrator'), getCertificateAnalytics);

// Revoke certificate
router.post('/admin/:certificateId/revoke', authorize('administrator'), revokeCertificate);

// Reissue certificate
router.post('/admin/:certificateId/reissue', authorize('administrator'), reissueCertificate);

export default router;
