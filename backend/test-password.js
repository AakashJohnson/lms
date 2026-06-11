import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb://localhost:27017/ceas-lms';

console.log('\n🔍 Testing password verification...\n');

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})
.then(async () => {
  console.log('✅ Connected to MongoDB!\n');
  
  const usersCollection = mongoose.connection.db.collection('users');
  const admin = await usersCollection.findOne({ email: 'admin@ncui.in' });
  
  if (!admin) {
    console.log('❌ Admin user not found!');
    process.exit(1);
  }
  
  console.log('📧 Email:', admin.email);
  console.log('🔐 Password Hash:', admin.password);
  console.log('👤 Role:', admin.role);
  console.log('✅ Approved:', admin.isApproved);
  console.log('✅ Active:', admin.isActive);
  
  console.log('\n🧪 Testing password comparison...\n');
  
  const testPassword = 'Admin@123';
  const isMatch = await bcrypt.compare(testPassword, admin.password);
  
  console.log(`Password: "${testPassword}"`);
  console.log(`Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!isMatch) {
    console.log('\n❌ Password does not match!');
    console.log('🔧 Generating new hash...\n');
    
    const newHash = await bcrypt.hash(testPassword, 12);
    console.log('New Hash:', newHash);
    
    const testNewHash = await bcrypt.compare(testPassword, newHash);
    console.log(`New Hash Match: ${testNewHash ? '✅ YES' : '❌ NO'}`);
  }
  
  await mongoose.connection.close();
  process.exit(0);
})
.catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
