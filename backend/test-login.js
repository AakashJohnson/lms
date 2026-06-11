// Simple test script to verify login functionality

const testLogin = async () => {
  try {
    console.log('🧪 Testing Login API...\n');
    
    const credentials = [
      { role: 'Admin', emailOrMobile: 'admin@ncui.in', password: 'Admin@123' },
      { role: 'Trainer', emailOrMobile: 'trainer@ncui.in', password: 'Trainer@123' },
      { role: 'Student', emailOrMobile: 'student@ncui.in', password: 'Student@123' }
    ];
    
    for (const cred of credentials) {
      console.log(`Testing ${cred.role} login...`);
      
      const response = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrMobile: cred.emailOrMobile,
          password: cred.password
        })
      });
      
      const data = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log(`✅ ${cred.role} login successful`);
        console.log(`   Token: ${data.token.substring(0, 20)}...`);
        console.log(`   User: ${data.user.firstName} ${data.user.lastName}`);
        console.log(`   Role: ${data.user.role}`);
      } else {
        console.log(`❌ ${cred.role} login failed: ${data.message}`);
      }
      console.log('');
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testLogin();
