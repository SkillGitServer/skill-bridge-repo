const mongoose = require('mongoose');

const trialExtensionSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    default: 'Student'
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'granted', 'denied'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('TrialExtension', trialExtensionSchema);
