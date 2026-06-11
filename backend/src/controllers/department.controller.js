import Department from '../models/Department.model.js';
import Batch from '../models/Batch.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Create a new department
 * @route   POST /api/v1/departments
 * @access  Private (admin only)
 */
export const createDepartment = asyncHandler(async (req, res, next) => {
  const { name, code, description, headOfDepartment } = req.body;

  if (!name || !code) {
    return next(new ErrorResponse('Name and code are required', 400));
  }

  // Check if department with same name or code exists
  const existing = await Department.findOne({
    $or: [{ name }, { code: code.toUpperCase() }]
  });

  if (existing) {
    return next(new ErrorResponse('Department with this name or code already exists', 400));
  }

  // Validate HOD if provided
  if (headOfDepartment) {
    const hod = await User.findById(headOfDepartment);
    if (!hod) {
      return next(new ErrorResponse('Head of Department not found', 404));
    }
  }

  const department = await Department.create({
    name,
    code: code.toUpperCase(),
    description,
    headOfDepartment,
    createdBy: req.user._id
  });

  await department.populate('headOfDepartment', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: department
  });
});

/**
 * @desc    Get all departments
 * @route   GET /api/v1/departments
 * @access  Private
 */
export const getDepartments = asyncHandler(async (req, res) => {
  const { isActive, search, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [departments, total] = await Promise.all([
    Department.find(filter)
      .populate('headOfDepartment', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Department.countDocuments(filter)
  ]);

  // Get batch count for each department
  const departmentsWithCounts = await Promise.all(
    departments.map(async (dept) => {
      const batchCount = await Batch.countDocuments({ department: dept._id });
      const studentCount = await User.countDocuments({ department: dept._id });
      return {
        ...dept,
        batchCount,
        studentCount
      };
    })
  );

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: departmentsWithCounts
  });
});

/**
 * @desc    Get single department
 * @route   GET /api/v1/departments/:id
 * @access  Private
 */
export const getDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id)
    .populate('headOfDepartment', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName email')
    .lean();

  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  // Get batch count and student count
  const [batchCount, studentCount] = await Promise.all([
    Batch.countDocuments({ department: department._id }),
    User.countDocuments({ department: department._id })
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...department,
      batchCount,
      studentCount
    }
  });
});

/**
 * @desc    Update department
 * @route   PUT /api/v1/departments/:id
 * @access  Private (admin only)
 */
export const updateDepartment = asyncHandler(async (req, res, next) => {
  let department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  const { name, code, description, headOfDepartment, isActive } = req.body;

  // Check for duplicate name or code (excluding current department)
  if (name || code) {
    const existing = await Department.findOne({
      _id: { $ne: req.params.id },
      $or: [
        ...(name ? [{ name }] : []),
        ...(code ? [{ code: code.toUpperCase() }] : [])
      ]
    });

    if (existing) {
      return next(new ErrorResponse('Department with this name or code already exists', 400));
    }
  }

  // Validate HOD if provided
  if (headOfDepartment) {
    const hod = await User.findById(headOfDepartment);
    if (!hod) {
      return next(new ErrorResponse('Head of Department not found', 404));
    }
  }

  department = await Department.findByIdAndUpdate(
    req.params.id,
    {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(description !== undefined && { description }),
      ...(headOfDepartment !== undefined && { headOfDepartment }),
      ...(isActive !== undefined && { isActive })
    },
    { new: true, runValidators: true }
  ).populate('headOfDepartment', 'firstName lastName email');

  res.status(200).json({
    success: true,
    message: 'Department updated successfully',
    data: department
  });
});

/**
 * @desc    Delete department
 * @route   DELETE /api/v1/departments/:id
 * @access  Private (admin only)
 */
export const deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  // Check if department has batches
  const batchCount = await Batch.countDocuments({ department: req.params.id });
  if (batchCount > 0) {
    return next(new ErrorResponse(
      `Cannot delete department with ${batchCount} active batch(es). Please delete or reassign batches first.`,
      400
    ));
  }

  // Check if department has students
  const studentCount = await User.countDocuments({ department: req.params.id });
  if (studentCount > 0) {
    return next(new ErrorResponse(
      `Cannot delete department with ${studentCount} assigned student(s). Please reassign students first.`,
      400
    ));
  }

  await department.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Department deleted successfully'
  });
});

/**
 * @desc    Get batches in a department
 * @route   GET /api/v1/departments/:id/batches
 * @access  Private
 */
export const getDepartmentBatches = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(new ErrorResponse('Department not found', 404));
  }

  const batches = await Batch.find({ department: req.params.id })
    .populate('coordinator', 'firstName lastName email')
    .sort({ year: -1, name: 1 })
    .lean();

  res.status(200).json({
    success: true,
    count: batches.length,
    data: batches
  });
});
