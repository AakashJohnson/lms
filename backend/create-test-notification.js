import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const createTestNotification = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    // Get Pratham's ID (the logged in student)
    const Participant = mongoose.model('Participant', new mongoose.Schema({}, { strict: false }));
    const pratham = await Participant.findOne({ email: 'pratham@gmail.com' });
    
    if (!pratham) {
      console.log('❌ Pratham not found');
      return;
    }

    console.log('✅ Found Pratham:', pratham._id);

    // Create notification schema
    const notificationSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
      category: { type: String, default: 'system' },
      read: { type: Boolean, default: false },
      isRead: { type: Boolean, default: false },
      actionUrl: { type: String },
      link: { type: String },
      metadata: { type: mongoose.Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    }, { timestamps: true });

    const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

    // Create test notification
    const notification = await Notification.create({
      userId: pratham._id,
      user: pratham._id,
      title: 'Test Notification',
      message: 'This is a test notification to verify the system works!',
      type: 'info',
      category: 'system',
      read: false,
      isRead: false,
      actionUrl: '/dashboard',
      link: '/dashboard',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Test notification created:', notification._id);
    console.log('📧 Notification details:');
    console.log('   User ID:', notification.userId);
    console.log('   Title:', notification.title);
    console.log('   Message:', notification.message);
    console.log('   Read:', notification.read);

    // Check all notifications for this user
    const allNotifications = await Notification.find({ userId: pratham._id });
    console.log('\n📊 Total notifications for Pratham:', allNotifications.length);

    await mongoose.disconnect();
    console.log('\n✅ Done! Now refresh the student dashboard to see the notification.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

createTestNotification();
