const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global_settings', unique: true },
  isSiteLocked: { type: Boolean, default: false },
  isDevToolsBlocked: { type: Boolean, default: true },
  isKeyboardLockActive: { type: Boolean, default: true },
  uploadLogsRetention: { type: String, default: '7d' },
  communicationsRetention: { type: String, default: '7d' },
  aiChatLogsRetention: { type: String, default: '7d' },
  chatGroqKey: { type: String, default: '' },
  resumeGroqKey: { type: String, default: '' },
  autoBackupFrequency: { type: String, default: 'Daily' }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
