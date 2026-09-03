const SystemMetrics = require('../models/SystemMetrics');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const MentorExam = require('../models/MentorExam');
const Job = require('../models/Job');
const Payment = require('../models/Payment');

const ChatLog = require('../models/ChatLog');

async function recalculateSystemMetrics() {
  try {
    const [admins, students, exams, jobs, payments, chatLogs] = await Promise.all([
      Admin.find({}).lean().catch(() => []),
      Student.find({}).lean().catch(() => []),
      MentorExam.find({ isActive: true }).lean().catch(() => []),
      Job.find({}).lean().catch(() => []),
      Payment.find({}).lean().catch(() => []),
      ChatLog.find({}).lean().catch(() => [])
    ]);

    const totalAdmins = admins.length;
    const pendingAdmins = admins.filter(a => a.status === 'pending').length;
    const activeAdmins = admins.filter(a => a.status === 'active').length;
    const revokedAdmins = admins.filter(a => a.status === 'revoked').length;

    const totalCandidates = students.length;
    const disabledCandidates = students.filter(s => s.isTrialActive === false || s.isActive === false || s.status === 'disabled' || s.status === 'deactivated').length;
    const upgradedCandidates = students.filter(s => s.isUnlocked === true).length;
    const pendingCandidates = students.filter(s => (!s.assignedAdminId && (!s.adminReferralCode || s.adminReferralCode.trim() === '')) && s.isTrialActive !== false && s.isActive !== false).length;
    const activeCandidates = students.filter(s => (s.assignedAdminId || (s.adminReferralCode && s.adminReferralCode.trim() !== '')) && s.isTrialActive !== false && s.isActive !== false).length;

    const totalExams = exams.length;
    const totalJobs = jobs.filter(j => j.status === 'approved').length;
    const pendingJobs = jobs.filter(j => j.status === 'pending').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (Array.isArray(j.applicants) ? j.applicants.length : 0), 0);
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalChatLogs = chatLogs.length;

    const metrics = await SystemMetrics.findOneAndUpdate(
      { key: 'global_metrics' },
      {
        totalAdmins,
        pendingAdmins,
        activeAdmins,
        revokedAdmins,
        totalCandidates,
        pendingCandidates,
        activeCandidates,
        upgradedCandidates,
        disabledCandidates,
        totalExams,
        totalJobs,
        pendingJobs,
        totalApplications,
        totalRevenue,
        totalChatLogs
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return metrics;
  } catch (err) {
    console.error('[METRICS RECALCULATE ERROR]', err);
    return null;
  }
}

async function getSystemMetrics() {
  try {
    return await recalculateSystemMetrics();
  } catch (err) {
    console.error('[GET METRICS ERROR]', err);
    return null;
  }
}

module.exports = {
  recalculateSystemMetrics,
  getSystemMetrics
};
