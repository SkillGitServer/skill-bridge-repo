const mongoose = require('mongoose');

const systemMetricsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global_metrics',
    unique: true
  },
  // Admin Counts
  totalAdmins: { type: Number, default: 0 },
  pendingAdmins: { type: Number, default: 0 },
  activeAdmins: { type: Number, default: 0 },
  revokedAdmins: { type: Number, default: 0 },

  // Candidate Counts
  totalCandidates: { type: Number, default: 0 },
  pendingCandidates: { type: Number, default: 0 },
  activeCandidates: { type: Number, default: 0 },
  upgradedCandidates: { type: Number, default: 0 },
  disabledCandidates: { type: Number, default: 0 },

  // Platform Metrics
  totalExams: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  pendingJobs: { type: Number, default: 0 },
  totalApplications: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalChatLogs: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SystemMetrics', systemMetricsSchema);
