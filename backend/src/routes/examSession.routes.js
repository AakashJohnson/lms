import express from 'express';
import { protect } from '../middlewares/auth.js';
import { hasPermission } from '../middlewares/rbac.js';
import {
  createExamSession,
  validateSession,
  updateHeartbeat,
  logViolation,
  terminateSession,
  getSessionDetails,
  getAssessmentSessions,
  resumeSession
} from '../controllers/examSession.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Session Management ────────────────────────────────────────────────────────

// Create new exam session
router.post('/create', createExamSession);

// Validate session
router.get('/:sessionId/validate', validateSession);

// Update heartbeat (keep-alive)
router.post('/:sessionId/heartbeat', updateHeartbeat);

// Log violation
router.post('/:sessionId/violation', logViolation);

// Terminate session
router.post('/:sessionId/terminate', terminateSession);

// Resume paused session
router.post('/:sessionId/resume', resumeSession);

// Get session details
router.get('/:sessionId', getSessionDetails);

// ── Admin/Trainer Routes ──────────────────────────────────────────────────────

// Get all sessions for an assessment
router.get('/assessment/:assessmentId', hasPermission(['admin', 'trainer']), getAssessmentSessions);

export default router;
