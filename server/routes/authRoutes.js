const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const generateUniqueAdminReferralCode = require('../utils/referralUtils');

// ── Helper: parse basic device info from User-Agent ──────────────────────────
function parseDeviceInfo(req) {
  const ua = req.headers['user-agent'] || '';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad/i.test(ua)) os = 'iOS';

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.socket?.remoteAddress || 'Unknown';

  return { browser, os, ip };
}

// ── Helper: sign JWT ──────────────────────────────────────────────────────────
function signToken({ id, email, role, sessionId }) {
  return jwt.sign(
    { id, email, role, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Helper to validate password criteria for Admin and SuperAdmin
function validateAdminPassword(password, name, mobile, email) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  // Must contain a special character
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_]/;
  if (!specialCharRegex.test(password)) {
    return "Password must contain at least one special character.";
  }

  const lowerPassword = password.toLowerCase();

  // Cannot contain/match email
  if (email) {
    const lowerEmail = email.toLowerCase();
    const emailPrefix = lowerEmail.split('@')[0];
    if (lowerPassword.includes(lowerEmail) || (emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix))) {
      return "Password cannot match or contain your email address or username.";
    }
  }

  // Must contain different letters/characters (at least 4 unique characters)
  const uniqueChars = new Set(password).size;
  if (uniqueChars < 4) {
    return "Password must contain different letters (at least 4 unique characters).";
  }

  // Reject sequential numbers/characters (e.g. "1234", "abcd")
  for (let i = 0; i < password.length - 3; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    const char4 = password.charCodeAt(i + 3);

    // Ascending sequence
    if (char2 === char1 + 1 && char3 === char2 + 1 && char4 === char3 + 1) {
      return "Password cannot contain sequential letters or numbers.";
    }
    // Descending sequence
    if (char2 === char1 - 1 && char3 === char2 - 1 && char4 === char3 - 1) {
      return "Password cannot contain sequential letters or numbers.";
    }
  }

  // Reject repeating patterns of same character
  if (/^(.)\1+$/.test(password)) {
    return "Password cannot consist of repeating characters.";
  }

  // Common simple passwords
  const commonPasswords = ["123456", "12345678", "password", "qwerty", "admin123", "welcome123"];
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    return "Password is too simple or common.";
  }

  // Cannot contain user's own name (excluding generic role words)
  if (name) {
    const ignoredWords = ['admin', 'superadmin', 'user', 'test'];
    const nameParts = name.toLowerCase().split(/\s+/).filter(part => part.length >= 3 && !ignoredWords.includes(part));
    for (const part of nameParts) {
      if (lowerPassword.includes(part)) {
        return "Password cannot contain parts of your own name.";
      }
    }
  }

  // Cannot contain user's own mobile number
  if (mobile) {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length >= 6 && lowerPassword.includes(cleanMobile)) {
      return "Password cannot contain your mobile number.";
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Handles Student, Admin, and SuperAdmin registration.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/register', async (req, res) => {
  try {
    const { email, role, password, name, state, city, passkey, mobile } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    // Verify System Passkey for Super Admin
    if (role === 'superadmin') {
      const cleanKey = passkey ? passkey.trim() : '';
      if (!cleanKey) {
        return res.status(400).json({ error: 'System Passkey is required for Super Admin registration.' });
      }
    }

    // Require location details for Admins
    if (role === 'admin' && (!state || !city)) {
      return res.status(400).json({ error: 'State and city are required for Admin registration.' });
    }

    if (!['student', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    // Enforce global mobile number uniqueness across ALL accounts (Students, Admins, SuperAdmins)
    if (mobile && mobile.trim()) {
      const { isMobileAlreadyInUse } = require('../utils/mobileValidator');
      const mobileInUse = await isMobileAlreadyInUse(mobile.trim());
      if (mobileInUse) {
        return res.status(409).json({
          error: 'This mobile number is already registered on Skill Bridge by another account. Please use a different mobile number.'
        });
      }
    }

    // Validate Admin/SuperAdmin password specifically
    if (role === 'admin' || role === 'superadmin') {
      const passwordError = validateAdminPassword(password, name, mobile, normalizedEmail);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
    }

    // Generate password hash if password is provided, or a dummy one for student
    let passwordHash = '';
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    } else {
      passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 12);
    }

    // Enforce unique email checks across ALL collections
    const [studentExists, adminExists, superAdminExists] = await Promise.all([
      Student.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail }),
      SuperAdmin.findOne({ email: normalizedEmail })
    ]);

    if (role === 'admin') {
      if (studentExists || superAdminExists) {
        return res.status(409).json({
          error: "Cannot use this email: it is already associated with another person/account type."
        });
      }
      if (adminExists) {
        if (adminExists.status === 'pending') {
          return res.status(403).json({
            error: 'Your admin account registration is already pending Super Admin approval.',
            pending: true
          });
        }
        if (adminExists.status === 'revoked') {
          return res.status(403).json({
            error: 'Your admin access has been revoked. Please contact Super Admin.'
          });
        }
        return res.status(409).json({
          error: 'This email is already registered as an admin. Please log in instead.',
          redirect: '/login'
        });
      }
    } else if (role === 'student') {
      if (adminExists || superAdminExists) {
        return res.status(409).json({
          error: "Cannot use this email: it is already associated with another person/account type."
        });
      }
      if (studentExists) {
        if (studentExists.isVerified === true) {
          return res.status(409).json({
            error: 'An account with this email already exists. Please log in instead.',
            redirect: '/login'
          });
        } else {
          // Unverified student registration attempt — update details and send fresh OTP
          const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

          studentExists.name = name || studentExists.name || 'Student';
          studentExists.passwordHash = passwordHash;
          studentExists.otp = otpCode;
          studentExists.otpExpiresAt = otpExpiresAt;
          await studentExists.save();

          const { sendOtpEmail } = require('../utils/emailService');
          const emailSent = await sendOtpEmail(normalizedEmail, otpCode);
          if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification OTP via SMTP. Please try again later.' });
          }

          return res.status(200).json({
            message: 'Registration code sent to your email.',
            email: normalizedEmail
          });
        }
      }
    } else {
      if (studentExists || adminExists || superAdminExists) {
        return res.status(409).json({
          error: 'An account with this email already exists. Please log in instead.',
          redirect: '/login'
        });
      }
    }
    if (role === 'student') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const SystemConfig = require('../models/SystemConfig');
      const sysConfig = await SystemConfig.findOne().catch(() => null);
      const activeFee = (sysConfig && sysConfig.unlockFee) ? sysConfig.unlockFee : 99;

      // Determine active duration months (custom mentor duration vs platform default)
      let activeDurationMonths = (sysConfig && sysConfig.defaultStudentDurationMonths) ? Number(sysConfig.defaultStudentDurationMonths) : 6;
      let matchedAdminId = null;
      let canonicalRefCode = '';
      const refCodeInput = req.body.adminReferralCode || req.body.ref || req.body.referralCode || '';
      if (refCodeInput && refCodeInput.trim()) {
        const cleanRef = refCodeInput.trim();
        const adminObj = await Admin.findOne({
          referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
        });
        if (adminObj) {
          matchedAdminId = adminObj._id;
          canonicalRefCode = adminObj.referralCode;
          if (adminObj.customStudentDurationMonths && Number(adminObj.customStudentDurationMonths) > 0) {
            activeDurationMonths = Number(adminObj.customStudentDurationMonths);
          }
        } else {
          canonicalRefCode = cleanRef;
        }
      }

      const newUser = new Student({
        email: normalizedEmail,
        passwordHash,
        name: name || 'Student',
        otp: otpCode,
        otpExpiresAt,
        assignedUnlockFee: activeFee,
        allocatedDurationMonths: activeDurationMonths,
        assignedAdminId: matchedAdminId,
        adminReferralCode: canonicalRefCode
      });
      await newUser.save();

      // Log Activity for Super Admin Recent Platform Activity feed
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create({
          ownerId: null,
          ownerRole: 'SuperAdmin',
          sender: {
            name: name || 'New Candidate',
            email: normalizedEmail
          },
          recipient: {
            name: 'Candidate Registration',
            email: canonicalRefCode ? `Referral: ${canonicalRefCode}` : 'Direct'
          },
          type: 'NEW_STUDENT_REGISTERED',
          message: `New candidate ${name || normalizedEmail} registered on the platform.`,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log student registration ActivityLog:', logErr);
      }

      // Send SMTP OTP email for student
      const { sendOtpEmail } = require('../utils/emailService');
      const emailSent = await sendOtpEmail(normalizedEmail, otpCode);

      if (!emailSent) {
        return res.status(500).json({ error: 'Failed to send verification OTP via SMTP. Please try again later.' });
      }

      return res.status(200).json({
        message: 'Registration initiated. A 6-digit verification code has been sent to your email.',
        email: normalizedEmail
      });
    } else if (role === 'admin') {
      const uniqueCode = await generateUniqueAdminReferralCode();
      const newUser = new Admin({
        email: normalizedEmail,
        passwordHash,
        name: name || 'Admin',
        mobile,
        state,
        city,
        status: 'pending', // pending approval from Super Admin
        referralCode: uniqueCode
      });
      await newUser.save();

      // Log Activity for Super Admin Recent Platform Activity feed
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create({
          ownerId: null,
          ownerRole: 'SuperAdmin',
          sender: {
            name: name || 'New Admin',
            email: normalizedEmail
          },
          recipient: {
            name: 'Mentor Governance',
            email: `${city || ''}, ${state || ''}`.trim()
          },
          type: 'NEW_ADMIN_REGISTERED',
          message: `New Admin/Mentor ${name || normalizedEmail} registered from ${city}, ${state} (Pending SUPSS Approval).`,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log admin registration ActivityLog:', logErr);
      }

      return res.status(201).json({
        message: 'Admin registration submitted successfully! Your account is pending Super Admin approval.',
        pending: true
      });
    } else if (role === 'superadmin') {
      const { validateAndConsumePasskey } = require('../utils/passkeyManager');
      const passkeyResult = await validateAndConsumePasskey(passkey, normalizedEmail, name || 'Super Admin');
      if (!passkeyResult.success) {
        return res.status(403).json({ error: passkeyResult.error || 'Invalid or already used System Passkey.' });
      }

      const newUser = new SuperAdmin({
        email: normalizedEmail,
        passwordHash,
        name: name || 'Super Admin'
      });
      await newUser.save();

      return res.status(201).json({
        message: 'SuperAdmin registered successfully! You can now log in with your password.'
      });
    }

  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Students: generates an OTP for verification.
// Admin & SuperAdmin: password-only login, returns JWT directly.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, requestedRole } = req.body;

    if (!email || !requestedRole) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    let user = null;

    // Find user in appropriate collection
    if (requestedRole === 'student') {
      user = await Student.findOne({ email: normalizedEmail });
      if (user && (user.isTrialActive === false || user.isActive === false || user.status === 'disabled' || user.status === 'deactivated')) {
        return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
      }
    } else if (requestedRole === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
    } else if (requestedRole === 'superadmin') {
      user = await SuperAdmin.findOne({ email: normalizedEmail });
    } else {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or incorrect role selected.' });
    }

    // Verify password for Admin & SuperAdmin
    if (requestedRole === 'admin' || requestedRole === 'superadmin') {
      if (!password) {
        return res.status(400).json({ error: 'Password is required for administrative login.' });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
    }

    // Admin: check approval status
    if (requestedRole === 'admin' && user.status !== 'active') {
      if (user.status === 'pending') {
        return res.status(403).json({
          error: 'Your admin account is pending approval. Please wait for Super Admin authorization.',
          pending: true
        });
      }
      if (user.status === 'revoked') {
        return res.status(403).json({ error: 'Your admin access has been revoked. Please contact the Super Admin.' });
      }
    }

    // ── Admin & SuperAdmin: direct password login (no OTP) ───────────────────
    if (requestedRole === 'superadmin') {
      const sessionId = crypto.randomUUID();
      const deviceInfo = parseDeviceInfo(req);

      user.activeSessions = user.activeSessions.filter(s => {
        const age = Date.now() - new Date(s.createdAt).getTime();
        return age < 30 * 24 * 60 * 60 * 1000;
      });
      user.activeSessions.push({ sessionId, deviceInfo, createdAt: new Date() });
      await user.save();

      const token = signToken({ id: user._id, email: user.email, role: 'superadmin', sessionId });
      return res.status(200).json({
        message: 'Authentication successful.',
        token,
        directLogin: true,
        user: { email: user.email, name: user.name, role: 'superadmin' }
      });
    }

    if (requestedRole === 'admin') {
      // Session conflict check
      if (user.currentSessionId && user.currentSessionId !== null) {
        return res.status(409).json({
          sessionConflict: true,
          message: 'You are already logged in on another device.',
          user: { 
            email: user.email, 
            name: user.name, 
            role: 'admin',
            mobile: user.mobile || '',
            referralCode: user.referralCode || '',
            state: user.state || '',
            city: user.city || ''
          }
        });
      }

      const newSessionId = crypto.randomUUID();
      user.currentSessionId = newSessionId;
      user.activeSessionId = newSessionId;
      await user.save();

      const token = signToken({ id: user._id, email: user.email, role: 'admin', sessionId: newSessionId });
      return res.status(200).json({
        message: 'Authentication successful.',
        token,
        directLogin: true,
        user: { 
          email: user.email, 
          name: user.name, 
          role: 'admin',
          mobile: user.mobile || '',
          referralCode: user.referralCode || '',
          state: user.state || '',
          city: user.city || ''
        }
      });
    }

    // ── Student: OTP-based login (unchanged) ─────────────────────────────────
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.set('otp', otpCode, { strict: false });
    user.set('otpExpiresAt', otpExpiresAt, { strict: false });
    await user.save();

    // Send SMTP OTP email
    const { sendOtpEmail } = require('../utils/emailService');
    const emailSent = await sendOtpEmail(normalizedEmail, otpCode);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification OTP via SMTP. Please try again later.' });
    }

    return res.status(200).json({
      message: 'Verification OTP sent to your email.',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Validates 6-digit OTP code, clears DB OTP fields, and returns JWT.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, requestedRole } = req.body;

    if (!email || !otp || !requestedRole) {
      return res.status(400).json({ error: 'Email, OTP, and role are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    let user = null;

    if (requestedRole === 'student') {
      user = await Student.findOne({ email: normalizedEmail });
    } else if (requestedRole === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
    } else if (requestedRole === 'superadmin') {
      user = await SuperAdmin.findOne({ email: normalizedEmail });
    } else {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Retrieve OTP details from user document (fallback to get() for Admin/SuperAdmin dynamic fields)
    const dbOtp = user.otp || user.get('otp');
    const dbOtpExpiresAt = user.otpExpiresAt || user.get('otpExpiresAt');

    if (!dbOtp || !dbOtpExpiresAt) {
      return res.status(400).json({ error: 'No OTP requested or OTP has expired.' });
    }

    if (new Date() > new Date(dbOtpExpiresAt)) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }

    if (dbOtp.toString() !== otp.toString()) {
      return res.status(400).json({ error: 'Invalid OTP code.' });
    }

    // Admin approval check
    if (requestedRole === 'admin' && user.status !== 'active') {
      if (user.status === 'pending') {
        return res.status(403).json({ error: 'Your admin account is pending approval.' });
      }
      if (user.status === 'revoked') {
        return res.status(403).json({ error: 'Your admin access has been revoked.' });
      }
    }

    // ── SuperAdmin: multi-device session check & Passkey consumption ──────────────
    if (requestedRole === 'superadmin') {
      // Consume passkey if provided or pending
      const passkeyToConsume = req.body.passkey || user.get('pendingPasskey');
      if (passkeyToConsume) {
        const { validateAndConsumePasskey } = require('../utils/passkeyManager');
        await validateAndConsumePasskey(passkeyToConsume, user.email, user.name || 'Super Admin');
        user.set('pendingPasskey', undefined, { strict: false });
      }

      // Clear OTP fields
      user.set('otp', null, { strict: false });
      user.set('otpExpiresAt', null, { strict: false });

      const sessionId = crypto.randomUUID();
      const deviceInfo = parseDeviceInfo(req);

      user.activeSessions = user.activeSessions.filter(s => {
        const age = Date.now() - new Date(s.createdAt).getTime();
        return age < 30 * 24 * 60 * 60 * 1000;
      });

      user.activeSessions.push({ sessionId, deviceInfo, createdAt: new Date() });
      await user.save();

      const token = signToken({ id: user._id, email: user.email, role: 'superadmin', sessionId });
      return res.status(200).json({
        message: 'Authentication successful.',
        token,
        user: { email: user.email, name: user.name, role: 'superadmin' }
      });
    }

    // ── Student & Admin: single-device session check ─────────────────────────
    if (user.currentSessionId && user.currentSessionId !== null) {
      // Session conflict exists — return 409 but do NOT clear the OTP yet so force-login can reuse it
      return res.status(409).json({
        sessionConflict: true,
        message: 'You are already logged in on another device.',
        user: { email: user.email, name: user.name, role: requestedRole }
      });
    }

    // Mark student as verified and log ActivityLog if new registration
    const isNewRegistration = requestedRole === 'student' && !user.isVerified;
    if (requestedRole === 'student') {
      user.isVerified = true;
    }

    if (isNewRegistration) {
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create({
          ownerId: null,
          ownerRole: 'SuperAdmin',
          sender: {
            name: user.name || 'New Candidate',
            email: user.email
          },
          recipient: {
            name: 'Candidate Registration',
            email: user.adminReferralCode ? `Referral: ${user.adminReferralCode}` : 'Direct OTP'
          },
          type: 'NEW_STUDENT_REGISTERED',
          message: `New candidate ${user.name || user.email} verified and registered on the platform.`,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log student verification ActivityLog:', logErr);
      }
    }

    // Clear OTP fields
    user.set('otp', null, { strict: false });
    user.set('otpExpiresAt', null, { strict: false });

    const newSessionId = crypto.randomUUID();
    user.currentSessionId = newSessionId;
    user.activeSessionId = newSessionId;
    await user.save();

    const token = signToken({ id: user._id, email: user.email, role: requestedRole, sessionId: newSessionId });
    return res.status(200).json({
      message: 'Authentication successful.',
      token,
      user: { 
        email: user.email, 
        name: user.name, 
        role: requestedRole,
        profilePhoto: user.profilePhoto || '',
        docResume: user.docResume || '',
        mobile: user.mobile || '',
        referralCode: user.referralCode || '',
        state: user.state || '',
        city: user.city || ''
      }
    });

  } catch (error) {
    console.error('[VERIFY OTP ERROR]', error);
    res.status(500).json({ error: 'Server error during OTP verification.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Handles Student Google OAuth Login & Registration
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, access_token, email: directEmail, name: directName, picture: directPicture, mode } = req.body;
    let verifiedEmail = null;
    let verifiedName = directName || 'Google User';
    let verifiedPicture = directPicture || '';

    // 1. Verify ID Token (credential) with Google tokeninfo endpoint
    if (credential) {
      try {
        const googleRes = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (googleRes.data && googleRes.data.email) {
          verifiedEmail = googleRes.data.email.toLowerCase().trim();
          verifiedName = googleRes.data.name || verifiedName;
          verifiedPicture = googleRes.data.picture || verifiedPicture;
        }
      } catch (verifyErr) {
        console.warn('[GOOGLE TOKENINFO VERIFY WARNING]', verifyErr.response?.data || verifyErr.message);
      }
    }

    // 2. Verify access_token if credential verification was not present or failed
    if (!verifiedEmail && access_token) {
      try {
        const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (userInfoRes.data && userInfoRes.data.email) {
          verifiedEmail = userInfoRes.data.email.toLowerCase().trim();
          verifiedName = userInfoRes.data.name || verifiedName;
          verifiedPicture = userInfoRes.data.picture || verifiedPicture;
        }
      } catch (userinfoErr) {
        console.warn('[GOOGLE USERINFO VERIFY WARNING]', userinfoErr.response?.data || userinfoErr.message);
      }
    }

    // 3. Fallback to direct valid email if verified or provided via GIS SDK
    if (!verifiedEmail && directEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(directEmail)) {
        verifiedEmail = directEmail.toLowerCase().trim();
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({ error: 'Unable to verify Google account credentials. Please try signing in again.' });
    }

    // Ensure email is not tied to Admin or SuperAdmin
    const [adminExists, superAdminExists, userExists] = await Promise.all([
      Admin.findOne({ email: verifiedEmail }),
      SuperAdmin.findOne({ email: verifiedEmail }),
      User.findOne({ email: verifiedEmail })
    ]);

    if (adminExists || superAdminExists || (userExists && userExists.role && userExists.role !== 'student')) {
      return res.status(409).json({
        error: 'This email is already registered as an Admin/SuperAdmin account. Please use the Admin login portal.'
      });
    }

    let student = await Student.findOne({ email: verifiedEmail });

    // Mode 1: Login Mode (/login page) — require existing student account
    if (mode === 'login' && !student) {
      return res.status(404).json({
        error: 'No registered student account found with this email. Please register your account first.',
        redirect: '/register'
      });
    }

    // Mode 2: Register Mode (/register page) — reject if account already exists
    if (mode === 'register' && student && student.isVerified === true) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please log in instead.',
        redirect: '/login'
      });
    }

    if (!student) {
      // Create new student account via Google Registration with standard 24-Hour Free Trial
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      
      const SystemConfig = require('../models/SystemConfig');
      const sysConfig = await SystemConfig.findOne().catch(() => null);
      const activeFee = (sysConfig && sysConfig.unlockFee) ? sysConfig.unlockFee : 99;

      // Determine active duration months (custom mentor duration vs platform default)
      let activeDurationMonths = (sysConfig && sysConfig.defaultStudentDurationMonths) ? Number(sysConfig.defaultStudentDurationMonths) : 6;
      let matchedAdminId = null;
      let canonicalRefCode = '';
      const refCodeInput = req.body.adminReferralCode || req.body.ref || req.body.referralCode || '';
      if (refCodeInput && refCodeInput.trim()) {
        const cleanRef = refCodeInput.trim();
        const adminObj = await Admin.findOne({
          referralCode: { $regex: new RegExp('^' + cleanRef.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') }
        });
        if (adminObj) {
          matchedAdminId = adminObj._id;
          canonicalRefCode = adminObj.referralCode;
          if (adminObj.customStudentDurationMonths && Number(adminObj.customStudentDurationMonths) > 0) {
            activeDurationMonths = Number(adminObj.customStudentDurationMonths);
          }
        } else {
          canonicalRefCode = cleanRef;
        }
      }

      student = new Student({
        name: verifiedName,
        email: verifiedEmail,
        passwordHash,
        isVerified: true,
        profilePhoto: verifiedPicture,
        isTrialActive: true,
        trialExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Standard 24-Hour Free Trial
        assignedUnlockFee: activeFee,
        allocatedDurationMonths: activeDurationMonths,
        assignedAdminId: matchedAdminId,
        adminReferralCode: canonicalRefCode
      });
      await student.save();

      // Log Activity for Super Admin Recent Platform Activity feed (Google Registration)
      try {
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create({
          ownerId: null,
          ownerRole: 'SuperAdmin',
          sender: {
            name: verifiedName || 'New Candidate',
            email: verifiedEmail
          },
          recipient: {
            name: 'Candidate Registration',
            email: canonicalRefCode ? `Referral: ${canonicalRefCode}` : 'Google Sign-In'
          },
          type: 'NEW_STUDENT_REGISTERED',
          message: `New candidate ${verifiedName || verifiedEmail} registered on the platform via Google.`,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('Failed to log Google student registration ActivityLog:', logErr);
      }
    } else {
      // Update existing student details & normalize trial if legacy 7-day trial was set
      if (!student.isUnlocked && student.trialExpiresAt && student.createdAt) {
        const trialDurationMs = student.trialExpiresAt.getTime() - student.createdAt.getTime();
        if (trialDurationMs > 25 * 60 * 60 * 1000) {
          student.trialExpiresAt = new Date(student.createdAt.getTime() + 24 * 60 * 60 * 1000);
        }
      }
      student.isVerified = true;
      if (verifiedPicture && !student.profilePhoto) {
        student.profilePhoto = verifiedPicture;
      }
      if (verifiedName && (!student.name || student.name === 'Student')) {
        student.name = verifiedName;
      }
    }

    // Single-device session conflict check
    if (student.currentSessionId && student.currentSessionId !== null) {
      return res.status(409).json({
        sessionConflict: true,
        message: 'You are already logged in on another device.',
        user: { email: student.email, name: student.name, role: 'student' }
      });
    }

    const newSessionId = crypto.randomUUID();
    student.currentSessionId = newSessionId;
    student.activeSessionId = newSessionId;
    await student.save();

    const token = signToken({ id: student._id, email: student.email, role: 'student', sessionId: newSessionId });

    return res.status(200).json({
      message: 'Logged in with Google successfully!',
      token,
      user: {
        id: student._id,
        email: student.email,
        name: student.name,
        role: 'student',
        profilePhoto: student.profilePhoto || '',
        docResume: student.docResume || '',
        mobile: student.mobile || '',
        referralCode: student.adminReferralCode || '',
      }
    });

  } catch (error) {
    console.error('[GOOGLE AUTH ERROR]', error);
    res.status(500).json({ error: 'Server error during Google authentication.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/force-login
// Invalidates the existing session and logs in from the new device.
// Used by SessionConflict.jsx "Log out other device & continue" button.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/force-login', async (req, res) => {
  try {
    const { email, password, requestedRole, isGoogleLogin } = req.body;

    if (!email || (!password && !isGoogleLogin) || !requestedRole) {
      return res.status(400).json({ error: 'Email, credentials, and role are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    let user = null;

    if (requestedRole === 'student') {
      user = await Student.findOne({ email: normalizedEmail });
    } else if (requestedRole === 'admin') {
      user = await Admin.findOne({ email: normalizedEmail });
    } else {
      return res.status(400).json({ error: 'Force-login only applies to student and admin roles.' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (requestedRole === 'student') {
      if (isGoogleLogin) {
        // Google authentication verified
        user.isVerified = true;
      } else {
        // Validate OTP for student force-login
        const dbOtp = user.otp || user.get('otp');
        const dbOtpExpiresAt = user.otpExpiresAt || user.get('otpExpiresAt');

        if (!dbOtp || !dbOtpExpiresAt || new Date() > new Date(dbOtpExpiresAt) || dbOtp.toString() !== password?.toString()) {
          return res.status(401).json({ error: 'Invalid or expired verification session. Please request a new OTP.' });
        }

        // Clear OTP
        user.set('otp', null, { strict: false });
        user.set('otpExpiresAt', null, { strict: false });
      }
    } else {
      // Validate password for admin force-login
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
    }

    // Forcefully replace the old session
    const newSessionId = crypto.randomUUID();
    user.currentSessionId = newSessionId;
    user.activeSessionId = newSessionId;
    await user.save();

    const token = signToken({ id: user._id, email: user.email, role: requestedRole, sessionId: newSessionId });
    return res.status(200).json({
      message: 'Old session invalidated. Logged in on this device.',
      token,
      user: { 
        email: user.email, 
        name: user.name, 
        role: requestedRole,
        profilePhoto: user.profilePhoto || '',
        docResume: user.docResume || '',
        mobile: user.mobile || '',
        referralCode: user.referralCode || '',
        state: user.state || '',
        city: user.city || ''
      }
    });

  } catch (error) {
    console.error('[FORCE-LOGIN ERROR]', error);
    res.status(500).json({ error: 'Server error during force login.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears the currentSessionId for student/admin, or removes a specific
// sessionId from activeSessions for superadmin.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/logout', verifyToken, async (req, res) => {
  try {
    const { id, role, sessionId } = req.user;

    if (role === 'student') {
      await Student.findByIdAndUpdate(id, { currentSessionId: null, activeSessionId: null });
    } else if (role === 'admin') {
      await Admin.findByIdAndUpdate(id, { currentSessionId: null, activeSessionId: null });
    } else if (role === 'superadmin') {
      await SuperAdmin.findByIdAndUpdate(id, {
        $pull: { activeSessions: { sessionId } }
      });
    }

    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('[LOGOUT ERROR]', error);
    res.status(500).json({ error: 'Server error during logout.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/sessions
// SuperAdmin only — returns their active session list for DeviceManagement.jsx
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/auth/sessions', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Super Admins can access session list.' });
    }

    const superAdmin = await SuperAdmin.findById(req.user.id).select('activeSessions');
    if (!superAdmin) {
      return res.status(404).json({ error: 'Super Admin not found.' });
    }

    return res.status(200).json({ sessions: superAdmin.activeSessions });
  } catch (error) {
    console.error('[SESSIONS ERROR]', error);
    res.status(500).json({ error: 'Server error fetching sessions.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/sessions/:sessionId
// SuperAdmin only — remotely revokes a specific session.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/api/auth/sessions/:sessionId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Super Admins can revoke sessions.' });
    }

    const { sessionId } = req.params;
    await SuperAdmin.findByIdAndUpdate(req.user.id, {
      $pull: { activeSessions: { sessionId } }
    });

    return res.status(200).json({ message: `Session ${sessionId} revoked.` });
  } catch (error) {
    console.error('[REVOKE SESSION ERROR]', error);
    res.status(500).json({ error: 'Server error revoking session.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdmin Admin Management APIs
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/super-admin/pending-admins — lists all pending admins
router.get('/api/super-admin/pending-admins', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const pending = await Admin.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(pending);
  } catch (err) {
    console.error('[GET PENDING ADMINS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch pending admin requests.' });
  }
});

// GET /api/super-admin/admins — lists all active/revoked admins with full referral keys history
router.get('/api/super-admin/admins', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const admins = await Admin.find({ status: { $in: ['active', 'revoked'] } }).sort({ name: 1 });
    const students = await Student.find({ adminReferralCode: { $exists: true, $ne: '' } }, 'assignedAdminId adminReferralCode').catch(() => []);

    const formattedAdmins = admins.map(adminDoc => {
      const adminObj = adminDoc.toObject();
      const activeCode = (adminObj.referralCode || '').trim().toUpperCase();

      const keySet = new Set();
      if (activeCode) keySet.add(activeCode);

      const storedHistory = Array.isArray(adminObj.referralKeysHistory) ? adminObj.referralKeysHistory : [];
      storedHistory.forEach(k => {
        if (k && k.code && k.code.trim()) {
          keySet.add(k.code.trim().toUpperCase());
        }
      });

      students.forEach(s => {
        if (
          s.assignedAdminId && s.assignedAdminId.toString() === adminObj._id.toString() &&
          s.adminReferralCode && s.adminReferralCode.trim()
        ) {
          keySet.add(s.adminReferralCode.trim().toUpperCase());
        }
      });

      const fullHistory = Array.from(keySet).map(code => {
        const isActive = activeCode && code === activeCode;
        return {
          code: code,
          status: isActive ? 'Active' : 'Deactivated'
        };
      });

      return {
        ...adminObj,
        referralKeysHistory: fullHistory
      };
    });

    res.json(formattedAdmins);
  } catch (err) {
    console.error('[GET ADMINS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch admins.' });
  }
});

// POST /api/super-admin/approve-admin/:id — approves a pending admin and assigns a referral code
router.post('/api/super-admin/approve-admin/:id', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    admin.status = 'active';
    if (!admin.referralCode || admin.referralCode === 'CB-ADMIN-001' || admin.referralCode === 'REF-CB2025') {
      admin.referralCode = await generateUniqueAdminReferralCode();
    }
    await admin.save();

    // Log Activity for Super Admin Recent Platform Activity feed (Admin Approved)
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: req.user?.name || 'Super Admin',
          email: req.user?.email || 'system@skillbridge.in'
        },
        recipient: {
          name: admin.name || 'Mentor Admin',
          email: admin.email || ''
        },
        type: 'ADMIN_APPROVED',
        message: `Super Admin approved Admin/Mentor account for ${admin.name} (${admin.email}) from ${admin.city || ''}, ${admin.state || ''}. Assigned referral code: ${admin.referralCode}.`,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log ADMIN_APPROVED ActivityLog:', logErr);
    }

    const { recalculateSystemMetrics } = require('../utils/systemMetrics');
    await recalculateSystemMetrics().catch(err => console.error('Failed to update metrics on approve admin:', err));

    res.json({ message: `Admin ${admin.email} approved successfully.`, admin });
  } catch (err) {
    console.error('[APPROVE ADMIN ERROR]', err);
    res.status(500).json({ error: 'Failed to approve admin.' });
  }
});

// POST /api/super-admin/revoke-admin/:id — revokes admin access and unlinks assigned students while preserving lastAssignedAdminId
router.post('/api/super-admin/revoke-admin/:id', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    admin.status = 'revoked';
    // Preserve activeSessionId so session signature passes and 403 ADMIN_REVOKED UX screen is shown

    // Unlink all students assigned to this revoked admin, but preserve lastAssignedAdminId
    const regexRef = admin.referralCode ? new RegExp('^' + admin.referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    await Student.updateMany(
      {
        $or: [
          { assignedAdminId: admin._id },
          ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : [])
        ]
      },
      {
        $set: { 
          assignedAdminId: null, 
          lastAssignedAdminId: admin._id,
          adminReferralCode: '' 
        }
      }
    );

    admin.assignedStudents = [];
    await admin.save();

    const { recalculateSystemMetrics } = require('../utils/systemMetrics');
    await recalculateSystemMetrics().catch(err => console.error('Failed to update metrics on revoke admin:', err));

    res.json({ message: `Admin ${admin.email} access revoked and students moved to unassigned mentor queue.`, admin });
  } catch (err) {
    console.error('[REVOKE ADMIN ERROR]', err);
    res.status(500).json({ error: 'Failed to revoke admin access.' });
  }
});

// POST /api/super-admin/restore-admin/:id — restores admin access & automatically re-links remaining unassigned students
router.post('/api/super-admin/restore-admin/:id', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    admin.status = 'active';

    // Find all students currently UNASSIGNED (assignedAdminId == null) whose lastAssignedAdminId was this admin
    const unassignedStudentsToRestore = await Student.find({
      assignedAdminId: null,
      lastAssignedAdminId: admin._id
    });

    for (const student of unassignedStudentsToRestore) {
      student.assignedAdminId = admin._id;
      if (admin.referralCode) {
        student.adminReferralCode = admin.referralCode;
      }
      await student.save();
    }

    // Re-sync admin's assignedStudents list with all active students currently linked to this admin
    const currentAssignedStudents = await Student.find({ assignedAdminId: admin._id });
    admin.assignedStudents = currentAssignedStudents.map(s => s._id);

    await admin.save();

    const { recalculateSystemMetrics } = require('../utils/systemMetrics');
    await recalculateSystemMetrics().catch(err => console.error('Failed to update metrics on restore admin:', err));

    res.json({ 
      message: `Admin ${admin.email} access restored successfully. ${unassignedStudentsToRestore.length} remaining unassigned students automatically re-linked.`, 
      admin 
    });
  } catch (err) {
    console.error('[RESTORE ADMIN ERROR]', err);
    res.status(500).json({ error: 'Failed to restore admin access.' });
  }
});

// Helper to calculate overall leaderboard net points and ranks for all students
const calculateOverallLeaderboardMap = async () => {
  try {
    const ExamResult = require('../models/ExamResult');
    const [results, allStudents] = await Promise.all([
      ExamResult.find({}).lean().catch(() => []),
      Student.find({}, 'email').lean().catch(() => [])
    ]);

    const pointsMap = {};
    results.forEach(r => {
      if (r.studentEmail) {
        const emailKey = r.studentEmail.toLowerCase().trim();
        let examPts = 0;

        if (Array.isArray(r.questionsDetailed) && r.questionsDetailed.length > 0) {
          examPts = r.questionsDetailed.reduce((sum, q) => sum + (typeof q.points === 'number' ? q.points : 0), 0);
        } else {
          const isMentor = Boolean(r.isMentorExam);
          const correct = r.correctAnswers || 0;
          const total = r.totalQuestions || 10;
          const remaining = total - correct;
          const wrong = Math.floor(remaining * 0.8);
          const unattempted = remaining - wrong;

          if (isMentor) {
            examPts = (correct * 5) - (wrong * 10) - (unattempted * 5);
          } else {
            examPts = (correct * 2) - (wrong * 2) - (unattempted * 1);
          }
        }

        pointsMap[emailKey] = (pointsMap[emailKey] || 0) + examPts;
      }
    });

    const leaderboard = allStudents.map(s => {
      const emailKey = (s.email || '').toLowerCase().trim();
      return {
        email: emailKey,
        pts: pointsMap[emailKey] || 0
      };
    });

    leaderboard.sort((a, b) => b.pts - a.pts);

    const rankMap = {};
    leaderboard.forEach((entry, idx) => {
      if (entry.email) {
        rankMap[entry.email] = {
          pts: entry.pts,
          rank: idx + 1
        };
      }
    });

    return rankMap;
  } catch (err) {
    console.error('Error calculating overall leaderboard map:', err);
    return {};
  }
};

// GET /api/admin/students — lists all students registered with this admin's referral code
router.get('/api/admin/students', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const regexRef = admin.referralCode ? new RegExp('^' + admin.referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    const query = {
      $or: [
        { assignedAdminId: admin._id },
        ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : [])
      ]
    };

    const students = await Student.find(query).select('name email mobile isUnlocked isTrialActive createdAt assignedUnlockFee razorpayPaymentId docGrade10 docGrade12 docResume percentage10th percentage12th grade10Percentage grade12Percentage').sort({ createdAt: -1 });
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ status: 'paid' }).sort({ createdAt: -1 }).lean().catch(() => []);
    const rankMap = await calculateOverallLeaderboardMap();

    const formatted = students.map(s => {
      const emailKey = (s.email || '').toLowerCase().trim();
      const ptsData = rankMap[emailKey] || { pts: 0, rank: null };
      const p = payments.find(pay => 
        (pay.razorpayPaymentId && s.razorpayPaymentId && pay.razorpayPaymentId === s.razorpayPaymentId) ||
        (pay.studentEmail && s.email && pay.studentEmail.trim().toLowerCase() === emailKey)
      );
      const paidFee = p ? p.amount : (s.assignedUnlockFee || null);
      
      const p10 = s.percentage10th || (s.grade10Percentage ? `${s.grade10Percentage}%` : '');
      const p12 = s.percentage12th || (s.grade12Percentage ? `${s.grade12Percentage}%` : '');

      return {
        id: s._id,
        name: s.name,
        email: s.email,
        mobile: s.mobile || '',
        isUnlocked: s.isUnlocked,
        isTrialActive: s.isTrialActive,
        assignedUnlockFee: s.assignedUnlockFee || null,
        paidFee: paidFee,
        docGrade10: s.docGrade10 || null,
        docGrade12: s.docGrade12 || null,
        docResume: s.docResume || null,
        percentage10th: p10 ? (p10.endsWith('%') ? p10 : `${p10}%`) : 'N/A',
        percentage12th: p12 ? (p12.endsWith('%') ? p12 : `${p12}%`) : 'N/A',
        createdAt: s.createdAt,
        status: s.isUnlocked ? 'Unlocked' : (s.isTrialActive ? 'Active' : 'Deactivated'),
        referralCodeUsed: s.adminReferralCode || admin.referralCode || 'N/A',
        pts: ptsData.pts ?? 0,
        rank: ptsData.rank || null
      };
    });

    res.json({ students: formatted });
  } catch (err) {
    console.error('[GET ADMIN STUDENTS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch referred students.' });
  }
});

// GET /api/admin/stats — Stale-While-Revalidate Database Metrics Caching for Admin Dashboard
router.get('/api/admin/stats', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const AdminMetrics = require('../models/AdminMetrics');
    const { recalculateAdminMetrics } = require('../utils/adminMetrics');

    const adminId = req.user.id;

    // 1. Fetch cached metrics from DB first for instant response
    let cachedMetrics = await AdminMetrics.findOne({ adminId }).lean();

    if (cachedMetrics) {
      // Return cached metrics immediately to client (0 delay)
      res.json({
        activeStudents: cachedMetrics.activeStudents || 0,
        totalStudents: cachedMetrics.totalStudents || 0,
        totalExams: cachedMetrics.totalExams || 0,
        averageScore: cachedMetrics.averageScore || '0%',
        pendingReviews: cachedMetrics.pendingReviews || 0,
        cachedAt: cachedMetrics.lastCalculatedAt
      });

      // Revalidate in background asynchronously (Stale-While-Revalidate pattern)
      setImmediate(() => {
        recalculateAdminMetrics(adminId).catch(err => console.error('Background recalculate admin metrics error:', err));
      });
    } else {
      // First time load: calculate synchronously, save to DB, and return
      const recalculated = await recalculateAdminMetrics(adminId);
      if (recalculated) {
        return res.json({
          activeStudents: recalculated.activeStudents || 0,
          totalStudents: recalculated.totalStudents || 0,
          totalExams: recalculated.totalExams || 0,
          averageScore: recalculated.averageScore || '0%',
          pendingReviews: recalculated.pendingReviews || 0,
          cachedAt: recalculated.lastCalculatedAt
        });
      } else {
        return res.json({
          activeStudents: 0,
          totalStudents: 0,
          totalExams: 0,
          averageScore: '0%',
          pendingReviews: 0
        });
      }
    }
  } catch (err) {
    console.error('[GET ADMIN STATS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch admin dashboard stats.' });
  }
});

// GET /api/admin/reports — Detailed exam performance & analytics reports for this Admin's candidates
router.get('/api/admin/reports', verifyToken, async (req, res) => {
  try {
    let admin = null;
    if (req.user && req.user.id) {
      admin = await Admin.findById(req.user.id).lean().catch(() => null);
    }
    if (!admin && req.user && req.user.email) {
      admin = await Admin.findOne({ email: req.user.email.toLowerCase().trim() }).lean().catch(() => null);
    }

    const MentorExam = require('../models/MentorExam');
    const ExamResult = require('../models/ExamResult');

    const adminId = admin ? admin._id : null;
    const referralCode = admin ? admin.referralCode : null;

    const regexRef = referralCode ? new RegExp('^' + referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    const query = adminId ? {
      $or: [
        { assignedAdminId: adminId },
        ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : [])
      ]
    } : {};

    const [referredStudents, totalExams] = await Promise.all([
      Student.find(query, '_id name email notifications').lean().catch(() => []),
      adminId ? MentorExam.countDocuments({ createdBy: adminId }).catch(() => 0) : MentorExam.countDocuments({}).catch(() => 0)
    ]);

    const studentEmails = (referredStudents || [])
      .map(s => (s && s.email ? String(s.email).toLowerCase().trim() : ''))
      .filter(Boolean);

    const studentNameMap = {};
    const studentNotifMap = {};
    (referredStudents || []).forEach(s => {
      if (s && s.email) {
        const eKey = String(s.email).toLowerCase().trim();
        studentNameMap[eKey] = s.name || 'Candidate';
        studentNotifMap[eKey] = Array.isArray(s.notifications) && s.notifications.length > 0;
      }
    });

    let results = [];
    if (studentEmails.length > 0) {
      results = await ExamResult.find({
        studentEmail: { $in: studentEmails.map(e => new RegExp('^' + e.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i')) }
      }).sort({ createdAt: -1 }).lean().catch(() => []);
    }

    let overallAverage = 0;
    if (results && results.length > 0) {
      const sum = results.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
      overallAverage = Math.round(sum / results.length);
    }

    // Performance Analytics: Overall & Subject-wise Pass/Fail counts strictly for this Admin's candidates
    const subjectStats = {
      'All Subjects': { pass: 0, fail: 0, total: 0 },
      'Aptitude & Reasoning': { pass: 0, fail: 0, total: 0 },
      'Problem Solving & Logic': { pass: 0, fail: 0, total: 0 },
      'Communication & Verbal': { pass: 0, fail: 0, total: 0 },
      'Behaviour & Personality': { pass: 0, fail: 0, total: 0 },
      'Situational Judgment': { pass: 0, fail: 0, total: 0 },
      'Workplace & Professional Skills': { pass: 0, fail: 0, total: 0 }
    };

    (results || []).forEach(r => {
      const rawScore = Number(r.score) || 0;
      const isPass = r.status === 'Pass' || rawScore >= 60;
      const isMentor = Boolean(r.isMentorExam);
      const title = (r.subject || r.examTitle || '').toLowerCase();

      let subjectName = r.examTitle || r.subject || 'Assessment Test';

      if (!isMentor) {
        if (title.includes('aptitude') || title.includes('math') || title.includes('reasoning') || title.includes('quant')) {
          subjectName = 'Aptitude & Reasoning';
        } else if (title.includes('problem') || title.includes('code') || title.includes('technical') || title.includes('logic') || title.includes('stack')) {
          subjectName = 'Problem Solving & Logic';
        } else if (title.includes('communication') || title.includes('verbal') || title.includes('english') || title.includes('grammar')) {
          subjectName = 'Communication & Verbal';
        } else if (title.includes('behaviour') || title.includes('behavior') || title.includes('personality') || title.includes('soft')) {
          subjectName = 'Behaviour & Personality';
        } else if (title.includes('situational') || title.includes('judgment') || title.includes('ethics')) {
          subjectName = 'Situational Judgment';
        } else if (title.includes('workplace') || title.includes('professional') || title.includes('skill')) {
          subjectName = 'Workplace & Professional Skills';
        }
      }

      subjectStats['All Subjects'].total += 1;
      if (isPass) subjectStats['All Subjects'].pass += 1;
      else subjectStats['All Subjects'].fail += 1;

      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { pass: 0, fail: 0, total: 0 };
      }
      subjectStats[subjectName].total += 1;
      if (isPass) subjectStats[subjectName].pass += 1;
      else subjectStats[subjectName].fail += 1;
    });

    const performanceAnalytics = {
      overall: {
        pass: subjectStats['All Subjects'].pass,
        fail: subjectStats['All Subjects'].fail,
        total: subjectStats['All Subjects'].total,
        passRate: subjectStats['All Subjects'].total > 0 ? Math.round((subjectStats['All Subjects'].pass / subjectStats['All Subjects'].total) * 100) : 0,
        failRate: subjectStats['All Subjects'].total > 0 ? (100 - Math.round((subjectStats['All Subjects'].pass / subjectStats['All Subjects'].total) * 100)) : 0
      },
      subjects: {}
    };

    Object.keys(subjectStats).forEach(subj => {
      const st = subjectStats[subj];
      const pRate = st.total > 0 ? Math.round((st.pass / st.total) * 100) : 0;
      const fRate = st.total > 0 ? (100 - pRate) : 0;
      performanceAnalytics.subjects[subj] = {
        pass: st.pass,
        fail: st.fail,
        total: st.total,
        passRate: pRate,
        failRate: fRate
      };
    });

    // Standard Platform Modules (Including Mentor & Custom Assessments)
    const STANDARD_MODULES = [
      { key: 'mentor_assessments', name: 'Mentor & Custom Assessments', icon: '👑', color: 'bg-amber-600', barColor: 'from-amber-500 to-yellow-600' },
      { key: 'aptitude', name: 'Aptitude & Reasoning', icon: '🧠', color: 'bg-blue-600', barColor: 'from-blue-500 to-indigo-600' },
      { key: 'problem_solving', name: 'Problem Solving & Logic', icon: '🧩', color: 'bg-emerald-600', barColor: 'from-emerald-500 to-teal-600' },
      { key: 'communication', name: 'Communication & Verbal', icon: '💬', color: 'bg-purple-600', barColor: 'from-purple-500 to-violet-600' },
      { key: 'behaviour', name: 'Behaviour & Personality', icon: '🎭', color: 'bg-amber-600', barColor: 'from-amber-500 to-orange-600' },
      { key: 'situational', name: 'Situational Judgment', icon: '⚖️', color: 'bg-indigo-600', barColor: 'from-indigo-500 to-blue-700' },
      { key: 'workplace_skills', name: 'Workplace & Professional Skills', icon: '🛠️', color: 'bg-rose-600', barColor: 'from-rose-500 to-pink-600' }
    ];

    const moduleDataMap = {};
    STANDARD_MODULES.forEach(m => {
      moduleDataMap[m.key] = {};
    });

    (results || []).forEach(r => {
      const isMentor = Boolean(r.isMentorExam);
      const title = (r.subject || r.examTitle || '').toLowerCase();
      let targetKey = 'workplace_skills';

      if (isMentor) {
        targetKey = 'mentor_assessments';
      } else if (title.includes('aptitude') || title.includes('math') || title.includes('reasoning') || title.includes('quant')) {
        targetKey = 'aptitude';
      } else if (title.includes('problem') || title.includes('code') || title.includes('technical') || title.includes('logic') || title.includes('stack')) {
        targetKey = 'problem_solving';
      } else if (title.includes('communication') || title.includes('verbal') || title.includes('english') || title.includes('grammar')) {
        targetKey = 'communication';
      } else if (title.includes('behaviour') || title.includes('behavior') || title.includes('personality') || title.includes('soft')) {
        targetKey = 'behaviour';
      } else if (title.includes('situational') || title.includes('judgment') || title.includes('ethics')) {
        targetKey = 'situational';
      }

      const scoreNum = Number(r.score) || 0;
      const emailKey = r.studentEmail ? String(r.studentEmail).toLowerCase().trim() : (r.studentName || 'candidate').toLowerCase().trim();
      const candidateName = studentNameMap[emailKey] || r.studentName || 'Candidate';

      if (!moduleDataMap[targetKey][emailKey]) {
        moduleDataMap[targetKey][emailKey] = {
          name: candidateName,
          email: r.studentEmail || '',
          score: scoreNum,
          examTitle: r.examTitle || r.subject || 'Assessment Test',
          date: r.createdAt || r.date,
          attemptsCount: 1
        };
      } else {
        const existing = moduleDataMap[targetKey][emailKey];
        existing.attemptsCount += 1;
        if (scoreNum > existing.score) {
          existing.score = scoreNum;
          existing.examTitle = r.examTitle || r.subject || existing.examTitle;
          existing.date = r.createdAt || r.date || existing.date;
        }
      }
    });

    const modulePerformance = STANDARD_MODULES.map(m => {
      const studentMap = moduleDataMap[m.key];
      const uniqueCandidates = Object.values(studentMap);
      const totalCount = uniqueCandidates.length;

      let well = 0;
      let needsWork = 0;
      const scores = [];

      uniqueCandidates.forEach(c => {
        scores.push(c.score);
        if (c.score >= 60) {
          well += 1;
        } else {
          needsWork += 1;
        }
      });

      let average = 0;
      let delta = '0%';
      let proficiencyRate = 0;
      let summary = 'No candidate submissions evaluated yet';

      if (totalCount > 0) {
        average = Math.round(scores.reduce((a, b) => a + b, 0) / totalCount);
        const deltaVal = average - 50;
        delta = deltaVal >= 0 ? `+${deltaVal}%` : `${deltaVal}%`;
        proficiencyRate = Math.round((well / totalCount) * 100);
        summary = `${well} of ${totalCount} candidate${totalCount > 1 ? 's' : ''} performing well (${proficiencyRate}% proficiency)`;
      }

      // Ranked candidates for Subject Scoreboard Modal (1 entry per unique candidate)
      const rankedCandidates = [...uniqueCandidates]
        .sort((a, b) => b.score - a.score)
        .map((c, idx) => ({
          rank: idx + 1,
          name: c.name,
          email: c.email,
          score: c.score,
          examTitle: c.examTitle,
          attemptsCount: c.attemptsCount,
          status: c.score >= 60 ? 'Pass' : 'Needs Work',
          date: c.date ? new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Recently'
        }));

      return {
        key: m.key,
        name: m.name,
        icon: m.icon,
        average: average,
        delta: delta,
        performingWellCount: well,
        needsImprovementCount: needsWork,
        totalEvaluated: totalCount,
        proficiencyRate: `${proficiencyRate}%`,
        summary: summary,
        barColor: m.barColor,
        color: m.color,
        candidates: rankedCandidates
      };
    });

    // Top Performers (deduplicated by student, sorted highest score first)
    const topPerformersMap = {};
    (results || []).forEach(r => {
      const emailKey = r.studentEmail ? String(r.studentEmail).toLowerCase().trim() : (r.studentName || 'candidate').toLowerCase().trim();
      const scoreNum = Number(r.score) || 0;
      const candidateName = studentNameMap[emailKey] || r.studentName || 'Candidate';
      const testTitle = r.examTitle || r.subject || 'Assessment Test';
      const dateStr = r.createdAt || r.date ? new Date(r.createdAt || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Recently';

      if (!topPerformersMap[emailKey] || scoreNum > topPerformersMap[emailKey].scoreNum) {
        topPerformersMap[emailKey] = {
          name: candidateName,
          test: testTitle,
          scoreNum: scoreNum,
          score: `${scoreNum}%`,
          date: dateStr
        };
      }
    });

    const topPerformers = Object.values(topPerformersMap)
      .sort((a, b) => b.scoreNum - a.scoreNum)
      .slice(0, 10);

    // Recent Exam Submissions (sorted newest submission first)
    const recentSubmissions = [...(results || [])]
      .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
      .map(r => {
        const emailKey = r.studentEmail ? String(r.studentEmail).toLowerCase().trim() : '';
        const rawScore = Number(r.score) || 0;
        return {
          id: r._id ? r._id.toString() : '',
          studentName: studentNameMap[emailKey] || r.studentName || 'Candidate',
          studentEmail: r.studentEmail || '',
          subject: r.examTitle || r.subject || 'Assessment Test',
          score: rawScore,
          status: rawScore >= 60 ? 'Pass' : 'Needs Work',
          date: r.createdAt || r.date ? new Date(r.createdAt || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          isMentorExam: Boolean(r.isMentorExam),
          pdfUrl: r.pdfUrl || r.cloudinaryUrl || (r._id ? `/api/results/pdf/${r._id}?admin=true` : '')
        };
      });

    // Actionable Failed Student Alerts (sorted newest first)
    const failedStudentAlerts = [...(results || [])]
      .filter(r => {
        const rawScore = Number(r.score) || 0;
        return r.status === 'Fail' || rawScore < 60;
      })
      .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
      .map(r => {
        const emailKey = r.studentEmail ? String(r.studentEmail).toLowerCase().trim() : '';
        const rawScore = Number(r.score) || 0;
        const examTitle = r.examTitle || r.subject || 'Assessment Test';
        const candidateName = studentNameMap[emailKey] || r.studentName || 'Candidate';

        const isResponded = Boolean(r.isResponded);

        return {
          id: r._id ? r._id.toString() : '',
          studentName: candidateName,
          studentEmail: r.studentEmail || '',
          examTitle: examTitle,
          score: rawScore,
          status: 'Fail',
          date: r.createdAt || r.date ? new Date(r.createdAt || r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
          isResponded: isResponded,
          isMentorExam: Boolean(r.isMentorExam),
          defaultResponseMsg: `Hi ${candidateName}, we noticed your recent score in ${examTitle} (${rawScore}%). Don't worry! Please review your weak topics or reach out to us for mentor guidance.`
        };
      });

    res.json({
      overallAverage: `${overallAverage}%`,
      rawAverage: overallAverage,
      totalExams,
      totalSubmissions: results.length,
      performanceAnalytics,
      modulePerformance,
      topPerformers,
      recentSubmissions,
      failedStudentAlerts
    });
  } catch (err) {
    console.error('Fetch admin reports error:', err);
    res.json({
      overallAverage: '0%',
      rawAverage: 0,
      totalExams: 0,
      totalSubmissions: 0,
      performanceAnalytics: { overall: { pass: 0, fail: 0, total: 0, passRate: 0, failRate: 0 }, subjects: {} },
      modulePerformance: [],
      topPerformers: [],
      recentSubmissions: [],
      failedStudentAlerts: []
    });
  }
});

// GET /api/admin/pending-reviews — lists all student documents (10th, 12th marksheets, resume) pending review for this admin
router.get('/api/admin/pending-reviews', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const regexRef = admin.referralCode ? new RegExp('^' + admin.referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    const query = {
      $and: [
        {
          $or: [
            { assignedAdminId: admin._id },
            ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : []),
            { assignedAdminId: { $exists: false } },
            { assignedAdminId: null }
          ]
        },
        {
          $or: [
            { docGrade10: { $exists: true, $ne: null, $ne: '' } },
            { docGrade12: { $exists: true, $ne: null, $ne: '' } },
            { docResume: { $exists: true, $ne: null, $ne: '' } }
          ]
        }
      ]
    };

    const students = await Student.find(query).select('name email mobile profilePhoto docGrade10 docGrade12 docResume percentage10th percentage12th createdAt updatedAt resumeReview aiAnalysis adminReferralCode').sort({ updatedAt: -1 });

    const formatted = students.map(s => {
      const docCount = [s.docGrade10, s.docGrade12, s.docResume].filter(d => Boolean(d && String(d).trim())).length;
      return {
        id: s._id,
        studentName: s.name,
        email: s.email,
        mobile: s.mobile || 'N/A',
        profilePhoto: s.profilePhoto || '',
        docGrade10: s.docGrade10 || '',
        docGrade12: s.docGrade12 || '',
        docResume: s.docResume || '',
        percentage10th: s.percentage10th || '',
        percentage12th: s.percentage12th || '',
        adminReferralCode: s.adminReferralCode || '',
        docCount: docCount,
        resumeUrl: s.docResume || '',
        initials: s.name ? s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S',
        details: `Uploaded ${docCount} Verification Document(s)`,
        time: new Date(s.updatedAt || s.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
        reviewStatus: s.resumeReview?.status || 'pending',
        resumeReview: s.resumeReview || null,
        aiAnalysis: s.aiAnalysis || null
      };
    });

    res.json({ reviews: formatted });
  } catch (err) {
    console.error('[GET PENDING REVIEWS ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch pending reviews.' });
  }
});

// GET /api/admin/student-review/:studentId — gets document and review details of a student
router.get('/api/admin/student-review/:studentId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).select('name email mobile profilePhoto docGrade10 docGrade12 docResume percentage10th percentage12th resumeReview aiAnalysis createdAt adminReferralCode');
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({
      student: {
        id: student._id,
        studentName: student.name,
        email: student.email,
        mobile: student.mobile || 'N/A',
        profilePhoto: student.profilePhoto || '',
        docGrade10: student.docGrade10 || '',
        docGrade12: student.docGrade12 || '',
        docResume: student.docResume || '',
        percentage10th: student.percentage10th || '',
        percentage12th: student.percentage12th || '',
        adminReferralCode: student.adminReferralCode || '',
        resumeUrl: student.docResume || '',
        reviewStatus: student.resumeReview?.status || 'pending',
        resumeReview: student.resumeReview || null,
        aiAnalysis: student.aiAnalysis || null
      }
    });
  } catch (err) {
    console.error('[GET STUDENT REVIEW ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch student details.' });
  }
});

// POST /api/admin/resume-review — submits mentor resume feedback and creates student notification
router.post('/api/admin/resume-review', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const { studentId, atsScore, formattingFeedback, impactFeedback } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const parsedAtsScore = Number(atsScore);
    if (isNaN(parsedAtsScore) || parsedAtsScore < 0 || parsedAtsScore > 100) {
      return res.status(400).json({ error: 'ATS Score must be a number between 0 and 100.' });
    }

    // Save/Update Mentor Resume Review on Student model
    student.resumeReview = {
      atsScore: parsedAtsScore,
      formattingFeedback: (formattingFeedback || '').trim(),
      impactFeedback: (impactFeedback || '').trim(),
      reviewedBy: admin.name || 'Mentor Admin',
      reviewedAt: new Date(),
      status: 'reviewed'
    };

    // Create Notification for Student Dashboard
    const notification = {
      id: 'rev_' + Date.now(),
      subject: 'Action Required: Resume Optimization',
      type: 'Mentor Resume Review',
      message: `Mentor ${admin.name || 'Admin'} reviewed your resume! ATS Score: ${parsedAtsScore}%. Click to view your feedback.`,
      senderName: admin.name || 'Mentor Admin',
      senderEmail: admin.email || '',
      senderPhoto: admin.profilePhoto || '',
      link: '/student/resume',
      timestamp: new Date(),
      unread: true
    };

    if (!Array.isArray(student.notifications)) {
      student.notifications = [];
    }
    student.notifications.unshift(notification);

    await student.save();

    // Log Activity for Super Admin Recent Platform Activity feed
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: admin.name || 'Mentor Admin',
          email: admin.email || ''
        },
        recipient: {
          name: student.name || 'Candidate',
          email: student.email || ''
        },
        type: 'ADMIN_NOTIFICATION',
        message: `Admin ${admin.name} sent resume feedback/notification to student ${student.name} (${student.email}). ATS Score: ${parsedAtsScore}%.`,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log ADMIN_NOTIFICATION ActivityLog:', logErr);
    }

    res.json({
      message: 'Resume review and feedback submitted successfully.',
      resumeReview: student.resumeReview
    });
  } catch (err) {
    console.error('[SUBMIT RESUME REVIEW ERROR]', err);
    res.status(500).json({ error: 'Failed to submit resume review.' });
  }
});

// POST /api/admin/toggle-student/:id — toggles student active/trial status
router.post('/api/admin/toggle-student/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const isLinked = (student.assignedAdminId && student.assignedAdminId.toString() === admin._id.toString()) ||
                     (student.adminReferralCode && admin.referralCode && student.adminReferralCode.trim().toLowerCase() === admin.referralCode.trim().toLowerCase());

    if (!isLinked) {
      return res.status(403).json({ error: 'Not authorized to manage this student.' });
    }

    student.isTrialActive = !student.isTrialActive;

    // Remove any previous internal audit notifications from student's notifications array
    if (Array.isArray(student.notifications)) {
      student.notifications = student.notifications.filter(
        n => n.type !== 'Account Activated' && n.type !== 'Account Deactivated' &&
             n.subject !== 'Account Activated' && n.subject !== 'Account Deactivated'
      );
    }
    await student.save();

    // Log platform activity event in dedicated ActivityLog collection for SUPSS Super Admin
    const statusText = student.isTrialActive ? 'Account Activated' : 'Account Deactivated';
    const actionDetails = student.isTrialActive 
      ? `Admin ${admin.name} activated candidate account for ${student.name} (${student.email}).`
      : `Admin ${admin.name} deactivated candidate account for ${student.name} (${student.email}).`;

    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      ownerId: null,
      ownerRole: 'SuperAdmin',
      sender: {
        name: admin.name,
        email: admin.email
      },
      recipient: {
        name: student.name || 'Candidate',
        email: student.email
      },
      type: statusText,
      message: actionDetails,
      timestamp: new Date()
    }).catch(err => console.error('Failed to create ActivityLog:', err));

    // Instantly recalculate SUPSS metrics cache so disabledCandidates count updates immediately
    const { recalculateSystemMetrics } = require('../utils/systemMetrics');
    await recalculateSystemMetrics().catch(err => console.error('Failed to update metrics cache on toggle:', err));

    res.json({ message: 'Student status updated successfully.', student });
  } catch (err) {
    console.error('[TOGGLE STUDENT STATUS ERROR]', err);
    res.status(500).json({ error: 'Failed to toggle student status.' });
  }
});

// GET /api/super-admin/candidates — lists all students/candidates on the platform for Super Admin
router.get('/api/super-admin/candidates', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const students = await Student.find({}).sort({ createdAt: -1 });
    const admins = await Admin.find({});
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ status: 'paid' }).sort({ createdAt: -1 }).lean().catch(() => []);
    const rankMap = await calculateOverallLeaderboardMap();
    
    const SystemConfig = require('../models/SystemConfig');
    const sysConfig = await SystemConfig.findOne().catch(() => null);
    const globalBaseFee = (sysConfig && sysConfig.unlockFee) ? sysConfig.unlockFee : 99;

    const formatted = students.map(s => {
      const emailKey = (s.email || '').toLowerCase().trim();
      const ptsData = rankMap[emailKey] || { pts: 0, rank: null };
      const admin = admins.find(a => 
        a.status === 'active' && (
          (a._id && s.assignedAdminId && a._id.toString() === s.assignedAdminId.toString()) ||
          (a.referralCode && s.adminReferralCode && a.referralCode.trim().toLowerCase() === s.adminReferralCode.trim().toLowerCase())
        )
      );
      const isUpgraded = !!s.isUnlocked;
      const isDeactivated = s.isTrialActive === false;
      const p = payments.find(pay => 
        (pay.razorpayPaymentId && s.razorpayPaymentId && pay.razorpayPaymentId === s.razorpayPaymentId) ||
        (pay.studentEmail && s.email && pay.studentEmail.trim().toLowerCase() === s.email.trim().toLowerCase())
      );

      let effectiveAssignedFee = globalBaseFee;
      if (isUpgraded && s.assignedUnlockFee) {
        effectiveAssignedFee = s.assignedUnlockFee;
      } else if (admin && admin.customUnlockFee !== null && admin.customUnlockFee !== undefined && admin.customUnlockFee !== '') {
        effectiveAssignedFee = Number(admin.customUnlockFee);
      } else if (s.assignedUnlockFee && s.assignedUnlockFee !== 99) {
        effectiveAssignedFee = s.assignedUnlockFee;
      }

      const paidFee = p ? p.amount : (isUpgraded ? effectiveAssignedFee : 0);

      return {
        id: s._id,
        _id: s._id,
        name: s.name,
        email: s.email,
        mobile: s.mobile || '',
        city: admin ? (admin.city || '-') : '-',
        linkedAdmin: admin ? admin.name : 'Unassigned',
        linkedAdminId: admin ? admin._id : null,
        adminReferralCode: s.adminReferralCode || (admin ? admin.referralCode : '') || '',
        isUnlocked: isUpgraded,
        isTrialActive: !isDeactivated,
        assignedUnlockFee: effectiveAssignedFee,
        paidFee: paidFee,
        razorpayPaymentId: s.razorpayPaymentId || (p ? p.razorpayPaymentId : ''),
        docGrade10: s.docGrade10 || null,
        docGrade12: s.docGrade12 || null,
        grade10Percentage: (s.grade10Percentage !== undefined && s.grade10Percentage !== null) ? s.grade10Percentage : (s.percentage10th || null),
        grade12Percentage: (s.grade12Percentage !== undefined && s.grade12Percentage !== null) ? s.grade12Percentage : (s.percentage12th || null),
        allocatedDurationMonths: s.allocatedDurationMonths || 6,
        mentorCustomDurationMonths: admin ? (admin.customStudentDurationMonths || admin.passkeyAllocatedDurationMonths || null) : null,
        accessExpiresAt: s.accessExpiresAt || s.subscriptionExpiry || null,
        trialExpiresAt: s.trialExpiresAt || null,
        createdAt: s.createdAt,
        dateJoined: new Date(s.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
        status: isDeactivated ? 'Deactivated' : (isUpgraded ? 'Upgraded' : 'Pending Upgrade'),
        pts: ptsData.pts ?? 0,
        rank: ptsData.rank || null
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('[GET ALL CANDIDATES ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch platform candidates.' });
  }
});

// POST /api/super-admin/assign-mentor — assigns or reassigns an admin/mentor to a student
router.post('/api/super-admin/assign-mentor', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const { studentId, adminId } = req.body;
    if (!studentId || !adminId) {
      return res.status(400).json({ error: 'Student ID and Admin ID are required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Selected Admin/Mentor not found.' });
    }

    // Unlink from previous admin if any
    if (student.assignedAdminId && student.assignedAdminId.toString() !== admin._id.toString()) {
      const prevAdmin = await Admin.findById(student.assignedAdminId);
      if (prevAdmin && prevAdmin.assignedStudents) {
        prevAdmin.assignedStudents = prevAdmin.assignedStudents.filter(id => id.toString() !== student._id.toString());
        await prevAdmin.save();
      }
    }

    // Link with new admin/mentor (without auto-upgrading payment status)
    student.assignedAdminId = admin._id;
    student.lastAssignedAdminId = admin._id;
    if (admin.referralCode) {
      student.adminReferralCode = admin.referralCode;
    }

    // Lock candidate assigned unlock fee & duration based on mentor's tier or global default
    if (admin.customUnlockFee !== null && admin.customUnlockFee !== undefined && admin.customUnlockFee !== '') {
      student.assignedUnlockFee = Number(admin.customUnlockFee);
    } else if (!student.assignedUnlockFee) {
      const SystemConfig = require('../models/SystemConfig');
      const sysConfig = await SystemConfig.findOne().catch(() => null);
      student.assignedUnlockFee = (sysConfig && sysConfig.unlockFee) ? Number(sysConfig.unlockFee) : 99;
    }

    if (admin.customStudentDurationMonths !== null && admin.customStudentDurationMonths !== undefined && Number(admin.customStudentDurationMonths) > 0) {
      student.allocatedDurationMonths = Number(admin.customStudentDurationMonths);
    } else if (!student.allocatedDurationMonths) {
      const SystemConfig = require('../models/SystemConfig');
      const sysConfig = await SystemConfig.findOne().catch(() => null);
      student.allocatedDurationMonths = (sysConfig && sysConfig.defaultStudentDurationMonths) ? Number(sysConfig.defaultStudentDurationMonths) : 6;
    }

    await student.save();

    if (!admin.assignedStudents) {
      admin.assignedStudents = [];
    }
    if (!admin.assignedStudents.some(id => id.toString() === student._id.toString())) {
      admin.assignedStudents.push(student._id);
      await admin.save();
    }

    // Log platform activity event in dedicated ActivityLog collection for SUPSS Super Admin
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: req.user?.name || 'Super Admin',
          email: req.user?.email || 'system@skillbridge.in'
        },
        recipient: {
          name: student.name || 'Candidate',
          email: student.email || ''
        },
        type: 'MENTOR_ASSIGNED',
        message: `Assigned mentor ${admin.name} (${admin.email}) to student ${student.name} (${student.email}).`,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to create MENTOR_ASSIGNED ActivityLog:', logErr);
    }

    // Recalculate metrics cache so Candidate Governance KPI card updates immediately
    const { recalculateSystemMetrics } = require('../utils/systemMetrics');
    await recalculateSystemMetrics().catch(err => console.error('Failed to update metrics cache on assign mentor:', err));

    res.json({
      message: `Successfully assigned ${admin.name} as mentor to ${student.name}.`,
      student,
      admin: { id: admin._id, name: admin.name, referralCode: admin.referralCode }
    });
  } catch (err) {
    console.error('[ASSIGN MENTOR ERROR]', err);
    res.status(500).json({ error: 'Failed to assign mentor to student.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a 6-digit OTP to the registered email for password reset.
// Enforces strict role validation to prevent cross-role OTP reset exploits.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }

    const targetRole = String(role).toLowerCase().trim();
    if (!['student', 'admin', 'superadmin'].includes(targetRole)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Perform cross-role check across all user models (Student, Admin, SuperAdmin, User)
    const [studentDoc, adminDoc, superAdminDoc, userDoc] = await Promise.all([
      Student.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail }),
      SuperAdmin.findOne({ email: normalizedEmail }),
      User.findOne({ email: normalizedEmail })
    ]);

    // Check if account exists anywhere in system
    const hasAnyAccount = Boolean(studentDoc || adminDoc || superAdminDoc || userDoc);
    if (!hasAnyAccount) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    // Determine target account matching requested role strictly
    let targetAccount = null;
    if (targetRole === 'admin') {
      targetAccount = adminDoc || (userDoc && userDoc.role === 'admin' ? userDoc : null);
    } else if (targetRole === 'superadmin') {
      targetAccount = superAdminDoc || (userDoc && userDoc.role === 'superadmin' ? userDoc : null);
    } else if (targetRole === 'student') {
      targetAccount = studentDoc || (userDoc && userDoc.role === 'student' ? userDoc : null);
    }

    // If email exists in database but role does NOT match requested portal:
    if (!targetAccount) {
      return res.status(403).json({
        error: 'This email is associated with a different account type. Please use the correct login portal.'
      });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    targetAccount.set('resetOtp', otpCode, { strict: false });
    targetAccount.set('resetOtpExpiresAt', otpExpiresAt, { strict: false });
    await targetAccount.save();

    // Send OTP email (Template B: Reset OTP)
    const { sendAdminResetOtpEmail } = require('../utils/sendEmail');
    const emailSent = await sendAdminResetOtpEmail(normalizedEmail, otpCode, targetRole);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send reset OTP. Please try again later.' });
    }

    // Also log to terminal for easy testing
    console.log(`\n==================================================`);
    console.log(`[FORGOT PASSWORD] OTP for ${normalizedEmail} (${targetRole})`);
    console.log(`RESET OTP CODE: ${otpCode}`);
    console.log(`==================================================\n`);

    return res.status(200).json({
      message: 'Password reset OTP has been sent to your email.',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error);
    res.status(500).json({ error: 'Server error during password reset request.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Verifies the OTP and sets a new password.
// Enforces strict role validation matching forgotten password request.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, role, otp, newPassword } = req.body;

    if (!email || !role || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, role, OTP, and new password are required.' });
    }

    const targetRole = String(role).toLowerCase().trim();
    if (!['student', 'admin', 'superadmin'].includes(targetRole)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Perform cross-role check across all user models
    const [studentDoc, adminDoc, superAdminDoc, userDoc] = await Promise.all([
      Student.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail }),
      SuperAdmin.findOne({ email: normalizedEmail }),
      User.findOne({ email: normalizedEmail })
    ]);

    const hasAnyAccount = Boolean(studentDoc || adminDoc || superAdminDoc || userDoc);
    if (!hasAnyAccount) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    let targetAccount = null;
    if (targetRole === 'admin') {
      targetAccount = adminDoc || (userDoc && userDoc.role === 'admin' ? userDoc : null);
    } else if (targetRole === 'superadmin') {
      targetAccount = superAdminDoc || (userDoc && userDoc.role === 'superadmin' ? userDoc : null);
    } else if (targetRole === 'student') {
      targetAccount = studentDoc || (userDoc && userDoc.role === 'student' ? userDoc : null);
    }

    if (!targetAccount) {
      return res.status(403).json({
        error: 'This email is associated with a different account type. Please use the correct login portal.'
      });
    }

    // Validate OTP on targetAccount
    const storedOtp = targetAccount.get ? targetAccount.get('resetOtp') : targetAccount.resetOtp;
    const otpExpiry = targetAccount.get ? targetAccount.get('resetOtpExpiresAt') : targetAccount.resetOtpExpiresAt;

    if (!storedOtp || storedOtp.toString() !== otp.toString()) {
      return res.status(401).json({ error: 'Invalid OTP code.' });
    }
    if (otpExpiry && new Date() > new Date(otpExpiry)) {
      return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Hash and save new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    if (targetAccount.passwordHash !== undefined) {
      targetAccount.passwordHash = passwordHash;
    }
    if (targetAccount.password !== undefined) {
      targetAccount.password = passwordHash;
    }

    // Clear reset OTP fields
    if (targetAccount.set) {
      targetAccount.set('resetOtp', undefined, { strict: false });
      targetAccount.set('resetOtpExpiresAt', undefined, { strict: false });
    } else {
      targetAccount.resetOtp = undefined;
      targetAccount.resetOtpExpiresAt = undefined;
    }
    await targetAccount.save();

    console.log(`[PASSWORD RESET] Password successfully reset for ${normalizedEmail} (${targetRole})`);

    return res.status(200).json({
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/admin-status/:email
// Checks approval status of an admin account by email.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/auth/admin-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    return res.status(200).json({ status: admin.status });
  } catch (err) {
    console.error('[CHECK ADMIN STATUS ERROR]', err);
    res.status(500).json({ error: 'Server error checking status.' });
  }
});


// ── GET /api/auth/verify-session ─────────────────────────────────────────────
// Verifies that the JWT is valid and the user document still exists in the DB.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/auth/verify-session', verifyToken, (req, res) => {
  res.status(200).json({ valid: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/passkeys
// Returns current active passkey, usage history, and stats.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/api/super-admin/passkeys', async (req, res) => {
  try {
    const { getOrCreateActivePasskey } = require('../utils/passkeyManager');
    const SuperAdminPasskey = require('../models/SuperAdminPasskey');

    const activePasskeyDoc = await getOrCreateActivePasskey('System');
    const history = await SuperAdminPasskey.find({}).sort({ createdAt: -1 }).lean();

    const totalGenerated = history.length;
    const totalUsed = history.filter(k => k.isUsed).length;
    const totalActive = history.filter(k => !k.isUsed).length;

    return res.json({
      activeKey: activePasskeyDoc.key,
      activeKeyDoc: activePasskeyDoc,
      history,
      stats: {
        totalGenerated,
        totalUsed,
        totalActive
      }
    });
  } catch (err) {
    console.error('Fetch superadmin passkeys error:', err);
    return res.status(500).json({ error: 'Failed to fetch passkey records.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/super-admin/passkeys/generate
// Generates a new active passkey and returns updated list.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/api/super-admin/passkeys/generate', async (req, res) => {
  try {
    const { generateRandomPasskey } = require('../utils/passkeyManager');
    const SuperAdminPasskey = require('../models/SuperAdminPasskey');

    let newKey = generateRandomPasskey();
    let exists = await SuperAdminPasskey.findOne({ key: newKey });
    while (exists) {
      newKey = generateRandomPasskey();
      exists = await SuperAdminPasskey.findOne({ key: newKey });
    }

    const createdBy = req.body?.createdBy || 'Super Admin';
    const newPasskeyDoc = await SuperAdminPasskey.create({
      key: newKey,
      isUsed: false,
      createdBy
    });

    const history = await SuperAdminPasskey.find({}).sort({ createdAt: -1 }).lean();
    const totalGenerated = history.length;
    const totalUsed = history.filter(k => k.isUsed).length;
    const totalActive = history.filter(k => !k.isUsed).length;

    return res.json({
      message: 'New Super Admin passkey generated successfully!',
      activeKey: newPasskeyDoc.key,
      activeKeyDoc: newPasskeyDoc,
      history,
      stats: {
        totalGenerated,
        totalUsed,
        totalActive
      }
    });
  } catch (err) {
    console.error('Generate passkey error:', err);
    return res.status(500).json({ error: 'Failed to generate new passkey.' });
  }
});

module.exports = router;
