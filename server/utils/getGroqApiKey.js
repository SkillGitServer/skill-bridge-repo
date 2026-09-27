const SystemSettings = require('../models/SystemSettings');

/**
 * Helper to inspect all potential Groq environment variables
 */
function getEnvGroqKey(preferredType = 'chat') {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROQ_CHAT_API_KEY ||
    process.env.AI_RESUME_API_KEY ||
    process.env.GROQ_RESUME_API_KEY ||
    process.env.VITE_GROQ_API_KEY ||
    process.env.AI_CHAT_API_KEY ||
    process.env.GROQ_KEY ||
    ''
  ).trim();
}

/**
 * getGroqChatApiKey — fetches active Groq API Key for AI Chatbot
 * 1. Checks MongoDB SystemSettings for chatGroqKey or activeGroqChatApiKey.
 * 2. If empty, falls back to environment variables (including GROQ_API_KEY, GROQ_CHAT_API_KEY, etc.).
 */
async function getGroqChatApiKey() {
  try {
    const settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (settings) {
      const customKey = settings.chatGroqKey || settings.activeGroqChatApiKey;
      if (customKey && typeof customKey === 'string' && customKey.trim()) {
        return customKey.trim();
      }
    }
  } catch (err) {
    console.error('[SETTINGS] Error fetching dynamic Groq Chat API Key:', err);
  }
  return getEnvGroqKey('chat');
}

/**
 * getGroqResumeApiKey — fetches active Groq API Key for Resume ATS Review
 * 1. Checks MongoDB SystemSettings for resumeGroqKey or activeGroqResumeApiKey.
 * 2. If empty, falls back to custom chatGroqKey, then environment variables.
 */
async function getGroqResumeApiKey() {
  try {
    const settings = await SystemSettings.findOne({ key: 'global_settings' });
    if (settings) {
      const customResumeKey = settings.resumeGroqKey || settings.activeGroqResumeApiKey;
      if (customResumeKey && typeof customResumeKey === 'string' && customResumeKey.trim()) {
        return customResumeKey.trim();
      }
      const customChatKey = settings.chatGroqKey || settings.activeGroqChatApiKey;
      if (customChatKey && typeof customChatKey === 'string' && customChatKey.trim()) {
        return customChatKey.trim();
      }
    }
  } catch (err) {
    console.error('[SETTINGS] Error fetching dynamic Groq Resume API Key:', err);
  }
  return getEnvGroqKey('resume');
}

module.exports = {
  getGroqChatApiKey,
  getGroqResumeApiKey,
  getEnvGroqKey,
  // Alias for backward compatibility
  getGroqApiKey: getGroqResumeApiKey
};
