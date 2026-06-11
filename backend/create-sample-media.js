import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import Media from './src/models/Media.model.js';

dotenv.config();

async function createSampleMedia() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find trainer
    const trainer = await User.findOne({ email: 'trainer@ncui.in' });

    if (!trainer) {
      console.log('❌ Trainer not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n👨‍🏫 Trainer: ${trainer.firstName} ${trainer.lastName}`);

    // Delete existing media
    await Media.deleteMany({});
    console.log('\n🗑️  Deleted existing media');

    // Create sample media items
    const sampleMedia = [
      {
        title: 'Introduction to Cooperative Management',
        description: 'Learn the basics of cooperative management and principles',
        mediaType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
        fileName: 'intro-cooperative-management.mp4',
        fileSize: 52428800, // 50MB
        mimeType: 'video/mp4',
        duration: 1200, // 20 minutes
        category: 'educational',
        tags: ['cooperative', 'management', 'basics'],
        uploadedBy: {
          userId: trainer._id,
          userType: 'trainer',
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        accessLevel: 'public',
        viewCount: 45,
        isActive: true
      },
      {
        title: 'Financial Literacy for Cooperatives',
        description: 'Understanding financial management in cooperative societies',
        mediaType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
        fileName: 'financial-literacy.mp4',
        fileSize: 78643200, // 75MB
        mimeType: 'video/mp4',
        duration: 1800, // 30 minutes
        category: 'training',
        tags: ['finance', 'accounting', 'cooperative'],
        uploadedBy: {
          userId: trainer._id,
          userType: 'trainer',
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        accessLevel: 'public',
        viewCount: 67,
        isActive: true
      },
      {
        title: 'Digital Marketing Basics',
        description: 'Introduction to digital marketing strategies',
        mediaType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
        fileName: 'digital-marketing-basics.mp4',
        fileSize: 41943040, // 40MB
        mimeType: 'video/mp4',
        duration: 900, // 15 minutes
        category: 'tutorial',
        tags: ['marketing', 'digital', 'social-media'],
        uploadedBy: {
          userId: trainer._id,
          userType: 'trainer',
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        accessLevel: 'public',
        viewCount: 89,
        isActive: true
      },
      {
        title: 'Legal Compliance for Cooperatives',
        description: 'Understanding legal requirements and compliance',
        mediaType: 'video',
        fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
        fileName: 'legal-compliance.mp4',
        fileSize: 62914560, // 60MB
        mimeType: 'video/mp4',
        duration: 1500, // 25 minutes
        category: 'educational',
        tags: ['legal', 'compliance', 'regulations'],
        uploadedBy: {
          userId: trainer._id,
          userType: 'trainer',
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        accessLevel: 'public',
        viewCount: 34,
        isActive: true
      },
      {
        title: 'Cooperative Leadership Podcast',
        description: 'Audio discussion on leadership in cooperatives',
        mediaType: 'audio',
        fileUrl: 'https://example.com/audio/leadership.mp3',
        thumbnailUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400',
        fileName: 'leadership-podcast.mp3',
        fileSize: 20971520, // 20MB
        mimeType: 'audio/mpeg',
        duration: 2400, // 40 minutes
        category: 'webinar',
        tags: ['leadership', 'podcast', 'management'],
        uploadedBy: {
          userId: trainer._id,
          userType: 'trainer',
          name: `${trainer.firstName} ${trainer.lastName}`
        },
        accessLevel: 'public',
        viewCount: 23,
        isActive: true
      }
    ];

    console.log('\n📝 Creating sample media items...');
    for (const mediaData of sampleMedia) {
      const media = await Media.create(mediaData);
      console.log(`  ✅ Created: "${media.title}" (${media.mediaType})`);
    }

    // Verify
    const allMedia = await Media.find()
      .sort({ createdAt: -1 });

    console.log(`\n✅ Total media items created: ${allMedia.length}`);
    console.log('\n📋 Media Items:');
    allMedia.forEach(m => {
      console.log(`  - ${m.title} (${m.mediaType})`);
      console.log(`    Category: ${m.category}`);
      console.log(`    Duration: ${Math.floor(m.duration / 60)} minutes`);
      console.log(`    Views: ${m.viewCount}`);
      console.log(`    Uploaded by: ${m.uploadedBy.name}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSampleMedia();
