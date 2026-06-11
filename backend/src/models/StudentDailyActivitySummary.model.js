import mongoose from 'mongoose';

const studentDailyActivitySummarySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  dateKey: {
    type: String,
    required: true,
    index: true,
  },
  totalActivities: {
    type: Number,
    default: 0,
  },
  totalStudySeconds: {
    type: Number,
    default: 0,
  },
  coursesViewed: {
    type: Number,
    default: 0,
  },
  lessonsOpened: {
    type: Number,
    default: 0,
  },
  lessonsCompleted: {
    type: Number,
    default: 0,
  },
  assessmentsCompleted: {
    type: Number,
    default: 0,
  },
  assignmentsSubmitted: {
    type: Number,
    default: 0,
  },
  resourcesDownloaded: {
    type: Number,
    default: 0,
  },
  liveClassesJoined: {
    type: Number,
    default: 0,
  },
  aiTutorUses: {
    type: Number,
    default: 0,
  },
  activityTypes: {
    type: [String],
    default: [],
  },
  lastActivityAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

studentDailyActivitySummarySchema.index({ student: 1, dateKey: 1 }, { unique: true });

export default mongoose.model('StudentDailyActivitySummary', studentDailyActivitySummarySchema);
