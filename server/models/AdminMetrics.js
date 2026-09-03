const mongoose = require('mongoose');

const AdminMetricsSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, unique: true },
  activeStudents: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  totalExams: { type: Number, default: 0 },
  averageScore: { type: String, default: '0%' },
  pendingReviews: { type: Number, default: 0 },
  lastCalculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AdminMetrics', AdminMetricsSchema);
