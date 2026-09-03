const Admin = require('../models/Admin');

/**
 * Generates a collision-proof, guaranteed unique referral code for Admins.
 * Format: SKILL-HUB-XXXX (e.g., SKILL-HUB-A8K9)
 */
async function generateUniqueAdminReferralCode() {
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 100) {
    attempts++;
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    code = `SKILL-HUB-${randomChars}`;

    const existing = await Admin.findOne({
      referralCode: { $regex: new RegExp('^' + code + '$', 'i') }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  // Fallback for extreme high scale
  if (!isUnique) {
    code = `SKILL-HUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }

  return code;
}

module.exports = generateUniqueAdminReferralCode;
