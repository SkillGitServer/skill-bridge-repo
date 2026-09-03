const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  // Basic Auth Details
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  mobile: { type: String },
  profilePhoto: { type: String, default: '' },

  // Location Data
  state: { type: String, required: true },
  city: { type: String, required: true },

  // Assigned Students Reference
  assignedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

  // Status & Identification
  status: {
    type: String,
    enum: ['pending', 'active', 'revoked'],
    default: 'pending'
  },
  referralCode: { type: String, unique: true, sparse: true },
  referralKeysHistory: [{
    code: { type: String },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Deactivated' },
    createdAt: { type: Date, default: Date.now }
  }],

  // City & Custom Fee / Duration Tier Override
  customUnlockFee: { type: Number, default: null },
  customStudentDurationMonths: { type: Number, default: null },

  // Session Management — Single-Device Enforcement
  currentSessionId: { type: String, default: null },
  activeSessionId: { type: String, default: null },

  // Dedicated Admin Activity Retention Setting (Days)
  activityRetentionDays: { type: Number, default: 7 }

}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
