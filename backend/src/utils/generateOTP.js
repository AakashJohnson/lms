import otpGenerator from 'otp-generator';

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });
};

/**
 * Get OTP expiry time
 */
export const getOTPExpiry = () => {
  const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

export default { generateOTP, getOTPExpiry };
