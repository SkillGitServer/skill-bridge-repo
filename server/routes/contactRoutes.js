const express = require('express');
const router = express.Router();
const { sendContactInquiryEmail } = require('../utils/sendEmail');

/**
 * @route   POST /api/contact OR POST /contact
 * @desc    Receives user contact form submissions and routes directly to mail.skillbridgeindia@gmail.com
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

    console.log(`[CONTACT INQUIRY] Dispatching message from "${name.trim()}" <${email.trim()}> to mail.skillbridgeindia@gmail.com`);

    const result = await sendContactInquiryEmail({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim()
    });

    if (result === false) {
      console.warn('[CONTACT INQUIRY] Brevo service failed to send email.');
      return res.status(502).json({
        success: false,
        error: 'Email delivery service temporarily unavailable. Please try again or reach out directly to mail.skillbridgeindia@gmail.com'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you shortly!'
    });
  } catch (err) {
    console.error('[CONTACT ROUTE ERROR]', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while sending your message. Please try again later.'
    });
  }
};

// Route support for both prefixed and direct paths
router.post('/api/contact', handleContactInquiry);
router.post('/contact', handleContactInquiry);
router.post('/', handleContactInquiry);

module.exports = router;
