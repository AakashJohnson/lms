import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
    
    // Find all live session notifications with old URL format
    const oldNotifs = await Notification.find({ 
      title: 'New Live Session Scheduled',
      actionUrl: { $regex: '^/live-sessions/' }
    });
    
    console.log(`\n📝 Found ${oldNotifs.length} notifications with old URL format`);
    
    if (oldNotifs.length > 0) {
      // Update all to new format
      const result = await Notification.updateMany(
        { 
          title: 'New Live Session Scheduled',
          actionUrl: { $regex: '^/live-sessions/' }
        },
        { 
          $set: { actionUrl: 'live-sessions' }
        }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} notifications`);
    }

    // Verify the update
    const updatedNotifs = await Notification.find({ 
      title: 'New Live Session Scheduled' 
    }).sort({ createdAt: -1 }).limit(3).lean();
    
    console.log('\n📬 Sample notifications after update:');
    updatedNotifs.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title}`);
      console.log('   ActionURL:', n.actionUrl);
    });

    await mongoose.disconnect();
    console.log('\n✅ Fix complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixNotifications();
