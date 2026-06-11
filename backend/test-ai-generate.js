import mongoose from 'mongoose';
import dotenv from 'dotenv';
import aiContentAnalyzer from './src/services/aiContentAnalyzer.service.js';

dotenv.config();

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('Connected to MongoDB.');

    const courseId = '6a213d7485fb6d4f3b36be0d';
    const content = `Welcome to the WhatsApp course. Today we will learn about communication. WhatsApp is an American freeware, cross-platform centralized instant messaging (IM) and voice-over-IP (VoIP) service owned by Meta Platforms. It allows users to send text messages and voice messages, make voice and video calls, and share images, documents, user locations, and other content. WhatsApp's client application runs on mobile devices but is also accessible from desktop computers, as long as the user's mobile device remains connected to the Internet while they use the desktop app. The service requires users to provide a standard cellular mobile number for registering with the service. In January 2018, WhatsApp released a standalone business app targeted at small business owners, called WhatsApp Business, to enable companies to communicate with customers who use the standard WhatsApp client.`;

    console.log('Calling aiContentAnalyzer.analyzeContent...');
    const result = await aiContentAnalyzer.analyzeContent(courseId, content, { section: 'Test Section' });

    console.log('Result Success:', result.success);
    if (result.success) {
      console.log('Total lessons generated:', result.data.totalLessons);
      console.log('Lessons details:');
      result.data.microLessons.forEach((l, i) => {
        console.log(`\n--- Lesson ${i + 1} ---`);
        console.log(`Title: ${l.title}`);
        console.log(`Duration: ${l.duration} mins`);
        console.log(`Takeaways Count: ${l.aiContent?.keyTakeaways?.length}`);
        console.log(`Quiz Questions Count: ${l.quiz?.questions?.length}`);
        console.log(`Flashcards Count: ${l.flashcards?.length}`);
        console.log(`Content Preview: ${l.content?.substring(0, 100)}...`);
      });
    } else {
      console.error('Error:', result.error);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
