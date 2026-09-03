const Student = require('../models/Student');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');

/**
 * Checks if an email address is already registered across Student, Admin, SuperAdmin, or User collections.
 * @param {string} emailStr - The email address to check.
 * @param {object} excludeUser - Optional user to exclude from check (e.g. { userId, model: 'Student'|'Admin'|'SuperAdmin' }).
 * @returns {Promise<boolean>} - True if email is already taken by another account, false otherwise.
 */
async function isEmailAlreadyInUse(emailStr, excludeUser = { userId: null, model: null }) {
  if (!emailStr) return false;
  const cleanEmail = String(emailStr).toLowerCase().trim();
  if (!cleanEmail) return false;

  // 1. Check in Student collection
  const studentQuery = { email: cleanEmail };
  if (excludeUser && excludeUser.model === 'Student' && excludeUser.userId) {
    studentQuery._id = { $ne: excludeUser.userId };
  }
  const existingStudent = await Student.findOne(studentQuery).lean();
  if (existingStudent) return true;

  // 2. Check in Admin collection
  const adminQuery = { email: cleanEmail };
  if (excludeUser && excludeUser.model === 'Admin' && excludeUser.userId) {
    adminQuery._id = { $ne: excludeUser.userId };
  }
  const existingAdmin = await Admin.findOne(adminQuery).lean();
  if (existingAdmin) return true;

  // 3. Check in SuperAdmin collection
  const superAdminQuery = { email: cleanEmail };
  if (excludeUser && excludeUser.model === 'SuperAdmin' && excludeUser.userId) {
    superAdminQuery._id = { $ne: excludeUser.userId };
  }
  const existingSuperAdmin = await SuperAdmin.findOne(superAdminQuery).lean();
  if (existingSuperAdmin) return true;

  // 4. Check in User collection
  const userQuery = { email: cleanEmail };
  if (excludeUser && excludeUser.userId) {
    userQuery._id = { $ne: excludeUser.userId };
  }
  const existingUser = await User.findOne(userQuery).lean();
  if (existingUser) return true;

  return false;
}

module.exports = {
  isEmailAlreadyInUse
};
