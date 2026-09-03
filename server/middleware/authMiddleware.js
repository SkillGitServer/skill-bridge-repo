const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * verifyToken — validates the Bearer JWT from the Authorization header.
 * Checks the database to ensure the user document still exists.
 * Attaches req.user = { id, email, role, sessionId } on success.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Authorization denied.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Perform database existence check
    const userId = decoded.id;
    const role = decoded.role;
    let userExists = false;

    if (role === 'student') {
      const user = await Student.findById(userId).select('_id isTrialActive isActive status currentSessionId activeSessionId accessExpiresAt isUnlocked allocatedDurationMonths').lean();
      if (user) {
        if (user.isTrialActive === false || user.isActive === false || user.status === 'disabled' || user.status === 'deactivated') {
          return res.status(403).json({ error: 'Your account has been deactivated by an administrator.' });
        }
        const activeSess = user.activeSessionId || user.currentSessionId;
        if (decoded.sessionId && activeSess && decoded.sessionId !== activeSess) {
          return res.status(401).json({ error: 'Session expired. You logged in on another device.' });
        }
        userExists = true;
        const isExp = Boolean(user.isUnlocked && user.accessExpiresAt && new Date(user.accessExpiresAt) < new Date());
        decoded.isExpired = isExp;
        decoded.accessExpiresAt = user.accessExpiresAt;
        decoded.allocatedDurationMonths = user.allocatedDurationMonths || 6;
      }
    } else if (role === 'admin') {
      const user = await Admin.findById(userId).select('_id status currentSessionId activeSessionId').lean();
      if (user) {
        const activeSess = user.activeSessionId || user.currentSessionId;
        if (decoded.sessionId && activeSess && decoded.sessionId !== activeSess) {
          return res.status(401).json({ error: 'Session expired. You logged in on another device.' });
        }
        if (user.status === 'revoked') {
          return res.status(403).json({
            success: false,
            code: 'ADMIN_REVOKED',
            error: 'Your administrator access has been revoked by the Super Admin.',
            message: 'Your administrator access has been revoked. Please contact the Super Admin for assistance.'
          });
        }
        if (user.status === 'active') {
          userExists = true;
        }
      }
    } else if (['superadmin', 'super-admin', 'super_admin'].includes(role)) {
      const user = await SuperAdmin.findById(userId).select('_id').lean();
      if (user) userExists = true;
    }

    if (!userExists) {
      return res.status(401).json({ error: 'User no longer exists. Session invalid.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired. Please log in again.' });
  }
};

/**
 * requireRole(...roles) — factory middleware for role-based access.
 * Use after verifyToken.
 * Example: router.get('/admin-only', verifyToken, requireRole('admin', 'superadmin'), handler)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const userRole = req.user.role;
    const isSuperAdminUser = ['superadmin', 'super-admin', 'super_admin'].includes(userRole);
    const isSuperAdminRequired = roles.some(r => ['superadmin', 'super-admin', 'super_admin'].includes(r));

    const isAllowed = roles.includes(userRole) || (isSuperAdminUser && isSuperAdminRequired);

    if (!isAllowed) {
      return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
