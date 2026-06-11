import AssessmentAttempt from '../models/AssessmentAttempt.model.js';
import StudentAssessment from '../models/StudentAssessment.model.js';
import Assessment from '../models/Assessment.model.js';
import { recordActivity } from '../services/streak.service.js';
import { logStudentActivity } from '../services/activityLogger.service.js';

/**
 * Submit an assessment attempt
 * POST /api/assessments/:id/submit
 */
export const submitAssessment = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { answers, proctoring, timeTaken, courseId } = req.body;
    const userId = req.user._id;

    console.log('📝 Submit Assessment Request:', {
      assessmentId,
      userId,
      answersCount: answers?.length,
      timeTaken,
      courseId
    });

    // Fetch the assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      console.error('❌ Assessment not found:', assessmentId);
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    console.log('✅ Assessment found:', assessment.title);

    // Check if assessment is published
    if (!assessment.isPublished) {
      console.error('❌ Assessment not published:', assessmentId);
      return res.status(403).json({
        success: false,
        message: 'Assessment is not published'
      });
    }

    // Find or create StudentAssessment document
    let studentAssessment = await StudentAssessment.findOne({
      assessment: assessmentId,
      user: userId
    });

    if (!studentAssessment) {
      console.log('📄 Creating new StudentAssessment document');
      studentAssessment = new StudentAssessment({
        assessment: assessmentId,
        user: userId,
        course: courseId || null,
        attempts: [],
        totalAttempts: 0
      });
    } else {
      console.log('📄 Found existing StudentAssessment document with', studentAssessment.attempts.length, 'attempts');
    }

    // Check if attempts limit exceeded
    const submittedAttempts = studentAssessment.attempts.filter(
      a => a.status === 'submitted' || a.status === 'evaluated'
    );
    
    console.log('🔢 Submitted attempts:', submittedAttempts.length, '/', assessment.attemptsAllowed);
    
    if (submittedAttempts.length >= assessment.attemptsAllowed) {
      console.error('❌ Maximum attempts reached');
      return res.status(403).json({
        success: false,
        message: 'Maximum attempts reached for this assessment'
      });
    }
    
    if (submittedAttempts.length >= assessment.attemptsAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Maximum attempts reached for this assessment'
      });
    }

    // Auto-grade the answers
    const gradedAnswers = [];
    let totalMarksObtained = 0;

    for (const answer of answers) {
      const question = assessment.questions.id(answer.questionId);
      if (!question) continue;

      let isCorrect = false;
      let marksAwarded = 0;

      // Auto-grading logic based on question type
      switch (question.type) {
        case 'mcq': {
          // Single correct answer
          const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
          isCorrect = answer.selectedOption === correctOptionIndex;
          marksAwarded = isCorrect ? question.points : 0;
          break;
        }

        case 'msq': {
          // Multiple correct answers
          const correctIndices = question.options
            .map((opt, idx) => opt.isCorrect ? idx : -1)
            .filter(idx => idx !== -1);
          
          const selectedSet = new Set(answer.selectedOptions || []);
          const correctSet = new Set(correctIndices);
          
          isCorrect = selectedSet.size === correctSet.size &&
                     [...selectedSet].every(idx => correctSet.has(idx));
          
          marksAwarded = isCorrect ? question.points : 0;
          break;
        }

        case 'truefalse': {
          isCorrect = answer.tfAnswer === question.tfAnswer;
          marksAwarded = isCorrect ? question.points : 0;
          break;
        }

        case 'fillblank': {
          // Check if all blanks are filled correctly
          const userAnswers = answer.blanks || [];
          const correctAnswers = question.blanks || [];
          
          if (userAnswers.length !== correctAnswers.length) {
            isCorrect = false;
          } else {
            isCorrect = userAnswers.every((userAns, idx) => {
              const correctAns = correctAnswers[idx];
              if (question.caseSensitive) {
                return userAns.trim() === correctAns.trim();
              }
              return userAns.trim().toLowerCase() === correctAns.trim().toLowerCase();
            });
          }
          
          marksAwarded = isCorrect ? question.points : 0;
          break;
        }

        case 'shortanswer':
        case 'longanswer':
        case 'fileupload':
        case 'code':
        case 'audio':
        case 'video': {
          // These require manual grading
          isCorrect = null;
          marksAwarded = 0;
          break;
        }

        default: {
          // For other types, mark as requiring manual grading
          isCorrect = null;
          marksAwarded = 0;
        }
      }

      totalMarksObtained += marksAwarded;

      gradedAnswers.push({
        questionId: answer.questionId,
        questionNumber: answer.questionNumber,
        selectedOption: answer.selectedOption,
        selectedOptions: answer.selectedOptions,
        textAnswer: answer.textAnswer,
        blanks: answer.blanks,
        tfAnswer: answer.tfAnswer,
        isCorrect,
        marksAwarded,
        timeTaken: answer.timeTaken || 0
      });
    }

    // Calculate percentage
    const percentage = assessment.totalPoints > 0
      ? ((totalMarksObtained / assessment.totalPoints) * 100).toFixed(2)
      : 0;

    const isPassed = parseFloat(percentage) >= assessment.passingScore;

    // Create new attempt
    const newAttempt = {
      attemptNumber: studentAssessment.attempts.length + 1,
      answers: gradedAnswers,
      startedAt: new Date(Date.now() - (timeTaken || 0) * 1000),
      submittedAt: new Date(),
      timeTaken: timeTaken || 0,
      status: 'submitted',
      score: {
        obtained: totalMarksObtained,
        total: assessment.totalPoints,
        percentage: parseFloat(percentage)
      },
      isPassed,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      proctoring: proctoring || {}
    };

    // Add attempt to array
    console.log('➕ Adding new attempt #', studentAssessment.attempts.length + 1);
    studentAssessment.attempts.push(newAttempt);
    
    // Update stats
    console.log('📊 Updating stats...');
    studentAssessment.updateStats();
    
    // Save document
    console.log('💾 Saving StudentAssessment document...');
    await studentAssessment.save();
    console.log('✅ Document saved successfully!');

    // Get the newly added attempt ID
    const attemptId = studentAssessment.attempts[studentAssessment.attempts.length - 1]._id;
    console.log('🆔 Attempt ID:', attemptId);

    // ── Update Assessment Statistics ──────────────────────────────────────────
    console.log('📈 Updating assessment statistics...');
    await updateAssessmentStats(assessmentId);

    console.log('🎉 Assessment submitted successfully!');

    // Record quiz completion for streak system
    try {
      await recordActivity(userId, 'quiz_complete');
    } catch (err) {
      console.error('Error recording quiz completion:', err);
    }

    if (req.user?.role === 'student') {
      logStudentActivity({
        req,
        studentId: userId,
        courseId: courseId || null,
        assessmentId,
        activityType: 'assessment_completed',
        title: assessment.title || 'Assessment submitted',
        description: 'Submitted an assessment attempt',
        durationSeconds: timeTaken || 0,
        scorePercent: parseFloat(percentage),
        status: 'completed',
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      data: {
        attemptId: attemptId,
        score: newAttempt.score,
        isPassed: newAttempt.isPassed,
        attemptNumber: newAttempt.attemptNumber,
        submittedAt: newAttempt.submittedAt
      }
    });

  } catch (error) {
    console.error('❌ Submit assessment error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment',
      error: error.message
    });
  }
};

/**
 * Get user's attempts for an assessment
 * GET /api/assessments/:id/attempts
 */
export const getMyAttempts = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const userId = req.user._id;

    const studentAssessment = await StudentAssessment.findOne({
      assessment: assessmentId,
      user: userId
    }).lean();

    if (!studentAssessment) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Return all attempts from the single document
    res.json({
      success: true,
      data: studentAssessment.attempts || []
    });

  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts',
      error: error.message
    });
  }
};

/**
 * Get a specific attempt with full details
 * GET /api/assessments/:id/attempts/:attemptId
 * Students can only view their own attempts
 * Trainers/Admins can view any attempt
 */
export const getAttemptDetails = async (req, res) => {
  try {
    const { id: assessmentId, attemptId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    let studentAssessment;

    // If trainer/admin, find by attemptId across all students
    if (userRole === 'administrator' || userRole === 'admin' || userRole === 'trainer') {
      // Find the student assessment that contains this attempt
      studentAssessment = await StudentAssessment.findOne({
        assessment: assessmentId,
        'attempts._id': attemptId
      })
        .populate('assessment', 'title questions showCorrectAnswers showFeedback')
        .populate('user', 'name email')
        .lean();
    } else {
      // Students can only view their own attempts
      studentAssessment = await StudentAssessment.findOne({
        assessment: assessmentId,
        user: userId
      })
        .populate('assessment', 'title questions showCorrectAnswers showFeedback')
        .lean();
    }

    if (!studentAssessment) {
      return res.status(404).json({
        success: false,
        message: 'No attempts found'
      });
    }

    // Find the specific attempt
    const attempt = studentAssessment.attempts.find(
      a => a._id.toString() === attemptId
    );

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...attempt,
        assessment: studentAssessment.assessment,
        user: studentAssessment.user // Include user info for trainers
      }
    });

  } catch (error) {
    console.error('Get attempt details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempt details',
      error: error.message
    });
  }
};

/**
 * Helper function to update assessment statistics
 */
async function updateAssessmentStats(assessmentId) {
  try {
    // Get all student assessments for this assessment
    const studentAssessments = await StudentAssessment.find({
      assessment: assessmentId
    }).lean();

    if (studentAssessments.length === 0) {
      return;
    }

    // Collect all submitted attempts from all students
    const allAttempts = [];
    studentAssessments.forEach(sa => {
      const submittedAttempts = sa.attempts.filter(
        a => a.status === 'submitted' || a.status === 'evaluated'
      );
      allAttempts.push(...submittedAttempts);
    });

    if (allAttempts.length === 0) {
      return;
    }

    // Calculate statistics
    const totalSubmissions = allAttempts.length;
    const passedCount = allAttempts.filter(a => a.isPassed).length;
    const passRate = ((passedCount / totalSubmissions) * 100).toFixed(2);
    
    const totalScore = allAttempts.reduce((sum, a) => sum + (a.score?.percentage || 0), 0);
    const avgScore = (totalScore / totalSubmissions).toFixed(2);

    // Update the assessment
    await Assessment.findByIdAndUpdate(assessmentId, {
      submissions: totalSubmissions,
      passRate: parseFloat(passRate),
      avgScore: parseFloat(avgScore)
    });

    console.log(`✅ Updated stats for assessment ${assessmentId}: ${totalSubmissions} submissions, ${passRate}% pass rate, ${avgScore}% avg score`);

  } catch (error) {
    console.error('Error updating assessment stats:', error);
  }
}

/**
 * Get all attempts for an assessment (Admin/Trainer only)
 * GET /api/assessments/:id/all-attempts
 */
export const getAllAttempts = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all student assessments for this assessment
    const studentAssessments = await StudentAssessment.find({
      assessment: assessmentId
    })
      .populate('user', 'name email')
      .lean();

    // Flatten all attempts with user info
    const allAttempts = [];
    studentAssessments.forEach(sa => {
      sa.attempts.forEach(attempt => {
        allAttempts.push({
          _id: attempt._id,
          user: sa.user,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          isPassed: attempt.isPassed,
          status: attempt.status,
          timeTaken: attempt.timeTaken,
          submittedAt: attempt.submittedAt,
          proctoring: attempt.proctoring
        });
      });
    });

    // Sort by submission date (newest first)
    allAttempts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Paginate
    const paginatedAttempts = allAttempts.slice(skip, skip + parseInt(limit));
    const total = allAttempts.length;

    res.json({
      success: true,
      data: paginatedAttempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all attempts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts',
      error: error.message
    });
  }
};
