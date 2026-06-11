import Batch from '../models/Batch.model.js';
import Department from '../models/Department.model.js';
import User from '../models/User.model.js';
import Participant from '../models/Participant.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Create a new batch
 * @route   POST /api/v1/batches
 * @access  Private (admin only)
 */
export const createBatch = asyncHandler(async (req, res, next) => {
  const { name, code, department, year, startDate, endDate, maxStudents, coordinator } = req.body;

  if (!name || !code || !department || !year) {
    return next(new ErrorResponse('Name, code, department, and year are required', 400));
  }

  // Validate department exists
  const dept = await Department.findById(department);
  if (!dept) {
    return next(new ErrorResponse('Department not found', 404));
  }

  // Check if batch with same code exists
  const existing = await Batch.findOne({ code: code.toUpperCase() });
  if (existing) {
    return next(new ErrorResponse('Batch with this code already exists', 400));
  }

  const batch = await Batch.create({
    name,
    code: code.toUpperCase(),
    department,
    year,
    startDate,
    endDate,
    maxStudents,
    coordinator,
    createdBy: req.user._id
  });

  await batch.populate([
    { path: 'department', select: 'name code' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Batch created successfully',
    data: batch
  });
});

/**
 * @desc    Get all batches
 * @route   GET /api/v1/batches
 * @access  Private
 */
export const getBatches = asyncHandler(async (req, res) => {
  const { department, year, isActive, search, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (department) {
    filter.department = department;
  }

  if (year) {
    filter.year = Number(year);
  }

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

  const [batches, total] = await Promise.all([
    Batch.find(filter)
      .populate('department', 'name code')
      .populate('course', 'title thumbnail')
      .populate('trainers', 'firstName lastName email')
      .sort({ year: -1, name: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Batch.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: batches
  });
});

/**
 * @desc    Get single batch
 * @route   GET /api/v1/batches/:id
 * @access  Private
 */
export const getBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id)
    .populate('department', 'name code')
    .populate('course', 'title thumbnail')
    .populate('trainers', 'firstName lastName email')
    .lean();

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Get actual student count
  const studentCount = await User.countDocuments({ batch: req.params.id });

  res.status(200).json({
    success: true,
    data: {
      ...batch,
      currentStudents: studentCount
    }
  });
});

/**
 * @desc    Update batch
 * @route   PUT /api/v1/batches/:id
 * @access  Private (admin only)
 */
export const updateBatch = asyncHandler(async (req, res, next) => {
  let batch = await Batch.findById(req.params.id);

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  const { name, code, department, year, startDate, endDate, maxStudents, coordinator, isActive, trainers } = req.body;

  // Check for duplicate code (excluding current batch)
  if (code) {
    const existing = await Batch.findOne({
      _id: { $ne: req.params.id },
      code: code.toUpperCase()
    });

    if (existing) {
      return next(new ErrorResponse('Batch with this code already exists', 400));
    }
  }

  // Validate department if provided
  if (department) {
    const dept = await Department.findById(department);
    if (!dept) {
      return next(new ErrorResponse('Department not found', 404));
    }
  }

  batch = await Batch.findByIdAndUpdate(
    req.params.id,
    {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
      ...(department && { department }),
      ...(year && { year }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(maxStudents !== undefined && { maxStudents }),
      ...(coordinator !== undefined && { coordinator }),
      ...(isActive !== undefined && { isActive }),
      ...(trainers !== undefined && { trainers })
    },
    { new: true, runValidators: true }
  ).populate([
    { path: 'department', select: 'name code' },
    { path: 'trainers', select: 'firstName lastName email' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Batch updated successfully',
    data: batch
  });
});

/**
 * @desc    Delete batch
 * @route   DELETE /api/v1/batches/:id
 * @access  Private (admin only)
 */
export const deleteBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id);

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Check if batch has students
  const studentCount = await User.countDocuments({ batch: req.params.id });
  if (studentCount > 0) {
    return next(new ErrorResponse(
      `Cannot delete batch with ${studentCount} assigned student(s). Please reassign students first.`,
      400
    ));
  }

  await batch.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Batch deleted successfully'
  });
});

/**
 * @desc    Get students in a batch
 * @route   GET /api/v1/batches/:id/students
 * @access  Private
 */
export const getBatchStudents = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findById(req.params.id);

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Check both User and Participant models
  let students = [];

  // Check in User model
  const userStudents = await User.find({
    batch: req.params.id,
    role: { $in: ['student', 'participant'] }
  })
    .select('firstName lastName email mobile organization designation isActive role')
    .lean();

  // Check in Participant model
  const participantStudents = await Participant.find({
    batch: req.params.id,
    isActive: true
  })
    .select('firstName lastName email mobile organization designation isActive role')
    .lean();

  // Combine both, removing duplicates by email
  const combinedMap = new Map();
  userStudents.forEach(s => combinedMap.set(s.email?.toLowerCase(), s));
  participantStudents.forEach(s => {
    if (!combinedMap.has(s.email?.toLowerCase())) {
      combinedMap.set(s.email?.toLowerCase(), s);
    }
  });

  students = Array.from(combinedMap.values()).sort((a, b) =>
    (a.firstName || '').localeCompare(b.firstName || '')
  );

  res.status(200).json({
    success: true,
    count: students.length,
    data: students
  });
});

/**
 * @desc    Assign students to batch
 * @route   POST /api/v1/batches/:id/assign
 * @access  Private (admin only)
 */
export const assignStudentsToBatch = asyncHandler(async (req, res, next) => {
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return next(new ErrorResponse('Please provide an array of student IDs', 400));
  }

  const batch = await Batch.findById(req.params.id);

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Check if batch has capacity
  if (batch.maxStudents) {
    const currentCount = await User.countDocuments({ batch: req.params.id });
    const newTotal = currentCount + studentIds.length;
    
    if (newTotal > batch.maxStudents) {
      return next(new ErrorResponse(
        `Batch capacity exceeded. Available seats: ${batch.maxStudents - currentCount}`,
        400
      ));
    }
  }

  // Update students
  const result = await User.updateMany(
    { 
      _id: { $in: studentIds },
      role: 'participant'
    },
    { 
      $set: { 
        batch: req.params.id,
        department: batch.department
      }
    }
  );

  // Update batch student count
  const newCount = await User.countDocuments({ batch: req.params.id });
  await Batch.findByIdAndUpdate(req.params.id, { currentStudents: newCount });

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} student(s) assigned to batch successfully`,
    data: {
      assigned: result.modifiedCount,
      batchId: req.params.id
    }
  });
});

/**
 * @desc    Remove students from batch
 * @route   POST /api/v1/batches/:id/remove
 * @access  Private (admin only)
 */
export const removeStudentsFromBatch = asyncHandler(async (req, res, next) => {
  const { studentIds } = req.body;

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return next(new ErrorResponse('Please provide an array of student IDs', 400));
  }

  const batch = await Batch.findById(req.params.id);

  if (!batch) {
    return next(new ErrorResponse('Batch not found', 404));
  }

  // Update students
  const result = await User.updateMany(
    { 
      _id: { $in: studentIds },
      batch: req.params.id
    },
    { 
      $unset: { batch: 1 }
    }
  );

  // Update batch student count
  const newCount = await User.countDocuments({ batch: req.params.id });
  await Batch.findByIdAndUpdate(req.params.id, { currentStudents: newCount });

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} student(s) removed from batch successfully`,
    data: {
      removed: result.modifiedCount
    }
  });
});
