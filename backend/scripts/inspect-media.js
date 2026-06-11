import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Media from '../src/models/Media.model.js';

dotenv.config({ path: './.env' });

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || process.env.DATABASE_URL || 'mongodb://localhost:27017/ceas-lms';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const allMedia = await Media.find({}).lean();
    console.log(`Total Media documents: ${allMedia.length}`);

    allMedia.forEach((media, i) => {
      console.log(`[${i+1}] Title: "${media.title}" | Type: ${media.mediaType} | Source: "${media.source}" | Module: "${media.module}" | UsageType: "${media.usageType}" | ID: ${media._id}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
