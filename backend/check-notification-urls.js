import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
    
    const notifs = await Notification.find({ 
      title: 'New Live Session Scheduled' 
    }).sort({ createdAt: -1 }).limit(5).lean();
    
    console.log('\n📬 Recent Live Session Notifications:', notifs.length);
    
    notifs.forEach((n, i) => {
      console.log(`\n${i + 1}. ${n.title}`);
      console.log('   Message:', n.message.substring(0, 60) + '...');
      console.log('   ActionURL:', n.actionUrl);
      console.log('   Category:', n.category);
      console.log('   Read:', n.read);
      console.log('   Created:', n.createdAt);
    });

    await mongoose.disconnect();
    console.log('\n✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkNotifications();
