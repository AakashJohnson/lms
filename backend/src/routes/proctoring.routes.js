import express from 'express';
import { protect } from '../middlewares/auth.js';
import { hasPermission } from '../middlewares/rbac.js';
import AssessmentAttempt from '../models/AssessmentAttempt.model.js';

const router = express.Router();

// ── Log Activity (Student) ────────────────────────────────────────────────────
router.post('/attempts/:attemptId/log-activity', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { activityLogs } = req.body;

    const attempt = await AssessmentAttempt.findById(attemptId);
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    // Verify the attempt belongs to the authenticated user
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Append activity logs
    if (!attempt.proctoring) {
      attempt.proctoring = {
        violations: [],
        violationCount: 0,
        activityLogs: [],
        autoSubmitted: false,
      };
    }

    attempt.proctoring.activityLogs.push(...activityLogs);
    await attempt.save();

    res.json({
      success: true,
      message: 'Activity logs recorded',
      data: { logsCount: activityLogs.length }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ success: false, message: 'Failed to log activity' });
  }
});

// ── Log Violation (Student) ───────────────────────────────────────────────────
router.post('/attempts/:attemptId/log-violation', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body;

    const attempt = await AssessmentAttempt.findById(attemptId);
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    // Verify the attempt belongs to the authenticated user
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Add violation
    if (!attempt.proctoring) {
      attempt.proctoring = {
        violations: [],
        violationCount: 0,
        activityLogs: [],
        autoSubmitted: false,
      };
    }

    attempt.proctoring.violations.push({
      type,
      timestamp: new Date(),
      details,
    });
    attempt.proctoring.violationCount = attempt.proctoring.violations.length;

    await attempt.save();

    res.json({
      success: true,
      message: 'Violation recorded',
      data: {
        violationCount: attempt.proctoring.violationCount,
        violation: { type, details, timestamp: new Date() }
      }
    });
  } catch (error) {
    console.error('Error logging violation:', error);
    res.status(500).json({ success: false, message: 'Failed to log violation' });
  }
});

// ── Get Proctoring Data (Trainer/Admin) ───────────────────────────────────────
router.get('/attempts/:attemptId/proctoring', protect, hasPermission('assessments:evaluate'), async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await AssessmentAttempt.findById(attemptId)
      .populate('user', 'name email')
      .populate('assessment', 'title');
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    res.json({
      success: true,
      data: {
        student: attempt.user,
        assessment: attempt.assessment,
        proctoring: attempt.proctoring || {},
        submittedAt: attempt.submittedAt,
        status: attempt.status,
      }
    });
  } catch (error) {
    console.error('Error fetching proctoring data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch proctoring data' });
  }
});

// ── Get All Flagged Attempts (Trainer/Admin) ──────────────────────────────────
router.get('/flagged-attempts', protect, hasPermission('assessments:evaluate'), async (req, res) => {
  try {
    const { courseId, assessmentId } = req.query;

    const query = {
      'proctoring.violationCount': { $gt: 0 }
    };

    if (courseId) query.course = courseId;
    if (assessmentId) query.assessment = assessmentId;

    const attempts = await AssessmentAttempt.find(query)
      .populate('user', 'name email')
      .populate('assessment', 'title')
      .sort({ 'proctoring.violationCount': -1 })
      .limit(100);

    res.json({
      success: true,
      data: attempts.map(attempt => ({
        _id: attempt._id,
        student: attempt.user,
        assessment: attempt.assessment,
        violationCount: attempt.proctoring?.violationCount || 0,
        autoSubmitted: attempt.proctoring?.autoSubmitted || false,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
      }))
    });
  } catch (error) {
    console.error('Error fetching flagged attempts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flagged attempts' });
  }
});

// ── Upload Webcam Recording (Student) ─────────────────────────────────────────
router.post('/attempts/:attemptId/upload-recording', protect, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { recordingUrl } = req.body;

    const attempt = await AssessmentAttempt.findById(attemptId);
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    // Verify the attempt belongs to the authenticated user
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!attempt.proctoring) {
      attempt.proctoring = {
        violations: [],
        violationCount: 0,
        activityLogs: [],
        autoSubmitted: false,
      };
    }

    attempt.proctoring.webcamRecordingUrl = recordingUrl;
    await attempt.save();

    res.json({
      success: true,
      message: 'Recording URL saved',
    });
  } catch (error) {
    console.error('Error saving recording URL:', error);
    res.status(500).json({ success: false, message: 'Failed to save recording URL' });
  }
});

export default router;
