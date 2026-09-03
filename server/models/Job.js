const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    default: 'Remote',
    trim: true
  },
  jobType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Internship', 'Contract'],
    default: 'Full-Time'
  },
  salary: {
    type: String,
    default: 'Not Disclosed',
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  applyLink: {
    type: String,
    default: '',
    trim: true
  },
  uploadedBy: {
    type: String,
    default: 'system'
  },
  uploaderRole: {
    type: String,
    enum: ['admin', 'super-admin'],
    default: 'admin'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'archived'],
    default: 'pending'
  },
  applicants: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Job', JobSchema);
