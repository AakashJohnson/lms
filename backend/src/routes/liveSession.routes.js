import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  createLiveSession,
  getAllLiveSessions,
  getLiveSession,
  updateLiveSession,
  deleteLiveSession,
  joinLiveSession,
  leaveLiveSession,
  markAttendance,
  getSessionAttendance,
  getMyEnrolledSessions
} from '../controllers/liveSession.controller.js';

const router = express.Router();

router.use(protect);

// My enrolled sessions (Student)
router.get('/my-sessions', getMyEnrolledSessions);

// Session management (Trainer/Admin)
router.post('/', authorize('trainer', 'administrator'), createLiveSession);
router.get('/', getAllLiveSessions);
router.get('/:sessionId', getLiveSession);
router.put('/:sessionId', authorize('trainer', 'administrator'), updateLiveSession);
router.delete('/:sessionId', authorize('administrator'), deleteLiveSession);

// Session joining
router.post('/:sessionId/join', joinLiveSession);
router.post('/:sessionId/leave', leaveLiveSession);

// Attendance
router.post('/:sessionId/attendance', markAttendance);
router.get('/:sessionId/attendance', authorize('trainer', 'administrator'), getSessionAttendance);

export default router;
