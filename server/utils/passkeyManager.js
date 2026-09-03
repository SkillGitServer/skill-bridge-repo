const SuperAdminPasskey = require('../models/SuperAdminPasskey');

function generateRandomPasskey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'SUP-KEY-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function escapeRegex(string) {
  return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Get current active passkey or generate one if none exists
async function getOrCreateActivePasskey(createdBy = 'System') {
  let activePasskey = await SuperAdminPasskey.findOne({ isUsed: false }).sort({ createdAt: -1 });

  if (!activePasskey) {
    let newKey = generateRandomPasskey();
    let exists = await SuperAdminPasskey.findOne({ key: newKey });
    while (exists) {
      newKey = generateRandomPasskey();
      exists = await SuperAdminPasskey.findOne({ key: newKey });
    }

    activePasskey = await SuperAdminPasskey.create({
      key: newKey,
      isUsed: false,
      createdBy
    });
  }

  return activePasskey;
}

// Validate passkey and mark it as used by email/name, then generate a new active key
async function validateAndConsumePasskey(providedKey, userEmail, userName = 'Super Admin') {
  const cleanKey = providedKey ? providedKey.trim() : '';
  if (!cleanKey) {
    return { success: false, error: 'System Passkey is required for Super Admin registration.' };
  }

  const envKey = (process.env.SUPER_ADMIN_PASSKEY || process.env.SUPERADMIN_PASSKEY || 'SH-ROOT-2026-SECURE').trim();

  // Case-insensitive query for active DB key
  let dbKeyDoc = await SuperAdminPasskey.findOne({
    key: { $regex: new RegExp('^' + escapeRegex(cleanKey) + '$', 'i') },
    isUsed: false
  });

  if (!dbKeyDoc) {
    // Check fallback env key (case-insensitive)
    if (cleanKey.toUpperCase() === envKey.toUpperCase()) {
      let existingEnvRecord = await SuperAdminPasskey.findOne({
        key: { $regex: new RegExp('^' + escapeRegex(envKey) + '$', 'i') }
      });
      if (existingEnvRecord && existingEnvRecord.isUsed) {
        return { success: false, error: 'This System Passkey has already been used. Please ask an active Super Admin for the latest passkey.' };
      }
      if (existingEnvRecord) {
        existingEnvRecord.isUsed = true;
        existingEnvRecord.usedByEmail = userEmail.toLowerCase();
        existingEnvRecord.usedByName = userName;
        existingEnvRecord.usedAt = new Date();
        await existingEnvRecord.save();
        dbKeyDoc = existingEnvRecord;
      } else {
        dbKeyDoc = await SuperAdminPasskey.create({
          key: envKey,
          isUsed: true,
          usedByEmail: userEmail.toLowerCase(),
          usedByName: userName,
          usedAt: new Date(),
          createdBy: 'System Root'
        });
      }
      await getOrCreateActivePasskey('System Auto-Refresh');
      return { success: true, keyDoc: dbKeyDoc };
    }

    return { success: false, error: 'Invalid or already used System Passkey. Please request the active passkey from an existing Super Admin.' };
  }

  // Mark DB key as used
  dbKeyDoc.isUsed = true;
  dbKeyDoc.usedByEmail = userEmail.toLowerCase();
  dbKeyDoc.usedByName = userName;
  dbKeyDoc.usedAt = new Date();
  await dbKeyDoc.save();

  // Automatically generate a brand new active passkey so the key is never reused!
  await getOrCreateActivePasskey('System Auto-Refresh');

  return { success: true, keyDoc: dbKeyDoc };
}

module.exports = {
  generateRandomPasskey,
  getOrCreateActivePasskey,
  validateAndConsumePasskey
};
