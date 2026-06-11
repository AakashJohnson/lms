import ExamSession from '../models/ExamSession.model.js';
import Assessment from '../models/Assessment.model.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new exam session
 * POST /api/exam-sessions/create
 */
export const createExamSession = async (req, res) => {
  try {
    const { 
      assessmentId, 
      deviceFingerprint, 
      systemInfo,
      geoLocation 
    } = req.body;
    const userId = req.user._id;

    console.log('📝 Creating exam session:', { assessmentId, userId });

    // Validate assessment exists and is published
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    if (!assessment.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Assessment is not published'
      });
    }

    // Check if user already has an active session for this assessment
    const existingSession = await ExamSession.findOne({
      user: userId,
      assessment: assessmentId,
      status: { $in: ['active', 'paused'] }
    });

    if (existingSession) {
      console.log('⚠️ Active session already exists:', existingSession.sessionId);
      return res.status(409).json({
        success: false,
        message: 'You already have an active session for this assessment',
        data: {
          sessionId: existingSession.sessionId,
          status: existingSession.status
        }
      });
    }

    // Generate unique session ID
    const sessionId = uuidv4();

    // Generate JWT token for this session
    const token = jwt.sign(
      { 
        sessionId, 
        userId, 
        assessmentId,
        deviceFingerprint 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: assessment.timeLimit ? `${assessment.timeLimit + 10}m` : '2h' }
    );

    // Calculate expiry time
    const expiryTime = new Date();
    if (assessment.timeLimit) {
      expiryTime.setMinutes(expiryTime.getMinutes() + assessment.timeLimit + (assessment.gracePeriod || 5));
    } else {
      expiryTime.setHours(expiryTime.getHours() + 2); // Default 2 hours
    }

    // Create session
    const session = new ExamSession({
      sessionId,
      assessment: assessmentId,
      user: userId,
      token,
      deviceFingerprint,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      geoLocation,
      systemInfo,
      startTime: new Date(),
      expiryTime,
      status: 'active',
      heartbeat: {
        lastPing: new Date(),
        missedPings: 0,
        threshold: 3
      }
    });

    await session.save();

    console.log('✅ Exam session created:', sessionId);

    res.status(201).json({
      success: true,
      message: 'Exam session created successfully',
      data: {
        sessionId,
        token,
        expiryTime,
        timeLimit: assessment.timeLimit
      }
    });

  } catch (error) {
    console.error('❌ Create exam session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam session',
      error: error.message
    });
  }
};

/**
 * Validate exam session
 * GET /api/exam-sessions/:sessionId/validate
 */
export const validateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { deviceFingerprint } = req.query;
    const userId = req.user._id;

    const session = await ExamSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to user
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to session'
      });
    }

    // Check if session is expired
    if (new Date() > session.expiryTime) {
      session.status = 'expired';
      session.endTime = new Date();
      await session.save();

      return res.status(410).json({
        success: false,
        message: 'Session has expired'
      });
    }

    // Check device fingerprint
    if (deviceFingerprint && session.deviceFingerprint !== deviceFingerprint) {
      await session.addViolation('device_mismatch', 'Device fingerprint mismatch', 'critical');
      
      return res.status(403).json({
        success: false,
        message: 'Device mismatch detected. Session locked.',
        violation: true
      });
    }

    // Check if session is active
    if (session.status !== 'active' && session.status !== 'paused') {
      return res.status(403).json({
        success: false,
        message: `Session is ${session.status}`
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        status: session.status,
        startTime: session.startTime,
        expiryTime: session.expiryTime,
        riskScore: session.riskScore,
        timeRemaining: Math.max(0, Math.floor((session.expiryTime - new Date()) / 1000))
      }
    });

  } catch (error) {
    console.error('❌ Validate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate session',
      error: error.message
    });
  }
};

/**
 * Update heartbeat
 * POST /api/exam-sessions/:sessionId/heartbeat
 */
export const updateHeartbeat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ExamSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to user
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Update heartbeat
    await session.updateHeartbeat();

    // If session was paused due to heartbeat failure, reactivate it
    if (session.status === 'paused' && session.heartbeat.missedPings === 0) {
      session.status = 'active';
      await session.save();
    }

    res.json({
      success: true,
      data: {
        lastPing: session.heartbeat.lastPing,
        status: session.status,
        timeRemaining: Math.max(0, Math.floor((session.expiryTime - new Date()) / 1000))
      }
    });

  } catch (error) {
    console.error('❌ Heartbeat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update heartbeat',
      error: error.message
    });
  }
};

/**
 * Log violation
 * POST /api/exam-sessions/:sessionId/violation
 */
export const logViolation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, details, severity } = req.body;
    const userId = req.user._id;

    const session = await ExamSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to user
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Add violation
    await session.addViolation(type, details, severity);

    console.log(`⚠️ Violation logged: ${type} - ${details}`);

    // Check if risk score is critical
    const shouldAutoSubmit = session.riskScore.level === 'critical' || session.riskScore.overall >= 80;

    res.json({
      success: true,
      data: {
        riskScore: session.riskScore,
        violationCount: session.violations.length,
        shouldAutoSubmit
      }
    });

  } catch (error) {
    console.error('❌ Log violation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log violation',
      error: error.message
    });
  }
};

/**
 * Terminate session
 * POST /api/exam-sessions/:sessionId/terminate
 */
export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const session = await ExamSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session belongs to user
    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    session.status = reason === 'completed' ? 'completed' : 'terminated';
    session.endTime = new Date();
    await session.save();

    console.log(`🛑 Session terminated: ${sessionId} - ${reason}`);

    res.json({
      success: true,
      message: 'Session terminated successfully',
      data: {
        sessionId,
        status: session.status,
        endTime: session.endTime
      }
    });

  } catch (error) {
    console.error('❌ Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate session',
      error: error.message
    });
  }
};

/**
 * Get session details
 * GET /api/exam-sessions/:sessionId
 */
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const session = await ExamSession.findOne({ sessionId })
      .populate('user', 'name email')
      .populate('assessment', 'title type timeLimit');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Students can only view their own sessions
    // Trainers/Admins can view any session
    if (userRole !== 'admin' && userRole !== 'trainer' && session.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('❌ Get session details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session details',
      error: error.message
    });
  }
};

/**
 * Get all sessions for an assessment (Admin/Trainer only)
 * GET /api/exam-sessions/assessment/:assessmentId
 */
export const getAssessmentSessions = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { assessment: assessmentId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sessions = await ExamSession.find(query)
      .populate('user', 'name email')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await ExamSession.countDocuments(query);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get assessment sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error.message
    });
  }
};

/**
 * Resume paused session
 * POST /api/exam-sessions/:sessionId/resume
 */
export const resumeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ExamSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (session.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: `Cannot resume session with status: ${session.status}`
      });
    }

    // Check if session has expired
    if (new Date() > session.expiryTime) {
      session.status = 'expired';
      session.endTime = new Date();
      await session.save();

      return res.status(410).json({
        success: false,
        message: 'Session has expired and cannot be resumed'
      });
    }

    session.status = 'active';
    await session.updateHeartbeat();

    console.log(`▶️ Session resumed: ${sessionId}`);

    res.json({
      success: true,
      message: 'Session resumed successfully',
      data: {
        sessionId,
        status: session.status,
        timeRemaining: Math.max(0, Math.floor((session.expiryTime - new Date()) / 1000))
      }
    });

  } catch (error) {
    console.error('❌ Resume session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume session',
      error: error.message
    });
  }
};
