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
 * @desc    Enhanced Bulk Import for Department-wise Students
 * @route   POST /api/v1/bulk-import/students/department
 * @access  Private/Admin
 */
export const importStudentsWithDepartment = asyncHandler(async (req, res, next) => {
  const { students, defaultPassword = 'Student@123', allocationMode = 'manual' } = req.body;

  console.log('📥 Enhanced Bulk Import - Department-wise');
  console.log('Students count:', students?.length);

  if (!students || !Array.isArray(students) || students.length === 0) {
    return next(new ErrorResponse('No student data provided', 400));
  }

  const results = {
    success: [],
    errors: [],
    created: 0,
    updated: 0,
    duplicates: [],
    batchesCreated: [],
    departmentsCreated: []
  };

  // Track departments and batches created/found in this import
  const departmentMap = new Map();
  const batchMap = new Map();

  // Process each student
  for (let i = 0; i < students.length; i++) {
    const studentData = students[i];
    const rowNum = i + 2; // Excel row number

    try {
      // 1. Validate Required Fields
      const requiredFields = ['firstName', 'lastName', 'email', 'mobile', 'department', 'semester', 'year'];
      const missingFields = requiredFields.filter(field => !studentData[field]);

      if (missingFields.length > 0) {
        results.errors.push({
          row: rowNum,
          enrollmentNo: studentData.enrollmentNo || 'N/A',
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
        continue;
      }

      // 2. Validate Email
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(studentData.email)) {
        results.errors.push({ row: rowNum, email: studentData.email, error: 'Invalid email format' });
        continue;
      }

      // 3. Validate Mobile (10 digits)
      const mobileStr = studentData.mobile?.toString().trim() || '';
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(mobileStr)) {
        results.errors.push({ row: rowNum, email: studentData.email, error: 'Invalid mobile (10 digits starting with 6-9)' });
        continue;
      }

      // 4. Validate Semester & Year
      const semester = parseInt(studentData.semester);
      const year = parseInt(studentData.year);
      if (isNaN(semester) || semester < 1 || semester > 8) {
        results.errors.push({ row: rowNum, email: studentData.email, error: 'Invalid semester (1-8)' });
        continue;
      }
      if (isNaN(year) || year < 2020 || year > 2030) {
        results.errors.push({ row: rowNum, email: studentData.email, error: 'Invalid year (2020-2030)' });
        continue;
      }

      // 5. Find or Create Department
      const deptCode = studentData.department.toUpperCase().trim();
      let department = departmentMap.get(deptCode);

      if (!department) {
        department = await Department.findOne({ code: deptCode });
        if (!department) {
          // Create new department
          department = await Department.create({
            name: studentData.department.trim(),
            code: deptCode,
            description: `Auto-created department for ${studentData.department}`,
            createdBy: req.user._id
          });
          results.departmentsCreated.push({ code: deptCode, name: department.name });
          console.log(`✅ Created department: ${deptCode}`);
        }
        departmentMap.set(deptCode, department);
      }

            // 6. Find or Create Batch (only for auto mode)
      const section = (studentData.section || 'A').toUpperCase();
      let batchName = '';
      let batch = null;

      if (allocationMode === 'auto') {
        batchName = `${studentData.department} Sem ${semester} Sec ${section} (${year})`;
        const batchCode = `${deptCode}-${semester}-${section}-${year}`.toUpperCase();

        batch = batchMap.get(batchCode);

        if (!batch) {
          batch = await Batch.findOne({ code: batchCode });
          if (!batch) {
            batch = await Batch.create({
              name: batchName,
              code: batchCode,
              department: department._id,
              year: year,
              startDate: new Date(`${year}-07-01`),
              endDate: new Date(`${year + 1}-05-31`),
              semester: semester,
              section: section,
              maxStudents: 60,
              isActive: true,
              createdBy: req.user._id
            });
            results.batchesCreated.push({ code: batchCode, name: batchName });
            console.log(`Created batch: ${batchCode}`);
          }
          batchMap.set(batchCode, batch);
        }
      }

      // 7. Check for Existing Student (by email or enrollment number)
      let student = await Participant.findOne({ email: studentData.email.toLowerCase().trim() });
      const previousBatchId = student?.batch?.toString();

      const studentDetails = {
        firstName: studentData.firstName.trim(),
        lastName: studentData.lastName.trim(),
        email: studentData.email.toLowerCase().trim(),
        mobile: mobileStr,
        department: department._id,
        batch: allocationMode === 'auto' ? batch?._id : (student?.batch || null),
        semester: semester,
        section: section,
        year: year,
        organization: studentData.organization?.toString().trim() || '',
        designation: 'Student',
        role: 'student',
        isApproved: true,
        isActive: true,
        isEmailVerified: false,
        isMobileVerified: false
      };

      if (student) {
        // Update existing student
        if (student.department?.toString() !== department._id.toString() ||
            (allocationMode === 'auto'
              ? student.batch?.toString() !== batch?._id?.toString()
              : false)) {
          student = await Participant.findByIdAndUpdate(
            student._id,
            { ...studentDetails, updatedAt: new Date() },
            { new: true }
          );
          results.updated++;
          if (allocationMode === 'auto' && batch?._id && previousBatchId !== batch._id.toString()) {
            await Batch.findByIdAndUpdate(batch._id, { $inc: { currentStudents: 1 } });
          }
          console.log(`✓ Updated student: ${student.email}`);
        } else {
          results.duplicates.push({
            row: rowNum,
            email: studentData.email,
            message: 'Student already exists with same department & batch'
          });
        }
      } else {
        // Create new student
        // Pass plain password — Participant model pre-save hook handles hashing
        studentDetails.password = defaultPassword;
        studentDetails.enrolledCourses = [];
        studentDetails.totalCoursesEnrolled = 0;

        student = await Participant.create(studentDetails);
        results.created++;
        if (allocationMode === 'auto' && batch?._id) {
          await Batch.findByIdAndUpdate(batch._id, { $inc: { currentStudents: 1 } });
        }
        console.log(`✅ Created student: ${student.email}`);
      }

      // 8. Add to success list
      results.success.push({
        row: rowNum,
        enrollmentNo: studentData.enrollmentNo || 'N/A',
        name: `${studentData.firstName} ${studentData.lastName}`,
        email: studentData.email,
        department: deptCode,
        batch: allocationMode === 'auto' ? batchName : 'Unassigned (manual mode)',
        status: student ? (results.updated > results.created ? 'Updated' : 'Created') : 'Exists'
      });

    } catch (error) {
      console.error(`❌ Error at row ${rowNum}:`, error.message);
      results.errors.push({
        row: rowNum,
        enrollmentNo: studentData.enrollmentNo || 'N/A',
        error: error.message
      });
    }
  }

  console.log('📊 Import Summary:');
  console.log(`   Created: ${results.created}`);
  console.log(`   Updated: ${results.updated}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log(`   Batches: ${results.batchesCreated.length}`);
  console.log(`   Departments: ${results.departmentsCreated.length}`);

  res.status(200).json({
    success: true,
    message: 'Bulk import completed',
    data: {
      totalProcessed: students.length,
      created: results.created,
      updated: results.updated,
      errors: results.errors.length,
      duplicates: results.duplicates.length,
      batchesCreated: results.batchesCreated.length,
      departmentsCreated: results.departmentsCreated.length,
      details: results
    }
  });
});

/**
 * @desc    Import students from Excel file
 * @route   POST /api/v1/bulk-import/students/excel
 * @access  Private/Admin
 */
export const importStudentsFromExcel = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload an Excel file', 400));
  }

  console.log('📄 Processing Excel file:', req.file.originalname);

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${jsonData.length} rows in Excel`);

    if (jsonData.length === 0) {
      return next(new ErrorResponse('Excel file is empty', 400));
    }

    // Transform Excel data to student format
    const students = jsonData.map(row => ({
      firstName: row.FirstName || row.firstName || row.Name?.split(' ')[0] || '',
      lastName: row.LastName || row.lastName || row.Name?.split(' ').slice(1).join(' ') || '',
      email: row.Email || row.email || row['E-mail'] || '',
      mobile: row.Mobile || row.mobile || row.Phone || row['Phone Number'] || '',
      department: row.Department || row.department || row.Dept || row['Dept Code'] || '',
      semester: row.Semester || row.semester || row.Sem || row['Sem No'] || 1,
      year: row.Year || row.year || row['Academic Year'] || new Date().getFullYear(),
      section: row.Section || row.section || row.Sec || 'A',
      organization: row.Organization || row.organization || ''
    }));

    // Call the main import function
    req.body = { students, defaultPassword: 'Student@123' };
    return importStudentsWithDepartment(req, res, next);

  } catch (error) {
    console.error('Excel parsing error:', error);
    return next(new ErrorResponse('Failed to parse Excel file: ' + error.message, 400));
  }
});

/**
 * @desc    Get template for student import
 * @route   GET /api/v1/bulk-import/template/students
 * @access  Private/Admin
 */
export const getStudentImportTemplate = asyncHandler(async (req, res, next) => {
  const templateData = [
    {
      FirstName: 'Rahul',
      LastName: 'Sharma',
      Email: 'rahul.sharma@example.com',
      Mobile: '9876543210',
      Department: 'CSE',
      Semester: 3,
      Year: 2023,
      Section: 'A',
      Organization: 'University'
    },
    {
      FirstName: 'Priya',
      LastName: 'Patel',
      Email: 'priya.patel@example.com',
      Mobile: '9876543211',
      Department: 'MBA',
      Semester: 1,
      Year: 2023,
      Section: 'A',
      Organization: 'University'
    },
    {
      FirstName: 'Amit',
      LastName: 'Singh',
      Email: 'amit.singh@example.com',
      Mobile: '9876543212',
      Department: 'BCA',
      Semester: 5,
      Year: 2023,
      Section: 'B',
      Organization: 'University'
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(templateData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=student_import_template.xlsx');
  res.send(buffer);
});

/**
 * @desc    Assign courses to batch
 * @route   POST /api/v1/bulk-import/batch/:batchId/courses
 * @access  Private/Admin
 */
export const assignCoursesToBatch = asyncHandler(async (req, res, next) => {
  const { batchId } = req.params;
  const { courseIds, enrollStudents = true } = req.body;

  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
    return next(new ErrorResponse('Please provide course IDs', 400));
  }

  // Validate batch exists
  const batch = await Batch.findById(batchId);
  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Validate courses exist
  const courses = await Course.find({ _id: { $in: courseIds } });
  if (courses.length !== courseIds.length) {
    return next(new ErrorResponse('One or more courses not found', 404));
  }

  // Get all students in the batch
  const students = await Participant.find({ batch: batchId, isActive: true });
  const results = {
    studentsProcessed: students.length,
    enrollmentsCreated: 0,
    errors: []
  };

  if (enrollStudents && students.length > 0) {
    for (const course of courses) {
      for (const student of students) {
        try {
          // Check if already enrolled
          const existingEnrollment = await Enrollment.findOne({
            user: student._id,
            course: course._id
          });

          if (!existingEnrollment) {
            await Enrollment.create({
              user: student._id,
              course: course._id,
              status: 'enrolled',
              enrolledAt: new Date()
            });

            // Update student's enrolled courses
            if (!student.enrolledCourses.includes(course._id)) {
              student.enrolledCourses.push(course._id);
              student.totalCoursesEnrolled = student.enrolledCourses.length;
              await student.save();
            }

            // Update course enrollment count
            course.currentEnrollments = (course.currentEnrollments || 0) + 1;
            course.statistics.totalEnrollments = (course.statistics.totalEnrollments || 0) + 1;
            await course.save();

            results.enrollmentsCreated++;
          }
        } catch (error) {
          results.errors.push({
            student: student.email,
            course: course.title,
            error: error.message
          });
        }
      }
    }
  }

  // Add courses to batch
  batch.courses = [...new Set([...batch.courses, ...courseIds])];
  await batch.save();

  console.log(`📚 Assigned ${courses.length} courses to batch ${batch.code}`);
  console.log(`   Students: ${students.length}`);
  console.log(`   Enrollments: ${results.enrollmentsCreated}`);

  res.status(200).json({
    success: true,
    message: `Courses assigned to batch. ${results.enrollmentsCreated} new enrollments created.`,
    data: {
      batch: batch.name,
      coursesAssigned: courses.map(c => c.title),
      studentsProcessed: results.studentsProcessed,
      enrollmentsCreated: results.enrollmentsCreated,
      errors: results.errors
    }
  });
});

/**
 * @desc    Assign courses to department
 * @route   POST /api/v1/bulk-import/department/:departmentId/courses
 * @access  Private/Admin
 */
export const assignCoursesToDepartment = asyncHandler(async (req, res, next) => {
  const { departmentId } = req.params;
  const { courseIds, enrollAllBatches = true } = req.body;

  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
    return next(new ErrorResponse('Please provide course IDs', 400));
  }

  // Validate department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  // Get all batches in department
  const batches = await Batch.find({ department: departmentId, isActive: true });

  const results = {
    batchesProcessed: batches.length,
    totalEnrollments: 0,
    errors: []
  };

  for (const batch of batches) {
    // Reuse batch course assignment logic
    const batchStudents = await Participant.find({ batch: batch._id, isActive: true });

    for (const courseId of courseIds) {
      const course = await Course.findById(courseId);
      if (!course) continue;

      for (const student of batchStudents) {
        try {
          const existingEnrollment = await Enrollment.findOne({
            user: student._id,
            course: courseId
          });

          if (!existingEnrollment) {
            await Enrollment.create({
              user: student._id,
              course: courseId,
              status: 'enrolled',
              enrolledAt: new Date()
            });

            if (!student.enrolledCourses.includes(courseId)) {
              student.enrolledCourses.push(courseId);
              student.totalCoursesEnrolled = student.enrolledCourses.length;
              await student.save();
            }

            course.currentEnrollments = (course.currentEnrollments || 0) + 1;
            course.statistics.totalEnrollments = (course.statistics.totalEnrollments || 0) + 1;
            await course.save();

            results.totalEnrollments++;
          }
        } catch (error) {
          results.errors.push({
            student: student.email,
            course: course.title,
            error: error.message
          });
        }
      }

      // Add course to batch
      if (!batch.courses.includes(courseId)) {
        batch.courses.push(courseId);
        await batch.save();
      }
    }
  }

  console.log(`📚 Assigned courses to department ${department.code}`);
  console.log(`   Batches: ${batches.length}`);
  console.log(`   Enrollments: ${results.totalEnrollments}`);

  res.status(200).json({
    success: true,
    message: `Courses assigned to all batches in ${department.name}`,
    data: {
      department: department.name,
      coursesAssigned: courseIds.length,
      batchesProcessed: results.batchesProcessed,
      totalEnrollments: results.totalEnrollments,
      errors: results.errors
    }
  });
});

/**
 * @desc    Auto divide participants department-wise into existing batches
 * @route   POST /api/v1/bulk-import/participants/auto-divide
 * @access  Private/Admin
 */
export const autoDivideParticipantsByDepartment = asyncHandler(async (req, res, next) => {
  const { departmentIds = [], courseId, onlyUnassigned = true } = req.body;

  const participantFilter = { isActive: true };
  if (onlyUnassigned) participantFilter.batch = null;
  if (Array.isArray(departmentIds) && departmentIds.length > 0) {
    participantFilter.department = { $in: departmentIds };
  }

  if (courseId) {
    const course = await Course.findById(courseId);
    if (!course) return next(new ErrorResponse('Course not found', 404));

    const enrollments = await Enrollment.find({
      course: courseId,
      status: { $in: ['enrolled', 'in-progress'] }
    }).select('user').lean();

    const enrolledParticipantIds = enrollments.map((enrollment) => enrollment.user);
    participantFilter._id = { $in: enrolledParticipantIds };
  }

  const participants = await Participant.find(participantFilter)
    .select('_id firstName lastName email department batch')
    .lean();

  if (!participants.length) {
    return res.status(200).json({
      success: true,
      message: 'No participants found for allocation',
      data: { totalParticipants: 0, assigned: 0, waitlisted: 0, preview: [] }
    });
  }

  const deptIds = [...new Set(participants.map((p) => p.department?.toString()).filter(Boolean))];
  const batches = await Batch.find({
    department: { $in: deptIds },
    isActive: true
  })
    .select('_id name code department maxStudents currentStudents')
    .sort({ createdAt: 1 })
    .lean();

  const batchesByDepartment = new Map();
  batches.forEach((b) => {
    const key = b.department.toString();
    if (!batchesByDepartment.has(key)) batchesByDepartment.set(key, []);
    batchesByDepartment.get(key).push({
      ...b,
      remainingSeats: Math.max((b.maxStudents || 0) - (b.currentStudents || 0), 0)
    });
  });

  const participantGroups = new Map();
  participants.forEach((p) => {
    const key = p.department?.toString() || 'NO_DEPT';
    if (!participantGroups.has(key)) participantGroups.set(key, []);
    participantGroups.get(key).push(p);
  });

  const assignmentOps = [];
  const batchSeatIncrements = new Map();
  const preview = [];
  let assigned = 0;
  let waitlisted = 0;

  for (const [deptId, deptParticipants] of participantGroups.entries()) {
    const deptBatches = batchesByDepartment.get(deptId) || [];

    // Least-filled first allocation
    deptBatches.sort((a, b) => b.remainingSeats - a.remainingSeats);

    for (const p of deptParticipants) {
      const target = deptBatches.find((b) => b.remainingSeats > 0);
      if (!target) {
        waitlisted += 1;
        preview.push({
          participantId: p._id,
          participantName: `${p.firstName} ${p.lastName}`,
          email: p.email,
          departmentId: deptId,
          status: 'waitlisted',
          batch: null
        });
        continue;
      }

      assignmentOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { batch: target._id } }
        }
      });

      assigned += 1;
      target.remainingSeats -= 1;
      batchSeatIncrements.set(target._id.toString(), (batchSeatIncrements.get(target._id.toString()) || 0) + 1);

      preview.push({
        participantId: p._id,
        participantName: `${p.firstName} ${p.lastName}`,
        email: p.email,
        departmentId: deptId,
        status: 'assigned',
        batch: {
          id: target._id,
          name: target.name,
          code: target.code
        }
      });
    }
  }

  if (assignmentOps.length) {
    await Participant.bulkWrite(assignmentOps);
  }

  if (batchSeatIncrements.size) {
    for (const [batchId, inc] of batchSeatIncrements.entries()) {
      const update = { $inc: { currentStudents: inc } };
      if (courseId) update.$addToSet = { courses: courseId };
      await Batch.findByIdAndUpdate(batchId, update);
    }
  }

  if (courseId && assigned > 0) {
    const assignedBatchIds = preview
      .filter((item) => item.status === 'assigned' && item.batch?.id)
      .map((item) => item.batch.id);
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { batches: { $each: assignedBatchIds } }
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Department-wise participant allocation completed',
    data: {
      totalParticipants: participants.length,
      assigned,
      waitlisted,
      onlyUnassigned,
      courseId: courseId || null,
      preview
    }
  });
});

/**
 * @desc    Get unassigned participants (optionally department filtered)
 * @route   GET /api/v1/bulk-import/participants/unassigned
 * @access  Private/Admin
 */
export const getUnassignedParticipants = asyncHandler(async (req, res, next) => {
  const { departmentId, courseId, limit = 200 } = req.query;
  const filter = { isActive: true, batch: null };
  if (departmentId) filter.department = departmentId;

  if (courseId) {
    const enrollments = await Enrollment.find({
      course: courseId,
      status: { $in: ['enrolled', 'in-progress'] }
    }).select('user').lean();
    filter._id = { $in: enrollments.map((enrollment) => enrollment.user) };
  }

  const participants = await Participant.find(filter)
    .populate('department', 'name code')
    .select('firstName lastName email mobile department')
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    count: participants.length,
    data: participants
  });
});

/**
 * @desc    Manually assign participants to a batch
 * @route   POST /api/v1/bulk-import/participants/manual-assign
 * @access  Private/Admin
 */
export const manualAssignParticipantsToBatch = asyncHandler(async (req, res, next) => {
  const { participantIds, batchId, courseId } = req.body;

  if (!batchId || !Array.isArray(participantIds) || participantIds.length === 0) {
    return next(new ErrorResponse('batchId and participantIds are required', 400));
  }

  const batch = await Batch.findById(batchId).lean();
  if (!batch) return next(new ErrorResponse('Batch not found', 404));

  const participants = await Participant.find({
    _id: { $in: participantIds },
    isActive: true
  }).select('_id department batch email').lean();

  if (!participants.length) {
    return next(new ErrorResponse('No valid participants found', 400));
  }

  // Same department guard
  const wrongDept = participants.filter(
    (p) => !p.department || p.department.toString() !== batch.department.toString()
  );
  if (wrongDept.length > 0) {
    return next(
      new ErrorResponse(
        `Department mismatch for ${wrongDept.length} participant(s). Assign only to same department batch.`,
        400
      )
    );
  }

  // Capacity guard
  const alreadyAssignedToThisBatch = participants.filter(
    (p) => p.batch && p.batch.toString() === batchId
  ).length;
  const toAssignCount = participants.length - alreadyAssignedToThisBatch;
  const available = Math.max((batch.maxStudents || 0) - (batch.currentStudents || 0), 0);
  if (toAssignCount > available) {
    return next(new ErrorResponse(`Batch capacity exceeded. Available seats: ${available}`, 400));
  }

  const result = await Participant.updateMany(
    { _id: { $in: participantIds }, isActive: true },
    { $set: { batch: batchId } }
  );

  if (toAssignCount > 0) {
    const batchUpdate = { $inc: { currentStudents: toAssignCount } };
    if (courseId) batchUpdate.$addToSet = { courses: courseId };
    await Batch.findByIdAndUpdate(batchId, batchUpdate);
  }

  if (courseId) {
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { batches: batchId }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Participants assigned successfully',
    data: {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      assignedNew: toAssignCount
    }
  });
});

export default {
  importStudentsWithDepartment,
  importStudentsFromExcel,
  getStudentImportTemplate,
  assignCoursesToBatch,
  assignCoursesToDepartment,
  autoDivideParticipantsByDepartment,
  getUnassignedParticipants,
  manualAssignParticipantsToBatch
};

