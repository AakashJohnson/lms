import mongoose from 'mongoose';

const lessonNoteSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  section: {
    type: String,
    required: true
  },
  lesson: {
    type: String,
    required: true
  },
  title: {
    type: String,
    trim: true,
    default: ""
  },
  content: {
    type: String,
    required: true,
    maxlength: [10000, 'Note content cannot exceed 10000 characters']
  },
  timestamp: {
    type: Number,
    default: null // Video timestamp when note was taken (in seconds)
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
lessonNoteSchema.index({ student: 1, course: 1 });
lessonNoteSchema.index({ student: 1, course: 1, section: 1, lesson: 1 });
lessonNoteSchema.index({ createdAt: -1 });

const LessonNote = mongoose.model('LessonNote', lessonNoteSchema);

export default LessonNote;
