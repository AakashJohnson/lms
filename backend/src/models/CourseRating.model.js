import mongoose from 'mongoose';

const courseRatingSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  review: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },
  isApproved: {
    type: Boolean,
    default: true // Auto-approve by default
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  reportCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
courseRatingSchema.index({ course: 1, student: 1 }, { unique: true }); // One rating per student per course
courseRatingSchema.index({ course: 1, isApproved: 1, isVisible: 1 });
courseRatingSchema.index({ createdAt: -1 });

// Update course ratings statistics after save
courseRatingSchema.post('save', async function() {
  await this.constructor.updateCourseRatings(this.course);
});

// Update course ratings statistics after remove
courseRatingSchema.post('remove', async function() {
  await this.constructor.updateCourseRatings(this.course);
});

// Static method to calculate and update course ratings
courseRatingSchema.statics.updateCourseRatings = async function(courseId) {
  const Course = mongoose.model('Course');
  
  const stats = await this.aggregate([
    {
      $match: {
        course: courseId,
        isApproved: true,
        isVisible: true
      }
    },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
      }
    }
  ]);

  if (stats.length > 0) {
    await Course.findByIdAndUpdate(courseId, {
      'ratings.average': Math.round(stats[0].averageRating * 10) / 10,
      'ratings.count': stats[0].totalRatings,
      'ratings.distribution': {
        5: stats[0].rating5,
        4: stats[0].rating4,
        3: stats[0].rating3,
        2: stats[0].rating2,
        1: stats[0].rating1
      }
    });
  } else {
    // No ratings, reset to defaults
    await Course.findByIdAndUpdate(courseId, {
      'ratings.average': 0,
      'ratings.count': 0,
      'ratings.distribution': { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });
  }
};

const CourseRating = mongoose.model('CourseRating', courseRatingSchema);

export default CourseRating;
