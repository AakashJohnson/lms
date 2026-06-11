import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize, hasPermission } from '../middlewares/rbac.js';

const router = express.Router();

router.use(protect);
router.use(hasPermission('reports:view'));

// Course reports
router.get('/courses', (req, res) => res.json({ message: 'Get course reports' }));
router.get('/courses/:courseId', (req, res) => res.json({ message: 'Get course-specific report' }));
router.get('/courses/:courseId/completion', (req, res) => res.json({ message: 'Get completion report' }));

// User reports
router.get('/users', (req, res) => res.json({ message: 'Get user reports' }));
router.get('/users/:userId/performance', (req, res) => res.json({ message: 'Get user performance' }));

// Assessment reports
router.get('/assessments', (req, res) => res.json({ message: 'Get assessment reports' }));
router.get('/assessments/:assessmentId', (req, res) => res.json({ message: 'Get assessment-specific report' }));

// Export routes (Admin only)
router.get('/export/courses', hasPermission('reports:export'), (req, res) => res.json({ message: 'Export course report' }));
router.get('/export/users', hasPermission('reports:export'), (req, res) => res.json({ message: 'Export user report' }));
router.get('/export/certificates', hasPermission('reports:export'), (req, res) => res.json({ message: 'Export certificate report' }));

export default router;
