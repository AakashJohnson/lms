import mongoose from 'mongoose';

export const STUDENT_ACTIVITY_TYPES = [
  'login',
  'logout',
  'course_viewed',
  'lesson_opened',
  'video_progress',
  'video_completed',
  'assessment_started',
  'assessment_completed',
  'assignment_submitted',
  'resource_downloaded',
  'live_class_joined',
  'live_class_left',
  'ai_tutor_used',
  'flashcard_reviewed',
  'certificate_downloaded',
];

const studentActivityLogSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null,
    index: true,
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    default: null,
  },
  activityType: {
    type: String,
    enum: STUDENT_ACTIVITY_TYPES,
    required: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 180,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  durationSeconds: {
    type: Number,
    min: 0,
    default: 0,
  },
  completionPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  scorePercent: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  status: {
    type: String,
    enum: ['success', 'started', 'progress', 'completed', 'failed'],
    default: 'success',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    select: false,
  },
  dateKey: {
    type: String,
    required: true,
    index: true,
  },
  timeKey: {
    type: String,
    required: true,
  },
  ipHash: {
    type: String,
    select: false,
  },
  userAgentHash: {
    type: String,
    select: false,
  },
  createdByRole: {
    type: String,
    enum: ['student', 'trainer', 'administrator', 'system'],
    default: 'student',
  },
}, {
  timestamps: true,
});

studentActivityLogSchema.index({ student: 1, dateKey: 1, createdAt: -1 });
studentActivityLogSchema.index({ student: 1, course: 1, dateKey: 1 });
studentActivityLogSchema.index({ course: 1, dateKey: 1, activityType: 1 });

export default mongoose.model('StudentActivityLog', studentActivityLogSchema);
