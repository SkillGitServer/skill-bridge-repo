const mongoose = require('mongoose');

const mentorExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 15
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true } // index 0-3
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  attemptedBy: [
    {
      type: String
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('MentorExam', mentorExamSchema);
