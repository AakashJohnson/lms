import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { gridFsUpload } from '../controllers/file.controller.js';
import {
  getAssignmentSubmissions,
  getLessonAssignmentSubmissions,
  getLessonAssignment,
  getSubmissionDetail,
  getTeacherAssignmentOverview,
  gradeAssignmentSubmission,
  reviewSubmission,
  submitLessonAssignment,
  uploadTeacherFeedbackFile,
} from '../controllers/assignment.controller.js';

const router = express.Router();

router.use(protect);

router.get('/teacher/overview', authorize('trainer', 'administrator'), getTeacherAssignmentOverview);
router.post('/teacher/feedback-file', authorize('trainer', 'administrator'), gridFsUpload.single('file'), uploadTeacherFeedbackFile);
router.get('/submissions/:submissionId', authorize('trainer', 'administrator'), getSubmissionDetail);
router.put('/submissions/:submissionId/review', authorize('trainer', 'administrator'), reviewSubmission);
router.patch('/submissions/:submissionId/grade', authorize('trainer', 'administrator'), gradeAssignmentSubmission);
router.get('/:assignmentId/submissions', authorize('trainer', 'administrator'), getAssignmentSubmissions);

router.get('/course/:courseId/lesson/:lessonId', getLessonAssignment);
router.post('/course/:courseId/lesson/:lessonId/submit', gridFsUpload.single('file'), submitLessonAssignment);
router.get('/course/:courseId/lesson/:lessonId/submissions', authorize('trainer', 'administrator'), getLessonAssignmentSubmissions);

export default router;
