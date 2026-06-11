import mongoose from 'mongoose';

// ─── Inline Notification Schema (no separate model file needed) ───────────────
const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Alias for compatibility
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  type:      { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  category:  { type: String, enum: ['course', 'assessment', 'certificate', 'session', 'payment', 'system'], default: 'system' },
  read:      { type: Boolean, default: false },
  isRead:    { type: Boolean, default: false }, // Alias for compatibility
  actionUrl: { type: String },
  link:      { type: String }, // Alias for compatibility
  metadata:  { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Virtual to sync read and isRead
notificationSchema.pre('save', function(next) {
  this.isRead = this.read;
  this.user = this.userId || this.user;
  this.link = this.actionUrl || this.link;
  next();
});

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// ─── Get my notifications ─────────────────────────────────────────────────────
export const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly, type, category } = req.query;
    const filter = { user: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;
    if (type) filter.type = type;
    if (category) filter.category = category;

    const [notifications, total, unreadCount, readCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
      Notification.countDocuments({ user: req.user._id, isRead: true }),
    ]);

    // Transform data to match frontend interface
    const transformedNotifications = notifications.map(n => ({
      _id: n._id,
      userId: n.user || n.userId,
      type: n.type,
      category: n.category || 'system',
      title: n.title,
      message: n.message,
      read: n.isRead || n.read || false,
      actionUrl: n.link || n.actionUrl,
      metadata: n.metadata,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt || n.createdAt,
    }));

    // Calculate today's notifications
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = transformedNotifications.filter(n => 
      new Date(n.createdAt) >= today
    ).length;

    res.json({
      success: true,
      data: transformedNotifications,
      stats: {
        total,
        unread: unreadCount,
        read: readCount,
        today: todayCount
      },
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total, 
        pages: Math.ceil(total / parseInt(limit)) 
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mark as read ─────────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (notificationId === 'all') {
      await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    const n = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: n });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete notification ──────────────────────────────────────────────────────
export const deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.notificationId, user: req.user._id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mark all as read ─────────────────────────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Clear all read notifications ─────────────────────────────────────────────
export const clearAllRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ user: req.user._id, isRead: true });
    res.json({ success: true, message: `${result.deletedCount} read notifications cleared` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get unread count ─────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Broadcast (admin) ────────────────────────────────────────────────────────
export const broadcastNotification = async (req, res) => {
  try {
    const { title, message, type = 'info', userIds, roles } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const User = mongoose.model('User');
    let targetUsers = [];

    if (userIds?.length) {
      targetUsers = userIds;
    } else if (roles?.length) {
      const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
      targetUsers = users.map(u => u._id);
    } else {
      const users = await User.find({ isActive: true }).select('_id').lean();
      targetUsers = users.map(u => u._id);
    }

    const notifications = targetUsers.map(userId => ({ user: userId, title, message, type }));
    await Notification.insertMany(notifications);

    res.json({ success: true, message: `Notification sent to ${targetUsers.length} users` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: create notification for a user ───────────────────────────────────
export const createNotification = async (userId, title, message, type = 'info', link = '') => {
  try {
    await Notification.create({ 
      userId: userId,
      user: userId, 
      title, 
      message, 
      type, 
      category: 'session',
      actionUrl: link,
      link,
      read: false,
      isRead: false
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};
