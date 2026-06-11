import mongoose from 'mongoose';

const submissionAttachmentSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  url: { type: String, default: '' },
  filename: { type: String, default: '' },
  originalName: { type: String, default: '' },
  mimetype: { type: String, default: '' },
  size: { type: Number, default: 0 },
}, { _id: false });

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignmentTitle: { type: String, default: '' },
  answerText: { type: String, default: '' },
  attachment: { type: submissionAttachmentSchema, default: () => ({}) },
  submissionFile: { type: submissionAttachmentSchema, default: () => ({}) },
  status: {
    type: String,
    enum: [
      'pending',
      'submitted',
      'resubmitted',
      'pending_review',
      'graded',
      'needs_resubmission',
      'rejected',
      'overdue',
    ],
    default: 'submitted',
  },
  score: { type: Number, default: null },
  feedback: { type: String, default: '' },
  grade: {
    score: { type: Number, default: null },
    maxScore: { type: Number, default: null },
    percentage: { type: Number, default: null },
  },
  teacherFeedback: {
    text: { type: String, default: '' },
    attachment: { type: submissionAttachmentSchema, default: () => ({}) },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  submittedAt: { type: Date, default: Date.now },
  resubmittedAt: { type: Date, default: null },
  isLate: { type: Boolean, default: false },
  attemptNumber: { type: Number, default: 1 },
}, {
  timestamps: true,
});

assignmentSubmissionSchema.index({ courseId: 1, lessonId: 1, studentId: 1 }, { unique: true });
assignmentSubmissionSchema.index({ courseId: 1, lessonId: 1, submittedAt: -1 });

export default mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
