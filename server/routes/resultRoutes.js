const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Helper function to map answer values (indexes or strings or single letters A-F) to actual option text
function formatAnswerText(ansVal, optionsArray) {
  if (ansVal === null || ansVal === undefined || ansVal === '') {
    return 'Not Answered / Skipped';
  }

  const strVal = String(ansVal).trim();

  // 1. If single letter A, B, C, D, E, F
  if (/^[A-F]$/i.test(strVal)) {
    const letterIdx = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(strVal.toUpperCase());
    if (letterIdx !== -1 && Array.isArray(optionsArray) && optionsArray[letterIdx]) {
      const optText = optionsArray[letterIdx];
      const optStr = typeof optText === 'object' ? (optText.text || JSON.stringify(optText)) : String(optText);
      if (/^[A-F][\.\)\s]/i.test(optStr.trim())) {
        return optStr;
      }
      return `${strVal.toUpperCase()}. ${optStr}`;
    }
  }

  // 2. If ansVal is numeric index 0-9
  const idxNum = Number(strVal);
  if (!isNaN(idxNum) && idxNum >= 0 && idxNum <= 9) {
    if (Array.isArray(optionsArray) && optionsArray[idxNum]) {
      const optText = optionsArray[idxNum];
      const optPrefix = ['A', 'B', 'C', 'D', 'E', 'F'][idxNum] || `${idxNum + 1}`;
      const optStr = typeof optText === 'object' ? (optText.text || JSON.stringify(optText)) : String(optText);
      if (/^[A-F][\.\)\s]/i.test(optStr.trim())) {
        return optStr;
      }
      return `${optPrefix}. ${optStr}`;
    }
    const letters = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'];
    return letters[idxNum] || `Option ${idxNum + 1}`;
  }

  if (typeof ansVal === 'object') {
    return ansVal.text || ansVal.answer || JSON.stringify(ansVal);
  }

  return String(ansVal);
}

// Helper function to render PDF contents (Page 1 summary + Page 2+ detailed breakdown)
function renderPdfContents(doc, result) {
  // ── Page 1 Top Brand Banner Bar ──
  doc.rect(0, 0, 612, 10).fill('#1e3a8a');
  doc.rect(0, 10, 612, 3).fill('#f97316');

  // Header Title & Subtitle
  doc.fillColor('#0f172a')
     .font('Helvetica-Bold')
     .fontSize(24)
     .text('SKILL BRIDGE INDIA', 50, 40, { tracking: 1 });

  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor('#f97316')
     .text('OFFICIAL ASSESSMENT & SKILL EVALUATION REPORT', 50, 68, { tracking: 1.5 });

  // Header Separator Line
  doc.strokeColor('#cbd5e1')
     .lineWidth(1)
     .moveTo(50, 88)
     .lineTo(562, 88)
     .stroke();

  const dateFormatted = new Date(result.date || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // ── Dual Boxed Info Cards Section ──
  const boxY = 105;
  const boxWidth = 248;
  const boxHeight = 105;

  // Left Card: Candidate Profile
  doc.fillColor('#f8fafc')
     .rect(50, boxY, boxWidth, boxHeight)
     .fill();

  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .rect(50, boxY, boxWidth, boxHeight)
     .stroke();

  doc.fillColor('#2563eb')
     .rect(50, boxY, 4, boxHeight)
     .fill();

  doc.fillColor('#0f172a')
     .font('Helvetica-Bold')
     .fontSize(10.5)
     .text('Candidate Profile', 64, boxY + 12);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Name: ', 64, boxY + 34, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#0f172a')
     .text(result.studentName || 'Candidate');

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Email: ', 64, boxY + 54, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#0f172a')
     .text(result.studentEmail || 'N/A');

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Date: ', 64, boxY + 74, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#0f172a')
     .text(dateFormatted);

  // Right Card: Performance Metrics
  const rightBoxX = 314;
  doc.fillColor('#f8fafc')
     .rect(rightBoxX, boxY, boxWidth, boxHeight)
     .fill();

  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .rect(rightBoxX, boxY, boxWidth, boxHeight)
     .stroke();

  doc.fillColor('#7c3aed')
     .rect(rightBoxX, boxY, 4, boxHeight)
     .fill();

  doc.fillColor('#0f172a')
     .font('Helvetica-Bold')
     .fontSize(10.5)
     .text('Performance Details', rightBoxX + 14, boxY + 12);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Total Questions: ', rightBoxX + 14, boxY + 34, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#0f172a')
     .text(`${result.totalQuestions || 10}`);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Correct Answers: ', rightBoxX + 14, boxY + 54, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#059669')
     .text(`${result.correctAnswers || 0}`);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Incorrect/Skipped: ', rightBoxX + 14, boxY + 74, { continued: true })
     .font('Helvetica-Bold')
     .fillColor('#dc2626')
     .text(`${(result.totalQuestions || 10) - (result.correctAnswers || 0)}`);

  // ── Emphasized Score Summary Card (Focal Point) ──
  const scoreY = 228;
  const scoreWidth = 512;
  const scoreHeight = 125;
  const isPass = result.status === 'Pass';
  const themeColor = isPass ? '#059669' : '#dc2626';

  doc.fillColor('#f8fafc')
     .rect(50, scoreY, scoreWidth, scoreHeight)
     .fill();

  doc.strokeColor('#cbd5e1')
     .lineWidth(1)
     .rect(50, scoreY, scoreWidth, scoreHeight)
     .stroke();

  doc.fillColor(themeColor)
     .rect(50, scoreY, 6, scoreHeight)
     .fill();

  doc.fillColor('#0f172a')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(result.examTitle || 'Assessment Test', 72, scoreY + 16, { width: 440 });

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#64748b')
     .text('Official Certified Domain Evaluation Result', 72, scoreY + 36);

  doc.font('Helvetica-Bold')
     .fontSize(9)
     .fillColor('#64748b')
     .text('FINAL SCORE', 72, scoreY + 62);

  doc.font('Helvetica-Bold')
     .fontSize(34)
     .fillColor(themeColor)
     .text(`${result.score || 0}%`, 72, scoreY + 76);

  // Solid Colored Pass/Fail Status Badge
  const badgeX = 412;
  const badgeY = scoreY + 68;
  const badgeW = 120;
  const badgeH = 34;

  doc.fillColor(themeColor)
     .rect(badgeX, badgeY, badgeW, badgeH)
     .fill();

  doc.font('Helvetica-Bold')
     .fontSize(12)
     .fillColor('#ffffff')
     .text((result.status || 'Pass').toUpperCase(), badgeX, badgeY + 10, { width: badgeW, align: 'center' });

  // ── Official Qualification Notice Box ──
  const noticeY = 373;
  const noticeWidth = 512;
  const noticeHeight = 85;

  doc.fillColor('#f1f5f9')
     .rect(50, noticeY, noticeWidth, noticeHeight)
     .fill();

  doc.strokeColor('#e2e8f0')
     .lineWidth(1)
     .rect(50, noticeY, noticeWidth, noticeHeight)
     .stroke();

  doc.fillColor('#475569')
     .rect(50, noticeY, 4, noticeHeight)
     .fill();

  const noticeTitle = isPass ? 'Certification & Qualification Notice' : 'Performance Review & Retake Guidance';
  const noticeBody = isPass
    ? 'This document confirms that the candidate has successfully passed the assessment and demonstrated competent domain knowledge, satisfying the standard qualifications required by Skill Bridge India.'
    : 'We encourage candidates to review the provided practice modules under the Skill Bridge India learning suite and re-attempt the examination to fulfill qualification criteria.';

  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor('#0f172a')
     .text(noticeTitle, 66, noticeY + 14);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#475569')
     .text(noticeBody, 66, noticeY + 32, { width: 480, lineGap: 3 });

  // ── Grounded Signature Footer Section ──
  const sigY = 650;

  doc.strokeColor('#cbd5e1')
     .lineWidth(1)
     .moveTo(50, sigY)
     .lineTo(220, sigY)
     .stroke();

  doc.font('Helvetica-Bold')
     .fontSize(9.5)
     .fillColor('#0f172a')
     .text('Authorized Signature', 50, sigY + 8);

  doc.font('Helvetica')
     .fontSize(8.5)
     .fillColor('#64748b')
     .text('Skill Bridge India Certification Authority', 50, sigY + 20);

  // ── Page 2+: Detailed Performance Breakdown (Full-Width Vertical Layout) ──
  doc.addPage();

  doc.fillColor('#111111')
     .font('Helvetica-Bold')
     .fontSize(15)
     .text('DETAILED PERFORMANCE BREAKDOWN', 50, 45);

  doc.font('Helvetica')
     .fontSize(9)
     .fillColor('#6b7280')
     .text('Comprehensive Question-by-Question Evaluation & Explanatory Rationale', 50, 65);

  doc.strokeColor('#e5e7eb')
     .lineWidth(1)
     .moveTo(50, 80)
     .lineTo(550, 80)
     .stroke();

  doc.y = 95;

  let qList = [];
  if (Array.isArray(result.questionsDetailed) && result.questionsDetailed.length > 0) {
    qList = result.questionsDetailed;
  } else {
    const total = result.totalQuestions || 10;
    const correct = result.correctAnswers || 0;
    for (let i = 0; i < total; i++) {
      const isCorrect = i < correct;
      qList.push({
        questionText: `Core Competency Assessment Question ${i + 1} (${result.examTitle || 'Domain Evaluation'})`,
        userAnswer: isCorrect ? 'Option A: Demonstrated Correct Conceptual Solution' : 'Option B: Incorrect Method / Attempted Strategy',
        correctAnswer: 'Option A: Demonstrated Correct Conceptual Solution',
        explanation: `Standard domain guidelines for ${result.examTitle || 'Skill Evaluation'} require systematic analysis and precision. Option A represents the optimal approach.`,
        isCorrect: isCorrect,
        points: isCorrect ? 10 : -2
      });
    }
  }

  qList.forEach((q, index) => {
    // ── Pagination Check: Ensure question block does not truncate at page bottom ──
    if (doc.y > 630) {
      doc.addPage();
      doc.fillColor('#9ca3af')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text(`DETAILED PERFORMANCE BREAKDOWN (CONTINUED) — ${result.examTitle || 'Assessment'}`, 50, 40);
      
      doc.strokeColor('#e5e7eb')
         .lineWidth(0.8)
         .moveTo(50, 52)
         .lineTo(550, 52)
         .stroke();
      
      doc.y = 65;
    }

    const isCorrect = q.isCorrect === true || (q.points && q.points > 0);

    // 1. Heading: "Question X:" (Bold, size 11)
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor('#111111')
       .text(`Question ${index + 1}:`, 50, doc.y, { width: 500 });

    doc.moveDown(0.2);

    // 2. Points Badge (Placed right below Question number)
    const isMentor = Boolean(result.isMentorExam || q.isMentorExam);
    const qPts = typeof q.points === 'number' ? q.points : (isCorrect ? (isMentor ? 5 : 2) : (q.userAnswer === 'Not Answered / Skipped' ? (isMentor ? -5 : -1) : (isMentor ? -10 : -2)));
    const ptsText = qPts > 0 ? `[+${qPts} Points (Correct)]` : `[${qPts} Points (${q.userAnswer === 'Not Answered / Skipped' ? 'Unattempted' : 'Incorrect'})]`;
    const ptsColor = qPts > 0 ? '#059669' : '#dc2626';

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor(ptsColor)
       .text(ptsText, 50, doc.y, { width: 500 });

    doc.moveDown(0.35);

    // 3. The Question Text (Full text, word-wrapped)
    const qText = q.questionText || q.question || `Question ${index + 1}`;
    doc.font('Helvetica')
       .fontSize(9.5)
       .fillColor('#1f2937')
       .text(qText, 50, doc.y, { width: 500, lineGap: 3 });

    doc.moveDown(0.45);

    // 4. Your Answer: [Actual Option Text]
    const uAnsFormatted = formatAnswerText(q.userAnswer, q.options);
    const ansColor = isCorrect ? '#059669' : '#dc2626';

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#4b5563')
       .text('Your Answer: ', 50, doc.y, { continued: true })
       .font('Helvetica')
       .fillColor(ansColor)
       .text(uAnsFormatted, { width: 500, lineGap: 2 });

    doc.moveDown(0.35);

    // 5. Correct Answer: [Actual Option Text]
    const cAnsFormatted = formatAnswerText(q.correctAnswer || q.answer, q.options);

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#4b5563')
       .text('Correct Answer: ', 50, doc.y, { continued: true })
       .font('Helvetica')
       .fillColor('#059669')
       .text(cAnsFormatted, { width: 500, lineGap: 2 });

    doc.moveDown(0.35);

    // 6. Explanation: [Explanation Text]
    const expText = q.explanation || q.rationale || 'Detailed conceptual evaluation and core competencies applied.';
    doc.font('Helvetica-Oblique')
       .fontSize(9)
       .fillColor('#4b5563')
       .text('Explanation: ', 50, doc.y, { continued: true })
       .font('Helvetica')
       .fillColor('#6b7280')
       .text(expText, { width: 500, lineGap: 2 });

    doc.moveDown(0.6);

    // 7. Divider Line across the page before starting Question X+1
    const dividerY = doc.y + 4;
    doc.strokeColor('#cbd5e1')
       .lineWidth(1)
       .moveTo(50, dividerY)
       .lineTo(550, dividerY)
       .stroke();

    doc.y = dividerY + 14;
  });
}

// Helper function to generate Exam Result PDF in-memory and upload to Cloudinary
async function generateAndUploadExamResultPdf(result, forceRegenerate = false) {
  if (!result) return null;
  if (!forceRegenerate && result.pdfUrl && typeof result.pdfUrl === 'string' && result.pdfUrl.includes('_v6_')) {
    return result.pdfUrl;
  }

  return new Promise((resolve) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const cldResult = await new Promise((resResolve, resReject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'career_bridge_docs',
                public_id: `exam_report_v6_${result._id || Date.now()}`,
                resource_type: 'auto'
              },
              (err, res) => {
                if (err) return resReject(err);
                resResolve(res);
              }
            );
            Readable.from(pdfBuffer).pipe(uploadStream);
          });

          if (cldResult && cldResult.secure_url) {
            result.pdfUrl = cldResult.secure_url;
            await ExamResult.findByIdAndUpdate(result._id, { pdfUrl: cldResult.secure_url }).catch(() => null);
            resolve(cldResult.secure_url);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('Cloudinary Exam PDF upload error:', e);
          resolve(null);
        }
      });

      renderPdfContents(doc, result);
      doc.end();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      resolve(null);
    }
  });
}

// Endpoint: Seed initial mock results (Disabled to prevent auto-generating mock records)
router.post('/api/results/seed', async (req, res) => {
  return res.json({ message: 'Automatic database seeding is disabled.', count: 0 });
});

// Endpoint: List all results (optionally filtered by email)
router.get('/api/results', async (req, res) => {
  try {
    const { email } = req.query;
    const filter = {};
    if (email) {
      filter.studentEmail = { $regex: new RegExp('^' + email.toLowerCase().trim() + '$', 'i') };
    }
    const results = await ExamResult.find(filter).sort({ date: -1 }).lean();

    // Check & generate/update Cloudinary PDF URL to latest v6 format
    for (const r of results) {
      if (!r.pdfUrl || !r.pdfUrl.includes('_v6_')) {
        const cldUrl = await generateAndUploadExamResultPdf(r, true);
        if (cldUrl) r.pdfUrl = cldUrl;
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Get leaderboard data dynamically grouped by timeframe and subject
router.get('/api/results/leaderboard', async (req, res) => {
  try {
    const { timeframe, subject } = req.query; // 'weekly', 'monthly', 'yearly'; subject key
    let dateLimit = new Date(0); // Default to all-time (epoch 0)
    const now = new Date();

    if (timeframe === 'weekly') {
      dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'monthly') {
      dateLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'yearly') {
      dateLimit = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const queryFilter = {};
    if (dateLimit.getTime() > 0) {
      queryFilter.$or = [
        { date: { $gte: dateLimit } },
        { createdAt: { $gte: dateLimit } }
      ];
    }

    // Support Subject-Wise & Mentor Assessment Aggregation
    if (subject && subject.toLowerCase() !== 'all' && subject.toLowerCase() !== 'overall') {
      const subjectClean = subject.toLowerCase().trim();
      if (subjectClean === 'mentor' || subjectClean === 'mentor_exams' || subjectClean === 'mentor_assessments') {
        queryFilter.isMentorExam = true;
      } else {
        const subjectNameMap = {
          'aptitude': 'aptitude',
          'problem_solving': 'problem',
          'communication': 'communication',
          'behaviour': 'behaviour',
          'situational': 'situational',
          'workplace_skills': 'workplace'
        };
        const searchPattern = subjectNameMap[subjectClean] || subjectClean;
        const subjectRegex = { $regex: new RegExp(searchPattern, 'i') };

        if (queryFilter.$or) {
          // Wrap date filter & subject regex together
          delete queryFilter.$or;
          queryFilter.$and = [
            {
              $or: [
                { date: { $gte: dateLimit } },
                { createdAt: { $gte: dateLimit } }
              ]
            },
            {
              $or: [
                { examTitle: subjectRegex },
                { subject: subjectRegex }
              ]
            }
          ];
        } else {
          queryFilter.$or = [
            { examTitle: subjectRegex },
            { subject: subjectRegex }
          ];
        }
      }
    }

    // Get all results matching filter
    const results = await ExamResult.find(queryFilter);
    
    // Get all registered students
    const students = await Student.find({}, 'name email');

    // Map email to total score points based on exact scoring rules:
    // Standard Assessment: Correct +2, Wrong -2, Unattempted -1
    // Mentor Assessment: Correct +5, Wrong -10, Unattempted -5
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

        // Dynamically sum net points (adds positive gains & subtracts negative deductions)
        pointsMap[emailKey] = (pointsMap[emailKey] || 0) + examPts;
      }
    });

    // Build the leaderboard response
    const leaderboard = students.map(s => {
      const emailKey = s.email.toLowerCase().trim();
      return {
        email: emailKey,
        name: s.name,
        pts: pointsMap[emailKey] || 0
      };
    });

    // Sort descending by net points
    leaderboard.sort((a, b) => b.pts - a.pts);

    // Assign rank values
    leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    res.json(leaderboard);
  } catch (error) {
    console.error('[LEADERBOARD API ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Fetch student's point history ledger (chronological with isMentorExam & netPoints)
router.get('/api/results/point-history', async (req, res) => {
  try {
    let studentEmail = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded && decoded.email) {
          studentEmail = decoded.email;
        }
      } catch (e) {}
    }

    if (!studentEmail && req.query.email) {
      studentEmail = req.query.email;
    }

    if (!studentEmail) {
      return res.status(400).json({ error: 'Student email is required.' });
    }

    const emailRegex = new RegExp('^' + studentEmail.toLowerCase().trim() + '$', 'i');
    const examResults = await ExamResult.find({ studentEmail: emailRegex }).sort({ date: -1, createdAt: -1 }).lean();

    const history = examResults.map(r => {
      let netPoints = 0;
      if (Array.isArray(r.questionsDetailed) && r.questionsDetailed.length > 0) {
        netPoints = r.questionsDetailed.reduce((sum, q) => sum + (typeof q.points === 'number' ? q.points : 0), 0);
      } else {
        const isMentor = Boolean(r.isMentorExam);
        const correct = r.correctAnswers || 0;
        const total = r.totalQuestions || 10;
        const remaining = total - correct;
        const wrong = Math.floor(remaining * 0.8);
        const unattempted = remaining - wrong;

        if (isMentor) {
          netPoints = (correct * 5) - (wrong * 10) - (unattempted * 5);
        } else {
          netPoints = (correct * 2) - (wrong * 2) - (unattempted * 1);
        }
      }

      return {
        id: r._id,
        examName: r.examTitle || 'Custom Assessment',
        pointsEarned: netPoints,
        date: r.date || r.createdAt || new Date(),
        score: r.score || 0,
        totalQuestions: r.totalQuestions || 10,
        correctAnswers: r.correctAnswers || 0,
        status: r.status || 'Completed',
        isMentorExam: Boolean(r.isMentorExam)
      };
    });

    res.json(history);
  } catch (error) {
    console.error('Point history endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Create a new result & save Cloudinary PDF
router.post('/api/results', async (req, res) => {
  try {
    const { studentName, studentEmail, examTitle, score, totalQuestions, correctAnswers, status, isMentorExam, questionsDetailed } = req.body;
    const newResult = new ExamResult({
      studentName,
      studentEmail,
      examTitle,
      score,
      totalQuestions,
      correctAnswers,
      status,
      isMentorExam: Boolean(isMentorExam),
      questionsDetailed: Array.isArray(questionsDetailed) ? questionsDetailed : []
    });
    const saved = await newResult.save();

    // Save Cloudinary PDF URL to MongoDB Atlas
    const cldUrl = await generateAndUploadExamResultPdf(saved);
    if (cldUrl) {
      saved.pdfUrl = cldUrl;
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Generate / Redirect PDF Report
router.get('/api/results/pdf/:id', async (req, res) => {
  try {
    const result = await ExamResult.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }

    // Bypass upgrade lock when requested by Admin or Mentor (req.query.admin === 'true')
    if (result.studentEmail && req.query.admin !== 'true') {
      const student = await Student.findOne({ email: result.studentEmail });
      if (student && !student.isUnlocked) {
        return res.status(403).json({ error: '🔒 Upgrade Required: PDF Certificate & Report downloads are locked for free accounts. Please upgrade your profile.' });
      }
    }

    // Check if pdfUrl is stored in latest _v6_ format
    const isLatestVersion = result.pdfUrl && typeof result.pdfUrl === 'string' && result.pdfUrl.includes('_v6_');

    if (isLatestVersion && req.query.force !== 'true') {
      return res.redirect(result.pdfUrl);
    }

    // Force regenerate PDF with multi-page Detailed Performance Breakdown to Cloudinary
    const cldUrl = await generateAndUploadExamResultPdf(result, true);
    if (cldUrl) {
      return res.redirect(cldUrl);
    }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=report-${result._id}.pdf`);
    doc.pipe(res);

    renderPdfContents(doc, result);
    doc.end();

  } catch (error) {
    console.error('PDF Generation failed:', error);
    res.status(500).json({ message: 'Failed to generate PDF', error: error.message });
  }
});

// DELETE /api/admin/exam-results/:id — Delete single exam result / alert
router.delete('/api/admin/exam-results/:id', verifyToken, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const deleted = await ExamResult.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Exam result not found.' });
    }
    res.json({ message: 'Exam alert record deleted successfully!', deletedId: req.params.id });
  } catch (err) {
    console.error('Delete exam result error:', err);
    res.status(500).json({ error: 'Failed to delete exam alert record.' });
  }
});

// POST /api/admin/clear-failed-insights — Delete responded or expired failed alert insights for Admin candidates
router.post('/api/admin/clear-failed-insights', verifyToken, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(adminId).lean();
    const referralCode = admin ? admin.referralCode : null;

    const regexRef = referralCode ? new RegExp('^' + referralCode.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i') : null;
    const query = adminId ? {
      $or: [
        { assignedAdminId: adminId },
        ...(regexRef ? [{ adminReferralCode: { $regex: regexRef } }] : [])
      ]
    } : {};

    const referredStudents = await Student.find(query, 'email').lean().catch(() => []);
    const studentEmails = (referredStudents || []).map(s => (s.email || '').toLowerCase().trim()).filter(Boolean);

    if (studentEmails.length === 0) {
      return res.json({ message: 'No candidate records found to clean.', deletedCount: 0 });
    }

    const emailRegexes = studentEmails.map(e => new RegExp('^' + e.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '$', 'i'));

    const { retention } = req.body; // '1d', '3d', '7d', '30d', 'all', 'responded'
    let deleteFilter = {
      studentEmail: { $in: emailRegexes },
      $or: [{ status: 'Fail' }, { score: { $lt: 60 } }]
    };

    if (retention === 'responded') {
      deleteFilter.isResponded = true;
    } else if (retention && retention !== 'never' && retention !== 'all') {
      const daysMap = { '1d': 1, '3d': 3, '7d': 7, '30d': 30 };
      const days = daysMap[retention] || 7;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      deleteFilter.createdAt = { $lte: cutoff };
    }

    const result = await ExamResult.deleteMany(deleteFilter);
    res.json({
      message: `Cleared ${result.deletedCount || 0} failed exam alert record(s).`,
      deletedCount: result.deletedCount || 0
    });
  } catch (err) {
    console.error('Clear failed insights error:', err);
    res.status(500).json({ error: 'Failed to clear insights records.' });
  }
});

module.exports = router;
