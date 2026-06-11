import mongoose from 'mongoose';

// ─── Option sub-schema (MCQ / MSQ) ───────────────────────────────────────────
const optionSchema = new mongoose.Schema({
  text:        { type: String, trim: true, default: '' },
  isCorrect:   { type: Boolean, default: false },
  explanation: { type: String, default: '' },
}, { _id: true });

// ─── Match pair ───────────────────────────────────────────────────────────────
const matchPairSchema = new mongoose.Schema({
  left:  { type: String, default: '' },
  right: { type: String, default: '' },
}, { _id: true });

// ─── Order item ───────────────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  text: { type: String, default: '' },
}, { _id: true });

// ─── Matrix ───────────────────────────────────────────────────────────────────
const matrixRowSchema = new mongoose.Schema({
  label:     { type: String, default: '' },
  correctCol: { type: String, default: '' },
}, { _id: true });

const matrixColSchema = new mongoose.Schema({
  label: { type: String, default: '' },
}, { _id: true });

// ─── Hotspot area ─────────────────────────────────────────────────────────────
const hotspotAreaSchema = new mongoose.Schema({
  x: Number, y: Number, w: Number, h: Number,
  label: { type: String, default: '' },
}, { _id: true });

// ─── Code test case ───────────────────────────────────────────────────────────
const codeTestCaseSchema = new mongoose.Schema({
  input:    { type: String, default: '' },
  expected: { type: String, default: '' },
}, { _id: true });

// ─── Rubric item ──────────────────────────────────────────────────────────────
const rubricItemSchema = new mongoose.Schema({
  label:  { type: String, default: '' },
  points: { type: Number, default: 0 },
}, { _id: true });

// ─── Question sub-schema ──────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'mcq', 'msq', 'truefalse', 'fillblank', 'match',
      'shortanswer', 'longanswer', 'ordering', 'rating', 'matrix',
      'hotspot', 'fileupload', 'code', 'audio', 'video',
    ],
    default: 'mcq',
  },
  questionText:   { type: String, default: '', trim: true },
  explanation:    { type: String, default: '' },
  points:         { type: Number, default: 1, min: 0 },
  negativePoints: { type: Number, default: 0, min: 0 },
  difficulty:     { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags:           [{ type: String, trim: true }],
  required:       { type: Boolean, default: true },
  order:          { type: Number, default: 0 },

  // MCQ / MSQ
  options: [optionSchema],

  // True/False
  tfAnswer: { type: Boolean, default: null },

  // Fill in blank
  blanks:        [{ type: String }],
  caseSensitive: { type: Boolean, default: false },

  // Match
  matchPairs: [matchPairSchema],

  // Short / Long answer
  sampleAnswer: { type: String, default: '' },
  wordLimit:    { type: Number, default: 0 },
  keywords:     [{ type: String }],
  rubric:       [rubricItemSchema],

  // Ordering
  orderItems: [orderItemSchema],

  // Rating / Likert
  ratingScale:    { type: Number, enum: [5, 7, 10], default: 5 },
  ratingMinLabel: { type: String, default: '' },
  ratingMaxLabel: { type: String, default: '' },

  // Matrix
  matrixRows: [matrixRowSchema],
  matrixCols: [matrixColSchema],

  // Hotspot
  hotspotImage: { type: String, default: '' },
  hotspotAreas: [hotspotAreaSchema],

  // File upload
  allowedFileTypes: [{ type: String }],
  maxFileSizeMB:    { type: Number, default: 10 },
  maxFiles:         { type: Number, default: 1 },

  // Code
  codeLanguage:  { type: String, default: 'javascript' },
  codeTemplate:  { type: String, default: '' },
  codeTestCases: [codeTestCaseSchema],
  codeSolution:  { type: String, default: '' },

  // Audio / Video response
  maxRecordSeconds: { type: Number, default: 120 },
  promptImage:      { type: String, default: '' },
  promptAudio:      { type: String, default: '' },
  promptVideo:      { type: String, default: '' },
}, { _id: true });

// ─── Main Assessment Schema ───────────────────────────────────────────────────
const assessmentSchema = new mongoose.Schema({
  // ── Setup ────────────────────────────────────────────────────────────────────
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  type: {
    type: String,
    enum: ['quiz', 'exam', 'assignment', 'survey', 'practice', 'poll'],
    default: 'quiz',
  },
  course:       { type: mongoose.Schema.Types.Mixed, default: '' },   // course name or ObjectId string
  courseRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  module:       { type: String, default: '' },
  description:  { type: String, default: '' },
  instructions: { type: String, default: '' },
  tags:         [{ type: String, trim: true }],

  // ── Settings ─────────────────────────────────────────────────────────────────
  timeLimit:         { type: Number, default: 30 },   // minutes; 0 = unlimited
  attemptsAllowed:   { type: Number, default: 3 },    // 999 = unlimited
  passingScore:      { type: Number, default: 60, min: 0, max: 100 },
  gracePeriod:       { type: Number, default: 5 },
  gradingType:       { type: String, enum: ['auto', 'manual', 'hybrid'], default: 'auto' },

  shuffleQuestions:  { type: Boolean, default: false },
  shuffleOptions:    { type: Boolean, default: true },
  showScore:         { type: Boolean, default: true },
  showFeedback:      { type: Boolean, default: true },
  showCorrectAnswers:{ type: String, enum: ['never', 'immediate', 'after_due'], default: 'immediate' },
  questionsPerPage:  { type: Number, default: 1 },
  allowBacktrack:    { type: Boolean, default: true },
  autoSubmit:        { type: Boolean, default: true },

  availableFrom:     { type: Date, default: null },
  availableUntil:    { type: Date, default: null },

  // Proctoring
  preventTabSwitch:      { type: Boolean, default: false },
  requireFullscreen:     { type: Boolean, default: false },
  disableCopyPaste:      { type: Boolean, default: false },
  warnOnTabSwitch:       { type: Boolean, default: true },
  autoSubmitOnViolation: { type: Boolean, default: false },
  maxViolationsAllowed:  { type: Number, default: 3, min: 1, max: 10 },
  enableWebcam:          { type: Boolean, default: false },
  enableFaceDetection:   { type: Boolean, default: false },
  logSuspiciousActivity: { type: Boolean, default: true },

  // ── Questions ────────────────────────────────────────────────────────────────
  questions: [questionSchema],

  // ── Computed (auto-updated on save) ──────────────────────────────────────────
  totalPoints:  { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },

  // ── Publish ──────────────────────────────────────────────────────────────────
  visibility:      { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft' },
  isPublished:     { type: Boolean, default: false },
  publishedAt:     { type: Date, default: null },
  scheduleAt:      { type: Date, default: null },
  notifyStudents:  { type: Boolean, default: true },

  // ── Stats ────────────────────────────────────────────────────────────────────
  submissions: { type: Number, default: 0 },
  passRate:    { type: Number, default: 0 },
  avgScore:    { type: Number, default: 0 },

  // ── Ownership ────────────────────────────────────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
assessmentSchema.index({ createdBy: 1 });
assessmentSchema.index({ type: 1, isPublished: 1 });
assessmentSchema.index({ course: 1 });
assessmentSchema.index({ createdAt: -1 });
assessmentSchema.index({ title: 'text' });

// ─── Pre-save: compute totals & sync isPublished ──────────────────────────────
assessmentSchema.pre('save', function (next) {
  if (this.isModified('questions')) {
    this.questions.forEach((q, i) => { q.order = i; });
    this.totalPoints = this.questions.reduce((s, q) => s + (q.points || 0), 0);
    this.passingMarks = Math.ceil((this.passingScore / 100) * this.totalPoints);
  }
  if (this.isModified('visibility')) {
    this.isPublished = this.visibility === 'published';
    if (this.visibility === 'published' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
  }
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────
assessmentSchema.virtual('totalQuestions').get(function () {
  return (this.questions || []).length;
});

const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
