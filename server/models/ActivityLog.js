const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  ownerRole: { type: String, enum: ['Admin', 'SuperAdmin'], default: 'SuperAdmin' },
  sender: {
    name: { type: String, default: 'Admin / System' },
    email: { type: String, default: 'system@skillbridge.in' }
  },
  recipient: {
    name: { type: String, default: 'Candidate' },
    email: { type: String, default: '' }
  },
  message: { type: String, required: true },
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
