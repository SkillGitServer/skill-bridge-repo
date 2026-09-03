const SystemSettings = require('../models/SystemSettings');

/**
 * getGroqChatApiKey — fetches active Groq API Key for AI Chatbot
 * 1. Checks MongoDB SystemSettings for activeGroqChatApiKey.
 * 2. If empty, falls back to process.env.VITE_GROQ_API_KEY or process.env.GROQ_CHAT_API_KEY.
 */
async function getGroqChatApiKey() {
  try {
    const settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (settings && settings.activeGroqChatApiKey && settings.activeGroqChatApiKey.trim()) {
      return settings.activeGroqChatApiKey.trim();
    }
  } catch (err) {
    console.error('[SETTINGS] Error fetching dynamic Groq Chat API Key:', err);
  }
  return process.env.VITE_GROQ_API_KEY || process.env.GROQ_CHAT_API_KEY || process.env.AI_RESUME_API_KEY || '';
}

/**
 * getGroqResumeApiKey — fetches active Groq API Key for Resume ATS Review
 * 1. Checks MongoDB SystemSettings for activeGroqResumeApiKey.
 * 2. If empty, falls back to process.env.AI_RESUME_API_KEY or process.env.VITE_GROQ_API_KEY.
 */
async function getGroqResumeApiKey() {
  try {
    const settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (settings && settings.activeGroqResumeApiKey && settings.activeGroqResumeApiKey.trim()) {
      return settings.activeGroqResumeApiKey.trim();
    }
  } catch (err) {
    console.error('[SETTINGS] Error fetching dynamic Groq Resume API Key:', err);
  }
  return process.env.AI_RESUME_API_KEY || process.env.VITE_GROQ_API_KEY || '';
}

module.exports = {
  getGroqChatApiKey,
  getGroqResumeApiKey,
  // Alias for backward compatibility
  getGroqApiKey: getGroqResumeApiKey
};
