import LiveSession from '../models/LiveSession.model.js';
import Course from '../models/Course.model.js';
import User from '../models/User.model.js';
import { notifyNewLiveSession, sendNotification } from '../utils/socketEmitter.js';
import { createNotification } from './notification.controller.js';

// @desc    Create a new live session
// @route   POST /api/v1/live-sessions
// @access  Private (Trainer/Admin)
export const createLiveSession = async (req, res) => {
  try {
    const {
      title, course, module, description, agenda,
      date, startTime, duration, platform, joinLink,
      meetingId, passcode, hostEmail, coHosts,
      maxCapacity, recurring, requireRegistration,
      allowRecording, waitingRoom, sendReminder,
      reminderMinutes, materials, tags
    } = req.body;

    const trainerId = req.user.id || req.user._id;

    console.log('📝 Creating live session:', title);
    console.log('  Trainer ID:', trainerId);
    console.log('  Date:', date, 'Time:', startTime);

    // Validate course if provided
    if (course) {
      const courseExists = await Course.findById(course);
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }
    }

    // Create session
    const session = await LiveSession.create({
      title,
      course: course || null,
      module,
      description,
      agenda,
      trainer: trainerId,
      date: new Date(date),
      startTime,
      duration,
      platform,
      joinLink,
      meetingId,
      passcode,
      hostEmail,
      coHosts: coHosts ? coHosts.split(',').map(e => e.trim()) : [],
      maxCapacity: maxCapacity || 50,
      recurring: {
        type: recurring?.type || 'none',
        endDate: recurring?.endDate || null
      },
      requireRegistration: requireRegistration || false,
      allowRecording: allowRecording !== false,
      waitingRoom: waitingRoom || false,
      sendReminder: sendReminder !== false,
      reminderMinutes: reminderMinutes || 30,
      materials: materials ? materials.split(',').map(m => m.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : []
    });

    // Populate session
    const populatedSession = await LiveSession.findById(session._id)
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail');

    console.log('✅ Live session created:', session._id);

    // Emit real-time event to students
    const io = req.app.get('io');
    if (io) {
      await notifyNewLiveSession(io, populatedSession);
    }

    // Create notifications for all students (or enrolled students if course-specific)
    try {
      let targetStudents = [];
      
      console.log('🔍 Starting notification process...');
      console.log('  Course ID:', course);
      
      if (course) {
        // Get enrolled students in the course
        console.log('  📚 Fetching enrolled students for course...');
        const Enrollment = (await import('../models/Enrollment.model.js')).default;
        const enrollments = await Enrollment.find({ 
          course: course, 
          status: 'active' 
        }).select('student').lean();
        
        console.log('  Found enrollments:', enrollments.length);
        targetStudents = enrollments.map(e => e.student);
        console.log('  Target students from enrollments:', targetStudents.length);
        
        // If no enrollments found, notify all active students
        if (targetStudents.length === 0) {
          console.log('  ⚠️ No enrollments found, notifying all active students instead...');
          const allStudents = await User.find({ role: 'student', isActive: true }).select('_id').lean();
          console.log('  Found active students:', allStudents.length);
          targetStudents = allStudents.map(s => s._id);
        }
      } else {
        // Get all active students
        console.log('  👥 Fetching all active students...');
        const allStudents = await User.find({ role: 'student', isActive: true }).select('_id').lean();
        console.log('  Found active students:', allStudents.length);
        
        targetStudents = allStudents.map(s => s._id);
        console.log('  Target students:', targetStudents.length);
        
        if (targetStudents.length === 0) {
          console.log('  ⚠️ No active students found, checking all students...');
          const allUsers = await User.find({ role: 'student' }).select('_id isActive').lean();
          console.log('  Total participants in DB:', allUsers.length);
          console.log('  Sample participant:', allUsers[0]);
        }
      }

      console.log('  📝 Creating notifications for', targetStudents.length, 'students...');

      // Create notification for each student
      let successCount = 0;
      for (const studentId of targetStudents) {
        try {
          await createNotification(
            studentId.toString(),
            'New Live Session Scheduled',
            `A new live session "${title}" has been scheduled for ${new Date(date).toLocaleDateString()} at ${startTime}`,
            'info',
            'live-sessions'  // Changed to page name instead of URL path
          );

          // Send real-time notification
          if (io) {
            sendNotification(io, studentId.toString(), {
              _id: session._id,
              title: 'New Live Session Scheduled',
              message: `"${title}" - ${new Date(date).toLocaleDateString()} at ${startTime}`,
              type: 'info',
              createdAt: new Date()
            });
          }
          
          successCount++;
        } catch (err) {
          console.error(`  ❌ Failed to notify student ${studentId}:`, err.message);
        }
      }

      console.log(`✅ Notifications sent successfully to ${successCount}/${targetStudents.length} students`);
    } catch (notifError) {
      console.error('❌ Failed to send notifications:', notifError);
      console.error('  Stack:', notifError.stack);
    }

    res.status(201).json({
      success: true,
      message: 'Live session created successfully',
      data: populatedSession
    });
  } catch (error) {
    console.error('❌ Error creating live session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create live session',
      error: error.message
    });
  }
};

// @desc    Get all live sessions
// @route   GET /api/v1/live-sessions
// @access  Private
export const getAllLiveSessions = async (req, res) => {
  try {
    const { status, platform, course, upcoming, past } = req.query;
    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    console.log('📋 Getting live sessions for user:', userId, 'Role:', userRole);

    // Build query filter
    const filter = { isActive: true };

    if (status) filter.status = status;
    if (platform) filter.platform = platform;
    if (course) filter.course = course;

    // Filter by date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today
    
    if (upcoming === 'true') {
      filter.date = { $gte: now };
      filter.status = { $in: ['scheduled', 'live'] };
    } else if (past === 'true') {
      filter.date = { $lt: now };
      filter.status = 'completed';
    }

    // Role-based filtering
    if (userRole === 'trainer') {
      filter.trainer = userId;
    }

    const sessions = await LiveSession.find(filter)
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail')
      .populate('enrolledStudents.student', 'firstName lastName email')
      .sort({ date: 1, startTime: 1 });

    console.log(`✅ Found ${sessions.length} sessions`);

    // For students, add enrollment status
    let sessionsWithEnrollment = sessions;
    if (userRole === 'participant') {
      console.log('🎓 Adding enrollment status for participant:', userId);
      sessionsWithEnrollment = sessions.map(session => {
        // Call isStudentEnrolled BEFORE converting to object
        const isEnrolled = session.isStudentEnrolled(userId);
        const sessionObj = session.toObject();
        sessionObj.isEnrolled = isEnrolled;
        
        // Debug: Show enrolled student IDs
        const enrolledIds = session.enrolledStudents.map(e => e.student.toString());
        console.log(`  Session ${session._id}:`);
        console.log(`    - Current user ID: ${userId}`);
        console.log(`    - Enrolled student IDs: [${enrolledIds.join(', ')}]`);
        console.log(`    - isEnrolled result: ${isEnrolled}`);
        console.log(`    - enrolledStudents count: ${session.enrolledStudents.length}`);
        
        return sessionObj;
      });
    }

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessionsWithEnrollment
    });
  } catch (error) {
    console.error('❌ Error fetching live sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live sessions',
      error: error.message
    });
  }
};

// @desc    Get single live session
// @route   GET /api/v1/live-sessions/:sessionId
// @access  Private
export const getLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id || req.user._id;

    const session = await LiveSession.findById(sessionId)
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail description')
      .populate('enrolledStudents.student', 'firstName lastName email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    const sessionObj = session.toObject();
    sessionObj.isEnrolled = session.isStudentEnrolled(userId);

    res.status(200).json({
      success: true,
      data: sessionObj
    });
  } catch (error) {
    console.error('❌ Error fetching live session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live session',
      error: error.message
    });
  }
};

// @desc    Update live session
// @route   PUT /api/v1/live-sessions/:sessionId
// @access  Private (Trainer/Admin)
export const updateLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const trainerId = req.user.id || req.user._id;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    // Check authorization
    if (session.trainer.toString() !== trainerId && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
    }

    // Update fields
    const allowedUpdates = [
      'title', 'module', 'description', 'agenda', 'date', 'startTime',
      'duration', 'platform', 'joinLink', 'meetingId', 'passcode',
      'hostEmail', 'maxCapacity', 'requireRegistration', 'allowRecording',
      'waitingRoom', 'sendReminder', 'reminderMinutes', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        session[field] = req.body[field];
      }
    });

    // Handle arrays
    if (req.body.coHosts) {
      session.coHosts = req.body.coHosts.split(',').map(e => e.trim());
    }
    if (req.body.materials) {
      session.materials = req.body.materials.split(',').map(m => m.trim());
    }
    if (req.body.tags) {
      session.tags = req.body.tags.split(',').map(t => t.trim().toLowerCase());
    }

    await session.save();

    const updatedSession = await LiveSession.findById(sessionId)
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail');

    res.status(200).json({
      success: true,
      message: 'Live session updated successfully',
      data: updatedSession
    });
  } catch (error) {
    console.error('❌ Error updating live session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update live session',
      error: error.message
    });
  }
};

// @desc    Delete live session
// @route   DELETE /api/v1/live-sessions/:sessionId
// @access  Private (Admin)
export const deleteLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    // Soft delete
    session.isActive = false;
    session.status = 'cancelled';
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Live session deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting live session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete live session',
      error: error.message
    });
  }
};

// @desc    Join/Enroll in live session
// @route   POST /api/v1/live-sessions/:sessionId/join
// @access  Private (Student)
export const joinLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id || req.user._id;

    console.log('🎓 Student joining session:', sessionId, 'Student:', studentId);

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    // Check if already enrolled
    if (session.isStudentEnrolled(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this session'
      });
    }

    // Check capacity
    if (session.isFull) {
      return res.status(400).json({
        success: false,
        message: 'Session is full'
      });
    }

    // Enroll student
    await session.enrollStudent(studentId);

    console.log('✅ Student enrolled successfully');

    // Create notification
    try {
      const Notification = (await import('../models/Notification.model.js')).default;
      await Notification.create({
        recipient: studentId,
        recipientModel: 'Participant',
        type: 'session_enrollment',
        title: 'Enrolled in Live Session',
        message: `You have successfully enrolled in "${session.title}"`,
        relatedEntity: {
          entityId: session._id,
          entityType: 'LiveSession',
          entityName: session.title
        },
        actionUrl: `/live-sessions/${session._id}`,
        priority: 'medium'
      });
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError);
    }

    const updatedSession = await LiveSession.findById(sessionId)
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail');

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in session',
      data: updatedSession
    });
  } catch (error) {
    console.error('❌ Error joining live session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to join live session',
      error: error.message
    });
  }
};

// @desc    Leave live session
// @route   POST /api/v1/live-sessions/:sessionId/leave
// @access  Private (Student)
export const leaveLiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.id || req.user._id;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    // Check if enrolled
    if (!session.isStudentEnrolled(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Not enrolled in this session'
      });
    }

    // Remove enrollment
    session.enrolledStudents = session.enrolledStudents.filter(
      e => e.student.toString() !== studentId.toString()
    );

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left the session'
    });
  } catch (error) {
    console.error('❌ Error leaving live session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave live session',
      error: error.message
    });
  }
};

// @desc    Mark attendance
// @route   POST /api/v1/live-sessions/:sessionId/attendance
// @access  Private
export const markAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, joinedAt, leftAt } = req.body;
    const userId = req.user.id || req.user._id;

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    // Use provided studentId or current user
    const targetStudentId = studentId || userId;

    await session.markAttendance(targetStudentId, joinedAt, leftAt);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark attendance',
      error: error.message
    });
  }
};

// @desc    Get session attendance
// @route   GET /api/v1/live-sessions/:sessionId/attendance
// @access  Private (Trainer/Admin)
export const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await LiveSession.findById(sessionId)
      .populate('enrolledStudents.student', 'firstName lastName email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found'
      });
    }

    const attendance = session.enrolledStudents.map(enrollment => ({
      student: enrollment.student,
      enrolledAt: enrollment.enrolledAt,
      attended: enrollment.attended,
      joinedAt: enrollment.joinedAt,
      leftAt: enrollment.leftAt,
      duration: enrollment.duration
    }));

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        title: session.title,
        date: session.date,
        totalEnrolled: session.enrolledCount,
        totalAttended: attendance.filter(a => a.attended).length,
        attendance
      }
    });
  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
};

// @desc    Get my enrolled sessions (Student)
// @route   GET /api/v1/live-sessions/my-sessions
// @access  Private (Student)
export const getMyEnrolledSessions = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const sessions = await LiveSession.find({
      'enrolledStudents.student': studentId,
      isActive: true
    })
      .populate('trainer', 'name email')
      .populate('course', 'title thumbnail')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error('❌ Error fetching enrolled sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled sessions',
      error: error.message
    });
  }
};
