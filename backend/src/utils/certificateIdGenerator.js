import crypto from 'crypto';

/**
 * Generate a unique certificate ID
 * Format: CERT-YYYY-XXXXXXXX
 */
export const generateCertificateId = () => {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CERT-${year}-${randomPart}`;
};

/**
 * Generate a secure verification token
 * This token is used in QR codes and verification URLs
 */
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Encrypt data for additional security
 */
export const encryptData = (data) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
  };
};

/**
 * Decrypt data
 */
export const decryptData = (encrypted, ivHex) => {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generate a hash for certificate validation
 */
export const generateCertificateHash = (certificateId, studentId, courseId) => {
  const data = `${certificateId}-${studentId}-${courseId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};
