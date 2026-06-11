import mongoose from 'mongoose';

const microLessonSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  sectionId: {
    type: String
  },
  lessonId: {
    type: String
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'review_required', 'published', 'archived'],
    default: 'draft'
  },
  section: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    enum: ['video', 'text', 'pdf', 'ppt', 'document', 'quiz'],
    default: 'text'
  },
  contentUrl: {
    type: String,
    default: ''
  },
  videoStartTime: {
    type: Number, // seconds into source video
    default: 0
  },
  videoEndTime: {
    type: Number, // seconds into source video
    default: 0
  },
  duration: {
    type: Number, // in minutes
    default: 5
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  xpReward: {
    type: Number,
    default: 10
  },
  // AI Generated Content
  aiContent: {
    summary: { type: String, default: '' },
    keyTakeaways: [{ type: String }],
    simpleExplanation: { type: String, default: '' },
    examples: [{ type: String }],
    analogies: [{ type: String }],
    revisionNotes: { type: String, default: '' }
  },
  // Quiz
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      explanation: String
    }],
    passingScore: { type: Number, default: 70 }
  },
  // Flashcards
  flashcards: [{
    front: String,
    back: String,
    topic: String
  }],
  // Interview Questions
  interviewQuestions: [{
    question: String,
    answer: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  }],
  // Coding Challenges (for technical content)
  codingChallenge: {
    problem: String,
    solution: String,
    hints: [String],
    difficulty: String
  },
  // Topics covered in this lesson
  topics: [{ type: String }],
  // Prerequisites
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MicroLesson'
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

microLessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MicroLesson = mongoose.model('MicroLesson', microLessonSchema);

export default MicroLesson;
