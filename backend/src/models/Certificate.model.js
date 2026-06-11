import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema({
  // Unique certificate identifier
  certificateId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    // Format: CERT-YYYY-XXXXXXXX
  },

  // Encrypted verification token for QR code
  verificationToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Student who earned the certificate
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Course completed
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true,
  },

  // Dates
  completionDate: {
    type: Date,
    required: true,
  },

  issueDate: {
    type: Date,
    default: Date.now,
  },

  // Certificate status
  status: {
    type: String,
    enum: ['valid', 'revoked'],
    default: 'valid',
    index: true,
  },

  // Revocation details
  revokedAt: {
    type: Date,
  },

  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  revokedReason: {
    type: String,
  },

  // File URLs
  qrCodeUrl: {
    type: String,
  },

  pdfUrl: {
    type: String,
  },

  // Verification tracking
  verificationCount: {
    type: Number,
    default: 0,
  },

  lastVerifiedAt: {
    type: Date,
  },

  // Certificate metadata (cached for quick access)
  metadata: {
    courseName: String,
    studentName: String,
    studentEmail: String,
    grade: String,
    completionPercentage: Number,
    totalLessons: Number,
    completedLessons: Number,
    assessmentScore: Number,
  },

}, {
  timestamps: true,
});

// Compound index to ensure one certificate per student per course
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

// Index for verification lookups
certificateSchema.index({ verificationToken: 1, status: 1 });

// Virtual for verification URL
certificateSchema.virtual('verificationUrl').get(function() {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${baseUrl}/verify/${this.verificationToken}`;
});

// Method to check if certificate is valid
certificateSchema.methods.isValid = function() {
  return this.status === 'valid';
};

// Method to revoke certificate
certificateSchema.methods.revoke = async function(revokedBy, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokedReason = reason;
  await this.save();
};

// Method to track verification
certificateSchema.methods.trackVerification = async function() {
  this.verificationCount += 1;
  this.lastVerifiedAt = new Date();
  await this.save();
};

// Static method to generate unique certificate ID
certificateSchema.statics.generateCertificateId = async function() {
  const year = new Date().getFullYear();
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let certificateId;
  let exists = true;

  // Keep generating until we get a unique ID
  while (exists) {
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    certificateId = `CERT-${year}-${randomPart}`;
    
    // Check if this ID already exists
    exists = await this.findOne({ certificateId });
  }

  return certificateId;
};

// Static method to find certificate by verification token
certificateSchema.statics.findByVerificationToken = async function(token) {
  return this.findOne({ verificationToken: token })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title slug');
};

export default mongoose.model('Certificate', certificateSchema);
