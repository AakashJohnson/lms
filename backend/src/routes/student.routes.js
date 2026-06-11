import express from 'express';
import { protect } from '../middlewares/auth.js';
import { getGlobalCourses, getMyCourses, enrollInCourse } from '../controllers/student.controller.js';

const router = express.Router();

// Enforce auth protection for all student routes
router.use(protect);

router.get('/courses/global', getGlobalCourses);
router.get('/my-courses', getMyCourses);
router.post('/courses/:courseId/enroll', enrollInCourse);

export default router;
