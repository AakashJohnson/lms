import express from 'express';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// Public routes
router.get('/queries', optionalAuth, (req, res) => res.json({ message: 'Get all queries' }));
router.get('/queries/:queryId', optionalAuth, (req, res) => res.json({ message: 'Get query details' }));

router.use(protect);

// User routes
router.post('/queries', (req, res) => res.json({ message: 'Submit query' }));
router.get('/my-queries', (req, res) => res.json({ message: 'Get my queries' }));

// Expert/Trainer routes
router.post('/queries/:queryId/respond', authorize('trainer', 'administrator'), (req, res) => res.json({ message: 'Respond to query' }));
router.put('/queries/:queryId/status', authorize('trainer', 'administrator'), (req, res) => res.json({ message: 'Update query status' }));

export default router;
