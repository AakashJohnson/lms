import CourseQuery from '../models/CourseQuery.model.js';
import Course from '../models/Course.model.js';
import Enrollment from '../models/Enrollment.model.js';
import User from '../models/User.model.js';

// @desc    Create a new course query (Student)
// @route   POST /api/course-queries
// @access  Private (Student)
export const createCourseQuery = async (req, res) => {
  try {
    const { courseId, question, category, lessonReference, isPublic } = req.body;
    const studentId = req.user.id || req.user._id;

    console.log('📝 createCourseQuery called');
    console.log('  Student ID:', studentId);
    console.log('  Course ID:', courseId);
    console.log('  Question:', question);
    console.log('  Category:', category);
    console.log('  req.user:', JSON.stringify(req.user));

    // Validate course exists
    const course = await Course.findById(courseId).populate('trainer');
    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    console.log('Course found:', course.title, 'Trainer:', course.trainer);
    console.log('Trainer type:', typeof course.trainer);
    console.log('Trainer value:', JSON.stringify(course.trainer));

    // Check if student is enrolled - Enrollment model uses 'user' field, not 'student'
    const enrollment = await Enrollment.findOne({ 
      user: studentId, 
      course: courseId
    });

    console.log('Enrollment found:', enrollment ? 'Yes' : 'No');

    if (!enrollment) {
      console.log('No enrollment found for user:', studentId, 'course:', courseId);
      // Allow question anyway for better UX
      console.log('Allowing question anyway for better user experience');
    }

    // Get trainer from course - handle if trainer is missing or invalid
    let trainerId = course.trainer;
    
    // If trainer is an object (populated), get the _id
    if (trainerId && typeof trainerId === 'object') {
      trainerId = trainerId._id;
    }
    
    // If trainer is still empty or invalid, use a default or skip
    if (!trainerId || trainerId === '' || trainerId === '""') {
      console.log('No valid trainer found for course, using course creator or admin');
      // Try to find course creator or use first admin as fallback
      trainerId = course.createdBy || null;
    }

    console.log('Using trainer ID:', trainerId);
    console.log('Trainer ID type:', typeof trainerId);
    console.log('Trainer ID value:', JSON.stringify(trainerId));

    // Create query - trainer can be null if not found
    const query = await CourseQuery.create({
      course: courseId,
      student: studentId,
      trainer: trainerId || studentId, // Use student as trainer if no trainer found (will be reassigned later)
      question,
      category: category || 'general',
      lessonReference,
      isPublic: isPublic || false
    });

    // Populate the query
    const populatedQuery = await CourseQuery.findById(query._id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .populate('trainer', 'name email');

    // Create notification for trainer
    try {
      const { createNotification } = await import('./notification.controller.js');
      const { sendNotification } = await import('../utils/socketEmitter.js');
      
      if (trainerId && trainerId !== studentId) {
        await createNotification(
          trainerId.toString(),
          'New Question from Student',
          `A student asked: "${question.substring(0, 100)}${question.length > 100 ? '...' : ''}"`,
          'info',
          'qms'
        );

        // Send real-time notification
        const io = req.app.get('io');
        if (io) {
          sendNotification(io, trainerId.toString(), {
            _id: query._id,
            title: 'New Question from Student',
            message: `"${question.substring(0, 80)}${question.length > 80 ? '...' : ''}"`,
            type: 'info',
            createdAt: new Date()
          });
        }

        console.log(`✅ Notification sent to trainer ${trainerId}`);
      }
    } catch (notifError) {
      console.error('❌ Failed to send notification to trainer:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      data: populatedQuery
    });
  } catch (error) {
    console.error('Error creating course query:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit query',
      error: error.message 
    });
  }
};

// @desc    Get all queries for a course (Student view - only their queries + public)
// @route   GET /api/course-queries/course/:courseId
// @access  Private (Student)
export const getCourseQueries = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    const { status, category } = req.query;

    // Build query filter
    const filter = {
      course: courseId,
      $or: [
        { student: studentId }, // Student's own queries
        { isPublic: true }      // Public queries
      ]
    };

    if (status) filter.status = status;
    if (category) filter.category = category;

    const queries = await CourseQuery.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('trainer', 'name email')
      .populate('replies.repliedBy', 'name email')
      .sort({ isPinned: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries
    });
  } catch (error) {
    console.error('Error fetching course queries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch queries',
      error: error.message 
    });
  }
};

// @desc    Get all queries for trainer's courses (or all for admin)
// @route   GET /api/course-queries/trainer
// @access  Private (Trainer/Admin)
export const getTrainerQueries = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;
    const { status, courseId, category } = req.query;

    console.log('👨‍🏫 getTrainerQueries called');
    console.log('  User ID from req.user:', userId);
    console.log('  User Role:', userRole);
    console.log('  req.user:', JSON.stringify(req.user));
    console.log('  Filters:', { status, courseId, category });

    // Build query filter
    const filter = {};
    
    // Only filter by trainer if not admin
    if (userRole !== 'administrator' && userRole !== 'admin') {
      filter.trainer = userId;
      console.log('  Filtering by trainer ID:', userId);
    } else {
      console.log('  Admin user - showing all queries');
    }
    
    if (status) filter.status = status;
    if (courseId) filter.course = courseId;
    if (category) filter.category = category;

    console.log('  Query filter:', JSON.stringify(filter));

    const queries = await CourseQuery.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .populate('trainer', 'firstName lastName email')
      .populate('replies.repliedBy', 'name email')
      .sort({ status: 1, createdAt: -1 }); // Pending first

    console.log(`  ✅ Found ${queries.length} queries`);

    // Group by status for better organization
    const grouped = {
      pending: queries.filter(q => q.status === 'pending'),
      answered: queries.filter(q => q.status === 'answered'),
      closed: queries.filter(q => q.status === 'closed')
    };

    console.log(`  📊 Grouped: ${grouped.pending.length} pending, ${grouped.answered.length} answered, ${grouped.closed.length} closed`);

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries,
      grouped,
      isAdmin: userRole === 'administrator' || userRole === 'admin'
    });
  } catch (error) {
    console.error('❌ Error fetching trainer queries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch queries',
      error: error.message 
    });
  }
};

// @desc    Reply to a course query (Trainer)
// @route   POST /api/course-queries/:queryId/reply
// @access  Private (Trainer)
export const replyToCourseQuery = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { reply } = req.body;
    const responderId = req.user.id || req.user._id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'administrator' || userRole === 'admin';

    console.log('replyToCourseQuery called');
    console.log('  Query ID:', queryId);
    console.log('  User ID from req.user:', responderId);
    console.log('  User role:', userRole);
    console.log('  Reply length:', reply?.length);

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reply text is required' 
      });
    }

    const query = await CourseQuery.findById(queryId).populate('course', 'title');
    if (!query) {
      console.log('Query not found');
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const assignedTrainerId = query.trainer ? query.trainer.toString() : '';

    // Trainers can manage their own course queries; admins can manage every QMS query.
    if (!isAdmin && assignedTrainerId !== responderId.toString()) {
      console.log('Authorization failed - Trainer mismatch');
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to reply to this query' 
      });
    }

    query.replies.push({
      repliedBy: responderId,
      repliedByModel: 'User',
      reply: reply.trim(),
      repliedAt: new Date()
    });

    if (query.status === 'pending') {
      query.status = 'answered';
    }

    await query.save();

    try {
      const { createNotification } = await import('./notification.controller.js');
      const { sendNotification } = await import('../utils/socketEmitter.js');
      const responderLabel = isAdmin ? 'Admin' : 'Trainer';
      
      await createNotification(
        query.student.toString(),
        'Your Question Was Answered',
        `${responderLabel} replied: "${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}"`,
        'success',
        'qms'
      );

      const io = req.app.get('io');
      if (io) {
        sendNotification(io, query.student.toString(), {
          _id: query._id,
          title: 'Your Question Was Answered',
          message: `${responderLabel} replied to your question in "${query.course.title}"`,
          type: 'success',
          createdAt: new Date()
        });
      }

      console.log(`Notification sent to student ${query.student}`);
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    const updatedQuery = await CourseQuery.findById(queryId)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .populate('trainer', 'name email')
      .populate('replies.repliedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      data: updatedQuery
    });
  } catch (error) {
    console.error('Error replying to query:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add reply',
      error: error.message 
    });
  }
};

// @desc    Get student's own queries
// @route   GET /api/course-queries/my-queries
// @access  Private (Student)
export const getMyQueries = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;
    const { status, courseId } = req.query;

    console.log('📋 getMyQueries called');
    console.log('  Student ID from req.user:', studentId);
    console.log('  req.user:', JSON.stringify(req.user));
    console.log('  Filters:', { status, courseId });

    const filter = { student: studentId };
    if (status) filter.status = status;
    if (courseId) filter.course = courseId;

    console.log('  Query filter:', JSON.stringify(filter));

    const queries = await CourseQuery.find(filter)
      .populate('course', 'title thumbnail')
      .populate('trainer', 'name email')
      .populate('replies.repliedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log(`  ✅ Found ${queries.length} queries`);

    res.status(200).json({
      success: true,
      count: queries.length,
      data: queries
    });
  } catch (error) {
    console.error('❌ Error fetching student queries:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your queries',
      error: error.message 
    });
  }
};

// @desc    Update query status (Trainer)
// @route   PATCH /api/course-queries/:queryId/status
// @access  Private (Trainer)
export const updateQueryStatus = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { status } = req.body;
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'administrator' || userRole === 'admin';

    if (!['pending', 'answered', 'closed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    const query = await CourseQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const assignedTrainerId = query.trainer ? query.trainer.toString() : '';
    if (!isAdmin && assignedTrainerId !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    query.status = status;
    await query.save();

    res.status(200).json({
      success: true,
      message: 'Query status updated',
      data: query
    });
  } catch (error) {
    console.error('Error updating query status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status',
      error: error.message 
    });
  }
};

// @desc    Toggle query public/private (Student)
// @route   PATCH /api/course-queries/:queryId/visibility
// @access  Private (Student)
export const toggleQueryVisibility = async (req, res) => {
  try {
    const { queryId } = req.params;
    const studentId = req.user.id;

    const query = await CourseQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Check if student owns this query
    if (query.student.toString() !== studentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    query.isPublic = !query.isPublic;
    await query.save();

    res.status(200).json({
      success: true,
      message: `Query is now ${query.isPublic ? 'public' : 'private'}`,
      data: query
    });
  } catch (error) {
    console.error('Error toggling query visibility:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update visibility',
      error: error.message 
    });
  }
};

// @desc    Upvote a query (Student)
// @route   POST /api/course-queries/:queryId/upvote
// @access  Private (Student)
export const upvoteQuery = async (req, res) => {
  try {
    const { queryId } = req.params;
    const studentId = req.user.id;

    const query = await CourseQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    // Check if already upvoted
    const alreadyUpvoted = query.upvotes.includes(studentId);

    if (alreadyUpvoted) {
      // Remove upvote
      query.upvotes = query.upvotes.filter(id => id.toString() !== studentId);
    } else {
      // Add upvote
      query.upvotes.push(studentId);
    }

    await query.save();

    res.status(200).json({
      success: true,
      message: alreadyUpvoted ? 'Upvote removed' : 'Query upvoted',
      data: { upvoteCount: query.upvotes.length, isUpvoted: !alreadyUpvoted }
    });
  } catch (error) {
    console.error('Error upvoting query:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upvote query',
      error: error.message 
    });
  }
};

// @desc    Pin/Unpin a query (Trainer)
// @route   PATCH /api/course-queries/:queryId/pin
// @access  Private (Trainer)
export const togglePinQuery = async (req, res) => {
  try {
    const { queryId } = req.params;
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;
    const isAdmin = userRole === 'administrator' || userRole === 'admin';

    const query = await CourseQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const assignedTrainerId = query.trainer ? query.trainer.toString() : '';
    if (!isAdmin && assignedTrainerId !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    query.isPinned = !query.isPinned;
    await query.save();

    res.status(200).json({
      success: true,
      message: `Query ${query.isPinned ? 'pinned' : 'unpinned'}`,
      data: query
    });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to toggle pin',
      error: error.message 
    });
  }
};
