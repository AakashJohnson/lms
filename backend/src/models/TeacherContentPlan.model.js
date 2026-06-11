import mongoose from 'mongoose';

const teachingSequenceSchema = new mongoose.Schema({
  stepNo: { type: Number, default: 1 },
  title: { type: String, default: '' },
  activity: { type: String, default: '' },
  teacherAction: { type: String, default: '' },
  studentAction: { type: String, default: '' },
  estimatedMinutes: { type: Number, default: 10 },
  resources: [{ type: String, default: '' }],
}, { _id: false });

const byteSuggestionSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  objective: { type: String, default: '' },
  estimatedMinutes: { type: Number, default: 5 },
  sourceLessonId: { type: String, default: '' },
  reason: { type: String, default: '' },
}, { _id: true });

const assessmentSuggestionSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  type: { type: String, default: 'quiz' },
  questionCount: { type: Number, default: 5 },
  difficulty: { type: String, default: 'medium' },
  objective: { type: String, default: '' },
}, { _id: true });

const homeworkSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  estimatedMinutes: { type: Number, default: 20 },
}, { _id: false });

const weakTopicRecoverySchema = new mongoose.Schema({
  topic: { type: String, default: '' },
  evidence: { type: String, default: '' },
  suggestedAction: { type: String, default: '' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
}, { _id: false });

const teacherContentPlanSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
  moduleId: { type: String, default: '' },
  planningMode: { type: String, enum: ['course', 'custom'], default: 'course' },
  customTitle: { type: String, default: '' },
  customContentPreview: { type: String, default: '' },
  planningType: {
    type: String,
    enum: ['daily_lesson', 'weekly_content', 'monthly_course', 'byte_learning', 'assessment', 'revision', 'weak_topic_recovery', 'live_class', 'homework'],
    required: true,
  },
  duration: { type: String, enum: ['1_day', '1_week', '2_weeks', '1_month'], default: '1_week' },
  classLevel: { type: String, default: '' },
  language: { type: String, enum: ['english', 'hindi', 'hinglish', 'auto'], default: 'hinglish' },
  teachingStyle: {
    type: String,
    enum: ['interactive', 'exam_focused', 'activity_based', 'revision_focused', 'remedial'],
    default: 'interactive',
  },
  teacherInstruction: { type: String, default: '' },
  aiPlan: {
    title: { type: String, default: '' },
    summary: { type: String, default: '' },
    learningObjectives: [{ type: String, default: '' }],
    prerequisites: [{ type: String, default: '' }],
    teachingSequence: [teachingSequenceSchema],
    byteSuggestions: [byteSuggestionSchema],
    assessmentSuggestions: [assessmentSuggestionSchema],
    liveClassPlan: {
      title: { type: String, default: '' },
      agenda: [{ type: String, default: '' }],
      activities: [{ type: String, default: '' }],
      estimatedMinutes: { type: Number, default: 60 },
    },
    homework: [homeworkSchema],
    weakTopicRecovery: [weakTopicRecoverySchema],
    expectedOutcomes: [{ type: String, default: '' }],
  },
  sourceContext: {
    usedSources: [{ type: String, default: '' }],
    weakTopicsDetected: [{ type: String, default: '' }],
    contentCoverage: { type: Number, default: 0 },
    studentInsightsSnapshot: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    courseSnapshot: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  status: { type: String, enum: ['draft', 'saved', 'published', 'archived'], default: 'draft', index: true },
}, { timestamps: true });

teacherContentPlanSchema.index({ teacherId: 1, createdAt: -1 });

export default mongoose.model('TeacherContentPlan', teacherContentPlanSchema);
