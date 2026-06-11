import mongoose from 'mongoose';

const aiLessonQuestionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      index: true,
    },
    lesson: {
      type: String,
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1200, 'Question cannot exceed 1200 characters'],
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: [8000, 'Answer cannot exceed 8000 characters'],
    },
    sources: [
      {
        label: { type: String, default: '' },
        start: { type: Number, default: 0 },
        end: { type: Number, default: 0 },
        text: { type: String, default: '' },
      },
    ],
    transcriptAvailable: {
      type: Boolean,
      default: false,
    },
    usedGlobalKnowledge: {
      type: Boolean,
      default: true,
    },
    contextAvailability: {
      transcript: { type: Boolean, default: false },
      summary: { type: Boolean, default: false },
      flashcards: { type: Boolean, default: false },
      questionAnswers: { type: Boolean, default: false },
      resources: { type: Boolean, default: false },
      knowledgeChecks: { type: Boolean, default: false },
      studentNotes: { type: Boolean, default: false },
    },
    model: {
      type: String,
      default: '',
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

aiLessonQuestionSchema.index({ student: 1, course: 1, section: 1, lesson: 1, createdAt: -1 });

const AiLessonQuestion = mongoose.model('AiLessonQuestion', aiLessonQuestionSchema);

export default AiLessonQuestion;
