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

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 250
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiReply = groqResponse.data?.choices?.[0]?.message?.content || "I'm having trouble connecting right now, please try again.";

    // On success, ensure Chatbot status is active
    SystemSettings.updateOne({ key: 'global_settings' }, { chatKeyStatus: 'active' }).catch(() => {});

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
    
    // Check if error is due to quota/billing (429) or invalid auth key (401/403)
    if (status === 429 || status === 401 || status === 403 || errMsg.includes('rate limit') || errMsg.includes('quota') || errMsg.includes('invalid api key') || errMsg.includes('exceeded')) {
      SystemSettings.updateOne({ key: 'global_settings' }, { chatKeyStatus: 'exhausted' }).catch(() => {});
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

