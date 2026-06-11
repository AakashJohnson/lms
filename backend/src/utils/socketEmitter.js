/**
 * Socket Event Emitter Utility
 * Emits real-time events to connected clients
 */

// Event types
export const SOCKET_EVENTS = {
  // Course events
  NEW_COURSE: 'new_course',
  COURSE_UPDATED: 'course_updated',
  COURSE_PUBLISHED: 'course_published',
  
  // Media/Content events
  NEW_MEDIA: 'new_media',
  MEDIA_UPDATED: 'media_updated',
  CONTENT_PUBLISHED: 'content_published',
  
  // Live Session events
  NEW_LIVE_SESSION: 'new_live_session',
  LIVE_SESSION_UPDATED: 'live_session_updated',
  SESSION_STARTING: 'session_starting',
  
  // Assessment events
  NEW_ASSESSMENT: 'new_assessment',
  ASSESSMENT_UPDATED: 'assessment_updated',
  ASSESSMENT_GRADED: 'assessment_graded',
  
  // Q&A events
  NEW_QUESTION: 'new_question',
  QUESTION_ANSWERED: 'question_answered',
  
  // Certificate events
  CERTIFICATE_READY: 'certificate_ready',
  
  // Payment events
  PAYMENT_STATUS_UPDATED: 'payment_status_updated',
  
  // User events
  USER_APPROVED: 'user_approved',
  ENROLLMENT_APPROVED: 'enrollment_approved',
  
  // Notification events
  NOTIFICATION: 'notification',
  NEW_ANNOUNCEMENT: 'new_announcement',
};

/**
 * Emit event to specific user
 */
export const emitToUser = (io, userId, event, data) => {
  try {
    io.to(`user:${userId}`).emit(event, data);
    console.log(`📡 Emitted ${event} to user ${userId}`);
  } catch (error) {
    console.error(`Failed to emit ${event} to user ${userId}:`, error.message);
  }
};

/**
 * Emit event to multiple users
 */
export const emitToUsers = (io, userIds, event, data) => {
  try {
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit(event, data);
    });
    console.log(`📡 Emitted ${event} to ${userIds.length} users`);
  } catch (error) {
    console.error(`Failed to emit ${event} to users:`, error.message);
  }
};

/**
 * Emit event to all users with specific role
 */
export const emitToRole = (io, role, event, data) => {
  try {
    io.to(`role:${role}`).emit(event, data);
    console.log(`📡 Emitted ${event} to role ${role}`);
  } catch (error) {
    console.error(`Failed to emit ${event} to role ${role}:`, error.message);
  }
};

/**
 * Emit event to all enrolled students in a course
 */
export const emitToCourseStudents = async (io, courseId, event, data) => {
  try {
    const Enrollment = (await import('../models/Enrollment.model.js')).default;
    const enrollments = await Enrollment.find({ 
      course: courseId, 
      status: 'active' 
    }).select('student').lean();
    
    const studentIds = enrollments.map(e => e.student.toString());
    emitToUsers(io, studentIds, event, data);
  } catch (error) {
    console.error(`Failed to emit ${event} to course students:`, error.message);
  }
};

/**
 * Broadcast event to all connected clients
 */
export const broadcast = (io, event, data) => {
  try {
    io.emit(event, data);
    console.log(`📡 Broadcasted ${event} to all clients`);
  } catch (error) {
    console.error(`Failed to broadcast ${event}:`, error.message);
  }
};

/**
 * Notify students about new course
 */
export const notifyNewCourse = (io, course) => {
  emitToRole(io, 'student', SOCKET_EVENTS.NEW_COURSE, {
    _id: course._id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    createdAt: course.createdAt
  });
};

/**
 * Notify students about new media/content
 */
export const notifyNewMedia = (io, media) => {
  emitToRole(io, 'student', SOCKET_EVENTS.NEW_MEDIA, {
    _id: media._id,
    title: media.title,
    mediaType: media.mediaType,
    category: media.category,
    createdAt: media.createdAt
  });
};

/**
 * Notify students about new live session
 */
export const notifyNewLiveSession = async (io, session) => {
  // Notify all enrolled students in the course
  if (session.course) {
    await emitToCourseStudents(io, session.course, SOCKET_EVENTS.NEW_LIVE_SESSION, {
      _id: session._id,
      title: session.title,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      meetingLink: session.meetingLink
    });
  } else {
    // Notify all students if no specific course
    emitToRole(io, 'student', SOCKET_EVENTS.NEW_LIVE_SESSION, {
      _id: session._id,
      title: session.title,
      scheduledAt: session.scheduledAt,
      duration: session.duration
    });
  }
};

/**
 * Notify students about new assessment
 */
export const notifyNewAssessment = async (io, assessment) => {
  if (assessment.course) {
    await emitToCourseStudents(io, assessment.course, SOCKET_EVENTS.NEW_ASSESSMENT, {
      _id: assessment._id,
      title: assessment.title,
      dueDate: assessment.dueDate,
      totalMarks: assessment.totalMarks
    });
  }
};

/**
 * Notify student when question is answered
 */
export const notifyQuestionAnswered = (io, studentId, question) => {
  emitToUser(io, studentId, SOCKET_EVENTS.QUESTION_ANSWERED, {
    _id: question._id,
    question: question.question,
    answer: question.answer,
    answeredAt: question.answeredAt
  });
};

/**
 * Notify student when certificate is ready
 */
export const notifyCertificateReady = (io, studentId, certificate) => {
  emitToUser(io, studentId, SOCKET_EVENTS.CERTIFICATE_READY, {
    _id: certificate._id,
    courseName: certificate.courseName,
    issueDate: certificate.issueDate
  });
};

/**
 * Notify student about user approval
 */
export const notifyUserApproved = (io, userId) => {
  emitToUser(io, userId, SOCKET_EVENTS.USER_APPROVED, {
    message: 'Your account has been approved!',
    timestamp: new Date()
  });
};

/**
 * Send notification to user
 */
export const sendNotification = (io, userId, notification) => {
  emitToUser(io, userId, SOCKET_EVENTS.NOTIFICATION, {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    createdAt: notification.createdAt
  });
};
