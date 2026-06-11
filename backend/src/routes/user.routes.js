import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  approveUser,
  rejectUser,
  deleteUser,
  getPendingApprovals,
} from '../controllers/user.controller.js';

const router = express.Router();

router.use(protect);

// ── My profile ────────────────────────────────────────────────────────────────
router.get('/profile',          getProfile);
router.put('/profile',          updateProfile);
router.put('/change-password',  changePassword);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/',                              authorize('administrator'), getAllUsers);
router.get('/pending-approvals',             authorize('administrator'), getPendingApprovals);
router.put('/:userId/approve',               authorize('administrator'), approveUser);
router.put('/:userId/reject',                authorize('administrator'), rejectUser);
router.delete('/:userId',                    authorize('administrator'), deleteUser);

// ── Trainer access ────────────────────────────────────────────────────────────
// Trainers can view students
router.get('/students',                  authorize('trainer', 'administrator'), getAllUsers);

export default router;
