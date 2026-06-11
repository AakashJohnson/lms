/**
 * Payment Integration Test Script
 * Run: node test-payment-flow.js
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';
let certificateId = '';
let paymentOrderId = '';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔹 ${msg}${colors.reset}`)
};

// Test functions
async function testLogin() {
  try {
    log.step('Step 1: Login as Student');
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrMobile: 'student@ncui.in',
      password: 'Student@123'
    });

    if (response.data.success) {
      authToken = response.data.token;
      log.success('Login successful');
      log.info(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    }
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function getMyCertificates() {
  try {
    log.step('Step 2: Get My Certificates');
    
    const response = await axios.get(`${BASE_URL}/certificates/my-certificates`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && response.data.data.length > 0) {
      certificateId = response.data.data[0]._id;
      const cert = response.data.data[0];
      
      log.success(`Found ${response.data.count} certificate(s)`);
      log.info(`Certificate ID: ${certificateId}`);
      log.info(`Certificate Number: ${cert.certificateNumber}`);
      log.info(`Course: ${cert.courseName}`);
      log.info(`Payment Status: ${cert.isPaid ? 'Paid ✅' : 'Unpaid ❌'}`);
      
      return true;
    } else {
      log.warning('No certificates found. Please generate a certificate first.');
      return false;
    }
  } catch (error) {
    log.error(`Get certificates failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function tryDownloadWithoutPayment() {
  try {
    log.step('Step 3: Try Download Without Payment (Should Fail)');
    
    const response = await axios.get(
      `${BASE_URL}/certificates/${certificateId}/download`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      log.warning('Download succeeded without payment! This is a security issue!');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 402) {
      log.success('Download blocked correctly - Payment required ✅');
      log.info(`Message: ${error.response.data.message}`);
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

async function createPaymentOrder() {
  try {
    log.step('Step 4: Create Payment Order');
    
    const response = await axios.post(
      `${BASE_URL}/payments/create-order`,
      { certificateId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (response.data.success) {
      paymentOrderId = response.data.data.orderId;
      
      log.success('Payment order created successfully');
      log.info(`Order ID: ${paymentOrderId}`);
      log.info(`Amount: Rs. ${response.data.data.amount / 100}`);
      log.info(`Currency: ${response.data.data.currency}`);
      log.info(`Razorpay Key: ${response.data.data.key}`);
      
      return true;
    }
  } catch (error) {
    log.error(`Create order failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function getMyPayments() {
  try {
    log.step('Step 5: Get My Payment History');
    
    const response = await axios.get(`${BASE_URL}/payments/my-payments`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log.success(`Found ${response.data.count} payment(s)`);
      
      response.data.data.forEach((payment, index) => {
        log.info(`\nPayment ${index + 1}:`);
        log.info(`  Order ID: ${payment.orderId}`);
        log.info(`  Amount: Rs. ${payment.amount / 100}`);
        log.info(`  Status: ${payment.status}`);
        log.info(`  Purpose: ${payment.purpose}`);
        log.info(`  Created: ${new Date(payment.createdAt).toLocaleString()}`);
      });
      
      return true;
    }
  } catch (error) {
    log.error(`Get payments failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function checkRazorpayConfig() {
  log.step('Checking Razorpay Configuration');
  
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!keyId || keyId === 'your_razorpay_key_id') {
    log.warning('RAZORPAY_KEY_ID not configured in .env');
  } else {
    log.success(`RAZORPAY_KEY_ID: ${keyId.substring(0, 15)}...`);
  }
  
  if (!keySecret || keySecret === 'your_razorpay_key_secret') {
    log.warning('RAZORPAY_KEY_SECRET not configured in .env');
  } else {
    log.success('RAZORPAY_KEY_SECRET: Configured ✅');
  }
  
  if (!webhookSecret || webhookSecret === 'your_razorpay_webhook_secret') {
    log.warning('RAZORPAY_WEBHOOK_SECRET not configured in .env');
  } else {
    log.success('RAZORPAY_WEBHOOK_SECRET: Configured ✅');
  }
  
  console.log('');
}

// Main test flow
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PAYMENT INTEGRATION TEST');
  console.log('='.repeat(60) + '\n');

  // Check Razorpay config
  await checkRazorpayConfig();

  // Run tests
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    log.error('Test stopped: Login failed');
    return;
  }

  console.log('');
  const certsSuccess = await getMyCertificates();
  if (!certsSuccess) {
    log.error('Test stopped: No certificates found');
    log.info('Generate a certificate first using admin/trainer account');
    return;
  }

  console.log('');
  await tryDownloadWithoutPayment();

  console.log('');
  await createPaymentOrder();

  console.log('');
  await getMyPayments();

  console.log('\n' + '='.repeat(60));
  log.success('TEST COMPLETED');
  console.log('='.repeat(60));
  
  console.log('\n📋 Next Steps:');
  console.log('1. Configure Razorpay keys in .env file');
  console.log('2. Complete payment on Razorpay checkout (frontend)');
  console.log('3. Verify payment using POST /api/v1/payments/verify');
  console.log('4. Download certificate after payment verification');
  console.log('\n📖 Read: RAZORPAY_INTEGRATION_GUIDE.md for complete details\n');
}

// Run tests
runTests().catch(error => {
  log.error(`Test failed: ${error.message}`);
  process.exit(1);
});
