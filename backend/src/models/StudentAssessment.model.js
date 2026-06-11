import mongoose from 'mongoose';

// Single attempt sub-schema
const attemptSchema = new mongoose.Schema({
  attemptNumber: {
    type: Number,
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    questionNumber: Number,
    selectedOption: Number,
    selectedOptions: [Number],
    textAnswer: String,
    blanks: [String],
    tfAnswer: Boolean,
    isCorrect: Boolean,
    marksAwarded: {
      type: Number,
      default: 0
    },
    timeTaken: Number
  }],
  startedAt: {
    type: Date,
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
  ipAddress: String,
  userAgent: String,
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
      timestamp: Date,
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
      timestamp: Date,
      details: String
    }],
    webcamRecordingUrl: String,
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
}, { _id: true, timestamps: true });

// Main document schema - One per student per assessment
const studentAssessmentSchema = new mongoose.Schema({
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
    required: false
  },
  attempts: [attemptSchema], // Array of all attempts
  totalAttempts: {
    type: Number,
    default: 0
  },
  bestScore: {
    type: Number,
    default: 0
  },
  latestAttemptDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  }
}, {
  timestamps: true
});

// Indexes
studentAssessmentSchema.index({ assessment: 1, user: 1 }, { unique: true }); // One document per student per assessment
studentAssessmentSchema.index({ user: 1, status: 1 });
studentAssessmentSchema.index({ course: 1 });

// Update best score and latest attempt date
studentAssessmentSchema.methods.updateStats = function() {
  if (this.attempts.length === 0) return;
  
  // Find best score
  this.bestScore = Math.max(...this.attempts.map(a => a.score?.percentage || 0));
  
  // Find latest attempt date
  const submittedAttempts = this.attempts.filter(a => a.submittedAt);
  if (submittedAttempts.length > 0) {
    this.latestAttemptDate = new Date(Math.max(...submittedAttempts.map(a => new Date(a.submittedAt).getTime())));
  }
  
  // Update total attempts
  this.totalAttempts = this.attempts.length;
  
  // Update status
  const hasSubmitted = this.attempts.some(a => a.status === 'submitted' || a.status === 'evaluated');
  const hasInProgress = this.attempts.some(a => a.status === 'in-progress');
  
  if (hasSubmitted) {
    this.status = 'completed';
  } else if (hasInProgress) {
    this.status = 'in-progress';
  }
};

const StudentAssessment = mongoose.model('StudentAssessment', studentAssessmentSchema);

export default StudentAssessment;
