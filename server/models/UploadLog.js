const mongoose = require('mongoose');

const UploadLogSchema = new mongoose.Schema({
  studentEmail: { type: String, required: true },
  studentName: { type: String, required: true },
  filename: { type: String, required: true },
  fileType: { type: String, required: true }, // e.g. 'profilePhoto' or 'resume'
  status: { type: String, enum: ['success', 'failed'], required: true },
  message: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UploadLog', UploadLogSchema);
