import Participant from '../models/Participant.model.js';
import Course from '../models/Course.model.js';
import Batch from '../models/Batch.model.js';
import Enrollment from '../models/Enrollment.model.js';
import Department from '../models/Department.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

/**
 * @desc    Import students for a specific course from XLSX file
 * @route   POST /api/v1/bulk-import/students/:courseId
 * @access  Private/Admin
 */
export const importStudentsForCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { students, defaultPassword = 'student123', departmentId } = req.body;

  console.log('📥 Bulk import request received');
  console.log('Course ID:', courseId);
  console.log('Department ID:', departmentId);
  console.log('Students count:', students?.length);

  // Validate course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  // Validate department if provided
  if (departmentId) {
    const department = await Department.findById(departmentId);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }
  }

  if (!students || !Array.isArray(students) || students.length === 0) {
    return next(new ErrorResponse('No student data provided', 400));
  }

  const results = {
    success: [],
    errors: [],
    enrolled: [],
  };

  // Process each student
  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const rowNum = i + 2; // Excel row number (1-indexed + header)

    try {
      // Validate required fields
      if (!studentData.firstName || !studentData.lastName || !studentData.email || !studentData.mobile) {
        results.errors.push({
          row: rowNum,
          email: studentData.email || 'N/A',
          error: 'Missing required fields (firstName, lastName, email, mobile)',
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(studentData.email)) {
        results.errors.push({
          row: rowNum,
          email: studentData.email,
          error: 'Invalid email format',
        });
        continue;
      }

      // Validate mobile format (10 digits starting with 6-9)
      const mobileRegex = /^[6-9]\d{9}$/;
      const mobileStr = studentData.mobile ? studentData.mobile.toString().trim() : '';
      if (!mobileRegex.test(mobileStr)) {
        results.errors.push({
          row: rowNum,
          email: studentData.email,
          error: 'Invalid mobile number (must be 10 digits starting with 6-9)',
        });
        continue;
      }

      // Check if student already exists
      let student = await Participant.findOne({ email: studentData.email });

      if (student) {
        // Student exists, just enroll in course
        console.log(`✓ Student exists: ${student.email}`);
        
        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
          user: student._id,
          course: courseId,
        });

        if (existingEnrollment) {
          results.errors.push({
            row: rowNum,
            email: studentData.email,
            error: 'Student already enrolled in this course',
          });
          continue;
        }

        // Enroll student in course
        const enrollment = await Enrollment.create({
          user: student._id,
          course: courseId,
          status: 'enrolled',
          enrolledAt: new Date(),
        });

        // Add course to student's enrolledCourses
        if (!student.enrolledCourses.some((id) => id.toString() === courseId.toString())) {
          student.enrolledCourses.push(courseId);
          student.totalCoursesEnrolled = student.enrolledCourses.length;
          await student.save();
        }

        // Update course enrollment count
        course.currentEnrollments = (course.currentEnrollments || 0) + 1;
        course.statistics.totalEnrollments = (course.statistics.totalEnrollments || 0) + 1;

        results.enrolled.push({
          row: rowNum,
          email: studentData.email,
          name: `${student.firstName} ${student.lastName}`,
          status: 'Enrolled (Existing Student)',
        });
      } else {
        // Create new student
        console.log(`+ Creating new student: ${studentData.email}`);

        // Convert mobile to string and clean it
        const mobileStr = studentData.mobile.toString().trim();

        // Pass plain password — Participant model pre-save hook handles hashing
        student = await Participant.create({
          firstName: studentData.firstName.trim(),
          lastName: studentData.lastName.trim(),
          email: studentData.email.toLowerCase().trim(),
          mobile: mobileStr,
          password: defaultPassword,
          role: 'student',
          organization: studentData.organization?.toString().trim() || '',
          designation: studentData.designation?.toString().trim() || '',
          department: departmentId || null,
          batch: studentData.batch || null,
          isApproved: true, // Auto-approve bulk imported students
          isActive: true,
          isEmailVerified: false,
          isMobileVerified: false,
          enrolledCourses: [courseId],
          totalCoursesEnrolled: 1,
        });

        // Enroll in course
        await Enrollment.create({
          user: student._id,
          course: courseId,
          status: 'enrolled',
          enrolledAt: new Date(),
        });

        // Update course enrollment count
        course.currentEnrollments = (course.currentEnrollments || 0) + 1;
        course.statistics.totalEnrollments = (course.statistics.totalEnrollments || 0) + 1;

        results.success.push({
          row: rowNum,
          email: studentData.email,
          name: `${student.firstName} ${student.lastName}`,
          password: defaultPassword,
        });

        results.enrolled.push({
          row: rowNum,
          email: studentData.email,
          name: `${student.firstName} ${student.lastName}`,
          status: 'Created & Enrolled',
        });
      }
    } catch (error) {
      console.error(`Error processing row ${rowNum}:`, error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        results.errors.push({
          row: rowNum,
          email: studentData.email || 'N/A',
          error: `Duplicate ${field}: ${studentData[field]}`,
        });
      } else {
        results.errors.push({
          row: rowNum,
          email: studentData.email || 'N/A',
          error: error.message,
        });
      }
    }
  }

  // Save course with updated enrollment count
  await course.save();

  console.log('✅ Bulk import completed');
  console.log(`   Success: ${results.success.length}`);
  console.log(`   Enrolled: ${results.enrolled.length}`);
  console.log(`   Errors: ${results.errors.length}`);

  res.status(200).json({
    success: true,
    message: 'Bulk import completed',
    data: {
      totalProcessed: students.length,
      newStudents: results.success.length,
      enrolled: results.enrolled.length,
      errors: results.errors.length,
      details: results,
    },
  });
});

/**
 * @desc    Auto-generate batches for a course based on batch size
 * @route   POST /api/v1/bulk-import/courses/:courseId/generate-batches
 * @access  Private/Admin
 */
export const generateBatchesForCourse = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;
  const { batchSize = 50, departmentId, year, trainerIds, semester = 1, section = 'A' } = req.body;

  console.log('🔄 Batch generation request received');
  console.log('Course ID:', courseId);
  console.log('Batch Size:', batchSize);
  console.log('Department ID:', departmentId);
  console.log('Year:', year);
  console.log('Semester:', semester);
  console.log('Section:', section);
  console.log('Trainer IDs:', trainerIds);

  // Validate course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  // Validate department if provided
  let department = null;
  if (departmentId) {
    department = await Department.findById(departmentId);
    if (!department) {
      return next(new ErrorResponse('Department not found', 404));
    }
  } else {
    return next(new ErrorResponse('Department is required', 400));
  }

  // Validate year
  if (!year || year < 2020 || year > 2100) {
    return next(new ErrorResponse('Valid academic year is required (2020-2100)', 400));
  }

  // Validate batch size
  if (!batchSize || batchSize < 1 || batchSize > 500) {
    return next(new ErrorResponse('Batch size must be between 1 and 500', 400));
  }

  // Get all enrolled students for this course
  console.log('📊 Fetching enrollments...');
  const enrollments = await Enrollment.find({
    course: courseId,
    status: { $in: ['enrolled', 'in-progress'] },
  }).lean();

  console.log(`Found ${enrollments.length} enrollments`);

  if (enrollments.length === 0) {
    return next(new ErrorResponse('No enrolled students found for this course. Please import students first.', 400));
  }

  // Get user IDs from enrollments
  const userIds = enrollments.map(e => e.user);
  console.log(`User IDs: ${userIds.length}`);

  // Fetch students ONLY from Participant model
  console.log('📊 Searching for students in Participant model...');

  const participantStudents = await Participant.find({
    _id: { $in: userIds },
    isActive: true,
    batch: null,
    ...(departmentId ? { department: departmentId } : {}),
  }).lean();
  const uniqueStudents = participantStudents;

  console.log(`📊 Found ${uniqueStudents.length} valid participants`);

  if (uniqueStudents.length === 0) {
    return next(new ErrorResponse('No valid students found to assign to batches.', 400));
  }

  // Calculate number of batches needed
  const totalBatches = Math.ceil(uniqueStudents.length / batchSize);
  console.log(`📦 Creating ${totalBatches} batches`);

  const createdBatches = [];
  const errors = [];

  // Generate batches
  for (let i = 0; i < totalBatches; i++) {
    const batchNumber = i + 1;
    const startIndex = i * batchSize;
    const endIndex = Math.min(startIndex + batchSize, uniqueStudents.length);
    const batchStudents = uniqueStudents.slice(startIndex, endIndex);

    try {
      // Get department code for naming
      const deptCode = department?.code || 'DEPT';
      const uniqueSuffix = `${Date.now()}`.slice(-6);

      // Generate batch name and code like: CSE-3-A-2023-Batch1
      const batchName = `${deptCode} Sem ${semester} Sec ${section} (${year}) - Batch ${batchNumber}`;
      const batchCode = `${deptCode.toUpperCase()}-${semester}-${section.toUpperCase()}-${year}-B${batchNumber}`;

      // Create batch with course reference and trainers
      const batch = await Batch.create({
        name: batchName,
        code: batchCode,
        department: departmentId,
        course: courseId, // Link batch to course
        year: year,
        semester: semester,
        section: section.toUpperCase(),
        startDate: new Date(),
        endDate: null,
        maxStudents: batchSize,
        currentStudents: batchStudents.length,
        isActive: true,
        createdBy: req.user._id,
        trainers: trainerIds && Array.isArray(trainerIds) ? trainerIds : [], // Assign trainers
      });

      // Assign participants to batch
      const studentIds = batchStudents.map(s => s._id);
      await Participant.updateMany(
        { _id: { $in: studentIds } },
        { $set: { batch: batch._id } }
      );

      // Add batch to course
      if (!course.batches.some((id) => id.toString() === batch._id.toString())) {
        course.batches.push(batch._id);
      }

      createdBatches.push({
        batchNumber,
        batchId: batch._id,
        batchName: batch.name,
        batchCode: batch.code,
        studentsCount: batchStudents.length,
        students: batchStudents.map(s => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`,
          email: s.email,
        })),
      });

      console.log(`✅ Created batch ${batchNumber}: ${batch.name} (${batchStudents.length} students)`);
    } catch (error) {
      console.error(`❌ Error creating batch ${batchNumber}:`, error);
      errors.push({
        batchNumber,
        error: error.message,
      });
    }
  }

  // Save course with updated batches
  await course.save();

  console.log('✅ Batch generation completed');
  console.log(`   Created: ${createdBatches.length} batches`);
  console.log(`   Errors: ${errors.length}`);

  res.status(200).json({
    success: true,
    message: `Successfully created ${createdBatches.length} batches`,
    data: {
      totalStudents: uniqueStudents.length,
      batchSize,
      totalBatches: createdBatches.length,
      batches: createdBatches,
      errors,
    },
  });
});

/**
 * @desc    Get students enrolled in a course (for batch generation preview)
 * @route   GET /api/v1/bulk-import/courses/:courseId/students
 * @access  Private/Admin
 */
export const getCourseStudents = asyncHandler(async (req, res, next) => {
  const { courseId } = req.params;

  // Validate course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new ErrorResponse('Course not found', 404));
  }

  // Get all enrolled students
  // Enrollment.user references 'User' but bulk-imported students live in the
  // Participant collection, so we override the populate model explicitly.
  const enrollments = await Enrollment.find({
    course: courseId,
    status: { $in: ['enrolled', 'in-progress'] },
  }).populate({
    path: 'user',
    model: 'Participant',
    select: 'firstName lastName email mobile batch department role',
  });

  const students = enrollments
    .map(e => e.user)
    .filter(Boolean)
    .map(user => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      batch: user.batch,
      department: user.department,
      hasBatch: !!user.batch,
    }));

  const studentsWithoutBatch = students.filter(s => !s.hasBatch);

  res.status(200).json({
    success: true,
    data: {
      totalStudents: students.length,
      studentsWithBatch: students.length - studentsWithoutBatch.length,
      studentsWithoutBatch: studentsWithoutBatch.length,
      students,
    },
  });
});

export default {
  importStudentsForCourse,
  generateBatchesForCourse,
  getCourseStudents,
};
