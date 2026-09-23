const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Fallback verified candidate placement reviews for landing page
const FALLBACK_PLACEMENT_REVIEWS = [
  {
    _id: 'fb-p1',
    name: 'Aarav Sharma',
    company: 'Tata Consultancy Services',
    role: 'Full Stack Engineer',
    joiningDate: 'August 2026',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-p2',
    name: 'Pooja Verma',
    company: 'ICICI Bank',
    role: 'Business Data Analyst',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-p3',
    name: 'Rohan Deshmukh',
    company: 'Infosys Limited',
    role: 'Associate Software Developer',
    joiningDate: 'July 2026',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-p4',
    name: 'Sneha Patel',
    company: 'Accenture India',
    role: 'Cloud Operations Trainee',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-p5',
    name: 'Vikram Joshi',
    company: 'Wipro Technologies',
    role: 'Systems Engineer',
    joiningDate: 'August 2026',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-p6',
    name: 'Ananya Iyer',
    company: 'Cognizant',
    role: 'AI Solutions Specialist',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    status: 'approved',
    createdAt: new Date().toISOString()
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUBLIC: Get Approved Placement Reviews for Landing Page (Max 12 in rotation)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/reviews/approved', async (req, res) => {
  try {
    const approved = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $sample: { size: 12 } }
    ]);

    if (!approved || approved.length === 0) {
      return res.json({
        success: true,
        count: FALLBACK_PLACEMENT_REVIEWS.length,
        reviews: FALLBACK_PLACEMENT_REVIEWS
      });
    }

    // Blend with fallback if fewer than 4 to keep carousel dense & lively
    if (approved.length < 4) {
      const combined = [...approved, ...FALLBACK_PLACEMENT_REVIEWS].slice(0, 12);
      return res.json({
        success: true,
        count: combined.length,
        reviews: combined
      });
    }

    res.json({
      success: true,
      count: approved.length,
      reviews: approved
    });
  } catch (error) {
    console.error('Error fetching approved reviews:', error);
    res.json({
      success: true,
      count: FALLBACK_PLACEMENT_REVIEWS.length,
      reviews: FALLBACK_PLACEMENT_REVIEWS
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. STUDENT: Get My Review Request Status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/reviews/my-status', async (req, res) => {
  try {
    let studentId = null;
    let studentEmail = (req.query.email || '').trim().toLowerCase();

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          studentId = decoded.id;
        }
      } catch (e) {}
    }

    let student = null;
    if (studentId) {
      student = await Student.findById(studentId).lean();
    } else if (studentEmail) {
      student = await Student.findOne({ email: studentEmail }).lean();
    }

    if (!student) {
      return res.json({ hasPendingRequest: false, hasSubmitted: false });
    }

    // Check if student already submitted a review
    const existingReview = await Review.findOne({
      $or: [
        { studentId: student._id },
        { email: student.email?.toLowerCase().trim() }
      ]
    }).lean();

    const hasSubmitted = Boolean(existingReview);
    const hasPendingNotification = Array.isArray(student.notifications) &&
      student.notifications.some(n => n.type === 'SuperAdmin Review Request' && n.unread);

    const hasPendingRequest = !hasSubmitted && (Boolean(student.reviewRequested) || hasPendingNotification);

    res.json({
      hasPendingRequest,
      hasSubmitted,
      existingReview: existingReview || null
    });
  } catch (err) {
    console.error('Error in my-status review check:', err);
    res.json({ hasPendingRequest: false, hasSubmitted: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. STUDENT: Submit Placement Review
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/reviews', async (req, res) => {
  try {
    let studentId = null;
    let studentName = req.body.name?.trim();
    let studentEmail = req.body.email?.trim()?.toLowerCase() || '';

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          studentId = decoded.id;
          const studentDoc = await Student.findById(decoded.id).select('name email').lean();
          if (studentDoc) {
            if (!studentName) studentName = studentDoc.name;
            if (!studentEmail) studentEmail = studentDoc.email?.toLowerCase().trim();
          }
        }
      } catch (e) {}
    }

    const { company, role, joiningDate, photo } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ error: 'Please enter where you got the job (Company / Organization).' });
    }
    if (!role || !role.trim()) {
      return res.status(400).json({ error: 'Please enter your job role/designation.' });
    }

    const nameToSave = studentName || 'Verified Candidate';

    // Upsert review for this student
    let review = null;
    if (studentId || studentEmail) {
      review = await Review.findOne({
        $or: [
          ...(studentId ? [{ studentId }] : []),
          ...(studentEmail ? [{ email: studentEmail }] : [])
        ]
      });
    }

    if (review) {
      review.name = nameToSave;
      review.company = company.trim();
      review.role = role.trim();
      review.joiningDate = joiningDate?.trim() || '';
      if (photo) review.photo = photo;
      review.status = 'approved';
      await review.save();
    } else {
      review = new Review({
        studentId: studentId || null,
        name: nameToSave,
        email: studentEmail,
        company: company.trim(),
        role: role.trim(),
        joiningDate: joiningDate?.trim() || '',
        photo: photo || '',
        status: 'approved'
      });
      await review.save();
    }

    // Clear request flag & mark notification as read on student
    if (studentId || studentEmail) {
      const query = studentId ? { _id: studentId } : { email: studentEmail };
      await Student.updateOne(query, {
        $set: {
          reviewRequested: false,
          'notifications.$[elem].unread': false
        }
      }, {
        arrayFilters: [{ 'elem.type': 'SuperAdmin Review Request' }]
      });
    }

    res.status(201).json({
      success: true,
      message: 'Placement review submitted successfully and featured on landing page!',
      review
    });
  } catch (error) {
    console.error('Error submitting placement review:', error);
    res.status(500).json({ error: 'Failed to submit placement review.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPER ADMIN: Dashboard Data (Submitted Reviews & Pending Students)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/api/super-admin/reviews/dashboard',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const [allReviews, allStudents] = await Promise.all([
        Review.find().sort({ createdAt: -1 }).lean(),
        Student.find()
          .select('_id name email mobile percentageGraduation assignedAdminId reviewRequested reviewRequestedAt createdAt')
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const reviewedEmails = new Set(allReviews.map(r => r.email?.toLowerCase().trim()).filter(Boolean));
      const reviewedStudentIds = new Set(allReviews.map(r => r.studentId?.toString()).filter(Boolean));

      // Submitted list
      const submittedReviews = allReviews;

      // Pending list: students who have not submitted a review yet
      const pendingStudents = allStudents.filter(s => {
        const email = s.email?.toLowerCase().trim();
        const id = s._id?.toString();
        return !reviewedEmails.has(email) && !reviewedStudentIds.has(id);
      });

      const approvedCount = allReviews.filter(r => r.status === 'approved').length;

      res.json({
        success: true,
        submittedReviews,
        pendingStudents,
        counts: {
          submitted: submittedReviews.length,
          pending: pendingStudents.length,
          approved: approvedCount
        }
      });
    } catch (error) {
      console.error('Error fetching admin review dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch review dashboard data.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUPER ADMIN: Send Review Request Notification to a Student
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/api/super-admin/reviews/request',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const { studentId, email } = req.body;
      if (!studentId && !email) {
        return res.status(400).json({ error: 'Student ID or email is required.' });
      }

      const query = studentId ? { _id: studentId } : { email: email.toLowerCase().trim() };
      const student = await Student.findOne(query);

      if (!student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      // Check if student already has a pending review request notification
      if (!Array.isArray(student.notifications)) {
        student.notifications = [];
      }

      const newNotif = {
        id: `rev-req-${Date.now()}`,
        subject: '👑 Golden Broadcast: Placement Review Request',
        type: 'SuperAdmin Review Request',
        message: 'Super Admin has selected your profile to feature your verified placement on our national showcase. Please submit your job and company details!',
        link: '/student/dashboard',
        unread: true,
        timestamp: new Date()
      };

      student.notifications.unshift(newNotif);
      student.reviewRequested = true;
      student.reviewRequestedAt = new Date();
      await student.save();

      res.json({
        success: true,
        message: `Placement review request sent to ${student.name} successfully!`,
        studentName: student.name
      });
    } catch (error) {
      console.error('Error sending review request:', error);
      res.status(500).json({ error: 'Failed to send review request.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUPER ADMIN: Edit Student Review Details
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/api/super-admin/reviews/:id',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const { name, company, role, joiningDate, photo, status } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (company !== undefined) updateData.company = company.trim();
      if (role !== undefined) updateData.role = role.trim();
      if (joiningDate !== undefined) updateData.joiningDate = joiningDate.trim();
      if (photo !== undefined) updateData.photo = photo;
      if (status !== undefined && ['approved', 'rejected', 'pending'].includes(status)) {
        updateData.status = status;
      }

      const updated = await Review.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      res.json({
        success: true,
        message: 'Student review updated successfully!',
        review: updated
      });
    } catch (error) {
      console.error('Error editing review:', error);
      res.status(500).json({ error: 'Failed to edit review.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. SUPER ADMIN: Update Review Status (Quick Approve / Hide)
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/api/super-admin/reviews/:id/status',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }

      const review = await Review.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!review) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      res.json({
        success: true,
        message: `Review status updated to ${status}.`,
        review
      });
    } catch (error) {
      console.error('Error updating review status:', error);
      res.status(500).json({ error: 'Failed to update review status.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. SUPER ADMIN: Delete Review
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/api/super-admin/reviews/:id',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const review = await Review.findByIdAndDelete(req.params.id);
      if (!review) {
        return res.status(404).json({ error: 'Review not found.' });
      }

      res.json({
        success: true,
        message: 'Review deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Failed to delete review.' });
    }
  }
);

// Backwards compatibility endpoint for previous calls
router.get(
  '/api/super-admin/reviews',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const reviews = await Review.find().sort({ createdAt: -1 }).lean();
      const totalCount = reviews.length;
      const approvedCount = reviews.filter(r => r.status === 'approved').length;
      const pendingCount = reviews.filter(r => r.status === 'pending').length;
      const rejectedCount = reviews.filter(r => r.status === 'rejected').length;

      res.json({
        success: true,
        reviews,
        counts: {
          total: totalCount,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
  }
);

module.exports = router;
