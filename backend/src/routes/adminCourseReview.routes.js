import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  getAdminCourseReviewDetail,
  getAdminCourseReviewList,
  publishCourse,
  rejectCourse,
  requestCourseChanges,
  unpublishCourse,
} from '../controllers/course.controller.js';

const router = express.Router();

router.use(protect);
router.use(authorize('administrator'));

router.get('/review', getAdminCourseReviewList);
router.get('/:courseId/review', getAdminCourseReviewDetail);
router.put('/:courseId/publish', publishCourse);
router.put('/:courseId/request-changes', requestCourseChanges);
router.put('/:courseId/reject', rejectCourse);
router.put('/:courseId/unpublish', unpublishCourse);

export default router;
