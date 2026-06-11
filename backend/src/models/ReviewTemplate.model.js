import mongoose from 'mongoose';

const reviewTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Template title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  templateText: {
    type: String,
    required: [true, 'Template text is required'],
    trim: true,
    maxlength: [500, 'Template text cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'positive'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

reviewTemplateSchema.index({ isActive: 1, order: 1 });

const ReviewTemplate = mongoose.model('ReviewTemplate', reviewTemplateSchema);

export default ReviewTemplate;