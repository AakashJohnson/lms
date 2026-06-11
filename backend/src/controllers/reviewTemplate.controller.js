import ReviewTemplate from '../models/ReviewTemplate.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Get all active review templates (for student to pick)
 * @route   GET /api/v1/review-templates
 * @access  Public
 */
export const getActiveTemplates = asyncHandler(async (req, res, next) => {
  const templates = await ReviewTemplate.find({ isActive: true })
    .sort('order')
    .lean();

  res.status(200).json({
    success: true,
    data: templates
  });
});

/**
 * @desc    Get all review templates (Admin)
 * @route   GET /api/v1/review-templates/admin
 * @access  Private/Admin
 */
export const getAllTemplates = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, active } = req.query;

  const query = {};
  if (active !== undefined) {
    query.isActive = active === 'true';
  }

  const templates = await ReviewTemplate.find(query)
    .sort('order')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const total = await ReviewTemplate.countDocuments(query);

  res.status(200).json({
    success: true,
    data: templates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Create review template (Admin)
 * @route   POST /api/v1/review-templates
 * @access  Private/Admin
 */
export const createTemplate = asyncHandler(async (req, res, next) => {
  const { title, templateText, category, order, isActive } = req.body;

  const template = await ReviewTemplate.create({
    title,
    templateText,
    category,
    order: order || 0,
    isActive: isActive !== false
  });

  res.status(201).json({
    success: true,
    message: 'Review template created successfully',
    data: template
  });
});

/**
 * @desc    Update review template (Admin)
 * @route   PUT /api/v1/review-templates/:id
 * @access  Private/Admin
 */
export const updateTemplate = asyncHandler(async (req, res, next) => {
  const { title, templateText, category, order, isActive } = req.body;

  const template = await ReviewTemplate.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  if (title) template.title = title;
  if (templateText) template.templateText = templateText;
  if (category) template.category = category;
  if (order !== undefined) template.order = order;
  if (isActive !== undefined) template.isActive = isActive;

  await template.save();

  res.status(200).json({
    success: true,
    message: 'Review template updated successfully',
    data: template
  });
});

/**
 * @desc    Delete review template (Admin)
 * @route   DELETE /api/v1/review-templates/:id
 * @access  Private/Admin
 */
export const deleteTemplate = asyncHandler(async (req, res, next) => {
  const template = await ReviewTemplate.findById(req.params.id);

  if (!template) {
    return next(new ErrorResponse('Template not found', 404));
  }

  await template.remove();

  res.status(200).json({
    success: true,
    message: 'Review template deleted successfully'
  });
});

export default {
  getActiveTemplates,
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
};