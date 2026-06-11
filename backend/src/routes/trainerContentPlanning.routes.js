import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  getPlanningOverview,
  generateTeacherContentPlan,
  getTeacherContentPlan,
  updateTeacherContentPlan,
  deleteTeacherContentPlan,
  createByteFromPlan,
  createAssessmentFromPlan,
  createLiveSessionFromPlan,
  publishPlanToStudents,
  getPlanHistory,
} from '../controllers/trainerContentPlanning.controller.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(protect);
router.use(authorize('trainer', 'administrator'));

router.get('/content-planning/overview', getPlanningOverview);
router.post('/content-planning/generate', upload.single('file'), generateTeacherContentPlan);
router.get('/content-planning/history', getPlanHistory);
router.get('/content-planning/:planId', getTeacherContentPlan);
router.patch('/content-planning/:planId', updateTeacherContentPlan);
router.delete('/content-planning/:planId', deleteTeacherContentPlan);
router.post('/content-planning/:planId/create-byte', createByteFromPlan);
router.post('/content-planning/:planId/create-assessment', createAssessmentFromPlan);
router.post('/content-planning/:planId/create-live-session', createLiveSessionFromPlan);
router.post('/content-planning/:planId/publish', publishPlanToStudents);

export default router;
