const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  examTitle: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pass', 'Fail'],
    required: true
  },
  pdfUrl: {
    type: String
  },
  questionsDetailed: [{
    questionText: String,
    userAnswer: String,
    correctAnswer: String,
    explanation: String,
    isCorrect: Boolean,
    points: Number
  }],
  isMentorExam: {
    type: Boolean,
    default: false
  },
  isResponded: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
