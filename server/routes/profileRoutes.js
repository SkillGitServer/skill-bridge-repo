const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const cloudinary = require('cloudinary').v2;
const upload = require('../config/cloudinary');

const { verifyToken } = require('../middleware/authMiddleware');

// Get Student Profile
router.get('/api/student/profile', verifyToken, async (req, res) => {
  try {
    let student = await Student.findById(req.user.id).populate('assignedAdminId');
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const Admin = require('../models/Admin');
    let mentor = null;

    if (student.assignedAdminId) {
      mentor = {
        name: student.assignedAdminId.name,
        email: student.assignedAdminId.email,
        mobile: student.assignedAdminId.mobile || '',
        profilePhoto: student.assignedAdminId.profilePhoto || ''
      };
      if (!student.adminReferralCode && student.assignedAdminId.referralCode) {
        student.adminReferralCode = student.assignedAdminId.referralCode;
        await student.save();
      }
    } else if (student.adminReferralCode) {
      const cleanRef = student.adminReferralCode.trim();
      const admin = await Admin.findOne({
        referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
      });
      if (admin) {
        student.assignedAdminId = admin._id;
        student.adminReferralCode = admin.referralCode;
        await student.save();

        if (!admin.assignedStudents) {
          admin.assignedStudents = [];
        }
        if (!admin.assignedStudents.some(id => id.toString() === student._id.toString())) {
          admin.assignedStudents.push(student._id);
          await admin.save();
        }

        mentor = {
          name: admin.name,
          email: admin.email,
          mobile: admin.mobile || '',
          profilePhoto: admin.profilePhoto || ''
        };
      }
    }

    // Filter out internal system audit events (like Account Activated/Deactivated) from student notifications
    const studentNotifications = (student.notifications || []).filter(
      n => n.type !== 'Account Activated' && n.type !== 'Account Deactivated' &&
           n.subject !== 'Account Activated' && n.subject !== 'Account Deactivated'
    );

    res.json({
      name: student.name,
      email: student.email,
      mobile: student.mobile || '',
      profilePhoto: student.profilePhoto || '',
      docResume: student.docResume || '',
      isUnlocked: student.isUnlocked || false,
      percentage10th: student.percentage10th || '',
      percentage12th: student.percentage12th || '',
      percentageGraduation: student.percentageGraduation || '',
      docGrade10: student.docGrade10 || '',
      docGrade12: student.docGrade12 || '',
      docGraduation: student.docGraduation || '',
      adminReferralCode: student.adminReferralCode || '',
      mentor,
      resumeReview: student.resumeReview || null,
      notifications: studentNotifications
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Update Student Profile Details
router.put('/api/student/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (email && email.toLowerCase().trim() !== student.email.toLowerCase().trim()) {
      const { isEmailAlreadyInUse } = require('../utils/emailValidator');
      const inUse = await isEmailAlreadyInUse(email.toLowerCase().trim(), { userId: student._id, model: 'Student' });
      if (inUse) {
        return res.status(409).json({ error: 'This email address is already in use by another account. Please use a different email address.' });
      }
      student.email = email.toLowerCase().trim();
    }

    if (name) student.name = name.trim();
    
    if (mobile && mobile.trim() && mobile.trim() !== student.mobile) {
      const { isMobileAlreadyInUse } = require('../utils/mobileValidator');
      const inUse = await isMobileAlreadyInUse(mobile.trim(), { userId: student._id, model: 'Student' });
      if (inUse) {
        return res.status(409).json({
          error: 'This mobile number is already registered on Skill Bridge by another account. Please use a different mobile number.'
        });
      }
      student.mobile = mobile.trim();
    } else if (!mobile) {
      student.mobile = '';
    }

    await student.save();

    res.json({
      message: 'Profile updated successfully.',
      user: {
        name: student.name,
        email: student.email,
        mobile: student.mobile || ''
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/student/complete-profile — Free access profile completion with mandatory mobile & documents
router.post('/api/student/complete-profile', upload.fields([
  { name: 'docGrade10', maxCount: 1 },
  { name: 'docGrade12', maxCount: 1 },
  { name: 'docGraduation', maxCount: 1 },
  { name: 'docResume', maxCount: 1 }
]), async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    let student = null;

    // Resolve student from Auth header or email
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          student = await Student.findById(decoded.id);
        }
      } catch (tokenErr) {
        // Token verification failed, fallback to email if present
      }
    }

    if (!student && req.body.email && req.body.email.trim()) {
      const normalizedEmail = req.body.email.toLowerCase().trim();
      student = await Student.findOne({
        email: { $regex: new RegExp('^' + normalizedEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
      });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student account not found. Please log in again.' });
    }

    // Mandatory mobile validation
    const rawMobile = req.body.mobile ? String(req.body.mobile).trim() : '';
    const cleanMobile = rawMobile.replace(/\D/g, '');

    if (!cleanMobile) {
      return res.status(400).json({ error: 'Mobile number is required to complete your student profile.' });
    }

    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).' });
    }

    // Check duplicate mobile across other accounts
    if (cleanMobile !== student.mobile) {
      const { isMobileAlreadyInUse } = require('../utils/mobileValidator');
      const inUse = await isMobileAlreadyInUse(cleanMobile, { userId: student._id, model: 'Student' });
      if (inUse) {
        return res.status(409).json({ error: 'This mobile number is already registered on Skill Bridge by another account. Please use a different mobile number.' });
      }
      student.mobile = cleanMobile;
    }

    // Process Academic Qualifications
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

    // Process Document Uploads
    if (req.files) {
      if (req.files['docGrade10'] && req.files['docGrade10'][0]) {
        student.docGrade10 = req.files['docGrade10'][0].path;
      }
      if (req.files['docGrade12'] && req.files['docGrade12'][0]) {
        student.docGrade12 = req.files['docGrade12'][0].path;
      }
      if (req.files['docGraduation'] && req.files['docGraduation'][0]) {
        student.docGraduation = req.files['docGraduation'][0].path;
      }
      if (req.files['docResume'] && req.files['docResume'][0]) {
        student.docResume = req.files['docResume'][0].path;
      }
    }

    // Grant permanent free access
    student.isUnlocked = true;
    student.isTrialActive = true;

    await student.save();

    res.json({
      success: true,
      message: 'Student profile credentials saved successfully! Full access granted.',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        mobile: student.mobile,
        isUnlocked: true,
        percentage10th: student.percentage10th || '',
        percentage12th: student.percentage12th || '',
        percentageGraduation: student.percentageGraduation || '',
        docGrade10: student.docGrade10 || '',
        docGrade12: student.docGrade12 || '',
        docGraduation: student.docGraduation || '',
        docResume: student.docResume || ''
      }
    });
  } catch (err) {
    console.error('Complete student profile error:', err);
    res.status(500).json({ error: err.message || 'Failed to save student profile credentials.' });
  }
});

// Upload or Update Profile Photo
router.post('/api/student/profile-photo', async (req, res) => {
  try {
    const { email, photoBase64 } = req.body;
    
    if (!photoBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Upload base64 image to cloudinary
    const result = await cloudinary.uploader.upload(photoBase64, {
      folder: 'career_bridge_profiles',
      resource_type: 'image'
    });
    
    // Update the student record if email is provided
    let student = null;
    if (email) {
      student = await Student.findOne({ email });
      if (student) {
        student.profilePhoto = result.secure_url;
        await student.save();
      }
    }
    
    res.json({ url: result.secure_url, message: 'Profile photo uploaded successfully' });
  } catch (err) {
    console.error('Profile photo upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const UploadLog = require('../models/UploadLog');
const Admin = require('../models/Admin');

// Log upload attempt (for Students & Admins/Mentors)
router.post('/api/student/log-upload', verifyToken, async (req, res) => {
  try {
    const { filename, fileType, status, message } = req.body;
    
    if (!filename || !fileType || !status) {
      return res.status(400).json({ error: 'Missing required upload log fields.' });
    }
    
    let uploaderEmail = '';
    let uploaderName = '';
    let uploaderRole = 'student';
    let assignedAdminId = null;
    let studentRefCode = null;

    // Check if uploader is a Student or Admin
    const student = await Student.findById(req.user.id);
    if (student) {
      uploaderEmail = student.email;
      uploaderName = student.name || 'Anonymous Student';
      assignedAdminId = student.assignedAdminId || null;
      studentRefCode = student.adminReferralCode || null;
    } else {
      const admin = await Admin.findById(req.user.id);
      if (admin) {
        uploaderEmail = admin.email;
        uploaderName = admin.name || 'Mentor Admin';
        uploaderRole = 'admin';
      } else {
        uploaderEmail = req.user.email || 'user@skillbridge.in';
        uploaderName = req.user.name || 'Platform User';
        uploaderRole = req.user.role || 'admin';
      }
    }
    
    const newLog = new UploadLog({
      studentEmail: uploaderEmail,
      studentName: uploaderName,
      filename,
      fileType,
      status,
      message: message || ''
    });
    
    await newLog.save();

    // Register ActivityLog for SuperAdmin (SUPSS Recent Platform Activity feed)
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      ownerId: null,
      ownerRole: 'SuperAdmin',
      sender: {
        name: uploaderName,
        email: uploaderEmail
      },
      recipient: {
        name: uploaderRole === 'admin' ? 'Mentor Account' : 'Platform Audit',
        email: fileType || 'Upload'
      },
      type: `${fileType || 'File'} Uploaded`,
      message: `${uploaderRole === 'admin' ? 'Admin' : 'Student'} ${uploaderName} (${uploaderEmail}) uploaded ${filename} (${fileType}).`,
      timestamp: new Date()
    }).catch(err => console.error('Failed to create SuperAdmin ActivityLog:', err));

    // Register ActivityLog owned by student's assigned Admin if uploader is a student
    if (uploaderRole === 'student') {
      if (!assignedAdminId && studentRefCode) {
        const matchedAdmin = await Admin.findOne({ referralCode: studentRefCode });
        if (matchedAdmin) assignedAdminId = matchedAdmin._id;
      }

      if (assignedAdminId) {
        await ActivityLog.create({
          ownerId: assignedAdminId,
          ownerRole: 'Admin',
          sender: {
            name: uploaderName,
            email: uploaderEmail
          },
          recipient: {
            name: 'Admin',
            email: ''
          },
          type: `Uploaded ${fileType || 'Document'}`,
          message: `Student ${uploaderName} (${uploaderEmail}) uploaded ${filename}.`,
          timestamp: new Date()
        }).catch(err => console.error('Failed to create student ActivityLog:', err));
      }
    }

    res.status(201).json({ message: 'Upload log registered successfully' });
  } catch (err) {
    console.error('Failed to register upload log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch upload logs with role-based filtering
router.get('/api/upload-logs', verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    
    if (role === 'admin') {
      const admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found.' });
      }
      
      const students = await Student.find({
        $or: [
          { assignedAdminId: admin._id },
          { adminReferralCode: admin.referralCode }
        ]
      }, 'email');
      
      const studentEmails = students.map(s => s.email.toLowerCase().trim());
      
      const logs = await UploadLog.find({
        studentEmail: { $in: studentEmails }
      }).sort({ timestamp: -1 }).limit(30);
      
      return res.json({ logs });
      
    } else if (role === 'superadmin') {
      const logs = await UploadLog.find().sort({ timestamp: -1 }).limit(50).lean();
      
      const enrichedLogs = await Promise.all(logs.map(async (log) => {
        let mentorName = 'Unassigned';
        const student = await Student.findOne({ email: log.studentEmail });
        if (student) {
          const mentor = await Admin.findOne({
            $or: [
              { _id: student.assignedAdminId },
              { referralCode: student.adminReferralCode }
            ]
          });
          if (mentor) mentorName = mentor.name;
        } else {
          const admin = await Admin.findOne({ email: log.studentEmail });
          if (admin) {
            mentorName = `${admin.name} (Admin)`;
          }
        }
        return {
          ...log,
          mentorName
        };
      }));
      
      return res.json({ logs: enrichedLogs });
    } else {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }
  } catch (err) {
    console.error('Failed to retrieve upload logs:', err);
    res.status(500).json({ error: 'Failed to retrieve upload logs.' });
  }
});

// Dedicated SUPSS Upload Logs view endpoint — fetches strictly from uploadlogs collection
router.get('/api/super-admin/upload-logs', verifyToken, async (req, res) => {
  try {
    const logs = await UploadLog.find().sort({ timestamp: -1 }).lean();
    
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let mentorName = 'Unassigned';
      const student = await Student.findOne({ email: log.studentEmail });
      if (student) {
        const mentor = await Admin.findOne({
          $or: [
            { _id: student.assignedAdminId },
            { referralCode: student.adminReferralCode }
          ]
        });
        if (mentor) mentorName = mentor.name;
      } else {
        const admin = await Admin.findOne({ email: log.studentEmail });
        if (admin) {
          mentorName = `${admin.name} (Admin)`;
        }
      }
      return {
        ...log,
        mentorName
      };
    }));
    
    return res.json({ logs: enrichedLogs });
  } catch (err) {
    console.error('Failed to retrieve super-admin upload logs:', err);
    res.status(500).json({ error: 'Failed to retrieve upload logs.' });
  }
});

// GET /api/super-admin/communications — Fetch system-level activity logs for SUPSS
router.get('/api/super-admin/communications', verifyToken, async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const activityLogs = await ActivityLog.find({ ownerRole: 'SuperAdmin' }).sort({ timestamp: -1 }).lean();

    const students = await Student.find({}, 'name email notifications assignedAdminId adminReferralCode').lean();
    const Admin = require('../models/Admin');
    const allAdmins = await Admin.find({}, 'name email referralCode').lean();

    const adminMap = new Map();
    allAdmins.forEach(a => {
      adminMap.set(a._id.toString(), a);
      if (a.referralCode) adminMap.set(a.referralCode, a);
    });

    const communicationsList = [];
    const seenNotifIds = new Set();

    // 1. Add System-level ActivityLog entries
    activityLogs.forEach(l => {
      seenNotifIds.add(l._id.toString());
      communicationsList.push({
        id: l._id.toString(),
        sender: l.sender || { name: 'Admin / System', email: 'system@skillbridge.in' },
        recipient: l.recipient || { name: 'Candidate', email: '' },
        message: l.message,
        type: l.type,
        rawTimestamp: l.timestamp ? new Date(l.timestamp).getTime() : Date.now(),
        timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', hour12: true, timeZone: 'Asia/Kolkata'
        }) : 'Recently'
      });
    });

    // 2. Scan Student Notifications sent by Admins/Mentors
    students.forEach(s => {
      if (Array.isArray(s.notifications)) {
        s.notifications.forEach(n => {
          let mentorName = n.senderName || 'Admin';
          let mentorEmail = n.senderEmail || '';

          if (!mentorEmail && s.assignedAdminId) {
            const m = adminMap.get(s.assignedAdminId.toString());
            if (m) {
              mentorName = `${m.name} (Admin)`;
              mentorEmail = m.email;
            }
          }

          const notifId = n.id || ('notif_' + (n.timestamp ? new Date(n.timestamp).getTime() : Math.random()));
          if (!seenNotifIds.has(notifId)) {
            seenNotifIds.add(notifId);
            communicationsList.push({
              id: notifId,
              sender: {
                name: mentorName,
                email: mentorEmail || 'admin@skillbridge.in'
              },
              recipient: {
                name: s.name || 'Student',
                email: s.email
              },
              message: `[${n.type || n.subject || 'Notification'}] ${n.message}`,
              type: 'ADMIN_NOTIFICATION',
              rawTimestamp: n.timestamp ? new Date(n.timestamp).getTime() : Date.now(),
              timestamp: n.timestamp ? new Date(n.timestamp).toLocaleString('en-IN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', hour12: true, timeZone: 'Asia/Kolkata'
              }) : 'Recently'
            });
          }
        });
      }
    });

    // Sort by newest first
    communicationsList.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

    res.json({ communications: communicationsList });
  } catch (err) {
    console.error('Failed to fetch communications:', err);
    res.status(500).json({ error: 'Failed to fetch platform communications.' });
  }
});

// GET /api/admin/communications — Fetch activity logs strictly for assigned Students of this Admin
router.get('/api/admin/communications', verifyToken, async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const Admin = require('../models/Admin');
    const Student = require('../models/Student');

    const admin = await Admin.findById(req.user.id).lean();
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    // 1. Fetch all students assigned or linked to this specific Admin
    const assignedStudents = await Student.find({
      $or: [
        { assignedAdminId: admin._id },
        { adminReferralCode: admin.referralCode }
      ]
    }).select('_id email name').lean();

    const studentEmails = assignedStudents.map(s => (s.email || '').toLowerCase().trim()).filter(Boolean);

    // 2. Fetch ActivityLogs pertaining strictly to this Admin's assigned students (excluding Admin self-actions)
    const logs = await ActivityLog.find({
      $and: [
        {
          $or: [
            { ownerId: admin._id },
            { 'sender.email': { $in: studentEmails } },
            { 'recipient.email': { $in: studentEmails } }
          ]
        },
        {
          type: {
            $nin: [
              'NEW_EXAM_PUBLISHED',
              'ADMIN_NOTIFICATION',
              'ADMIN_APPROVED',
              'NEW_ADMIN_REGISTERED',
              'MENTOR_ASSIGNED'
            ]
          }
        },
        {
          'sender.email': { $ne: (admin.email || '').toLowerCase().trim() }
        }
      ]
    }).sort({ timestamp: -1 }).limit(100).lean();

    const formattedList = logs.map(l => ({
      id: l._id.toString(),
      sender: l.sender || { name: 'Student', email: '' },
      recipient: l.recipient || { name: 'Admin', email: '' },
      message: l.message,
      type: l.type,
      rawTimestamp: l.timestamp ? new Date(l.timestamp).getTime() : Date.now(),
      timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', hour12: true, timeZone: 'Asia/Kolkata'
      }) : 'Recently'
    }));

    res.json({ communications: formattedList });
  } catch (err) {
    console.error('Failed to fetch admin communications:', err);
    res.status(500).json({ error: 'Failed to fetch admin communications.' });
  }
});

// DELETE /api/super-admin/communications — Clear all student notification messages from MongoDB Atlas
router.delete('/api/super-admin/communications', verifyToken, async (req, res) => {
  try {
    const Student = require('../models/Student');
    await Student.updateMany({}, { $set: { notifications: [] } });
    res.json({ message: 'All communications and notification messages cleared from MongoDB Atlas database successfully.' });
  } catch (err) {
    console.error('Failed to clear communications:', err);
    res.status(500).json({ error: 'Failed to clear communications from database.' });
  }
});

// DELETE /api/admin/communications — Clear all student notification messages from MongoDB Atlas
router.delete('/api/admin/communications', verifyToken, async (req, res) => {
  try {
    const Student = require('../models/Student');
    await Student.updateMany({}, { $set: { notifications: [] } });
    res.json({ message: 'All communications cleared from MongoDB Atlas database successfully.' });
  } catch (err) {
    console.error('Failed to clear admin communications:', err);
    res.status(500).json({ error: 'Failed to clear communications from database.' });
  }
});

// POST /api/admin/send-notification — send notification / message to registered students in MongoDB Atlas
router.post('/api/admin/send-notification', verifyToken, async (req, res) => {
  try {
    const { recipient, type, message, examResultId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    if (examResultId) {
      const ExamResult = require('../models/ExamResult');
      await ExamResult.findByIdAndUpdate(examResultId, { isResponded: true, respondedAt: new Date() }).catch(() => null);
    }

    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.user.id).lean();

    const notificationItem = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      subject: type || 'Notification',
      type: type || 'General Info',
      message: message.trim(),
      senderName: admin ? admin.name : (req.user.name || 'Mentor'),
      senderEmail: admin ? admin.email : req.user.email,
      senderPhoto: admin ? (admin.profilePhoto || '') : '',
      timestamp: new Date(),
      unread: true
    };

    let targetStudents = [];

    if (recipient === 'All Students') {
      if (req.user.role === 'superadmin') {
        targetStudents = await Student.find({});
      } else {
        const refCode = admin ? admin.referralCode : null;
        const conditions = [{ assignedAdminId: req.user.id }];
        if (refCode) {
          conditions.push({ adminReferralCode: refCode });
        }
        targetStudents = await Student.find({ $or: conditions });
      }
    } else {
      const singleStudent = await Student.findOne({ email: recipient.toLowerCase().trim() });
      if (singleStudent) {
        targetStudents = [singleStudent];
      }
    }

    if (targetStudents.length === 0) {
      return res.status(404).json({ error: 'No registered students found matching your recipient selection.' });
    }

    const ActivityLog = require('../models/ActivityLog');

    for (const stud of targetStudents) {
      if (!Array.isArray(stud.notifications)) {
        stud.notifications = [];
      }
      stud.notifications.unshift(notificationItem);
      await stud.save();

      // Log activity event for Super Admin (SUPS) and Admin activity feeds
      try {
        await ActivityLog.create({
          ownerRole: 'SuperAdmin',
          ownerId: req.user.id,
          sender: {
            name: admin ? `${admin.name} (Admin)` : (req.user.name || 'Admin'),
            email: admin ? admin.email : req.user.email
          },
          recipient: {
            name: stud.name || 'Student',
            email: stud.email
          },
          type: 'ADMIN_NOTIFICATION',
          message: `[${type || 'Notification'}] ${message.trim()}`,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to save ActivityLog for sent notification:', logErr);
      }
    }

    res.json({
      message: `Message delivered successfully to ${targetStudents.length} registered student(s)!`,
      sentCount: targetStudents.length,
      notification: notificationItem
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
    res.status(500).json({ error: 'Failed to deliver message to student(s).' });
  }
});

const multer = require('multer');
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload or Update Resume (Stateless upload directly from RAM to Cloudinary)
router.post('/api/student/resume', verifyToken, uploadMemory.single('docResume'), async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No file uploaded or file buffer missing.' });
    }

    // Upload memory buffer directly to Cloudinary via upload_stream
    const { Readable } = require('stream');
    const cldResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'career_bridge_docs',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      Readable.from(req.file.buffer).pipe(uploadStream);
    });

    student.docResume = cldResult.secure_url;
    if (!student.resumeReview) {
      student.resumeReview = { status: 'pending' };
    } else {
      student.resumeReview.status = 'pending';
    }
    await student.save();

    res.json({ 
      docResume: student.docResume, 
      message: 'Resume uploaded successfully.' 
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/notifications/read-all — clear student notifications from database
router.post('/api/student/notifications/read-all', verifyToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    student.notifications = [];
    await student.save();

    res.json({ message: 'All notifications cleared.', notifications: [] });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// DELETE & POST /api/student/notifications/:id — removes a single notification when clicked
const removeNotificationHandler = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const notifId = req.params.id;
    if (Array.isArray(student.notifications)) {
      student.notifications = student.notifications.filter(
        n => String(n.id) !== String(notifId) && String(n._id) !== String(notifId)
      );
      await student.save();
    }

    res.json({ message: 'Notification removed successfully.', notifications: student.notifications || [] });
  } catch (err) {
    console.error('Error removing notification:', err);
    res.status(500).json({ error: 'Failed to remove notification.' });
  }
};

router.delete('/api/student/notifications/:id', verifyToken, removeNotificationHandler);
router.post('/api/student/notifications/delete/:id', verifyToken, removeNotificationHandler);

const generateUniqueAdminReferralCode = require('../utils/referralUtils');

// GET /api/admin/profile — fetches the active admin's profile details
router.get('/api/admin/profile', verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    if (!admin.referralCode || admin.referralCode === 'CB-ADMIN-001' || admin.referralCode === 'REF-CB2025') {
      admin.referralCode = await generateUniqueAdminReferralCode();
    }

    if (!admin.referralKeysHistory || admin.referralKeysHistory.length === 0) {
      admin.referralKeysHistory = [{
        code: admin.referralCode,
        status: 'Active',
        createdAt: new Date()
      }];
      await admin.save();
    } else {
      let activeExists = admin.referralKeysHistory.some(k => k.code === admin.referralCode);
      if (!activeExists && admin.referralCode) {
        admin.referralKeysHistory.push({
          code: admin.referralCode,
          status: 'Active',
          createdAt: new Date()
        });
        await admin.save();
      }
    }

    const SystemConfig = require('../models/SystemConfig');
    const sysConfig = await SystemConfig.findOne().catch(() => null);
    const globalFee = sysConfig?.unlockFee || 99;

    const assignedFee = (admin.customUnlockFee !== null && admin.customUnlockFee !== undefined && Number(admin.customUnlockFee) > 0)
      ? Number(admin.customUnlockFee)
      : globalFee;

    res.json({
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile || '',
      profilePhoto: admin.profilePhoto || '',
      referralCode: admin.referralCode || '',
      referralKeysHistory: admin.referralKeysHistory || [],
      state: admin.state || '',
      city: admin.city || '',
      status: admin.status,
      customUnlockFee: admin.customUnlockFee,
      assignedFee: assignedFee
    });
  } catch (err) {
    console.error('Fetch admin profile error:', err);
    res.status(500).json({ error: 'Failed to fetch admin profile.' });
  }
});

// PUT /api/admin/profile — updates the active admin's profile details
router.put('/api/admin/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, mobile, referralCode, referralKeysHistory, institute, profilePhoto } = req.body;
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    if (profilePhoto !== undefined) {
      admin.profilePhoto = profilePhoto;
    }

    if (email && email.toLowerCase().trim() !== admin.email.toLowerCase().trim()) {
      const { isEmailAlreadyInUse } = require('../utils/emailValidator');
      const inUse = await isEmailAlreadyInUse(email.toLowerCase().trim(), { userId: admin._id, model: 'Admin' });
      if (inUse) {
        return res.status(409).json({ error: 'This email address is already in use by another account. Please use a different email address.' });
      }
      admin.email = email.toLowerCase().trim();
    }

    if (referralCode && referralCode.trim() !== admin.referralCode) {
      const existingRef = await Admin.findOne({ referralCode: referralCode.trim() });
      if (existingRef && existingRef._id.toString() !== admin._id.toString()) {
        return res.status(400).json({ error: 'Referral code is already in use by another admin.' });
      }
      admin.referralCode = referralCode.trim();
    }

    if (name) admin.name = name.trim();
    if (mobile && mobile.trim() && mobile.trim() !== admin.mobile) {
      const { isMobileAlreadyInUse } = require('../utils/mobileValidator');
      const inUse = await isMobileAlreadyInUse(mobile.trim(), { userId: admin._id, model: 'Admin' });
      if (inUse) {
        return res.status(409).json({
          error: 'This mobile number is already registered on Skill Bridge by another account. Please use a different mobile number.'
        });
      }
      admin.mobile = mobile.trim();
    }

    if (institute) {
      const parts = institute.replace(/Branch/gi, '').split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        admin.city = parts[0];
        if (parts.length > 1) {
          admin.state = parts.slice(1).join(' ');
        }
      }
    }

    // Process and update referralKeysHistory with single Active key rule
    if (Array.isArray(referralKeysHistory)) {
      admin.referralKeysHistory = referralKeysHistory;
    }

    // Ensure single active key rule
    if (admin.referralCode) {
      const activeCode = admin.referralCode.trim();
      let foundInHistory = false;

      if (!admin.referralKeysHistory) admin.referralKeysHistory = [];

      admin.referralKeysHistory = admin.referralKeysHistory.map(k => {
        if (k.code.trim().toUpperCase() === activeCode.toUpperCase()) {
          foundInHistory = true;
          return { ...k, status: 'Active' };
        } else {
          return { ...k, status: 'Deactivated' };
        }
      });

      if (!foundInHistory) {
        admin.referralKeysHistory.unshift({
          code: activeCode,
          status: 'Active',
          createdAt: new Date()
        });
      }
    }

    await admin.save();

    res.json({
      message: 'Admin profile updated successfully.',
      user: {
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile || '',
        profilePhoto: admin.profilePhoto || '',
        referralCode: admin.referralCode || '',
        referralKeysHistory: admin.referralKeysHistory || [],
        state: admin.state || '',
        city: admin.city || ''
      }
    });
  } catch (err) {
    console.error('Update admin profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
