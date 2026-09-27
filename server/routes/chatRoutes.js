const express = require('express');
const router = express.Router();
const axios = require('axios');
const ChatLog = require('../models/ChatLog');
const SystemSettings = require('../models/SystemSettings');
const { getGroqChatApiKey } = require('../utils/getGroqApiKey');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Handler for Groq AI Chatbot
const handleChatAsk = async (req, res) => {
  try {
    const { prompt, messages, sessionId } = req.body;
    const userPrompt = prompt || (messages && messages.length > 0 ? messages[messages.length - 1].content || messages[messages.length - 1].text : '');

    if (!userPrompt || !userPrompt.trim()) {
      return res.status(400).json({ error: 'Prompt message is required.' });
    }

    const apiKey = await getGroqChatApiKey();
    if (!apiKey) {
      // Key missing or unconfigured — flag as exhausted
      SystemSettings.updateOne({ key: 'global_settings' }, { chatKeyStatus: 'exhausted' }).catch(() => {});
      return res.status(500).json({ error: 'Groq Chat API key is not configured.' });
    }

    // System instruction for official platform chatbot
    const systemInstruction = {
      role: 'system',
      content: 'You are the official Skill Bridge India AI assistant. You help students, job seekers, and administrators navigate our platform features, courses, mentorship, exam preparation, and career guidance. Be professional, friendly, clear, and concise.'
    };

    let formattedMessages = [systemInstruction];

    if (Array.isArray(messages) && messages.length > 0) {
      const pastMessages = messages.slice(-10).map(m => ({
        role: m.role || (m.sender === 'ai' ? 'assistant' : 'user'),
        content: m.content || m.text || ''
      })).filter(m => m.content && typeof m.content === 'string' && m.content.trim());
      formattedMessages = [systemInstruction, ...pastMessages];
    } else {
      formattedMessages.push({ role: 'user', content: userPrompt.trim() });
    }

    // Verified, high-availability Groq production models (llama-3.1-8b-instant is ultra-fast with high TPM limit)
    const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
    let groqResponse;
    let lastErr;

    for (const modelCandidate of GROQ_MODELS) {
      try {
        groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: modelCandidate,
            messages: formattedMessages,
            temperature: 0.5,
            max_tokens: 300
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
        if (groqResponse && groqResponse.data?.choices?.[0]?.message) {
          break; // Success!
        }
      } catch (mErr) {
        lastErr = mErr;
        const errStatus = mErr.response?.status;
        console.warn(`[Groq Model ${modelCandidate} failed]:`, mErr.response?.data?.error?.message || mErr.message);
        // Only break early if API key is invalid (401)
        if (errStatus === 401) {
          throw mErr;
        }
        // If 429 or temporary issue on this specific model, attempt next model candidate!
      }
    }

    if (!groqResponse && lastErr) {
      throw lastErr;
    }

    const aiReply = groqResponse.data?.choices?.[0]?.message?.content || "I'm here to help with Skill Bridge India courses, assessments, and career guidance. How can I assist you today?";

    // On success, ensure Chatbot status is active and clear exhausted records
    SystemSettings.updateOne(
      { key: 'global_settings' }, 
      { 
        chatKeyStatus: 'active',
        chatKeyExhaustedKey: null,
        chatKeyFailureCount: 0
      }
    ).catch(() => {});

    // Automatically log conversation
    if (sessionId) {
      try {
        const newLog = new ChatLog({
          sessionId,
          userMessage: userPrompt.trim(),
          aiResponse: aiReply
        });
        await newLog.save();
      } catch (logErr) {
        console.error('Error auto-logging chat message:', logErr);
      }
    }

    res.json({ reply: aiReply, success: true });
  } catch (error) {
    const status = error.response?.status;
    const errMsg = (error.response?.data?.error?.message || error.message || '').toLowerCase();
    const errCode = (error.response?.data?.error?.code || '').toLowerCase();
    
    // Only flag as exhausted if the key is rejected (401) or truly quota-depleted (insufficient_quota / billing)
    const isAuthFailure = status === 401 || errMsg.includes('invalid api key') || errCode === 'invalid_api_key';
    const isHardQuotaExhausted = (status === 429 && (errMsg.includes('quota') || errMsg.includes('insufficient_quota') || errCode === 'insufficient_quota'));

    if (isAuthFailure || isHardQuotaExhausted) {
      const currentKey = await getGroqChatApiKey().catch(() => '');
      SystemSettings.updateOne(
        { key: 'global_settings' }, 
        { 
          chatKeyStatus: 'exhausted',
          chatKeyExhaustedKey: currentKey
        }
      ).catch(() => {});
    }

    console.error('Error communicating with Groq in backend proxy:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to communicate with AI server.',
      reply: "I'm having trouble connecting to the AI assistant right now. Please try again shortly."
    });
  }
};


// Support all AI chat route aliases (POST & OPTIONS preflight)
router.post('/api/chat/ask', handleChatAsk);
router.post('/api/ai/chat', handleChatAsk);
router.post('/api/chat', handleChatAsk);
router.post('/api/ai/ask', handleChatAsk);

// Double-slash fallback matches if proxy passes //api
router.post('//api/chat/ask', handleChatAsk);
router.post('//api/ai/chat', handleChatAsk);
router.post('//api/chat', handleChatAsk);
router.post('//api/ai/ask', handleChatAsk);

router.options('/api/chat/ask', (req, res) => res.sendStatus(200));
router.options('/api/ai/chat', (req, res) => res.sendStatus(200));
router.options('/api/chat', (req, res) => res.sendStatus(200));
router.options('/api/ai/ask', (req, res) => res.sendStatus(200));

router.options('//api/chat/ask', (req, res) => res.sendStatus(200));
router.options('//api/ai/chat', (req, res) => res.sendStatus(200));
router.options('//api/chat', (req, res) => res.sendStatus(200));
router.options('//api/ai/ask', (req, res) => res.sendStatus(200));

router.post('/api/chat/log', async (req, res) => {
  try {
    const { sessionId, userMessage, aiResponse } = req.body;
    const newLog = new ChatLog({ sessionId, userMessage, aiResponse });
    await newLog.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving chat log:', error);
    res.status(500).json({ success: false, error: 'Failed to save log' });
  }
});

// GET /api/super-admin/ai-chat-logs — Fetch all AI chat logs for Super Admin
router.get('/api/super-admin/ai-chat-logs', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const logs = await ChatLog.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching chat logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch AI chat logs.' });
  }
});

// DELETE /api/super-admin/ai-chat-logs — Clear all AI chat logs
router.delete('/api/super-admin/ai-chat-logs', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    await ChatLog.deleteMany({});
    res.json({ success: true, message: 'All AI chat logs cleared successfully.' });
  } catch (error) {
    console.error('Error clearing chat logs:', error);
    res.status(500).json({ success: false, error: 'Failed to clear chat logs.' });
  }
});

module.exports = router;

