import bcrypt from 'bcryptjs';

const passwords = {
  'Admin@123': null,
  'Trainer@123': null,
  'Student@123': null
};

async function generateHashes() {
  console.log('\n🔐 Generating Password Hashes...\n');
  
  for (const password of Object.keys(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    passwords[password] = hash;
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }
  
  console.log('✅ All hashes generated!\n');
  console.log('📋 Copy these hashes to your population script:\n');
  console.log(JSON.stringify(passwords, null, 2));
}

generateHashes();
