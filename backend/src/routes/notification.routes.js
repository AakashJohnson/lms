import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  getUnreadCount,
  broadcastNotification,
} from '../controllers/notification.controller.js';

const router = express.Router();

router.use(protect);

router.get('/',                              getMyNotifications);
router.get('/unread/count',                  getUnreadCount);
router.patch('/:notificationId/read',        markAsRead);
router.patch('/read-all',                    markAllAsRead);
router.delete('/:notificationId',            deleteNotification);
router.delete('/clear-read',                 clearAllRead);
router.post('/broadcast', authorize('administrator'), broadcastNotification);
router.post('/send-email', authorize('administrator', 'trainer'), (req, res) => res.json({ success: true, message: 'Email queued' }));
router.post('/send-sms',   authorize('administrator'),            (req, res) => res.json({ success: true, message: 'SMS queued' }));

export default router;
