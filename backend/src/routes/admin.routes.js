import express from 'express';
import {
  getAllUsers,
  getUserById,
  approveUser,
  rejectUser,
  activateUser,
  deactivateUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  bulkImportUsers,
  downloadCSVTemplate,
  getStudentsWithStats,
  getStudentDetails,
  getTrainersOverview,
  getTrainerStudents
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('administrator'));

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// Students with enrollment statistics
router.get('/students-with-stats', getStudentsWithStats);
router.get('/students/:id/details', getStudentDetails);

// Trainers overview with batch and student statistics
router.get('/trainers-overview', getTrainersOverview);
router.get('/trainer/:id/students', getTrainerStudents);

// User management routes
router.route('/users')
  .get(getAllUsers);

router.route('/users/bulk-import')
  .post(bulkImportUsers);

router.route('/users/bulk-import/template/:role')
  .get(downloadCSVTemplate);

router.route('/users/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/activate', activateUser);
router.put('/users/:id/deactivate', deactivateUser);

export default router;
