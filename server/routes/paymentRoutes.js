const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Payment = require('../models/Payment');
const SystemConfig = require('../models/SystemConfig');
const upload = require('../config/cloudinary');
const { createOrder, verifyPayment, createRenewalOrder, verifyRenewal } = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// POST /api/payment/create-order — Create Razorpay order
// Note: Auth is optional — we use email from body + validate student & referral code server-side.
// Crypto signature on /verify endpoint is the real security layer.
router.post('/api/payment/create-order', createOrder);

// POST /api/payment/verify — Verify Razorpay HMAC-SHA256 signature & unlock student profile
router.post('/api/payment/verify', verifyPayment);

// Express Renewal Endpoints (Streamlined checkout for existing candidates)
router.post('/api/payment/create-renewal-order', verifyToken, requireRole('student'), createRenewalOrder);
router.post('/api/payment/verify-renewal', verifyToken, requireRole('student'), verifyRenewal);

// Helper to get or create SystemConfig
async function getOrCreateSystemConfig() {
  let config = await SystemConfig.findOne();
  if (!config) {
    config = new SystemConfig();
    await config.save();
  }
  return config;
}

// Process unlock payment / profile unlock
router.post('/api/payment/unlock', upload.fields([{ name: 'docGrade10' }, { name: 'docGrade12' }, { name: 'docGraduation' }, { name: 'docResume' }]), async (req, res) => {
  try {
    const { email, amount, referralCode } = req.body;
    
    // 1. Optional admin referral code
    const Admin = require('../models/Admin');
    let admin = null;
    if (referralCode && referralCode.trim()) {
      const cleanRef = referralCode.trim();
      admin = await Admin.findOne({
        referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
      });
    }

    // 2. Validate & find student account
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Student email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({
      email: { $regex: new RegExp('^' + normalizedEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    // 3. Update student status & link with mentor if provided
    student.isUnlocked = true;
    student.isTrialActive = true;
    if (admin) {
      student.adminReferralCode = admin.referralCode; // Canonical referral code
      student.assignedAdminId = admin._id;
    }

    if (req.files && req.files['docGrade10']) student.docGrade10 = req.files['docGrade10'][0].path;
    if (req.files && req.files['docGrade12']) student.docGrade12 = req.files['docGrade12'][0].path;
    if (req.files && req.files['docGraduation']) student.docGraduation = req.files['docGraduation'][0].path;
    if (req.files && req.files['docResume']) student.docResume = req.files['docResume'][0].path;

    if (req.body.mobile && req.body.mobile.trim() && req.body.mobile.trim() !== student.mobile) {
      const cleanMob = req.body.mobile.trim().replace(/\D/g, '');
      const { isMobileAlreadyInUse } = require('../utils/mobileValidator');
      const inUse = await isMobileAlreadyInUse(cleanMob, { userId: student._id, model: 'Student' });
      if (inUse) {
        return res.status(409).json({ error: 'This mobile number is already registered on Skill Bridge by another account. Please enter a different mobile number.' });
      }
      student.mobile = cleanMob;
    }
    if (req.body.percentage10th && req.body.percentage10th.trim()) {
      student.percentage10th = req.body.percentage10th.trim();
      const p10 = parseFloat(req.body.percentage10th);
      if (!isNaN(p10)) student.grade10Percentage = p10;
    }
    if (req.body.percentage12th && req.body.percentage12th.trim()) {
      student.percentage12th = req.body.percentage12th.trim();
      const p12 = parseFloat(req.body.percentage12th);
      if (!isNaN(p12)) student.grade12Percentage = p12;
    }
    if (req.body.percentageGraduation && req.body.percentageGraduation.trim()) {
      student.percentageGraduation = req.body.percentageGraduation.trim();
      const pGrad = parseFloat(req.body.percentageGraduation);
      if (!isNaN(pGrad)) student.graduationPercentage = pGrad;
    }

    await student.save();

    if (admin) {
      if (!admin.assignedStudents) {
        admin.assignedStudents = [];
      }
      if (!admin.assignedStudents.some(id => id.toString() === student._id.toString())) {
        admin.assignedStudents.push(student._id);
        await admin.save();
      }
    }
    
    res.json({ message: 'Profile updated and dashboard unlocked successfully', mentorName: admin ? admin.name : null });
  } catch (err) {
    console.error('Unlock payment error:', err);
    res.status(500).json({ error: err.message || 'Payment processing failed.' });
  }
});


// Get total revenue
router.get('/api/payment/revenue', async (req, res) => {
  try {
    const payments = await Payment.find();
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({ totalRevenue: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/history — lists all payment transactions with student details
router.get('/api/payment/history', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    const students = await Student.find({ email: { $in: payments.map(p => p.studentEmail) } });
    const formatted = payments.map(p => {
      const student = students.find(s => s.email === p.studentEmail);
      return {
        _id: p._id,
        studentEmail: p.studentEmail,
        studentName: student ? student.name : 'Unknown Student',
        amount: p.amount,
        createdAt: p.createdAt
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/test-credentials — Debug route: verifies Razorpay keys work
router.get('/api/payment/test-credentials', async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Razorpay env vars not set',
        keyIdPresent: !!keyId,
        keySecretPresent: !!keySecret
      });
    }

    // Try creating a minimal test order to validate credentials
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    
    // Just fetch orders list (lightweight auth check)
    await razorpay.orders.all({ count: 1 });

    res.json({ 
      ok: true, 
      message: 'Razorpay credentials are valid ✅',
      keyId: keyId.substring(0, 12) + '...'
    });
  } catch (err) {
    const razorpayDesc = err?.error?.description || err?.error?.reason || '';
    const errMsg = razorpayDesc || err?.message || 'Unknown error';
    res.status(500).json({ 
      ok: false, 
      error: errMsg,
      code: err?.error?.code || err?.statusCode,
      full: JSON.stringify(err)
    });
  }
});
router.get('/api/payment/config', async (req, res) => {
  try {
    const config = await getOrCreateSystemConfig();
    const Admin = require('../models/Admin');
    const adminFees = await Admin.find(
      { status: 'active' },
      '_id name city state referralCode customUnlockFee customStudentDurationMonths'
    ).sort({ city: 1, name: 1 }).lean();

    res.json({
      unlockFee: config.unlockFee,
      defaultStudentDurationMonths: config.defaultStudentDurationMonths || 6,
      adminFees: adminFees || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/fee-by-code/:code — lookup specific fee by referral code
router.get('/api/payment/fee-by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const config = await getOrCreateSystemConfig();
    const globalFee = config.unlockFee || 99;

    if (!code || !code.trim()) {
      return res.json({ fee: globalFee, city: null, mentorName: null });
    }

    const Admin = require('../models/Admin');
    const cleanRef = code.trim();
    const admin = await Admin.findOne({
      referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') },
      status: 'active'
    });

    if (!admin) {
      return res.json({ fee: globalFee, city: null, mentorName: null, valid: false, message: 'Referral code not found or inactive.' });
    }

    const studentEmail = req.query.email;
    let lockedStudentFee = null;
    if (studentEmail && studentEmail.trim()) {
      const Student = require('../models/Student');
      const student = await Student.findOne({ email: studentEmail.toLowerCase().trim() }).catch(() => null);
      if (student && student.isUnlocked && student.assignedUnlockFee && Number(student.assignedUnlockFee) > 0) {
        lockedStudentFee = Number(student.assignedUnlockFee);
      }
    }

    const resolvedFee = lockedStudentFee !== null 
      ? lockedStudentFee 
      : ((admin && admin.customUnlockFee && Number(admin.customUnlockFee) > 0) ? Number(admin.customUnlockFee) : globalFee);

    res.json({
      fee: resolvedFee,
      city: admin.city,
      state: admin.state,
      mentorName: admin.name,
      referralCode: admin.referralCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/config — updates global unlock fee and city/admin custom fees
router.post('/api/payment/config', async (req, res) => {
  try {
    const config = await getOrCreateSystemConfig();
    if (req.body.unlockFee !== undefined) {
      config.unlockFee = Number(req.body.unlockFee);
    }
    if (req.body.defaultStudentDurationMonths !== undefined) {
      config.defaultStudentDurationMonths = Number(req.body.defaultStudentDurationMonths) || 6;
    }
    await config.save();

    // Process custom unlock fees & duration overrides per admin
    let adminFeesMap = req.body.adminFees;
    let adminDurationsMap = req.body.adminDurations;
    if (typeof adminFeesMap === 'string') {
      try { adminFeesMap = JSON.parse(adminFeesMap); } catch (e) {}
    }
    if (typeof adminDurationsMap === 'string') {
      try { adminDurationsMap = JSON.parse(adminDurationsMap); } catch (e) {}
    }

    const Admin = require('../models/Admin');
    const allAdminIds = new Set([
      ...Object.keys(adminFeesMap || {}),
      ...Object.keys(adminDurationsMap || {})
    ]);

    if (allAdminIds.size > 0) {
      const updates = Array.from(allAdminIds).map(adminId => {
        const updateData = {};
        if (adminFeesMap && adminFeesMap[adminId] !== undefined) {
          const customFee = adminFeesMap[adminId];
          updateData.customUnlockFee = (customFee !== null && customFee !== '' && !isNaN(customFee) && Number(customFee) > 0)
            ? Number(customFee)
            : null;
        }
        if (adminDurationsMap && adminDurationsMap[adminId] !== undefined) {
          const customDur = adminDurationsMap[adminId];
          updateData.customStudentDurationMonths = (customDur !== null && customDur !== '' && !isNaN(customDur) && Number(customDur) > 0)
            ? Number(customDur)
            : null;
        }
        return Admin.findByIdAndUpdate(adminId, updateData);
      });
      await Promise.all(updates);
    }

    const updatedAdminFees = await Admin.find(
      { status: 'active' },
      '_id name city state referralCode customUnlockFee customStudentDurationMonths'
    ).sort({ city: 1, name: 1 }).lean();

    res.json({
      message: 'Payment configuration, duration allocations, and city unlock fees updated successfully!',
      config: {
        unlockFee: config.unlockFee,
        defaultStudentDurationMonths: config.defaultStudentDurationMonths || 6,
        adminFees: updatedAdminFees
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
