import dotenv from 'dotenv';
dotenv.config();
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
import mongoose from 'mongoose';
import LiveSession from './src/models/LiveSession.model.js';
import MicroLesson from './src/models/MicroLesson.model.js';

const mongoUri = process.env.NODE_ENV === 'production' 
  ? process.env.MONGODB_URI_PROD 
  : process.env.MONGODB_URI;

mongoose.connect(mongoUri, { family: 4 })
  .then(async () => {
    console.log("Connected!");

    const liveSessionsCount = await LiveSession.countDocuments();
    const microLessonsCount = await MicroLesson.countDocuments();

    console.log("LiveSessions Count:", liveSessionsCount);
    console.log("MicroLessons Count:", microLessonsCount);

    if (liveSessionsCount > 0) {
      const live = await LiveSession.find({}).limit(5).lean();
      console.log("Sample Live Sessions:", live);
    }
    if (microLessonsCount > 0) {
      const micro = await MicroLesson.find({}).limit(5).lean();
      console.log("Sample Micro Lessons:", micro);
    }

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
