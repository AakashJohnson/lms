import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionNumber: Number,
  selectedOptions: [{
    type: Number // Option numbers
  }],
  textAnswer: String, // For short-answer questions
  isCorrect: Boolean,
  marksAwarded: {
    type: Number,
    default: 0
  },
  timeTaken: Number // in seconds
}, { _id: false });

const assessmentAttemptSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false  // Make it optional since we might not always have courseId
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1
  },
  answers: [answerSchema],
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  timeTaken: {
    type: Number // in seconds
  },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'evaluated', 'expired'],
    default: 'in-progress'
  },
  score: {
    obtained: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatedAt: Date,
  feedback: {
    type: String,
    trim: true
  },
  ipAddress: String,
  userAgent: String,
  
  // ── Proctoring Data ────────────────────────────────────────────────────────
  proctoring: {
    violations: [{
      type: {
        type: String,
        enum: [
          'tab_switch', 'fullscreen_exit', 
          'copy_attempt', 'paste_attempt', 'cut_attempt',
          'right_click', 'keyboard_shortcut',
          'focus_lost', 'devtools_attempt'
        ]
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }],
    violationCount: {
      type: Number,
      default: 0
    },
    activityLogs: [{
      type: {
        type: String,
        enum: [
          'tab_switch', 'fullscreen_exit', 'fullscreen_enter', 
          'copy_attempt', 'paste_attempt', 'cut_attempt',
          'right_click', 'keyboard_shortcut', 
          'mouse_leave', 'focus_lost', 'focus_gained',
          'consent_given', 'webcam_started', 'webcam_stopped',
          'devtools_attempt'
        ]
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }],
    webcamRecordingUrl: String,
    faceDetectionEvents: [{
      type: {
        type: String,
        enum: ['no_face', 'multiple_faces', 'face_obscured', 'face_detected']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
    }],
    autoSubmitted: {
      type: Boolean,
      default: false
    },
    autoSubmitReason: String,
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentTimestamp: Date
  }
}, {
  timestamps: true
});

// Indexes
assessmentAttemptSchema.index({ assessment: 1, user: 1 });
assessmentAttemptSchema.index({ user: 1, status: 1 });
assessmentAttemptSchema.index({ course: 1 });

// Calculate score and percentage
assessmentAttemptSchema.methods.calculateScore = function() {
  this.score.obtained = this.answers.reduce((total, answer) => {
    return total + (answer.marksAwarded || 0);
  }, 0);
  
  this.score.percentage = ((this.score.obtained / this.score.total) * 100).toFixed(2);
  
  return this.score;
};

const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);

export default AssessmentAttempt;
