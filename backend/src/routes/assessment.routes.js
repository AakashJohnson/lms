import express from 'express';
import { protect } from '../middlewares/auth.js';
import { hasPermission, authorize } from '../middlewares/rbac.js';
import { assessmentRateLimiter } from '../middlewares/rateLimiter.js';
import {
  getAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  updateAssessmentStatus,
  deleteAssessment,
  duplicateAssessment,
} from '../controllers/assessment.controller.js';
import {
  generateAssessmentFromSavedContent,
  addQuestionsFromSavedContent,
  regenerateQuestion,
} from '../controllers/assessmentAi.controller.js';

const router = express.Router();

router.use(protect);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',    getAssessments);
router.post('/',   hasPermission('assessments:create'), createAssessment);

// Specific sub-routes BEFORE /:id wildcard
router.post('/ai/generate-from-saved-content', hasPermission('assessments:create'), generateAssessmentFromSavedContent);
router.post('/ai/add-questions-from-saved-content', hasPermission('assessments:create'), addQuestionsFromSavedContent);
router.post('/ai/regenerate-question', hasPermission('assessments:create'), regenerateQuestion);

router.patch('/:id/status',    hasPermission('assessments:update'), updateAssessmentStatus);
router.post('/:id/duplicate',  hasPermission('assessments:create'), duplicateAssessment);

router.get('/:id',    getAssessment);
router.put('/:id',    hasPermission('assessments:update'), updateAssessment);
router.delete('/:id', hasPermission('assessments:delete'), deleteAssessment);

// ── Attempts (Participant) ────────────────────────────────────────────────────
import {
  submitAssessment,
  getMyAttempts,
  getAttemptDetails,
  getAllAttempts
} from '../controllers/assessmentAttempt.controller.js';

router.post('/:id/start',    assessmentRateLimiter, (req, res) => res.json({ message: 'Start assessment' }));
router.post('/:id/submit',   assessmentRateLimiter, submitAssessment);
router.get('/:id/attempts',  getMyAttempts);
router.get('/:id/attempts/:attemptId', getAttemptDetails);

// Admin/Trainer only - get all attempts for an assessment
router.get('/:id/all-attempts', authorize('administrator', 'trainer'), getAllAttempts);

// ── Evaluation (Trainer/Admin) ────────────────────────────────────────────────
router.post('/attempts/:attemptId/evaluate', hasPermission('assessments:evaluate'), (req, res) => res.json({ message: 'Evaluate attempt' }));

export default router;
