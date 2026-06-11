import mongoose from 'mongoose';

const aiSrsSchema = new mongoose.Schema(
  {
    repetitions: { type: Number, default: 0 },
    intervalDays: { type: Number, default: 0 }, // Scheduling interval
    easeFactor: { type: Number, default: 2.5 }, // SM-2 ease factor
    dueAt: { type: Date, default: () => new Date() },
    lastReviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const aiFlashcardSchema = new mongoose.Schema(
  {
    front: { type: String, required: true, trim: true, maxlength: 800 },
    back: { type: String, required: true, trim: true, maxlength: 4000 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    srs: { type: aiSrsSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const aiFlashcardDeckSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    section: { type: String, required: true, index: true },
    lesson: { type: String, required: true, index: true },

    source: {
      inputType: { type: String, default: 'lesson-content' },
    },

    cards: { type: [aiFlashcardSchema], default: [] },
  },
  { timestamps: true },
);

aiFlashcardDeckSchema.index({ student: 1, course: 1, section: 1, lesson: 1, createdAt: -1 });

const AiFlashcardDeck = mongoose.model('AiFlashcardDeck', aiFlashcardDeckSchema);
export default AiFlashcardDeck;

