const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  deviceInfo: {
    browser: { type: String, default: 'Unknown Browser' },
    os: { type: String, default: 'Unknown OS' },
    ip: { type: String, default: 'Unknown' }
  },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const superAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, default: 'Super Admin' },

  // Session Management — Multi-Device Hub (concurrent sessions allowed)
  activeSessions: { type: [activeSessionSchema], default: [] }

}, { timestamps: true });

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
