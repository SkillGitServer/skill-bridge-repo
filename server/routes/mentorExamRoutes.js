const express = require('express');
const router = express.Router();
const MentorExam = require('../models/MentorExam');
const { verifyToken } = require('../middleware/authMiddleware');

// Endpoint: Seed mock mentor-published exams (Disabled to prevent auto-generating mock records)
router.post('/api/mentor-exams/seed', async (req, res) => {
  return res.json({ message: 'Automatic mentor exam seeding is disabled.', count: 0 });
});

// Endpoint: Get active pending mentor exam for student (Excludes exams already started/attempted)
router.get('/api/mentor-exams/active', async (req, res) => {
  try {
    let studentId = null;
    let studentEmail = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded) {
          studentId = decoded.id || decoded._id || null;
          studentEmail = decoded.email || null;
        }
      } catch (e) {}
    }

    if (!studentEmail && req.query.email) studentEmail = req.query.email;
    if (!studentId && req.query.studentId) studentId = req.query.studentId;

    const excludeIdentifiers = [];
    if (studentId) excludeIdentifiers.push(String(studentId));
    if (studentEmail) excludeIdentifiers.push(String(studentEmail).toLowerCase().trim());

    const query = { isActive: true };
    if (excludeIdentifiers.length > 0) {
      query.attemptedBy = { $nin: excludeIdentifiers };
    }

    const activeExam = await MentorExam.findOne(query).sort({ dateCreated: -1, createdAt: -1, _id: -1 });
    res.json(activeExam || null);
  } catch (error) {
    res.status(200).json(null);
  }
});

// Endpoint: Mark mentor exam as started/attempted by student
router.post('/api/mentor-exams/:id/start', async (req, res) => {
  try {
    let studentIdentifier = req.body?.studentEmail || req.body?.studentId || null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded) {
          if (!studentIdentifier) {
            studentIdentifier = decoded.id || decoded._id || decoded.email;
          }
        }
      } catch (e) {}
    }

    if (!studentIdentifier) {
      studentIdentifier = 'anonymous_student';
    }

    await MentorExam.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { attemptedBy: String(studentIdentifier).toLowerCase().trim() } },
      { returnDocument: 'after' }
    );

    res.json({ message: 'Exam attempt recorded.', examId: req.params.id, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Get specific mentor exam by ID (only if active)
router.get('/api/mentor-exams/:id', async (req, res) => {
  try {
    const exam = await MentorExam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'This exam was not found.' });
    }
    if (!exam.isActive) {
      return res.status(403).json({ error: 'This exam is not active or has not been published by the mentor yet.' });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Update an existing mentor exam (Update fields or publish/draft status)
router.put('/api/mentor-exams/:id', async (req, res) => {
  try {
    const { title, description, duration, questions, isActive } = req.body;
    
    const updateData = { updatedAt: new Date(), dateCreated: new Date() };
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (duration !== undefined) updateData.duration = Number(duration) || 15;
    if (questions) {
      updateData.questions = questions;
      updateData.totalQuestions = questions.length;
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await MentorExam.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    // If publishing (isActive === true), notify assigned students
    if (isActive === true) {
      try {
        let createdBy = updated.createdBy;
        let senderName = 'Admin / Mentor';
        let senderEmail = 'admin@skillbridge.in';
        let adminObj = null;

        if (createdBy) {
          const Admin = require('../models/Admin');
          adminObj = await Admin.findById(createdBy);
          if (adminObj) {
            senderName = adminObj.name || senderName;
            senderEmail = adminObj.email || senderEmail;
          }
        }

        const Student = require('../models/Student');
        let studentQuery = {};
        if (createdBy) {
          const refCode = adminObj ? adminObj.referralCode : null;
          const conditions = [{ assignedAdminId: createdBy }];
          if (refCode) conditions.push({ adminReferralCode: refCode });
          studentQuery = { $or: conditions };
        }
        const assignedStudents = await Student.find(studentQuery);

        const notifItem = {
          id: 'exam_notif_' + Date.now(),
          subject: '📢 New Assessment Published',
          type: 'Assessment Announcement',
          message: `Mentor ${senderName} published an assessment: "${updated.title}" (${updated.totalQuestions} Questions, ${updated.duration} Mins). Click to take exam now!`,
          senderName: senderName,
          senderEmail: senderEmail,
          senderPhoto: adminObj ? (adminObj.profilePhoto || '') : '',
          link: '/student/exam',
          timestamp: new Date(),
          unread: true
        };

        for (const stud of assignedStudents) {
          if (!Array.isArray(stud.notifications)) stud.notifications = [];
          stud.notifications.unshift(notifItem);
          await stud.save();
        }
      } catch (notifErr) {
        console.error('Failed to notify students on exam publish update:', notifErr);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating mentor exam:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Delete a published mentor exam from MongoDB database
router.delete('/api/mentor-exams/:id', async (req, res) => {
  try {
    const deleted = await MentorExam.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }
    res.json({ message: 'Assessment deleted from database successfully.', id: req.params.id });
  } catch (error) {
    console.error('Error deleting mentor exam:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Get mentor exams created by the logged-in admin
router.get('/api/mentor-exams', async (req, res) => {
  try {
    let adminId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded && (decoded.id || decoded._id)) {
          adminId = decoded.id || decoded._id;
        }
      } catch (e) {}
    }

    let filter = {};
    if (adminId) {
      filter = { createdBy: adminId };
    }

    const exams = await MentorExam.find(filter).sort({ dateCreated: -1, createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Get all mentor exams across platform (For Super Admin global audit)
router.get('/api/super-admin/mentor-exams', async (req, res) => {
  try {
    const exams = await MentorExam.find({})
      .populate('createdBy', 'name email mobile')
      .sort({ dateCreated: -1, createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



const ActivityLog = require('../models/ActivityLog');
const Admin = require('../models/Admin');

// Endpoint: Create a new custom mentor exam (Active or Draft)
router.post('/api/mentor-exams', async (req, res) => {
  try {
    const { title, description, duration, questions, isActive } = req.body;
    let createdBy = null;
    let senderName = 'Admin / Mentor';
    let senderEmail = 'admin@skillbridge.in';
    let adminObj = null;

    const isExamActive = isActive !== undefined ? Boolean(isActive) : true;

    // Extract user ID from auth token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded && (decoded.id || decoded._id)) {
          createdBy = decoded.id || decoded._id;
          adminObj = await Admin.findById(createdBy);
          if (adminObj) {
            senderName = adminObj.name || senderName;
            senderEmail = adminObj.email || senderEmail;
          }
        }
      } catch (e) {}
    }

    const newExam = new MentorExam({
      title,
      description,
      duration: Number(duration) || 15,
      totalQuestions: (questions && questions.length) ? questions.length : 0,
      questions: questions || [],
      isActive: isExamActive,
      createdBy
    });
    const saved = await newExam.save();

    // If published (isActive === true), notify assigned students and log activity feed
    if (isExamActive) {
      try {
        const Student = require('../models/Student');
        let studentQuery = {};
        if (createdBy) {
          const refCode = adminObj ? adminObj.referralCode : null;
          const conditions = [{ assignedAdminId: createdBy }];
          if (refCode) conditions.push({ adminReferralCode: refCode });
          studentQuery = { $or: conditions };
        }
        const assignedStudents = await Student.find(studentQuery);

        const notifItem = {
          id: 'exam_notif_' + Date.now(),
          subject: '📢 New Assessment Published',
          type: 'Assessment Announcement',
          message: `Mentor ${senderName} published a new assessment: "${title}" (${questions ? questions.length : 0} Questions, ${duration} Mins). Click to take exam now!`,
          senderName: senderName,
          senderEmail: senderEmail,
          senderPhoto: adminObj ? (adminObj.profilePhoto || '') : '',
          link: '/student/exam',
          timestamp: new Date(),
          unread: true
        };

        for (const stud of assignedStudents) {
          if (!Array.isArray(stud.notifications)) stud.notifications = [];
          stud.notifications.unshift(notifItem);
          await stud.save();
        }
      } catch (notifErr) {
        console.error('Failed to notify students of new exam publication:', notifErr);
      }

      // Log Activity for SUPSS & Admin activity feeds
      try {
        await ActivityLog.create({
          ownerId: createdBy,
          ownerRole: 'Admin',
          sender: {
            name: senderName,
            email: senderEmail
          },
          recipient: {
            name: 'Platform Candidates & Students',
            email: 'all@skillbridge.in'
          },
          message: `Published new assessment: "${title}" (${questions ? questions.length : 0} Questions, ${duration} Mins)`,
          type: 'NEW_EXAM_PUBLISHED',
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log exam publication activity:', logErr);
      }
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating mentor exam:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
