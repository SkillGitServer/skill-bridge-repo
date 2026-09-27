const express = require('express');
const router = express.Router();
const ContactInquiry = require('../models/ContactInquiry');
const { sendContactInquiryEmail } = require('../utils/sendEmail');

/**
 * @route   POST /api/contact OR POST /contact
 * @desc    Dual-Channel: Saves client inquiry to database AND sends email notification to mail.skillbridgeindia@gmail.com
 * @access  Public
 */
const handleContactInquiry = async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your name.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your email address.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your message.'
      });
    }

    // 1. Channel A: Save inquiry directly into MongoDB for real-time admin dashboard viewing
    const inquiry = await ContactInquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      isRead: false
    });

    console.log(`[CONTACT INQUIRY SAVED] DB ID: ${inquiry._id} from "${inquiry.name}" <${inquiry.email}>`);

    // 2. Channel B: Dispatch email notification directly to mail.skillbridgeindia@gmail.com
    sendContactInquiryEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim()
    }).catch(emailErr => {
      console.error('[CONTACT INQUIRY EMAIL WARNING] Could not send email notification:', emailErr?.message || emailErr);
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you shortly!',
      inquiry: {
        _id: inquiry._id,
        name: inquiry.name,
        email: inquiry.email,
        createdAt: inquiry.createdAt
      }
    });
  } catch (err) {
    console.error('[CONTACT INQUIRY ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while sending your message. Please try again later.'
    });
  }
};

/**
 * @route   GET /api/super-admin/inquiries
 * @desc    Fetch client inquiries and counts for Super Admin Dashboard
 * @access  Super Admin / Admin
 */
const getSuperAdminInquiries = async (req, res) => {
  try {
    const inquiries = await ContactInquiry.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const total = await ContactInquiry.countDocuments();
    const unread = await ContactInquiry.countDocuments({ isRead: false });

    return res.status(200).json({
      success: true,
      inquiries,
      counts: {
        total,
        unread,
        read: total - unread
      }
    });
  } catch (err) {
    console.error('[GET INQUIRIES ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve client inquiries.'
    });
  }
};

/**
 * @route   PATCH /api/super-admin/inquiries/:id/read
 * @desc    Mark a specific inquiry as read
 * @access  Super Admin / Admin
 */
const markInquiryRead = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await ContactInquiry.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    const unread = await ContactInquiry.countDocuments({ isRead: false });
    const total = await ContactInquiry.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'Inquiry marked as read.',
      inquiry,
      counts: { total, unread, read: total - unread }
    });
  } catch (err) {
    console.error('[MARK INQUIRY READ ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to update inquiry.' });
  }
};

/**
 * @route   POST /api/super-admin/inquiries/mark-all-read
 * @desc    Mark all unread inquiries as read
 * @access  Super Admin / Admin
 */
const markAllInquiriesRead = async (req, res) => {
  try {
    await ContactInquiry.updateMany(
      { isRead: false },
      { isRead: true, readAt: new Date() }
    );

    const total = await ContactInquiry.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'All inquiries marked as read.',
      counts: { total, unread: 0, read: total }
    });
  } catch (err) {
    console.error('[MARK ALL INQUIRIES READ ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to mark inquiries as read.' });
  }
};

/**
 * @route   DELETE /api/super-admin/inquiries/:id
 * @desc    Delete an inquiry
 * @access  Super Admin / Admin
 */
const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    await ContactInquiry.findByIdAndDelete(id);

    const total = await ContactInquiry.countDocuments();
    const unread = await ContactInquiry.countDocuments({ isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully.',
      counts: { total, unread, read: total - unread }
    });
  } catch (err) {
    console.error('[DELETE INQUIRY ERROR]', err);
    return res.status(500).json({ success: false, error: 'Failed to delete inquiry.' });
  }
};

// Public submission endpoints
router.post('/api/contact', handleContactInquiry);
router.post('/contact', handleContactInquiry);
router.post('/', handleContactInquiry);

// Super admin dashboard endpoints
router.get('/api/super-admin/inquiries', getSuperAdminInquiries);
router.get('/super-admin/inquiries', getSuperAdminInquiries);
router.patch('/api/super-admin/inquiries/:id/read', markInquiryRead);
router.put('/api/super-admin/inquiries/:id/read', markInquiryRead);
router.post('/api/super-admin/inquiries/mark-all-read', markAllInquiriesRead);
router.delete('/api/super-admin/inquiries/:id', deleteInquiry);

module.exports = router;
