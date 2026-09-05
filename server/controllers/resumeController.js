const Student = require('../models/Student');
const axios = require('axios');
const { PDFParse } = require('pdf-parse');
const { getGroqResumeApiKey } = require('../utils/getGroqApiKey');
const SystemSettings = require('../models/SystemSettings');

// Helper to flag resume key status
const updateResumeKeyStatus = (status) => {
  SystemSettings.updateOne({ key: 'global_settings' }, { resumeKeyStatus: status }).catch(() => {});
};

// Helper to fetch PDF buffer in memory from Cloudinary/Remote URL
const fetchPdfBuffer = async (url) => {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    throw new Error(`Invalid or missing PDF URL: ${url}`);
  }
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
};

// Asynchronous function to analyze resume using Groq Llama3 model and pdf-parse
const analyzeResumeAi = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const resumeUrl = student.docResume;
    if (!student.isUnlocked) {
      return res.status(403).json({ error: 'AI Resume Review is a premium feature. Please upgrade your profile to unlock full access.' });
    }
    if (!resumeUrl) {
      return res.status(400).json({ error: 'Please upload a resume first.' });
    }

    const apiKey = await getGroqResumeApiKey();
    if (!apiKey) {
      updateResumeKeyStatus('exhausted');
      return res.status(500).json({ error: 'AI Resume API Key is not configured on the server.' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await fetchPdfBuffer(resumeUrl);
    } catch (err) {
      console.error('Failed to download PDF from URL:', resumeUrl, err);
      return res.status(500).json({ 
        error: `Failed to retrieve resume from Cloud. URL: ${resumeUrl}. Error: ${err.message}` 
      });
    }

    // Extract text from PDF buffer
    let resumeText = '';
    try {
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      const parsedPdf = await parser.getText();
      resumeText = parsedPdf.text || '';
    } catch (err) {
      console.error('Failed to parse PDF content:', err);
      return res.status(500).json({ error: `Failed to parse PDF document text. Error: ${err.message}` });
    }

    if (!resumeText.trim()) {
      return res.status(400).json({ error: 'The uploaded PDF appears to be empty or unscannable (scanned images only).' });
    }

    // Request Groq Chat Completion with resilient model fallback
    const GROQ_MODELS = ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.6-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    let groqResponse;
    let lastErr;

    const payloadMessages = [
      {
        role: 'system',
        content: `You are an expert ATS resume reviewer. Analyze the resume text and return a JSON object with: 1. score (number out of 100), 2. metrics (array of objects with { name, value, color }), 3. suggestions (array of objects with { id, type, text, badgeColor, dotColor }). Suggestion types should be "Action Required", "Warning", or "Good". Ensure badgeColor matches "bg-red-50 text-red-700 border-red-100" for Action Required, "bg-orange-50 text-orange-700 border-orange-100" for Warning, and "bg-green-50 text-green-700 border-green-100" for Good. Corresponding dotColor should be "bg-red-500", "bg-orange-500", or "bg-green-500" respectively. Ensure color for metrics is "bg-green-500", "bg-orange-500", or "bg-amber-500".

CRITICAL RULE:
Compare the user's site profile name ("${student.name}") with the name you detect on their resume.
- If they match, add a "Good" suggestion praising the consistency of the name.
- If they do not match, or if the resume name is missing, add an "Action Required" or "Warning" suggestion saying exactly: "In your site registration, your name is ${student.name}, but in the resume it appears as [found name or missing]. It could have been better if you updated it to ensure consistency."

Respond ONLY with the raw JSON object, without markdown blocks.`
      },
      {
        role: 'user',
        content: `Student Site Name: ${student.name}\n\nResume Text:\n${resumeText}`
      }
    ];

    for (const modelCandidate of GROQ_MODELS) {
      try {
        groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: modelCandidate,
            messages: payloadMessages,
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (groqResponse && groqResponse.data?.choices?.[0]?.message) {
          break;
        }
      } catch (mErr) {
        lastErr = mErr;
        const errStatus = mErr.response?.status;
        if (errStatus === 401 || errStatus === 403 || errStatus === 429) {
          throw mErr;
        }
      }
    }

    if (!groqResponse && lastErr) {
      throw lastErr;
    }

    // On success, reset resumeKeyStatus to active
    updateResumeKeyStatus('active');

    let parsedContent;
    try {
      const contentText = groqResponse.data.choices[0].message.content;
      parsedContent = JSON.parse(contentText);
    } catch (err) {
      console.error('Failed to parse AI response content:', err);
      return res.status(500).json({ error: 'AI generated an invalid response layout. Please retry.' });
    }

    student.aiAnalysis = {
      score: parsedContent.score,
      metrics: parsedContent.metrics,
      suggestions: parsedContent.suggestions,
      analyzedAt: new Date()
    };
    await student.save();

    return res.json({
      status: "success",
      ...parsedContent
    });
  } catch (err) {
    const status = err.response?.status;
    const errMsg = (err.response?.data?.error?.message || err.message || '').toLowerCase();
    if (status === 429 || status === 401 || status === 403 || errMsg.includes('rate limit') || errMsg.includes('quota') || errMsg.includes('invalid api key') || errMsg.includes('exceeded')) {
      updateResumeKeyStatus('exhausted');
    }
    console.error('AI Resume analysis error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Admin trigger function to analyze a specific student's resume
const analyzeStudentResumeByAdmin = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const resumeUrl = student.docResume;
    if (!resumeUrl) {
      return res.status(400).json({ error: 'Student has not uploaded a resume yet.' });
    }

    const apiKey = await getGroqResumeApiKey();
    if (!apiKey) {
      updateResumeKeyStatus('exhausted');
      return res.status(500).json({ error: 'AI Resume API Key is not configured on the server.' });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await fetchPdfBuffer(resumeUrl);
    } catch (err) {
      return res.status(500).json({ error: `Could not load PDF document for AI analysis: ${err.message}` });
    }

    const parser = new PDFParse(new Uint8Array(pdfBuffer));
    const parsedPdf = await parser.getText();
    const resumeText = parsedPdf.text || '';

    if (!resumeText.trim()) {
      return res.status(400).json({ error: 'The uploaded PDF is empty or unscannable.' });
    }

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are an expert ATS resume reviewer. Analyze the resume text and return a JSON object with: 1. score (number out of 100), 2. metrics (array of objects with { name, value, color }), 3. suggestions (array of objects with { id, type, text, badgeColor, dotColor }). Suggestion types should be "Action Required", "Warning", or "Good". Ensure badgeColor matches "bg-red-50 text-red-700 border-red-100" for Action Required, "bg-orange-50 text-orange-700 border-orange-100" for Warning, and "bg-green-50 text-green-700 border-green-100" for Good. Corresponding dotColor should be "bg-red-500", "bg-orange-500", or "bg-green-500" respectively. Ensure color for metrics is "bg-green-500", "bg-orange-500", or "bg-amber-500".

CRITICAL RULE:
Compare the user's site profile name ("${student.name}") with the name you detect on their resume.
- If they match, add a "Good" suggestion praising the consistency of the name.
- If they do not match, or if the resume name is missing, add an "Action Required" or "Warning" suggestion saying exactly: "In your site registration, your name is ${student.name}, but in the resume it appears as [found name or missing]. It could have been better if you updated it to ensure consistency."

Respond ONLY with the raw JSON object, without markdown blocks.`
          },
          {
            role: 'user',
            content: `Student Site Name: ${student.name}\n\nResume Text:\n${resumeText}`
          }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // On success, reset resumeKeyStatus to active
    updateResumeKeyStatus('active');

    const contentText = groqResponse.data.choices[0].message.content;
    const parsedContent = JSON.parse(contentText);

    student.aiAnalysis = {
      score: parsedContent.score,
      metrics: parsedContent.metrics,
      suggestions: parsedContent.suggestions,
      analyzedAt: new Date()
    };
    await student.save();

    return res.json({
      status: "success",
      aiAnalysis: student.aiAnalysis
    });
  } catch (err) {
    const status = err.response?.status;
    const errMsg = (err.response?.data?.error?.message || err.message || '').toLowerCase();
    if (status === 429 || status === 401 || status === 403 || errMsg.includes('rate limit') || errMsg.includes('quota') || errMsg.includes('invalid api key') || errMsg.includes('exceeded')) {
      updateResumeKeyStatus('exhausted');
    }
    console.error('Admin AI analysis error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Function to stream PDF content directly with inline disposition
const streamResumePdf = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await Student.findById(studentId);
    if (!student || !student.docResume) {
      return res.status(404).send('Student or resume not found.');
    }

    const pdfBuffer = await fetchPdfBuffer(student.docResume);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error streaming PDF:', err);
    res.status(500).send('Error streaming PDF file.');
  }
};

module.exports = {
  analyzeResumeAi,
  streamResumePdf,
  analyzeStudentResumeByAdmin
};
