import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

async function testGetCertificatesEndpoint() {
  try {
    console.log('🔐 Testing certificate endpoint...\n');

    // First, login as student
    console.log('1. Logging in as student@ncui.in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'student@ncui.in',
      password: 'student123'
    });

    if (!loginRes.data.success) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Get certificates
    console.log('\n2. Fetching certificates...');
    const certRes = await axios.get(`${API_URL}/certificates/my-certificates`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('\n📜 Certificate API Response:');
    console.log(JSON.stringify(certRes.data, null, 2));

    if (certRes.data.success && certRes.data.data) {
      console.log(`\n✅ Found ${certRes.data.count} certificate(s)`);
      certRes.data.data.forEach((cert, index) => {
        console.log(`\nCertificate ${index + 1}:`);
        console.log(`   Certificate ID: ${cert.certificateId}`);
        console.log(`   Course ID: ${typeof cert.course === 'string' ? cert.course : cert.course._id}`);
        console.log(`   Course Title: ${typeof cert.course === 'string' ? 'N/A' : cert.course.title}`);
        console.log(`   Status: ${cert.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGetCertificatesEndpoint();
