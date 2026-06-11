import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    maxlength: [100, 'Batch name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Batch code is required'],
    uppercase: true,
    trim: true,
    maxlength: [50, 'Batch code cannot exceed 50 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year must be 2020 or later'],
    max: [2100, 'Year must be before 2100']
  },
  semester: {
    type: Number,
    min: [1, 'Semester must be between 1 and 8'],
    max: [8, 'Semester must be between 1 and 8'],
    default: 1
  },
  section: {
    type: String,
    uppercase: true,
    trim: true,
    maxlength: [5, 'Section cannot exceed 5 characters'],
    default: 'A'
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  maxStudents: {
    type: Number,
    default: null,
    min: [1, 'Max students must be at least 1']
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: [0, 'Current students cannot be negative']
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  trainers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
batchSchema.index({ code: 1 });
batchSchema.index({ department: 1, year: -1 });
batchSchema.index({ course: 1 });
batchSchema.index({ isActive: 1 });

// Compound index for unique batch per department per year
batchSchema.index({ department: 1, code: 1 }, { unique: true });

// Virtual for checking if batch is full
batchSchema.virtual('isFull').get(function() {
  if (!this.maxStudents) return false;
  return this.currentStudents >= this.maxStudents;
});

// Virtual for available seats
batchSchema.virtual('availableSeats').get(function() {
  if (!this.maxStudents) return null;
  return Math.max(0, this.maxStudents - this.currentStudents);
});

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
