import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms_db';

async function fixCertificateIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('certificates');

    // Drop the problematic index
    console.log('🔧 Dropping certificateNumber index...');
    try {
      await collection.dropIndex('certificateNumber_1');
      console.log('✅ Index dropped');
    } catch (error) {
      console.log('⚠️  Index might not exist:', error.message);
    }

    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, idx.key);
    });

    console.log('\n✅ Done! Now you can generate certificates.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixCertificateIndex();
