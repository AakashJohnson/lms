import express from 'express';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import {
  importStudentsForCourse,
  generateBatchesForCourse,
  getCourseStudents,
} from '../controllers/bulkImport.controller.js';
import {
  importStudentsWithDepartment,
  importStudentsFromExcel,
  getStudentImportTemplate,
  assignCoursesToBatch,
  assignCoursesToDepartment,
  autoDivideParticipantsByDepartment,
  getUnassignedParticipants,
  manualAssignParticipantsToBatch
} from '../controllers/enhancedBulkImport.controller.js';
import multer from 'multer';

const router = express.Router();

// All routes require authentication and admin or trainer role
router.use(protect);
router.use(authorize('administrator', 'trainer'));

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// ============================================
// EXISTING ROUTES
// ============================================

// Import students for a specific course
router.post('/students/:courseId', importStudentsForCourse);

// Generate batches for a course
router.post('/courses/:courseId/generate-batches', generateBatchesForCourse);

// Get students enrolled in a course
router.get('/courses/:courseId/students', getCourseStudents);

// ============================================
// NEW DEPARTMENT-WISE BULK IMPORT ROUTES
// ============================================

// Get Excel template for student import
router.get('/template/students', getStudentImportTemplate);

// Import students with department and batch (JSON)
router.post('/students/department', importStudentsWithDepartment);

// Import students from Excel file
router.post('/students/excel', upload.single('file'), importStudentsFromExcel);

// Assign courses to a batch
router.post('/batch/:batchId/courses', assignCoursesToBatch);

// Assign courses to entire department
router.post('/department/:departmentId/courses', assignCoursesToDepartment);

// Auto divide participants department-wise into batches
router.post('/participants/auto-divide', autoDivideParticipantsByDepartment);
router.get('/participants/unassigned', getUnassignedParticipants);
router.post('/participants/manual-assign', manualAssignParticipantsToBatch);

export default router;
