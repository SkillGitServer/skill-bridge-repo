const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Public / Student route: Get approved jobs
router.get('/api/jobs', jobController.getApprovedJobs);

// Student Apply Endpoint: Apply for a job
router.post('/api/jobs/:jobId/apply', verifyToken, requireRole('student'), jobController.applyForJob);

// Create a new job posting (Direct approved if super-admin, pending if admin)
router.post('/api/jobs', jobController.createJob);

// Super Admin & Admin route: Get all jobs (Approved, Pending, Declined) with populated applicants
router.get('/api/super-admin/jobs', verifyToken, requireRole('superadmin', 'super-admin', 'admin'), jobController.getSuperAdminJobs);

// Super Admin route: Get pending jobs
router.get('/api/admin/jobs/pending', jobController.getPendingJobs);

// Super Admin route: Update job status (Approve / Decline)
router.put('/api/admin/jobs/:id/status', jobController.updateJobStatus);

// Super Admin route: Edit job details (and optionally approve)
router.put('/api/admin/jobs/:id', jobController.editJob);

// Delete job posting route
router.delete('/api/jobs/:id', verifyToken, requireRole('superadmin', 'super-admin', 'admin'), jobController.deleteJob);

module.exports = router;
