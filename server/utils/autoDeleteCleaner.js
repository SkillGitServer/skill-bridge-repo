const SystemSettings = require('../models/SystemSettings');
const UploadLog = require('../models/UploadLog');
const ChatLog = require('../models/ChatLog');
const Student = require('../models/Student');
const ActivityLog = require('../models/ActivityLog');

function getCutoffDate(retentionKey) {
  if (!retentionKey || retentionKey === 'never') return null;

  const now = Date.now();
  let ms = 0;

  switch (retentionKey) {
    case '1d':
      ms = 1 * 24 * 60 * 60 * 1000;
      break;
    case '3d':
      ms = 3 * 24 * 60 * 60 * 1000;
      break;
    case '7d':
      ms = 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      ms = 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }

  return new Date(now - ms);
}

/**
 * Runs cleanup on MongoDB Atlas database collections based on configured retention policies or instant manual wipe.
 * @param {Object} overrideConfig - Optional custom retention overrides or { forceAll: true }
 */
async function runAutoDeleteCleanup(overrideConfig = null) {
  try {
    let settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = new SystemSettings({ key: 'global_settings' });
      await settings.save();
    }

    const isManualWipe = Boolean(overrideConfig?.forceAll || overrideConfig?.isManual || overrideConfig?.mode === 'all');
    const uploadRetention = overrideConfig?.uploadLogsRetention || settings.uploadLogsRetention || '7d';
    const commRetention   = overrideConfig?.communicationsRetention || settings.communicationsRetention || '7d';
    const chatRetention   = overrideConfig?.aiChatLogsRetention || settings.aiChatLogsRetention || '7d';

    let uploadLogsDeleted = 0;
    let communicationsDeleted = 0;
    let aiChatLogsDeleted = 0;

    if (isManualWipe) {
      // ── Instant Full Wipe on MongoDB Atlas ──
      // 1. Delete ALL Upload Logs from Atlas
      const uploadResult = await UploadLog.deleteMany({});
      uploadLogsDeleted = uploadResult.deletedCount || 0;

      // 2. Delete ALL AI Chat Logs from Atlas
      const chatResult = await ChatLog.deleteMany({});
      aiChatLogsDeleted = chatResult.deletedCount || 0;

      // 3. Clear ALL Activity Logs from Atlas
      const actResult = await ActivityLog.deleteMany({});
      communicationsDeleted += actResult.deletedCount || 0;

      // 4. Clear ALL student notifications / communications from Atlas
      const students = await Student.find({ 'notifications.0': { $exists: true } });
      for (const student of students) {
        if (Array.isArray(student.notifications)) {
          communicationsDeleted += student.notifications.length;
          student.notifications = [];
          student.markModified('notifications');
          await student.save();
        }
      }
    } else {
      // ── Scheduled Maintenance Retention Cutoff Cleanup ──
      // 1. Clean Upload Logs from Atlas
      const uploadCutoff = getCutoffDate(uploadRetention);
      if (uploadCutoff) {
        const result = await UploadLog.deleteMany({ timestamp: { $lt: uploadCutoff } });
        uploadLogsDeleted = result.deletedCount || 0;
      }

      // 2. Clean AI Chat Logs from Atlas
      const chatCutoff = getCutoffDate(chatRetention);
      if (chatCutoff) {
        const result = await ChatLog.deleteMany({ createdAt: { $lt: chatCutoff } });
        aiChatLogsDeleted = result.deletedCount || 0;
      }

      // 3. Clean Platform Activity & Communications from Atlas
      const commCutoff = getCutoffDate(commRetention);
      if (commCutoff) {
        // Clean SuperAdmin ActivityLog entries by global cutoff date
        const actResult = await ActivityLog.deleteMany({
          ownerRole: 'SuperAdmin',
          timestamp: { $lt: commCutoff }
        });
        communicationsDeleted += actResult.deletedCount || 0;
      }

      // Clean Admin ActivityLog entries by each Admin's specific activityRetentionDays
      const Admin = require('../models/Admin');
      const allAdmins = await Admin.find({}, '_id activityRetentionDays').lean();
      for (const adm of allAdmins) {
        const days = adm.activityRetentionDays !== undefined ? adm.activityRetentionDays : 7;
        if (days > 0) {
          const admCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          const admRes = await ActivityLog.deleteMany({
            ownerRole: 'Admin',
            ownerId: adm._id,
            timestamp: { $lt: admCutoff }
          });
          communicationsDeleted += admRes.deletedCount || 0;
        }
      }

      // Clean Student notifications safely
      if (commCutoff) {
        const students = await Student.find({ 'notifications.0': { $exists: true } });
        for (const student of students) {
          if (Array.isArray(student.notifications)) {
            const initialLen = student.notifications.length;
            student.notifications = student.notifications.filter(n => {
              const raw = n.timestamp || n.createdAt;
              if (!raw) return true;
              const nTime = new Date(raw).getTime();
              if (isNaN(nTime)) return true; // Safeguard: KEEP if timestamp string parsing is NaN
              return nTime >= commCutoff.getTime();
            });
            const removed = initialLen - student.notifications.length;
            if (removed > 0) {
              communicationsDeleted += removed;
              student.markModified('notifications');
              await student.save();
            }
          }
        }
      }
    }

    console.log(`[AUTO-DELETE CLEANUP] Atlas Cleaned (${isManualWipe ? 'MANUAL FULL WIPE' : 'RETENTION CUTOFF'}): UploadLogs: ${uploadLogsDeleted}, Communications: ${communicationsDeleted}, AIChatLogs: ${aiChatLogsDeleted}`);

    return {
      success: true,
      uploadLogsDeleted,
      communicationsDeleted,
      aiChatLogsDeleted,
      mode: isManualWipe ? 'full_wipe' : 'retention_cutoff',
      retentionConfig: {
        uploadLogsRetention: uploadRetention,
        communicationsRetention: commRetention,
        aiChatLogsRetention: chatRetention
      },
      timestamp: new Date()
    };
  } catch (err) {
    console.error('[AUTO-DELETE CLEANUP ERROR]', err);
    return {
      success: false,
      error: err.message,
      uploadLogsDeleted: 0,
      communicationsDeleted: 0,
      aiChatLogsDeleted: 0
    };
  }
}

module.exports = {
  getCutoffDate,
  runAutoDeleteCleanup
};
