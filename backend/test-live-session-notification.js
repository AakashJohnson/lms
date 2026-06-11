import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ceas-lms');
    console.log('✅ Connected to MongoDB');

    // Check participants
    const Participant = mongoose.model('Participant', new mongoose.Schema({}, { strict: false }));
    const activeParticipants = await Participant.find({ isActive: true }).lean();
    console.log('\n👥 Active Participants:', activeParticipants.length);
    
    if (activeParticipants.length > 0) {
      console.log('Sample participant:', {
        id: activeParticipants[0]._id,
        name: `${activeParticipants[0].firstName} ${activeParticipants[0].lastName}`,
        email: activeParticipants[0].email,
        isActive: activeParticipants[0].isActive
      });
    }

    // Check recent live sessions
    const LiveSession = mongoose.model('LiveSession', new mongoose.Schema({}, { strict: false }));
    const recentSessions = await LiveSession.find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    
    console.log('\n📅 Recent Live Sessions:', recentSessions.length);
    recentSessions.forEach((session, i) => {
      console.log(`\n${i + 1}. ${session.title}`);
      console.log('   ID:', session._id);
      console.log('   Course:', session.course || 'General');
      console.log('   Created:', session.createdAt);
    });

    // Check notifications for these sessions
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
    
    if (recentSessions.length > 0) {
      const latestSession = recentSessions[0];
      console.log('\n🔔 Checking notifications for latest session:', latestSession.title);
      
      const notifications = await Notification.find({
        message: { $regex: latestSession.title, $options: 'i' }
      }).lean();
      
      console.log('   Found notifications:', notifications.length);
      
      if (notifications.length > 0) {
        console.log('\n   Sample notification:');
        console.log('   - User ID:', notifications[0].userId);
        console.log('   - Title:', notifications[0].title);
        console.log('   - Message:', notifications[0].message);
        console.log('   - Created:', notifications[0].createdAt);
      }
      
      // Check if notifications exist for active participants
      const participantIds = activeParticipants.map(p => p._id.toString());
      const matchingNotifs = notifications.filter(n => 
        participantIds.includes(n.userId?.toString())
      );
      
      console.log('\n   Notifications sent to active participants:', matchingNotifs.length);
    }

    // Check all notifications created in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentNotifications = await Notification.find({
      createdAt: { $gte: tenMinutesAgo }
    }).lean();
    
    console.log('\n📬 All notifications in last 10 minutes:', recentNotifications.length);
    recentNotifications.forEach((notif, i) => {
      console.log(`\n${i + 1}. ${notif.title}`);
      console.log('   User ID:', notif.userId);
      console.log('   Category:', notif.category);
      console.log('   Created:', notif.createdAt);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testNotifications();
