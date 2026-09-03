const mongoose = require('mongoose');
const chatLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ChatLog', chatLogSchema);
