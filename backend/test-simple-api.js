import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function test() {
  try {
    // Login
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      emailOrMobile: 'admin@ncui.in',
      password: 'Admin@123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log('User:', loginRes.data.user);
    
    // Try to create department
    console.log('\n2. Creating department...');
    try {
      const deptRes = await axios.post(`${API_BASE}/departments`, {
        name: 'Test Department',
        code: 'TEST',
        description: 'Test description'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Department created:', deptRes.data);
    } catch (error) {
      console.log('❌ Department creation failed:');
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
    // Get departments
    console.log('\n3. Getting departments...');
    const getDeptRes = await axios.get(`${API_BASE}/departments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Departments:', getDeptRes.data.data.length);
    if (getDeptRes.data.data.length > 0) {
      console.log('First department:', getDeptRes.data.data[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

test();
