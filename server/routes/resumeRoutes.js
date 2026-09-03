const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { analyzeResumeAi, streamResumePdf, analyzeStudentResumeByAdmin } = require('../controllers/resumeController');
const { requireRole } = require('../middleware/authMiddleware');

// POST /api/resume/analyze-ai
router.post('/api/resume/analyze-ai', verifyToken, analyzeResumeAi);

// POST /api/admin/analyze-student-resume/:studentId
router.post('/api/admin/analyze-student-resume/:studentId', verifyToken, requireRole('admin'), analyzeStudentResumeByAdmin);

// GET /api/resume/pdf-stream/:studentId (Public stream endpoint with inline Disposition)
router.get('/api/resume/pdf-stream/:studentId', streamResumePdf);

module.exports = router;
