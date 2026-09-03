const Job = require('../models/Job');
const { recalculateSystemMetrics } = require('../utils/systemMetrics');

// Create a new job posting
exports.createJob = async (req, res) => {
  try {
    const { title, company, location, jobType, salary, description, applyLink, uploaderRole, uploadedBy } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'Title, company, and description are required fields.' });
    }

    const role = uploaderRole || (req.user && req.user.role) || 'admin';
    const status = role === 'super-admin' ? 'approved' : 'pending';

    const rawUploadedBy = uploadedBy || (req.user && (req.user.email || req.user.id)) || 'system';

    const newJob = new Job({
      title,
      company,
      location: location || 'Remote',
      jobType: jobType || 'Full-Time',
      salary: salary || 'Not Disclosed',
      description,
      applyLink: applyLink || '',
      uploadedBy: rawUploadedBy,
      uploaderRole: role,
      status
    });

    const savedJob = await newJob.save();

    // Resolve poster identity for Super Admin Recent Platform Activity feed
    let posterName = role === 'super-admin' ? 'Super Admin' : 'Mentor Admin';
    let posterEmail = rawUploadedBy;

    try {
      const Admin = require('../models/Admin');
      let adminDoc = null;

      if (req.user && req.user.id) {
        adminDoc = await Admin.findById(req.user.id).catch(() => null);
      }
      if (!adminDoc && rawUploadedBy && rawUploadedBy.includes('@')) {
        adminDoc = await Admin.findOne({ email: rawUploadedBy.toLowerCase().trim() }).catch(() => null);
      }

      if (adminDoc) {
        posterName = adminDoc.name || adminDoc.institutionName || posterName;
        posterEmail = adminDoc.email || posterEmail;
      }
    } catch (e) {}

    // Log Activity for Super Admin Recent Platform Activity Feed
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: posterName,
          email: posterEmail
        },
        recipient: {
          name: company || 'Corporate Partner',
          email: title || 'Job Opening'
        },
        type: role === 'super-admin' ? 'Job Published' : 'Job Posted',
        message: `${posterName} (${posterEmail}) posted job: "${title}" at ${company}${status === 'pending' ? ' (Pending SUPSS Review).' : '.'}`,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log job creation activity for SuperAdmin:', logErr);
    }

    recalculateSystemMetrics().catch(() => {});
    res.status(201).json(savedJob);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all approved jobs (for Students & Public)
exports.getApprovedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'approved' })
      .populate('applicants.studentId', 'name email mobile docResume profilePhoto grade10Percentage grade12Percentage percentage10th percentage12th city state')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching approved jobs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all pending jobs (for Super Admins)
exports.getPendingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'pending' })
      .populate('applicants.studentId', 'name email mobile docResume profilePhoto grade10Percentage grade12Percentage percentage10th percentage12th city state')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching pending jobs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all jobs (Approved, Pending, Declined) with populated applicants for Super Admin Dashboard
exports.getSuperAdminJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('applicants.studentId', 'name email mobile docResume profilePhoto grade10Percentage grade12Percentage percentage10th percentage12th city state')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching super admin jobs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Apply for a job (Student Portal)
exports.applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Student authentication required.' });
    }

    const Student = require('../models/Student');
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student account not found.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    if (job.status !== 'approved') {
      return res.status(400).json({ error: 'This job posting is not open for applications.' });
    }

    // Check if student has already applied
    const alreadyAppliedInJob = job.applicants.some(
      a => a.studentId && a.studentId.toString() === studentId.toString()
    );
    const alreadyAppliedInStudent = student.appliedJobs && student.appliedJobs.some(
      a => a.jobId && a.jobId.toString() === jobId.toString()
    );

    if (alreadyAppliedInJob || alreadyAppliedInStudent) {
      return res.status(400).json({ error: 'You have already submitted an application for this job.' });
    }

    const appliedAt = new Date();

    // Push into Job.applicants
    job.applicants.push({
      studentId: student._id,
      appliedAt
    });
    await job.save();

    // Push into Student.appliedJobs
    if (!student.appliedJobs) student.appliedJobs = [];
    student.appliedJobs.push({
      jobId: job._id,
      appliedAt
    });
    await student.save();

    // Log Activity for SuperAdmin (SUPSS Recent Platform Activity feed) & Mentor Admin
    try {
      const ActivityLog = require('../models/ActivityLog');
      
      // 1. SuperAdmin Activity Log
      await ActivityLog.create({
        ownerId: null,
        ownerRole: 'SuperAdmin',
        sender: {
          name: student.name || 'Candidate',
          email: student.email || ''
        },
        recipient: {
          name: job.company || 'Corporate Partner',
          email: job.title || 'Job Opening'
        },
        type: 'Job Application',
        message: `${student.name || student.email} applied for "${job.title}" at ${job.company}.`,
        timestamp: appliedAt
      });

      // 2. Mentor Admin Activity Log (if candidate is linked to a mentor)
      let assignedAdminId = student.assignedAdminId || null;
      if (!assignedAdminId && student.adminReferralCode && student.adminReferralCode.trim()) {
        const Admin = require('../models/Admin');
        const matchedAdmin = await Admin.findOne({ referralCode: student.adminReferralCode.trim() });
        if (matchedAdmin) assignedAdminId = matchedAdmin._id;
      }

      if (assignedAdminId) {
        await ActivityLog.create({
          ownerId: assignedAdminId,
          ownerRole: 'Admin',
          sender: {
            name: student.name || 'Candidate',
            email: student.email || ''
          },
          recipient: {
            name: job.company || 'Corporate Partner',
            email: job.title || 'Job Opening'
          },
          type: 'Job Application',
          message: `${student.name || student.email} applied for "${job.title}" at ${job.company}.`,
          timestamp: appliedAt
        });
      }
    } catch (logErr) {
      console.error('Failed to log job application activity:', logErr);
    }

    recalculateSystemMetrics().catch(() => {});

    res.json({
      success: true,
      message: `Application submitted successfully for ${job.title} at ${job.company}!`,
      appliedAt
    });
  } catch (error) {
    console.error('Error applying for job:', error);
    res.status(500).json({ error: error.message || 'Failed to submit job application.' });
  }
};

// Update job status (Approve, Decline, Archive, Restore)
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'declined', 'pending', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value provided.' });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      { status },
      { returnDocument: 'after' }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    recalculateSystemMetrics().catch(() => {});
    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Permanently delete a job posting
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }
    recalculateSystemMetrics().catch(() => {});
    res.json({ success: true, message: 'Job posting permanently deleted.' });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    res.status(500).json({ error: error.message });
  }
};

// Edit job details (and optionally update status/approve)
exports.editJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, company, location, jobType, salary, description, applyLink, status } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (company !== undefined) updateFields.company = company;
    if (location !== undefined) updateFields.location = location;
    if (jobType !== undefined) updateFields.jobType = jobType;
    if (salary !== undefined) updateFields.salary = salary;
    if (description !== undefined) updateFields.description = description;
    if (applyLink !== undefined) updateFields.applyLink = applyLink;
    if (status !== undefined) updateFields.status = status;

    const updatedJob = await Job.findByIdAndUpdate(
      id,
      updateFields,
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: 'Job posting not found.' });
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('Error editing job posting:', error);
    res.status(500).json({ error: error.message });
  }
};
