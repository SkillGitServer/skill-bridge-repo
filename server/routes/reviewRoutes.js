const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Fallback reviews to seed display if no reviews are approved yet
const FALLBACK_REVIEWS = [
  {
    _id: 'fb-1',
    name: 'Aarav Sharma',
    role: 'Full Stack Trainee',
    rating: 5,
    reviewText: 'Skill Bridge India gave me clarity on my technical competencies and helped me pinpoint exactly what areas to improve for placement interviews.',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-2',
    name: 'Pooja Verma',
    role: 'Data Science Candidate',
    rating: 5,
    reviewText: 'The assessment test was challenging and directly aligned with modern job roles. Getting instant feedback boosted my confidence tremendously!',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-3',
    name: 'Rohan Deshmukh',
    role: 'Computer Engineering Student',
    rating: 5,
    reviewText: 'Clean interface, seamless resume evaluation, and genuine placement guidance. Highly recommended for every final year candidate.',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-4',
    name: 'Sneha Patel',
    role: 'Business Analytics Aspirant',
    rating: 5,
    reviewText: 'The mentor evaluations and tailored career recommendations made my job hunt so much more structured. Truly transformative platform.',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-5',
    name: 'Vikram Joshi',
    role: 'Software Development Candidate',
    rating: 5,
    reviewText: 'Verified certificates and direct company interview opportunities — Skill Bridge India bridged the gap between college and my first tech job.',
    status: 'approved',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'fb-6',
    name: 'Ananya Iyer',
    role: 'AI & ML Trainee',
    rating: 5,
    reviewText: 'Great experience! The automated reports are comprehensive and the platform runs smoothly without any friction.',
    status: 'approved',
    createdAt: new Date().toISOString()
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. PUBLIC: Get Approved Reviews (Max 12 in random rotation)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/reviews/approved', async (req, res) => {
  try {
    const approvedReviews = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $sample: { size: 12 } }
    ]);

    if (!approvedReviews || approvedReviews.length === 0) {
      // Return fallback reviews if no approved reviews in DB yet
      return res.json({
        success: true,
        count: FALLBACK_REVIEWS.length,
        reviews: FALLBACK_REVIEWS
      });
    }

    // If fewer than 4 approved reviews, blend with fallback to keep carousel visually rich
    if (approvedReviews.length < 4) {
      const combined = [...approvedReviews, ...FALLBACK_REVIEWS].slice(0, 12);
      return res.json({
        success: true,
        count: combined.length,
        reviews: combined
      });
    }

    res.json({
      success: true,
      count: approvedReviews.length,
      reviews: approvedReviews
    });
  } catch (error) {
    console.error('Error fetching approved reviews:', error);
    // On DB failure, safely return fallback reviews so landing page never crashes
    res.json({
      success: true,
      count: FALLBACK_REVIEWS.length,
      reviews: FALLBACK_REVIEWS
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. STUDENT: Submit Review (Public or Auth)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/reviews', async (req, res) => {
  try {
    let studentId = null;
    let studentName = req.body.name?.trim();
    let studentEmail = req.body.email?.trim() || '';
    let studentRole = req.body.role?.trim() || 'Verified Candidate';

    // Optional token extraction if student is logged in
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
            if (!studentEmail) studentEmail = studentDoc.email;
          }
        }
      } catch (e) {
        // Token invalid or expired; proceed with provided body info
      }
    }

    const { rating, reviewText } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ error: 'Please provide a valid rating between 1 and 5.' });
    }

    if (!reviewText || reviewText.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a review of at least 5 characters.' });
    }

    if (!studentName) {
      studentName = 'Student';
    }

    const newReview = new Review({
      studentId: studentId || null,
      name: studentName,
      email: studentEmail,
      role: studentRole,
      rating: Number(rating),
      reviewText: reviewText.trim(),
      status: 'pending' // Super Admin must approve before it goes live
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted and will be displayed once verified.',
      review: newReview
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review. Please try again later.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUPER ADMIN: Get All Reviews (with status counts)
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/api/super-admin/reviews',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.query;
      const query = {};
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query.status = status;
      }

      const reviews = await Review.find(query)
        .sort({ createdAt: -1 })
        .lean();

      const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
        Review.countDocuments(),
        Review.countDocuments({ status: 'pending' }),
        Review.countDocuments({ status: 'approved' }),
        Review.countDocuments({ status: 'rejected' })
      ]);

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
      console.error('Error fetching admin reviews:', error);
      res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPER ADMIN: Update Review Status (Approve / Reject)
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/api/super-admin/reviews/:id/status',
  verifyToken,
  requireRole('superadmin', 'super-admin', 'admin'),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be approved, rejected, or pending.' });
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
        message: `Review has been marked as ${status}.`,
        review
      });
    } catch (error) {
      console.error('Error updating review status:', error);
      res.status(500).json({ error: 'Failed to update review status.' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUPER ADMIN: Delete Review
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

module.exports = router;
