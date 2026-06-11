import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

// Get token from your browser localStorage
const TOKEN = 'YOUR_TOKEN_HERE'; // Replace with actual token from browser

const testQueryAPI = async () => {
  try {
    console.log('🧪 Testing Query API...\n');

    // Test 1: Get my queries
    console.log('1️⃣ Testing GET /course-queries/my-queries');
    const response = await axios.get(`${API_URL}/course-queries/my-queries`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    console.log('✅ Response Status:', response.status);
    console.log('✅ Success:', response.data.success);
    console.log('✅ Count:', response.data.count);
    console.log('✅ Queries:', JSON.stringify(response.data.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
};

// Run if token is provided
if (process.argv[2]) {
  const TOKEN_FROM_ARG = process.argv[2];
  testQueryAPI();
} else {
  console.log('❌ Please provide token as argument:');
  console.log('node test-query-api.js YOUR_TOKEN_HERE');
}
