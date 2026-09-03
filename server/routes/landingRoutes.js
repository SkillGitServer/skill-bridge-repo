const express = require('express');
const router = express.Router();
const LandingContent = require('../models/LandingContent');

function replaceCareerBridgeInObject(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object' && typeof obj !== 'string') {
    return obj;
  }
  if (typeof obj === 'string') {
    return obj
      .replace(/CAREER BRIDGE INDIA/gi, 'SKILL BRIDGE INDIA')
      .replace(/CAREER BRIDGE/gi, 'SKILL BRIDGE')
      .replace(/Career Bridge India/gi, 'Skill Bridge India')
      .replace(/Career Bridge/gi, 'Skill Bridge')
      .replace(/CareerBridge/gi, 'SkillBridge');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replaceCareerBridgeInObject(item));
  }
  // If it's a Buffer, Date, or ObjectId, return as-is
  if (obj._bsontype || obj.constructor?.name === 'ObjectId' || obj instanceof Date) {
    return obj;
  }
  const newObj = {};
  for (const key of Object.keys(obj)) {
    if (key === '_id' || key === '__v') {
      newObj[key] = obj[key];
    } else {
      newObj[key] = replaceCareerBridgeInObject(obj[key]);
    }
  }
  return newObj;
}

// Shared handler to fetch landing page content
const getLandingContent = async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  try {
    let content = await LandingContent.findOne().lean();
    const DEFAULT_INSTA = "https://www.instagram.com/skill_bridge.2026?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";
    const DEFAULT_WA = "https://api.whatsapp.com/message/347Q34LPY7JBP1?autoload=1&app_absent=0&utm_source=ig";

    if (!content) {
      content = await LandingContent.create({
        heroBadge: "Skill Bridge India",
        heroDeviceBrand: "SKILL BRIDGE INDIA",
        footerBrand: "Skill Bridge India",
        footerText: "© 2026 Skill Bridge India. All rights reserved.",
        instagramUrl: DEFAULT_INSTA,
        whatsAppUrl: DEFAULT_WA
      });
      content = content.toObject ? content.toObject() : content;
    } else {
      const sanitized = replaceCareerBridgeInObject(content);
      if (!sanitized.instagramUrl || sanitized.instagramUrl.includes('careerbridgeindia')) {
        sanitized.instagramUrl = DEFAULT_INSTA;
      }
      if (!sanitized.whatsAppUrl || sanitized.whatsAppUrl.includes('919876543210')) {
        sanitized.whatsAppUrl = DEFAULT_WA;
      }

      // Check if DB needs updating due to old legacy strings
      const contentStr = JSON.stringify(content);
      const sanitizedStr = JSON.stringify(sanitized);
      if (contentStr !== sanitizedStr) {
        const { _id, __v, ...updatePayload } = sanitized;
        content = await LandingContent.findOneAndUpdate({}, { $set: updatePayload }, { returnDocument: 'after', lean: true });
      } else {
        content = sanitized;
      }
    }
    return res.json(content);
  } catch (err) {
    console.error('Fetch landing content error:', err);
    return res.status(500).json({ error: 'Failed to fetch landing content' });
  }
};

// Shared handler to update landing page content
const updateLandingContent = async (req, res) => {
  try {
    const $set = { ...req.body };
    delete $set._id;
    delete $set.__v;

    if (req.body.showInstagram !== undefined) {
      $set.showInstagram = req.body.showInstagram === true || req.body.showInstagram === 'true';
    }
    if (req.body.showWhatsApp !== undefined) {
      $set.showWhatsApp = req.body.showWhatsApp === true || req.body.showWhatsApp === 'true';
    }
    if (req.body.showEmail !== undefined) {
      $set.showEmail = req.body.showEmail === true || req.body.showEmail === 'true';
    }
    if (req.body.showPhone !== undefined) {
      $set.showPhone = req.body.showPhone === true || req.body.showPhone === 'true';
    }

    $set.updatedAt = new Date();

    console.log('[LandingContent] Updating document with keys:', Object.keys($set));

    const content = await LandingContent.findOneAndUpdate(
      {},
      { $set },
      { returnDocument: 'after', upsert: true, strict: false }
    );

    return res.json({ message: 'Landing page content updated successfully!', content });
  } catch (err) {
    console.error('Update landing content error:', err);
    return res.status(500).json({ error: 'Failed to update landing page content.' });
  }
};

// Public GET endpoints
router.get('/api/landing-content', getLandingContent);
router.get('/api/landing-page', getLandingContent);

// Update endpoints (POST / PUT / Admin routes)
router.post('/api/landing-content', updateLandingContent);
router.post('/api/landing-page', updateLandingContent);
router.put('/api/landing-page', updateLandingContent);
router.put('/api/admin/landing-page', updateLandingContent);
router.post('/api/admin/landing-page', updateLandingContent);

module.exports = router;
