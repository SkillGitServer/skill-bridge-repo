const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const TrialExtension = require('../models/TrialExtension');

// Get trial status for a user by email
router.get('/api/trial/status/:email', async (req, res) => {
  try {
    let student = await Student.findOne({ email: req.params.email });
    
    if (!student) {
      return res.status(401).json({ error: 'User no longer exists. Session invalid.' });
    }

    const Admin = require('../models/Admin');
    let assignedAdmin = null;
    if (student.assignedAdminId) {
      assignedAdmin = await Admin.findById(student.assignedAdminId).select('name email mobile city').lean();
    } else if (student.adminReferralCode) {
      assignedAdmin = await Admin.findOne({ referralCode: student.adminReferralCode }).select('name email mobile city').lean();
    }

    if (student.isTrialActive === false || student.isActive === false || student.status === 'disabled' || student.status === 'deactivated') {
      return res.json({
        isDeactivated: true,
        message: 'Your account has been deactivated by an administrator.',
        assignedAdmin: assignedAdmin ? {
          name: assignedAdmin.name,
          email: assignedAdmin.email,
          mobile: assignedAdmin.mobile || ''
        } : null
      });
    }
    
    // Initialize trial if not present
    if (!student.trialExpiresAt && !student.isUnlocked) {
      student.trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await student.save();
    }
    
    const isExpired = Boolean(student.isUnlocked && student.accessExpiresAt && new Date(student.accessExpiresAt) < new Date());
    const daysRemaining = (student.isUnlocked && student.accessExpiresAt)
      ? Math.ceil((new Date(student.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      isDeactivated: false,
      trialExpiresAt: student.trialExpiresAt,
      isUnlocked: student.isUnlocked,
      accessExpiresAt: student.accessExpiresAt,
      allocatedDurationMonths: student.allocatedDurationMonths || 6,
      isExpired,
      daysRemaining,
      assignedUnlockFee: student.assignedUnlockFee || null,
      assignedAdmin: assignedAdmin ? {
        name: assignedAdmin.name,
        email: assignedAdmin.email,
        mobile: assignedAdmin.mobile || ''
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a trial extension request
router.post('/api/trial/extension', async (req, res) => {
  try {
    const { email, name, reason } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required for extension request.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let studentName = name;
    
    // Look up actual student name from DB if name is generic or missing
    if (!studentName || studentName === 'Student') {
      const student = await Student.findOne({
        email: { $regex: new RegExp('^' + normalizedEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
      });
      if (student && student.name) {
        studentName = student.name;
      }
    }

    const extension = new TrialExtension({
      studentEmail: normalizedEmail,
      studentName: studentName || 'Student',
      reason
    });
    await extension.save();
    res.status(201).json({ message: 'Extension requested successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all pending extensions
router.get('/api/trial/extensions', async (req, res) => {
  try {
    const extensions = await TrialExtension.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    const emails = extensions.map(e => e.studentEmail.toLowerCase().trim());
    const students = await Student.find({
      email: { $in: emails }
    }).populate('assignedAdminId').lean();

    const formatted = extensions.map(e => {
      const student = students.find(s => s.email.toLowerCase().trim() === e.studentEmail.toLowerCase().trim());
      return {
        ...e,
        studentName: student ? student.name : (e.studentName && e.studentName !== 'Student' ? e.studentName : 'Student'),
        studentId: student ? student._id : null,
        mobile: student ? (student.mobile || '') : '',
        linkedAdmin: student ? (student.assignedAdminId ? student.assignedAdminId.name : 'Unassigned') : 'Unassigned',
        status: student ? (student.isUnlocked ? 'Upgraded' : 'Pending Upgrade') : 'Pending Upgrade'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grant extension
router.post('/api/trial/extension/:id/grant', async (req, res) => {
  try {
    const extension = await TrialExtension.findById(req.params.id);
    if (!extension) return res.status(404).json({ message: 'Request not found' });
    
    extension.status = 'granted';
    await extension.save();
    
    const student = await Student.findOne({ email: extension.studentEmail });
    if (student) {
      if (!student.trialExpiresAt || student.trialExpiresAt < new Date()) {
        student.trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else {
        student.trialExpiresAt = new Date(student.trialExpiresAt.getTime() + 24 * 60 * 60 * 1000);
      }
      await student.save();
    }
    
    res.json({ message: 'Granted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deny extension
router.post('/api/trial/extension/:id/deny', async (req, res) => {
  try {
    const extension = await TrialExtension.findByIdAndUpdate(req.params.id, { status: 'denied' });
    if (!extension) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Denied successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
