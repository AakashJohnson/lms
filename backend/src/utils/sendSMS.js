import twilio from 'twilio';
import { logger } from '../config/logger.js';

// Lazy initialization of Twilio client
let client = null;

const getTwilioClient = () => {
  if (!client) {
    // Check if Twilio credentials are configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken || accountSid === 'your_twilio_account_sid') {
      logger.warn('⚠️  Twilio not configured. SMS features disabled.');
      return null;
    }
    
    try {
      client = twilio(accountSid, authToken);
    } catch (error) {
      logger.warn(`⚠️  Twilio initialization failed: ${error.message}`);
      return null;
    }
  }
  return client;
};

const sendSMS = async (options) => {
  try {
    const twilioClient = getTwilioClient();
    
    if (!twilioClient) {
      logger.warn('SMS not sent: Twilio not configured');
      return { success: false, message: 'SMS service not configured' };
    }
    
    const message = await twilioClient.messages.create({
      body: options.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${options.mobile}` // Assuming Indian numbers
    });

    logger.info(`SMS sent to ${options.mobile}: ${message.sid}`);
    return message;
  } catch (error) {
    logger.error(`SMS sending failed: ${error.message}`);
    throw error;
  }
};

export default sendSMS;
