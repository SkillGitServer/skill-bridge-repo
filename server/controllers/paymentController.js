const Razorpay = require('razorpay');
const crypto = require('crypto');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const Payment = require('../models/Payment');

// Initialize Razorpay instance with environment credentials
function getRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

/**
 * POST /api/payment/create-order
 * Creates a Razorpay order for the student upgrade fee.
 * Body: { amount, currency?, referralCode, email }
 */
const createOrder = async (req, res) => {
  try {
    const { amount, referralCode, email } = req.body;
    // Validate email is provided
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Student email is required.' });
    }

    // 1. Validate referral code exists
    if (!referralCode || !referralCode.trim()) {
      return res.status(400).json({ error: 'Admin/Mentor referral code is required before payment.' });
    }

    const cleanRef = referralCode.trim();
    const admin = await Admin.findOne({
      referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') },
      status: 'active'
    });

    if (!admin) {
      return res.status(400).json({ error: 'Invalid or inactive Admin Referral Code. Please check the code provided by your mentor.' });
    }

    // 2. Validate student exists
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Student email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({
      email: { $regex: new RegExp('^' + normalizedEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student account not found. Please ensure you are logged in.' });
    }

    // 3. Determine amount (prioritize unlocked grandfathered fee, mentor's custom fee, or global default)
    let feeAmount;
    if (student.isUnlocked && student.assignedUnlockFee && Number(student.assignedUnlockFee) > 0) {
      feeAmount = Number(student.assignedUnlockFee);
    } else if (admin && admin.customUnlockFee && Number(admin.customUnlockFee) > 0) {
      feeAmount = Number(admin.customUnlockFee);
      student.assignedUnlockFee = feeAmount;
      await student.save();
    } else if (student.assignedUnlockFee && Number(student.assignedUnlockFee) > 0 && Number(student.assignedUnlockFee) !== 99) {
      feeAmount = Number(student.assignedUnlockFee);
    } else {
      const SystemConfig = require('../models/SystemConfig');
      let config = await SystemConfig.findOne();
      feeAmount = (config && config.unlockFee) ? Number(config.unlockFee) : 99;
      student.assignedUnlockFee = feeAmount;
      await student.save();
    }

    // 4. Create Razorpay order (amount in paise)
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(feeAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `rcpt_${student._id.toString().slice(-12)}_${Date.now()}`,
      notes: {
        studentEmail: normalizedEmail,
        referralCode: cleanRef,
        adminId: admin._id.toString()
      }
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      studentName: student.name,
      studentEmail: normalizedEmail
    });
  } catch (err) {
    // Razorpay SDK throws non-standard error objects — extract the real message
    const razorpayDesc = err?.error?.description || err?.error?.reason || '';
    const razorpayCode = err?.error?.code || err?.statusCode || '';
    const errMsg = razorpayDesc || err?.message || 'Failed to create payment order. Please try again.';

    console.error('[RAZORPAY CREATE ORDER ERROR]', {
      code: razorpayCode,
      description: razorpayDesc,
      message: err?.message,
      full: JSON.stringify(err)
    });

    res.status(500).json({ 
      error: errMsg,
      code: razorpayCode || undefined
    });
  }
};

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature using HMAC-SHA256.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, referralCode, mobile?, docUrls? }
 * Note: Documents are handled separately via the existing upload endpoint after verification.
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      email,
      referralCode,
      mobile,
      percentage10th,
      percentage12th
    } = req.body;

    // 1. Verify all required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay payment details.' });
    }

    // 2. CRITICAL: Verify payment signature using HMAC-SHA256
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Server payment configuration error.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('[RAZORPAY] Signature mismatch — potential tampered request');
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // 3. Find student & admin
    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({
      email: { $regex: new RegExp('^' + normalizedEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    const cleanRef = referralCode.trim();
    const admin = await Admin.findOne({
      referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') },
      status: 'active'
    });

    if (!admin) {
      return res.status(400).json({ error: 'Referral code is no longer valid.' });
    }

    // 4. Fetch order details to get the real amount paid
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amountPaid = order.amount / 100; // Convert from paise to INR

    // 5. Save verified payment record
    const payment = new Payment({
      studentEmail: normalizedEmail,
      amount: amountPaid,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'paid'
    });
    await payment.save();

    // 6. Unlock student & link with mentor
    student.isUnlocked = true;
    student.adminReferralCode = admin.referralCode;
    student.assignedAdminId = admin._id;
    student.razorpayPaymentId = razorpay_payment_id;

    // Calculate access expiry date based on snapshotted allocatedDurationMonths
    const durationMonths = student.allocatedDurationMonths || 6;
    const accessExp = new Date();
    accessExp.setMonth(accessExp.getMonth() + durationMonths);
    student.accessExpiresAt = accessExp;
    if (mobile && mobile.trim()) student.mobile = mobile.trim();
    if (percentage10th && percentage10th.trim()) {
      student.percentage10th = percentage10th.trim();
      const p10 = parseFloat(percentage10th);
      if (!isNaN(p10)) student.grade10Percentage = p10;
    }
    if (percentage12th && percentage12th.trim()) {
      student.percentage12th = percentage12th.trim();
      const p12 = parseFloat(percentage12th);
      if (!isNaN(p12)) student.grade12Percentage = p12;
    }
    await student.save();

    // 7. Link student to admin's assignedStudents array
    if (!admin.assignedStudents) admin.assignedStudents = [];
    if (!admin.assignedStudents.some(id => id.toString() === student._id.toString())) {
      admin.assignedStudents.push(student._id);
      await admin.save();
    }

    // 8. Log Activity for Super Admin Recent Platform Activity feed (Student Upgraded)
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: student.name || 'Candidate',
          email: student.email
        },
        recipient: {
          name: admin.name || 'Mentor Admin',
          email: admin.email || ''
        },
        type: 'STUDENT_UPGRADED',
        message: `Candidate ${student.name} (${student.email}) upgraded their account plan via payment (Fee: ₹${amountPaid}). Assigned mentor: ${admin.name}.`,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log STUDENT_UPGRADED ActivityLog:', logErr);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully! Your profile has been unlocked.',
      mentorName: admin.name,
      paymentId: razorpay_payment_id
    });
  } catch (err) {
    console.error('[RAZORPAY VERIFY ERROR]', err);
    res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
};

/**
 * POST /api/payment/create-renewal-order
 * Streamlined express renewal order creation. No documents or referral keys required.
 */
const createRenewalOrder = async (req, res) => {
  try {
    const studentId = req.user?.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    let feeAmount;
    if (student.assignedUnlockFee && Number(student.assignedUnlockFee) > 0) {
      feeAmount = Number(student.assignedUnlockFee);
    } else {
      const SystemConfig = require('../models/SystemConfig');
      const config = await SystemConfig.findOne().catch(() => null);
      feeAmount = (config && config.unlockFee) ? Number(config.unlockFee) : 99;
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(feeAmount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rnw_${Date.now()}_${student._id.toString().slice(-6)}`,
      notes: {
        studentId: student._id.toString(),
        type: 'Express Renewal',
        email: student.email
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: feeAmount,
      currency: 'INR',
      student: {
        name: student.name,
        email: student.email,
        mobile: student.mobile || ''
      }
    });
  } catch (err) {
    console.error('[CREATE RENEWAL ORDER ERROR]', err);
    res.status(500).json({ error: err.message || 'Failed to create renewal order.' });
  }
};

/**
 * POST /api/payment/verify-renewal
 * Verifies Razorpay payment signature and extends student accessExpiresAt by allocatedDurationMonths.
 */
const verifyRenewal = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters.' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment signature verification failed. Invalid transaction signature.' });
    }

    const studentId = req.user?.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amountPaid = order.amount / 100;

    const payment = new Payment({
      studentEmail: student.email,
      amount: amountPaid,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'paid'
    });
    await payment.save();

    const durationMonths = student.allocatedDurationMonths || 6;
    let baseDate = new Date();
    if (student.accessExpiresAt && new Date(student.accessExpiresAt) > baseDate) {
      baseDate = new Date(student.accessExpiresAt);
    }
    baseDate.setMonth(baseDate.getMonth() + durationMonths);

    student.accessExpiresAt = baseDate;
    student.isUnlocked = true;
    student.razorpayPaymentId = razorpay_payment_id;
    await student.save();

    res.json({
      success: true,
      message: `Subscription renewed successfully! Access extended by ${durationMonths} months.`,
      accessExpiresAt: student.accessExpiresAt,
      paymentId: razorpay_payment_id
    });
  } catch (err) {
    console.error('[VERIFY RENEWAL ERROR]', err);
    res.status(500).json({ error: err.message || 'Renewal verification failed.' });
  }
};

module.exports = { createOrder, verifyPayment, createRenewalOrder, verifyRenewal };
