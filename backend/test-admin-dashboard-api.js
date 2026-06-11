import axios from 'axios';

const testAdminDashboard = async () => {
  try {
    console.log('🔐 Testing Admin Dashboard API\n');
    console.log('='.repeat(60));

    // First login as admin
    console.log('\n1. Logging in as admin...');
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      emailOrMobile: 'admin@ncui.in',
      password: 'Admin@123'
    });

    if (!loginRes.data.success) {
      console.log('❌ Login failed:', loginRes.data.message);
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ Login successful!');
    console.log('Token:', token.substring(0, 20) + '...');

    // Get admin dashboard
    console.log('\n2. Fetching admin dashboard...');
    const dashboardRes = await axios.get('http://localhost:5000/api/v1/dashboard/admin', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!dashboardRes.data.success) {
      console.log('❌ Dashboard fetch failed:', dashboardRes.data.message);
      return;
    }

    console.log('✅ Dashboard fetched successfully!');
    
    const data = dashboardRes.data.data;
    
    console.log('\n📊 Dashboard Data:');
    console.log('='.repeat(60));
    
    console.log('\n👥 Users:');
    console.log('   Total:', data.users?.total || 0);
    console.log('   Admins:', data.users?.admins || 0);
    console.log('   Trainers:', data.users?.trainers || 0);
    console.log('   Students:', data.users?.students || 0);
    
    console.log('\n📚 Courses:');
    console.log('   Total:', data.courses?.total || 0);
    console.log('   Published:', data.courses?.published || 0);
    
    console.log('\n⭐ Recent Ratings:');
    if (data.recentRatings && data.recentRatings.length > 0) {
      console.log(`   Found ${data.recentRatings.length} ratings:`);
      data.recentRatings.forEach((rating, idx) => {
        console.log(`\n   ${idx + 1}. ${rating.student?.firstName} ${rating.student?.lastName}`);
        console.log(`      Course: ${rating.course?.title}`);
        console.log(`      Rating: ${'⭐'.repeat(rating.rating)} (${rating.rating}/5)`);
        console.log(`      Review: ${rating.review ? rating.review.substring(0, 50) + '...' : 'No review'}`);
        console.log(`      Created: ${new Date(rating.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('   ❌ No ratings found in response!');
      console.log('   Response keys:', Object.keys(data));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
};

testAdminDashboard();
