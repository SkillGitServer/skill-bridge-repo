const mongoose = require('mongoose');

const systemSchema = new mongoose.Schema({
  // Global Dev Kill Switch
  globalSiteBlocked: { 
    type: Boolean, 
    default: false 
  },

  // Trial Extension Requests Pool
  trialExtensionRequests: [{
    studentId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Student',
      required: true
    },
    message: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'granted', 'denied'], 
      default: 'pending' 
    },
    requestedAt: { type: Date, default: Date.now }
  }],

  // Anonymous AI Chat Logs
  aiChatLogs: [{
    question: { type: String, required: true },
    response: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('System', systemSchema);
