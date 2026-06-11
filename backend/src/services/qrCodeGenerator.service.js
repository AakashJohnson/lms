import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate QR code for certificate verification
 * @param {string} verificationUrl - The URL to encode in QR code
 * @param {string} certificateId - Certificate ID for filename
 * @returns {Promise<string>} - Path to generated QR code image
 */
export const generateQRCode = async (verificationUrl, certificateId) => {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../../uploads/qrcodes');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename
    const filename = `qr-${certificateId}.png`;
    const filepath = path.join(uploadsDir, filename);

    // QR code options
    const options = {
      errorCorrectionLevel: 'H', // High error correction
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    };

    // Generate QR code
    await QRCode.toFile(filepath, verificationUrl, options);

    // Return relative path for storage
    return `/uploads/qrcodes/${filename}`;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code as base64 string (for embedding in PDFs)
 * @param {string} verificationUrl - The URL to encode
 * @returns {Promise<string>} - Base64 encoded QR code
 */
export const generateQRCodeBase64 = async (verificationUrl) => {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300,
    };

    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, options);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code base64:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate QR code buffer (for direct use)
 * @param {string} verificationUrl - The URL to encode
 * @returns {Promise<Buffer>} - QR code as buffer
 */
export const generateQRCodeBuffer = async (verificationUrl) => {
  try {
    const options = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 300,
    };

    const buffer = await QRCode.toBuffer(verificationUrl, options);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code');
  }
};
