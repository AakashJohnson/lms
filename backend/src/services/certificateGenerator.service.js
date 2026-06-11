import Certificate from '../models/Certificate.model.js';
import Enrollment from '../models/Enrollment.model.js';
import { generateVerificationToken } from '../utils/certificateIdGenerator.js';
import { generateQRCode } from './qrCodeGenerator.service.js';
import { generateCertificatePDF } from './pdfGenerator.service.js';

/**
 * Check if student meets course completion criteria
 * @param {string} userId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Completion status and details
 */
export const checkCompletionCriteria = async (userId, courseId) => {
  try {
    // Get enrollment
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
    }).populate('course', 'title slug');

    if (!enrollment) {
      return {
        eligible: false,
        reason: 'Not enrolled in course',
      };
    }

    // Check if already completed
    if (enrollment.status !== 'completed') {
      return {
        eligible: false,
        reason: 'Course not completed',
        progress: enrollment.progressPercent,
      };
    }

    // Check progress percentage
    if (enrollment.progressPercent < 100) {
      return {
        eligible: false,
        reason: 'Progress less than 100%',
        progress: enrollment.progressPercent,
      };
    }

    // All criteria met
    return {
      eligible: true,
      enrollment,
      completionDate: enrollment.completedAt || new Date(),
    };
  } catch (error) {
    console.error('Error checking completion criteria:', error);
    throw error;
  }
};

/**
 * Generate certificate for a student
 * @param {string} userId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} - Generated certificate
 */
export const generateCertificate = async (userId, courseId) => {
  try {
    console.log(`📜 Generating certificate for user ${userId}, course ${courseId}`);

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: userId,
      course: courseId,
    });

    if (existingCertificate) {
      console.log('⚠️ Certificate already exists');
      return {
        success: false,
        message: 'Certificate already issued for this course',
        certificate: existingCertificate,
      };
    }

    // Check completion criteria
    const completionCheck = await checkCompletionCriteria(userId, courseId);
    
    if (!completionCheck.eligible) {
      console.log(`❌ Not eligible: ${completionCheck.reason}`);
      return {
        success: false,
        message: completionCheck.reason,
        progress: completionCheck.progress,
      };
    }

    // Get student and course details
    const User = (await import('../models/User.model.js')).default;
    const Course = (await import('../models/Course.model.js')).default;

    const student = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
      throw new Error('Student or course not found');
    }

    // Generate unique certificate ID
    const certificateId = await Certificate.generateCertificateId();
    
    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create verification URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify/${verificationToken}`;

    // Generate QR code
    console.log('🔲 Generating QR code...');
    const qrCodeUrl = await generateQRCode(verificationUrl, certificateId);

    // Prepare certificate data
    const studentName = `${student.firstName} ${student.lastName}`;
    const courseName = course.title;
    const completionDate = completionCheck.completionDate;
    const issueDate = new Date();

    // Generate PDF certificate
    console.log('📄 Generating PDF certificate...');
    const pdfUrl = await generateCertificatePDF({
      certificateId,
      studentName,
      courseName,
      completionDate,
      issueDate,
      verificationUrl,
      organizationName: process.env.ORGANIZATION_NAME || 'NCUI Training Center',
    });

    // Create certificate record
    const certificate = await Certificate.create({
      certificateId,
      verificationToken,
      student: userId,
      course: courseId,
      completionDate,
      issueDate,
      status: 'valid',
      qrCodeUrl,
      pdfUrl,
      metadata: {
        courseName,
        studentName,
        studentEmail: student.email,
        completionPercentage: completionCheck.enrollment.progressPercent,
      },
    });

    console.log(`✅ Certificate generated successfully: ${certificateId}`);

    // TODO: Send notification to student
    // await sendCertificateNotification(student, certificate);

    return {
      success: true,
      message: 'Certificate generated successfully',
      certificate,
    };
  } catch (error) {
    console.error('❌ Error generating certificate:', error);
    throw error;
  }
};

/**
 * Auto-generate certificate when course is completed
 * This should be called from enrollment completion hook
 * @param {string} userId - Student ID
 * @param {string} courseId - Course ID
 */
export const autoGenerateCertificate = async (userId, courseId) => {
  try {
    console.log(`🤖 Auto-generating certificate for user ${userId}, course ${courseId}`);
    
    const result = await generateCertificate(userId, courseId);
    
    if (result.success) {
      console.log('✅ Certificate auto-generated successfully');
    } else {
      console.log(`⚠️ Certificate not generated: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error in auto-generate certificate:', error);
    // Don't throw error - just log it
    // We don't want to break the completion flow
  }
};

/**
 * Regenerate certificate (for admin use)
 * @param {string} certificateId - Certificate ID
 * @returns {Promise<Object>} - Regenerated certificate
 */
export const regenerateCertificate = async (certificateId) => {
  try {
    const certificate = await Certificate.findOne({ certificateId })
      .populate('student')
      .populate('course');

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // Generate new PDF
    const studentName = `${certificate.student.firstName} ${certificate.student.lastName}`;
    const pdfUrl = await generateCertificatePDF({
      certificateId: certificate.certificateId,
      studentName,
      courseName: certificate.course.title,
      completionDate: certificate.completionDate,
      issueDate: certificate.issueDate,
      verificationUrl: certificate.verificationUrl,
    });

    // Update certificate
    certificate.pdfUrl = pdfUrl;
    await certificate.save();

    console.log(`✅ Certificate regenerated: ${certificateId}`);

    return certificate;
  } catch (error) {
    console.error('Error regenerating certificate:', error);
    throw error;
  }
};
