import express from 'express';
import {
  exportAdminStudentActivity,
  getAdminStudentCalendar,
  getAdminStudentDay,
  getAdminStudentSummary,
  getMyActivityCalendar,
  getMyActivityDay,
  getMyActivityRange,
  getMyActivitySummary,
  getTeacherCourseStudents,
  getTeacherCourses,
  getTeacherStudentCalendar,
  getTeacherStudentDay,
  getTeacherStudentSummary,
  searchAdminStudents,
} from '../controllers/activity.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/my/summary', authorize('student'), getMyActivitySummary);
router.get('/my/calendar', authorize('student'), getMyActivityCalendar);
router.get('/my/day', authorize('student'), getMyActivityDay);
router.get('/my/range', authorize('student'), getMyActivityRange);

router.get('/teacher/courses', authorize('trainer'), getTeacherCourses);
router.get('/teacher/courses/:courseId/students', authorize('trainer'), getTeacherCourseStudents);
router.get('/teacher/students/:studentId/summary', authorize('trainer'), getTeacherStudentSummary);
router.get('/teacher/students/:studentId/calendar', authorize('trainer'), getTeacherStudentCalendar);
router.get('/teacher/students/:studentId/day', authorize('trainer'), getTeacherStudentDay);

router.get('/admin/students/search', authorize('administrator'), searchAdminStudents);
router.get('/admin/students/:studentId/summary', authorize('administrator'), getAdminStudentSummary);
router.get('/admin/students/:studentId/calendar', authorize('administrator'), getAdminStudentCalendar);
router.get('/admin/students/:studentId/day', authorize('administrator'), getAdminStudentDay);
router.get('/admin/students/:studentId/export', authorize('administrator'), exportAdminStudentActivity);

export default router;
