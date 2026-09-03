const Student = require('../models/Student');
const Admin = require('../models/Admin');

async function healStudentMentorLinks() {
  try {
    const students = await Student.find({});
    const admins = await Admin.find({ status: 'active' });

    let healedCount = 0;
    for (const student of students) {
      let needsSave = false;
      let matchedAdmin = null;

      // Case 1: student has assignedAdminId
      if (student.assignedAdminId) {
        matchedAdmin = admins.find(a => a._id.toString() === student.assignedAdminId.toString());
      }

      // Case 2: student has adminReferralCode but no matchedAdmin found yet
      if (!matchedAdmin && student.adminReferralCode) {
        const cleanRef = student.adminReferralCode.trim().toLowerCase();
        matchedAdmin = admins.find(a => a.referralCode && a.referralCode.trim().toLowerCase() === cleanRef);
        if (matchedAdmin) {
          student.assignedAdminId = matchedAdmin._id;
          needsSave = true;
        }
      }

      // Case 3: student has matchedAdmin but no adminReferralCode
      if (matchedAdmin && matchedAdmin.referralCode && (!student.adminReferralCode || student.adminReferralCode.trim().toLowerCase() !== matchedAdmin.referralCode.trim().toLowerCase())) {
        student.adminReferralCode = matchedAdmin.referralCode;
        needsSave = true;
      }

      if (needsSave) {
        await student.save();
        healedCount++;
      }

      // Ensure student ID is inside matchedAdmin.assignedStudents
      if (matchedAdmin) {
        if (!matchedAdmin.assignedStudents) {
          matchedAdmin.assignedStudents = [];
        }
        if (!matchedAdmin.assignedStudents.some(id => id.toString() === student._id.toString())) {
          matchedAdmin.assignedStudents.push(student._id);
          await matchedAdmin.save();
        }
      }
    }

    if (healedCount > 0) {
      console.log(`[SELF-HEAL] Successfully linked/healed ${healedCount} student-mentor relationships.`);
    }
  } catch (err) {
    console.error('[SELF-HEAL ERROR]', err.message);
  }
}

module.exports = healStudentMentorLinks;
