const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Basic Auth Details
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiresAt: { type: Date },

  // Trial Status
  trialExpiresAt: { type: Date },
  isTrialActive: { type: Boolean, default: true },
  isUnlocked: { type: Boolean, default: false },

  // Upgraded Profile Details
  profilePhoto: { type: String },
  mobile: { type: String },
  percentage10th: { type: String, default: '' },
  percentage12th: { type: String, default: '' },
  grade10Percentage: { type: Number },
  grade12Percentage: { type: Number },
  docGrade10: { type: String },
  docGrade12: { type: String },
  docResume: { type: String },
  adminReferralCode: { type: String },

  // Administrative Link
  assignedAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastAssignedAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },

  // Session Management — Single-Device Enforcement
  currentSessionId: { type: String, default: null },
  activeSessionId: { type: String, default: null },

  // Payment tracking, Grandfathered Fee Lock & Duration Snapshot
  razorpayPaymentId: { type: String, default: '' },
  assignedUnlockFee: { type: Number, default: null },
  allocatedDurationMonths: { type: Number, default: 6 },
  accessExpiresAt: { type: Date, default: null },

  // Job Applications Tracking
  appliedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Mentor Resume Review
  resumeReview: {
    atsScore: { type: Number, default: 0 },
    formattingFeedback: { type: String, default: '' },
    impactFeedback: { type: String, default: '' },
    reviewedBy: { type: String, default: '' },
    reviewedAt: { type: Date },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' }
  },

  // AI Resume Analysis Result (Bridge AI)
  aiAnalysis: {
    score: { type: Number },
    metrics: { type: Array },
    suggestions: { type: Array },
    analyzedAt: { type: Date }
  },

  // Student Notifications / Messages from Mentors/Admins
  notifications: [{
    id: { type: String },
    subject: { type: String },
    type: { type: String },
    message: { type: String },
    link: { type: String, default: '/student/resume' },
    timestamp: { type: Date, default: Date.now },
    unread: { type: Boolean, default: true }
  }]

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
