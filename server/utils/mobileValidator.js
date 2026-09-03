const Student = require('../models/Student');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');

/**
 * Normalizes a mobile string to its last 10 digits for strict uniqueness checking.
 * E.g., "+917414908641", "917414908641", "07414908641", "7414908641" -> "7414908641"
 */
function normalizeMobile(mobileStr) {
  if (!mobileStr) return '';
  const digits = String(mobileStr).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Checks if a mobile number is already registered across Student, Admin, or SuperAdmin collections.
 * @param {string} mobileStr - The mobile number to check.
 * @param {object} excludeUser - Optional user to exclude from check (e.g. { userId, model: 'Student'|'Admin'|'SuperAdmin' }).
 * @returns {Promise<boolean>} - True if mobile number is already taken by another account, false otherwise.
 */
async function isMobileAlreadyInUse(mobileStr, excludeUser = { userId: null, model: null }) {
  if (!mobileStr) return false;
  const clean10 = normalizeMobile(mobileStr);
  if (!clean10 || clean10.length < 10) return false;

  const mobileRegex = new RegExp(clean10 + '$');

  // 1. Check in Student collection
  const studentQuery = { mobile: { $regex: mobileRegex } };
  if (excludeUser && excludeUser.model === 'Student' && excludeUser.userId) {
    studentQuery._id = { $ne: excludeUser.userId };
  }
  const existingStudent = await Student.findOne(studentQuery).lean();
  if (existingStudent) return true;

  // 2. Check in Admin collection
  const adminQuery = { mobile: { $regex: mobileRegex } };
  if (excludeUser && excludeUser.model === 'Admin' && excludeUser.userId) {
    adminQuery._id = { $ne: excludeUser.userId };
  }
  const existingAdmin = await Admin.findOne(adminQuery).lean();
  if (existingAdmin) return true;

  // 3. Check in SuperAdmin collection
  const superAdminQuery = { mobile: { $regex: mobileRegex } };
  if (excludeUser && excludeUser.model === 'SuperAdmin' && excludeUser.userId) {
    superAdminQuery._id = { $ne: excludeUser.userId };
  }
  const existingSuperAdmin = await SuperAdmin.findOne(superAdminQuery).lean();
  if (existingSuperAdmin) return true;

  return false;
}

module.exports = {
  normalizeMobile,
  isMobileAlreadyInUse
};
