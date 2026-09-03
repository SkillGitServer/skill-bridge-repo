const mongoose = require('mongoose');

const superAdminPasskeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
  usedByEmail: { type: String, default: null },
  usedByName: { type: String, default: null },
  usedAt: { type: Date, default: null },
  createdBy: { type: String, default: 'System' }
}, { timestamps: true });

module.exports = mongoose.model('SuperAdminPasskey', superAdminPasskeySchema);
