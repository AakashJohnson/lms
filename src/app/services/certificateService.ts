import axiosInstance from '../../utils/axiosConfig';

export interface Certificate {
  _id: string;
  certificateId: string;
  verificationToken: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  course: {
    _id: string;
    title: string;
    slug: string;
    thumbnail?: string;
  };
  completionDate: string;
  issueDate: string;
  status: 'valid' | 'revoked';
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  qrCodeUrl: string;
  pdfUrl: string;
  verificationCount: number;
  lastVerifiedAt?: string;
  metadata: {
    courseName: string;
    studentName: string;
    studentEmail: string;
    completionPercentage: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CertificateVerification {
  verified: boolean;
  status: 'valid' | 'revoked';
  certificateId: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  completionDate: string;
  issueDate: string;
  organizationName: string;
  verificationCount: number;
  lastVerifiedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
}

/**
 * Get all certificates for logged-in student
 */
export const getMyCertificates = async () => {
  const response = await axiosInstance.get('/certificates/my-certificates');
  return response.data;
};

/**
 * Get single certificate by ID
 */
export const getCertificateById = async (certificateId: string) => {
  const response = await axiosInstance.get(`/certificates/${certificateId}`);
  return response.data;
};

/**
 * Download certificate PDF
 */
export const downloadCertificate = async (certificateId: string) => {
  const response = await axiosInstance.get(`/certificates/${certificateId}/download`, {
    responseType: 'blob',
  });
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `certificate-${certificateId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  
  return { success: true };
};

/**
 * Generate certificate manually (for testing)
 */
export const generateCertificate = async (courseId: string) => {
  const response = await axiosInstance.post('/certificates/generate', { courseId });
  return response.data;
};

/**
 * Get shareable link for certificate
 */
export const shareCertificate = async (certificateId: string) => {
  const response = await axiosInstance.post(`/certificates/${certificateId}/share`);
  return response.data;
};

/**
 * Verify certificate by token (public - no auth)
 */
export const verifyCertificate = async (token: string) => {
  const response = await axiosInstance.get(`/certificates/verify/${token}`);
  return response.data;
};

/**
 * Verify certificate by certificate ID (public - no auth)
 */
export const verifyCertificateById = async (certificateId: string) => {
  const response = await axiosInstance.get(`/certificates/verify-by-id/${certificateId}`);
  return response.data;
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all certificates (Admin)
 */
export const getAllCertificates = async (params?: {
  status?: string;
  courseId?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axiosInstance.get('/certificates/admin/all', { params });
  return response.data;
};

/**
 * Revoke certificate (Admin)
 */
export const revokeCertificate = async (certificateId: string, reason: string) => {
  const response = await axiosInstance.post(`/certificates/admin/${certificateId}/revoke`, {
    reason,
  });
  return response.data;
};

/**
 * Reissue certificate (Admin)
 */
export const reissueCertificate = async (certificateId: string) => {
  const response = await axiosInstance.post(`/certificates/admin/${certificateId}/reissue`);
  return response.data;
};

/**
 * Get certificate analytics (Admin)
 */
export const getCertificateAnalytics = async () => {
  const response = await axiosInstance.get('/certificates/admin/analytics');
  return response.data;
};
