const AdminMetrics = require('../models/AdminMetrics');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const MentorExam = require('../models/MentorExam');
const ExamResult = require('../models/ExamResult');

/**
 * Recalculates KPI metrics for a specific Admin and updates the database cache asynchronously.
 * Supports Stale-While-Revalidate architecture for instant Admin Dashboard loads.
 * 
 * @param {string|mongoose.Types.ObjectId} adminId - The Admin ID to recalculate metrics for
 */
async function recalculateAdminMetrics(adminId) {
  try {
    if (!adminId) return null;

    const admin = await Admin.findById(adminId).lean();
    if (!admin) return null;

    const regexRef = admin.referralCode ? new RegExp('^' + admin.referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    const query = {
      $or: [
        { assignedAdminId: admin._id },
        ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : [])
      ]
    };

    const [totalStudents, activeStudents, totalExams, referredStudents, pendingReviews] = await Promise.all([
      Student.countDocuments(query),
      Student.countDocuments({ ...query, isTrialActive: true }),
      MentorExam.countDocuments({ createdBy: admin._id }),
      Student.find(query, 'email').lean(),
      Student.countDocuments({ ...query, docResume: { $exists: true, $ne: null, $ne: '' } })
    ]);

    const studentEmails = referredStudents.map(s => s.email ? s.email.toLowerCase().trim() : '').filter(Boolean);
    const results = studentEmails.length > 0 
      ? await ExamResult.find({ studentEmail: { $in: studentEmails } }).lean()
      : [];

    let avgScore = 0;
    if (results.length > 0) {
      const sum = results.reduce((acc, curr) => acc + (curr.score || 0), 0);
      avgScore = Math.round(sum / results.length);
    }
    const averageScoreStr = `${avgScore}%`;

    const metrics = await AdminMetrics.findOneAndUpdate(
      { adminId: admin._id },
      {
        activeStudents,
        totalStudents,
        totalExams,
        averageScore: averageScoreStr,
        pendingReviews,
        lastCalculatedAt: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    return metrics;
  } catch (err) {
    console.error(`Failed to recalculate admin metrics for admin ${adminId}:`, err);
    return null;
  }
}

module.exports = { recalculateAdminMetrics };
