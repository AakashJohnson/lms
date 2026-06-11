import mongoose from 'mongoose';

const aiGeneratedMindMapSchema = new mongoose.Schema(
  {
    root: { type: String, default: 'Lesson' },
    branches: [
      {
        label: { type: String, required: true },
        items: [{ type: String, default: '' }],
      },
    ],
  },
  { _id: false },
);

const aiInterviewQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true, maxlength: 500 },
    answer: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  },
  { _id: false },
);

const aiTimestampSummarySchema = new mongoose.Schema(
  {
    start: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
    label: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { _id: false },
);

const aiFlashcardSchema = new mongoose.Schema(
  {
    question: { type: String, default: '' },
    answer: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    tags: [{ type: String, default: '' }],
  },
  { _id: false },
);

const aiQuizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, default: '' },
    options: [{ type: String, default: '' }],
    answer: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false },
);

const aiLessonNoteSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    section: { type: String, required: true, index: true },
    lesson: { type: String, required: true, index: true },

    mode: { type: String, enum: ['short', 'detailed'], default: 'short', index: true },

    source: {
      inputType: { type: String, default: 'lesson-content' },
      contentHash: { type: String, default: '' },
      transcript: { type: String, default: '' },
      transcriptLanguage: { type: String, default: 'en' },
      transcriptGeneratedAt: { type: Date },
    },

    generated: {
      summary: { type: String, default: '' },
      detailedSummary: { type: String, default: '' },
      keyTakeaways: [{ type: String, default: '' }],
      timestamps: [aiTimestampSummarySchema],
      transcriptSegments: [aiTimestampSummarySchema],
      flashcards: [aiFlashcardSchema],
      quizQuestions: [aiQuizQuestionSchema],
      mindMap: { type: aiGeneratedMindMapSchema, default: () => ({}) },
      interviewQuestions: [{ type: aiInterviewQuestionSchema, default: [] }],
      examples: [{ type: String, default: '' }],
      revisionMaterial: { type: String, default: '' },
    },

    isSavedForRevision: { type: Boolean, default: false, index: true },

    bookmarks: [
      {
        sectionType: {
          type: String,
          enum: ['summary', 'keyTakeaways', 'mindMap', 'interviewQuestions', 'examples', 'revisionMaterial'],
          required: true,
        },
        label: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

aiLessonNoteSchema.index({ student: 1, course: 1, section: 1, lesson: 1, mode: 1 });
aiLessonNoteSchema.index({ student: 1, course: 1, isSavedForRevision: 1 });

const AiLessonNote = mongoose.model('AiLessonNote', aiLessonNoteSchema);
export default AiLessonNote;

