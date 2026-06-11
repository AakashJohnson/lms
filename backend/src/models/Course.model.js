import mongoose from 'mongoose';
import slugify from 'slugify';
import { VIDEO_SUMMARY_STATUS_VALUES } from '../constants/videoSummaryStatus.js';

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const lessonResourceSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  url:   { type: String, trim: true },
  type:  { type: String, default: 'link' },
  storageProvider: { type: String, enum: ['gridfs', 'local', 's3', 'cloudinary'], default: 'local' },
  fileAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  fileAsset: { type: mongoose.Schema.Types.Mixed, default: null },
  gridfsFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  streamUrl: { type: String, default: '' },
  viewUrl: { type: String, default: '' },
  downloadUrl: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  size: { type: Number, default: 0 },
  originalName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const lessonAssetSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  storageProvider: { type: String, enum: ['gridfs', 'local', 's3', 'cloudinary'], default: 'local' },
  fileAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  gridfsFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  bucketName: { type: String, default: 'uploads' },
  streamUrl: { type: String, default: '' },
  viewUrl: { type: String, default: '' },
  downloadUrl: { type: String, default: '' },
  originalName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  uploadedAt: { type: Date },
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  dueDate: { type: String, default: '' },
  attachmentUrl: { type: String, default: '' },
  maxScore: { type: Number, default: 100 },
  points: { type: Number, default: 100 },
  fileAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  isRequired: { type: Boolean, default: false },
  attachmentAsset: { type: lessonAssetSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const knowledgeCheckSchema = new mongoose.Schema({
  question: { type: String, default: '' },
  type: { type: String, default: 'multiple-choice' },
  options: [{ type: String, default: '' }],
  correctAnswer: { type: String, default: '' },
  explanation: { type: String, default: '' },
  timestamp: { type: Number, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: true });

const requiredChecklistSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  type: { type: String, default: 'content' },
  isRequired: { type: Boolean, default: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const videoSummaryTimestampSchema = new mongoose.Schema({
  start: { type: Number, default: 0 },
  end: { type: Number, default: 0 },
  label: { type: String, default: '' },
  summary: { type: String, default: '' },
}, { _id: false });

const videoSummaryFlashcardSchema = new mongoose.Schema({
  question: { type: String, default: '' },
  answer: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: [{ type: String, default: '' }],
}, { _id: false });

const videoSummaryQuizSchema = new mongoose.Schema({
  question: { type: String, default: '' },
  options: [{ type: String, default: '' }],
  answer: { type: String, default: '' },
  explanation: { type: String, default: '' },
}, { _id: false });

const transcriptSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  text: { type: String, default: '' },
  segments: [{
    start: Number,
    end: Number,
    text: String
  }],
  language: { type: String, default: '' },
  provider: { type: String, default: '' },
  generatedAt: Date,
  errorCode: { type: String, default: '' },
  errorMessage: { type: String, default: '' }
}, { _id: false });

const videoSummarySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: VIDEO_SUMMARY_STATUS_VALUES,
    default: 'idle',
  },
  stage: { type: String, default: '' },
  error: { type: String, default: '' },
  sourceVideoUrl: { type: String, default: '' },
  sourceFileAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  sourceGridfsFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  rawTranscript: { type: String, default: '' },
  transcript: { type: String, default: '' },
  cleanedTranscript: { type: String, default: '' },
  // ──── Transcript Editing & Version Control ────
  editedTranscript: { type: String, default: '' },
  finalTranscript: { type: String, default: '' },
  transcriptEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  transcriptEditedAt: { type: Date, default: null },
  transcriptGeneratedAt: { type: Date, default: null },
  transcriptGeneratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // ──── Transcript Metadata ────
  transcriptStatus: {
    type: String,
    enum: ['idle', 'pending', 'processing', 'completed', 'failed'],
    default: 'idle',
  },
  transcriptErrorMessage: { type: String, default: '' },
  transcriptWordCount: { type: Number, default: 0 },
  transcriptDurationSeconds: { type: Number, default: 0 },
  transcriptSegments: [{
    start: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
    text: { type: String, default: '' },
    _id: false
  }],
  transcriptSourceFileHash: { type: String, default: '' },
  transcriptAiProvider: { type: String, default: '' },
  transcriptSttModel: { type: String, default: '' },
  transcriptRegenerateCount: { type: Number, default: 0 },
  transcriptNotificationId: { type: mongoose.Schema.Types.ObjectId, default: null },
  // ────────────────────────────────────────────
  transcriptAnalysisMeta: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  transcriptLanguage: { type: String, default: 'en' },
  summaryType: { type: String, enum: ['short', 'detailed'], default: 'short' },
  summaryLanguage: { type: String, default: 'en' },
  aiProcessingStatus: { type: String, default: 'idle' },
  aiProcessingProgress: { type: Number, default: 0 },
  aiProcessingError: { type: String, default: '' },
  aiProcessingStartedAt: { type: Date },
  aiProcessingCompletedAt: { type: Date },
  summaryGeneratedAt: { type: Date },
  summaryModel: { type: String, default: '' },
  transcriptAnalysisModel: { type: String, default: '' },
  generated: {
    summary: { type: String, default: '' },
    detailedSummary: { type: String, default: '' },
    transcript: { type: String, default: '' },
    rawTranscript: { type: String, default: '' },
    keyTakeaways: [{ type: String, default: '' }],
    importantConcepts: [{ type: String, default: '' }],
    topicWisePoints: [videoSummaryTimestampSchema],
    timestamps: [videoSummaryTimestampSchema],
    transcriptSegments: [videoSummaryTimestampSchema],
    flashcards: [videoSummaryFlashcardSchema],
    quizQuestions: [videoSummaryQuizSchema],
    revisionNotes: { type: String, default: '' },
  },
  summaryVersions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  startedAt: { type: Date },
  completedAt: { type: Date },
  updatedAt: { type: Date },
}, { _id: false });

const lessonSchema = new mongoose.Schema({
  title:         { type: String, trim: true, default: "Untitled Lesson" },
  type:          { type: String, enum: ['video', 'article', 'quiz', 'assignment', 'live'], default: 'video' },
  content:       { type: String, default: '' },       // article body / description
  description:   { type: String, default: '' },
  videoDescription: { type: String, default: '' },
  fullDescription: { type: String, default: '' },
  overview:      { type: String, default: '' },
  summary:       { type: String, default: '' },
  transcript:    { type: String, default: '' }, // video/audio transcript used by AI notes
  manualTranscript: { type: String, default: '' },
  generatedTranscript: { type: String, default: '' },
  notes: { type: String, default: '' },
  transcriptRaw: {
    text: { type: String, default: '' },
    language: { type: String, default: '' },
    provider: { type: String, default: '' },
    confidence: { type: Number, default: null },
    segments: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now }
  },
  transcriptCleaned: {
    text: { type: String, default: '' },
    language: { type: String, default: '' },
    provider: { type: String, default: '' },
    mainTopics: { type: Array, default: [] },
    removedNoiseSummary: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  transcriptEnglish: {
    text: { type: String, default: '' },
    sourceLanguage: { type: String, default: '' },
    provider: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  transcriptMeta: {
    jobId: { type: String, default: '' },
    audioDuration: { type: Number, default: 0 },
    detectedLanguage: { type: String, default: '' },
    languageHint: { type: String, default: '' },
    providersTried: { type: Array, default: [] },
    selectedProvider: { type: String, default: '' },
    fallbackUsed: { type: Boolean, default: false },
    qualityScore: { type: Number, default: 0 },
    warnings: { type: Array, default: [] },
    rawTranscriptLength: { type: Number, default: 0 },
    cleanedTranscriptLength: { type: Number, default: 0 },
    finalOutputLanguage: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  videoUrl:      { type: String, default: '' },
  videoDuration: { type: String, default: '' },       // "mm:ss" string
  duration: { type: mongoose.Schema.Types.Mixed, default: '' },
  languageMode: { type: String, default: 'auto' },
  transcriptionMode: { type: String, default: 'balanced' },
  lessonImage:   { type: String, default: '' },
  lessonAudio:   { type: String, default: '' },
  lessonVideo:   { type: String, default: '' },
  videoAsset:    { type: lessonAssetSchema, default: () => ({}) },
  imageAsset:    { type: lessonAssetSchema, default: () => ({}) },
  audioAsset:    { type: lessonAssetSchema, default: () => ({}) },
  mediaAssets: { type: [mongoose.Schema.Types.Mixed], default: [] },
  attachments: [lessonResourceSchema],
  videoSummary:  { type: videoSummarySchema, default: () => ({}) },
  isPreview:     { type: Boolean, default: false },
  resources:     [lessonResourceSchema],
  assignment:    { type: assignmentSchema, default: undefined },
  assignments: [assignmentSchema],
  knowledgeChecks: [knowledgeCheckSchema],
  requiredChecklist: [requiredChecklistSchema],
  order:         { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Topic Questions - embedded in lesson for easy access during learning
  questions: [{
    question: { type: String, required: true },
    questionType: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer'], default: 'multiple-choice' },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: String,
    explanation: String,
    position: { type: String, enum: ['start', 'middle', 'end'], default: 'end' },
    timestamp: Number // For video lessons - at what second to show
  }],
}, { _id: true });

const sectionSchema = new mongoose.Schema({
  title:       { type: String, trim: true, default: "Untitled Section" },
  description: { type: String, default: '' },
  fullDescription: { type: String, default: '' },
  lessons:     [lessonSchema],
  order:       { type: Number, default: 0 },
}, { _id: true });

// ─── Main Course Schema ───────────────────────────────────────────────────────

const courseSchema = new mongoose.Schema({
  // ── Identity ────────────────────────────────────────────────────────────────
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [300, 'Subtitle cannot exceed 300 characters'],
    default: '',
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
  },
  fullDescription: {
    type: String,
    default: '',
  },
  overview: {
    type: String,
    default: '',
  },

  // ── Classification ──────────────────────────────────────────────────────────
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: [
      'management', 'finance', 'marketing', 'legal',
      'technology', 'hr', 'agriculture', 'healthcare',
      // legacy values kept for backward compat
      'cooperative-management', 'financial-literacy', 'digital-skills',
      'leadership', 'other',
    ],
  },
  subCategory: { type: String, trim: true, default: '' },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'beginner',
  },
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'kn', 'ml', 'bn', 'pa', 'or', 'as', 'ur'],
  },
  tags: [{ type: String, trim: true, lowercase: true }],

  // ── Media ───────────────────────────────────────────────────────────────────
  thumbnail:  { type: String, default: '' },
  promoVideo: { type: String, default: '' },

  // ── Curriculum ──────────────────────────────────────────────────────────────
  sections: [sectionSchema],

  // ── Objectives & Audience ───────────────────────────────────────────────────
  objectives:     [{ type: String, trim: true }],   // learning outcomes
  requirements:   [{ type: String, trim: true }],   // prerequisites
  targetAudience: { type: mongoose.Schema.Types.Mixed, default: '' },

  // ── Pricing ─────────────────────────────────────────────────────────────────
  pricing: {
    isFree:   { type: Boolean, default: false },
    amount:   { type: Number, default: 50 },
    currency: { type: String, default: 'INR' },
  },

  // ── Enrollment ──────────────────────────────────────────────────────────────
  enrollmentType: {
    type: String,
    enum: ['open', 'approval', 'invite'],
    default: 'open',
  },
  enrollStart:        { type: Date, default: null },
  enrollEnd:          { type: Date, default: null },
  maxStudents:        { type: Number, default: null },   // null = unlimited
  currentEnrollments: { type: Number, default: 0 },

  // ── Assignment ──────────────────────────────────────────────────────────────
  trainer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    default: null 
  },
  batches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  }],
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],

  // ── Settings ────────────────────────────────────────────────────────────────
  visibility: {
    type: String,
    enum: ['public', 'private', 'draft'],
    default: 'draft',
  },
  enableCertificate: { type: Boolean, default: true },
  certPassScore:     { type: Number, default: 70, min: 0, max: 100 },
  enableDiscussion:  { type: Boolean, default: true },
  courseValidity:    { type: String, default: '365' },  // days, '' = forever

  // ── Messaging ───────────────────────────────────────────────────────────────
  welcomeMessage:  { type: String, default: '' },
  congratsMessage: { type: String, default: '' },

  // ── SEO ─────────────────────────────────────────────────────────────────────
  metaTitle:       { type: String, default: '' },
  metaDescription: { type: String, default: '' },

  // ── Status ──────────────────────────────────────────────────────────────────
  /**
   * status:
   *   draft    – being built, not visible to students
   *   active   – live and accessible to enrolled students
   *   archived – hidden from new enrollments, read-only
   */
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  },
  reviewStatus: {
    type: String,
    enum: ['draft', 'pending_review', 'changes_requested', 'published', 'rejected', 'unpublished'],
    default: 'draft',
    index: true,
  },
  isPublished: { type: Boolean, default: false, index: true },
  submittedForReviewAt: { type: Date, default: null },
  publishedAt:  { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  unpublishedAt: { type: Date, default: null },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adminReview: {
    decision: { type: String, enum: ['approved', 'rejected', 'changes_requested', null], default: null },
    message: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  reviewHistory: [{
    status: { type: String, default: '' },
    decision: { type: String, default: '' },
    message: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedByRole: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],

  // ── Certificate eligibility (legacy / advanced) ──────────────────────────────
  certificateEligibility: {
    minCompletionPercentage: { type: Number, default: 80, min: 0, max: 100 },
    minAssessmentScore:      { type: Number, default: 60, min: 0, max: 100 },
  },

  // ── Ratings & Reviews ───────────────────────────────────────────────────────
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count:   { type: Number, default: 0 },
  },
  reviews: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   String,
    createdAt: { type: Date, default: Date.now },
  }],

  // ── Statistics ───────────────────────────────────────────────────────────────
  statistics: {
    totalViews:             { type: Number, default: 0 },
    totalEnrollments:       { type: Number, default: 0 },
    totalCompletions:       { type: Number, default: 0 },
    averageCompletionTime:  Number,
  },

  // ── Ownership ────────────────────────────────────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
courseSchema.index({ slug: 1 }, { unique: true });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ createdBy: 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ 'ratings.average': -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text' });

// ─── Pre-save hooks ───────────────────────────────────────────────────────────

// Auto-generate unique slug from title
courseSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();

  let base = slugify(this.title, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (await mongoose.model('Course').exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${counter++}`;
  }
  this.slug = slug;
  next();
});

// Keep legacy status and new review fields compatible.
courseSchema.pre('save', function (next) {
  if (!this.reviewStatus) {
    this.reviewStatus = this.status === 'active' || this.isPublished ? 'published' : 'draft';
  }

  if (this.reviewStatus === 'published') {
    this.isPublished = true;
    this.status = 'active';
    this.visibility = this.visibility === 'draft' ? 'public' : this.visibility;
    if (!this.publishedAt) this.publishedAt = new Date();
  } else if (['draft', 'pending_review', 'changes_requested', 'rejected', 'unpublished'].includes(this.reviewStatus)) {
    this.isPublished = false;
    if (this.status === 'active') this.status = this.reviewStatus === 'unpublished' ? 'archived' : 'draft';
  }
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────
courseSchema.virtual('completionRate').get(function () {
  if (!this.statistics.totalEnrollments) return 0;
  return ((this.statistics.totalCompletions / this.statistics.totalEnrollments) * 100).toFixed(2);
});

courseSchema.virtual('totalLessons').get(function () {
  return (this.sections || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0);
});

const Course = mongoose.model('Course', courseSchema);
export default Course;
