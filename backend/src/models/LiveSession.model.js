import mongoose from 'mongoose';

const liveSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  module: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  agenda: {
    type: String,
    trim: true
  },
  trainer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Trainer is required']
  },
  date: {
    type: Date,
    required: [true, 'Session date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours']
  },
  platform: {
    type: String,
    enum: ['Zoom', 'Google Meet', 'Microsoft Teams', 'Webex', 'YouTube Live', 'Custom'],
    required: [true, 'Platform is required']
  },
  joinLink: {
    type: String,
    required: [true, 'Join link is required'],
    trim: true
  },
  meetingId: {
    type: String,
    trim: true
  },
  passcode: {
    type: String,
    trim: true
  },
  hostEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  coHosts: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  maxCapacity: {
    type: Number,
    default: 50,
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000']
  },
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    },
    joinedAt: {
      type: Date
    },
    leftAt: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  recurring: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    endDate: {
      type: Date
    }
  },
  requireRegistration: {
    type: Boolean,
    default: false
  },
  allowRecording: {
    type: Boolean,
    default: true
  },
  recordingUrl: {
    type: String,
    trim: true
  },
  recordingAvailable: {
    type: Boolean,
    default: false
  },
  waitingRoom: {
    type: Boolean,
    default: false
  },
  sendReminder: {
    type: Boolean,
    default: true
  },
  reminderMinutes: {
    type: Number,
    default: 30,
    enum: [15, 30, 60, 1440] // 15min, 30min, 1hr, 1day
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  materials: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
liveSessionSchema.index({ trainer: 1, date: -1 });
liveSessionSchema.index({ date: 1, status: 1 });
liveSessionSchema.index({ 'enrolledStudents.student': 1 });
liveSessionSchema.index({ course: 1 });
liveSessionSchema.index({ status: 1, date: 1 });

// Virtual for enrolled count
liveSessionSchema.virtual('enrolledCount').get(function() {
  return this.enrolledStudents ? this.enrolledStudents.length : 0;
});

// Virtual for available seats
liveSessionSchema.virtual('availableSeats').get(function() {
  return this.maxCapacity - (this.enrolledStudents ? this.enrolledStudents.length : 0);
});

// Virtual for is full
liveSessionSchema.virtual('isFull').get(function() {
  return this.enrolledCount >= this.maxCapacity;
});

// Ensure virtuals are included in JSON
liveSessionSchema.set('toJSON', { virtuals: true });
liveSessionSchema.set('toObject', { virtuals: true });

// Method to check if student is enrolled
liveSessionSchema.methods.isStudentEnrolled = function(studentId) {
  return this.enrolledStudents.some(enrollment => {
    // Handle both populated and non-populated cases
    const enrolledId = enrollment.student._id || enrollment.student;
    return enrolledId.toString() === studentId.toString();
  });
};

// Method to enroll student
liveSessionSchema.methods.enrollStudent = function(studentId) {
  if (this.isStudentEnrolled(studentId)) {
    throw new Error('Student already enrolled');
  }
  if (this.isFull) {
    throw new Error('Session is full');
  }
  this.enrolledStudents.push({ student: studentId });
  return this.save();
};

// Method to mark attendance
liveSessionSchema.methods.markAttendance = function(studentId, joinedAt, leftAt) {
  const enrollment = this.enrolledStudents.find(
    e => e.student.toString() === studentId.toString()
  );
  if (!enrollment) {
    throw new Error('Student not enrolled');
  }
  enrollment.attended = true;
  enrollment.joinedAt = joinedAt || new Date();
  if (leftAt) {
    enrollment.leftAt = leftAt;
    enrollment.duration = Math.round((leftAt - enrollment.joinedAt) / 60000); // minutes
  }
  return this.save();
};

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);

export default LiveSession;
