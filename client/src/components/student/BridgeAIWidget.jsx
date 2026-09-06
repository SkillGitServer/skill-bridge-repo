import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, X, Send, Sparkles, Phone, Mail, ClipboardList } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '../../utils/auth';

/**
 * Forbidden administrative keywords for strict data isolation.
 * Bridge AI is dedicated strictly to students and must NEVER discuss administrative apps or panels.
 */
const FORBIDDEN_KEYWORDS = [
  'vault',
  'supss',
  'admin dashboard',
  'superadmin',
  'super admin',
  'admin portal',
  'admin auth',
  'admin login',
  'sudo-control-panel',
  'super_admin',
  'vault app',
  'supss app'
];

/**
 * Lightweight inline markdown formatter for bolding, headers, and bullet lists
 */
function formatInline(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderFormattedText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list_${elements.length}`} className="list-disc pl-4 space-y-1 my-1.5">
          {currentList.map((item, idx) => (
            <li key={idx} className="text-gray-700">{formatInline(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      elements.push(<div key={`br_${idx}`} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      const headingText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <h4 key={`h_${idx}`} className="font-extrabold text-gray-900 text-xs mt-2 mb-1">
          {formatInline(headingText)}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.substring(2));
      return;
    }

    flushList();
    elements.push(
      <p key={`p_${idx}`} className="leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

export default function BridgeAIWidget({ mentor, mentorExam, studentName }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${studentName ? studentName.split(' ')[0] : 'there'}! 👋 I'm **Bridge AI**, your personal student learning companion.\n\nI can assist you with your **mentor contact details**, **pending assessments**, practice modules, or navigating your dashboard. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Check if query touches forbidden administrative topics
  const isForbiddenQuery = (query) => {
    const lower = query.toLowerCase();
    return FORBIDDEN_KEYWORDS.some(kw => lower.includes(kw));
  };

  // Build context for the AI prompt
  const buildContextPrompt = () => {
    const sName = studentName || localStorage.getItem('auth_name') || 'Student';
    const mName = mentor?.name || localStorage.getItem('admin_name') || null;
    const mEmail = mentor?.email || localStorage.getItem('admin_email') || null;
    const mMobile = mentor?.mobile || null;
    
    let mentorContext = mName 
      ? `Assigned Mentor: ${mName}${mEmail ? ` (Email: ${mEmail})` : ''}${mMobile ? ` (Phone: ${mMobile})` : ''}`
      : 'Assigned Mentor: Not yet assigned (administration will allocate one soon).';

    let examContext = 'Pending Mentor Assessments: None currently. Student is up to date!';
    if (mentorExam && mentorExam.isActive && mentorExam._id) {
      const isAttempted = localStorage.getItem(`attempted_mentor_exam_${mentorExam._id}`) === 'true' ||
                          localStorage.getItem(`completed_mentor_exam_${mentorExam._id}`) === 'true';
      if (!isAttempted) {
        examContext = `Pending Mentor Assessment: "${mentorExam.title || 'Mentor Evaluation Assessment'}" (${mentorExam.duration || 15} minutes, ${mentorExam.totalQuestions || 10} questions). Available to start from the dashboard.`;
      }
    }

    return `You are "Bridge AI", a friendly and helpful student support assistant for Skill Bridge India.
Student Information:
- Student Name: ${sName}
- ${mentorContext}
- ${examContext}
- Practice Modules: 6 modules available (Aptitude, Communication, Behaviour, Problem Solving, Workplace Skills, Situational).

STRICT RULES & CONSTRAINTS:
1. ONLY assist with student learning, exam preparation, dashboard navigation, resume reviews, placement opportunities, and mentor communication.
2. FORBIDDEN TOPICS: You must NEVER mention, acknowledge, explain, or discuss the "Vault app", "Supss app", "Admin dashboard", "Superadmin dashboard", or administrative internals. If asked about them, politely state that you are exclusively focused on student learning and redirect them to their coursework or mentor.
3. Keep your answers clear, supportive, concise, and professional.`;
  };

  // Navigate to the correct pending exam or exams section
  const handleNavigateToExam = () => {
    setIsOpen(false);
    if (mentorExam && mentorExam._id) {
      navigate(`/student/exam/mentor-${mentorExam._id}`);
    } else {
      navigate('/student/exam');
    }
  };

  // Local fallback response generator if offline or API unavailable
  const generateLocalAnswer = (query) => {
    const lower = query.toLowerCase();

    if (isForbiddenQuery(query)) {
      return "I'm Bridge AI, dedicated exclusively to assisting Skill Bridge India students with their learning journey, practice tests, mentor sessions, and career guidance. I cannot assist with administrative tools or external applications. Let's focus on your dashboard, assessments, or studies!";
    }

    if (lower.includes('mentor') || lower.includes('teacher') || lower.includes('guide') || lower.includes('advisor') || lower.includes('contact')) {
      const mName = mentor?.name || localStorage.getItem('admin_name');
      const mEmail = mentor?.email || localStorage.getItem('admin_email');
      const mMobile = mentor?.mobile;

      if (mName) {
        return `Your assigned academic mentor is **${mName}**.\n\n` +
               `📧 **Email:** ${mEmail || 'Available via dashboard'}\n` +
               (mMobile ? `📱 **Phone:** ${mMobile}\n\n` : '\n') +
               `Feel free to reach out to your mentor for guidance on assessments and career planning!`;
      }
      return "You have not been assigned a permanent mentor yet. Our administration will allocate a mentor shortly! In the meantime, you can explore the 6 AI Practice Modules on your dashboard.";
    }

    if (lower.includes('exam') || lower.includes('test') || lower.includes('assessment') || lower.includes('pending')) {
      if (mentorExam && mentorExam.isActive && mentorExam._id) {
        const isAttempted = localStorage.getItem(`attempted_mentor_exam_${mentorExam._id}`) === 'true' ||
                            localStorage.getItem(`completed_mentor_exam_${mentorExam._id}`) === 'true';
        if (!isAttempted) {
          return `You have an active assessment waiting: **"${mentorExam.title || 'Mentor Evaluation Assessment'}"**.\n\n` +
                 `⏱️ **Duration:** ${mentorExam.duration || 15} minutes\n` +
                 `📋 **Questions:** ${mentorExam.totalQuestions || 10} questions\n\n` +
                 `You can start it right now from the **Mentor Assessment** section on your dashboard!`;
        }
      }
      return "You are all caught up on pending mentor assessments! You can continue practicing with the 6 domain practice modules (Aptitude, Communication, Behaviour, Problem Solving, Workplace Skills, and Situational).";
    }

    if (lower.includes('resume') || lower.includes('cv')) {
      return "You can upload and analyze your resume under the **Career Tools** section of your dashboard or in **Profile Settings** -> **Resume Review**. Bridge AI will analyze your resume against industry standards and provide an ATS score!";
    }

    if (lower.includes('job') || lower.includes('placement') || lower.includes('internship') || lower.includes('career')) {
      return "You can view available job openings by clicking **Job Board** on your dashboard or navigating to the student placement section. Verified corporate positions and internship opportunities are regularly posted by mentors.";
    }

    if (lower.includes('practice') || lower.includes('module') || lower.includes('score') || lower.includes('rank')) {
      return "Skill Bridge India offers 6 key assessment modules: **Aptitude**, **Communication**, **Behaviour**, **Problem Solving**, **Workplace Skills**, and **Situational**. Each completed test boosts your leaderboard ranking and generates a downloadable Skill Report!";
    }

    return "I'm here to help with your student journey at Skill Bridge India! You can ask me about your assigned mentor, pending assessments, how practice exams work, or resume evaluation.";
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Hard Constraint Check: Immediate rejection of forbidden admin topics
    if (isForbiddenQuery(text)) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: "I'm Bridge AI, dedicated exclusively to supporting Skill Bridge India students with their studies, practice tests, mentor sessions, and career guidance. I cannot assist with administrative tools or external applications. Let's focus on your dashboard and coursework!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsLoading(false);
      }, 400);
      return;
    }

    try {
      const token = getAuthToken('spark') || localStorage.getItem('auth_token');
      const systemPrompt = buildContextPrompt();

      // Format last 6 messages for LLM context
      const formattedHistory = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await axios.post('/api/ai/chat', {
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedHistory,
          { role: 'user', content: text }
        ]
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000
      });

      const reply = res.data?.reply || res.data?.message || generateLocalAnswer(text);

      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.warn('AI Chat online request failed, falling back to localized intelligence:', err.message);
      // Seamless local intelligent answer fallback
      const localReply = generateLocalAnswer(text);
      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: localReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Parse action buttons dynamically for AI messages
  const getMessageActions = (msg) => {
    if (msg.sender !== 'ai') return null;

    const lower = (msg.text || '').toLowerCase();
    const actions = [];

    // 1. Mentor actions detection (phone & email)
    const hasMentorTopic = 
      lower.includes('mentor') ||
      lower.includes('assigned mentor') ||
      lower.includes('contact them');

    const mPhone = mentor?.mobile || (msg.text.match(/(?:\+91|0)?[6-9]\d{9}/) || [])[0];
    const mEmail = mentor?.email || localStorage.getItem('admin_email') || (msg.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0];

    if (hasMentorTopic && (mPhone || mEmail)) {
      if (mPhone) {
        actions.push(
          <a
            key="call-mentor"
            href={`tel:${mPhone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition-transform active:scale-95 no-underline"
          >
            <Phone size={12} />
            <span>Call Mentor</span>
          </a>
        );
      }
      if (mEmail) {
        actions.push(
          <a
            key="email-mentor"
            href={`mailto:${mEmail}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition-transform active:scale-95 no-underline"
          >
            <Mail size={12} />
            <span>Email Mentor</span>
          </a>
        );
      }
    }

    // 2. Pending Exam actions detection
    const hasExamTopic =
      lower.includes('pending assessment') ||
      lower.includes('active assessment') ||
      lower.includes('pending exam') ||
      lower.includes('mentor evaluation') ||
      lower.includes('start exam now') ||
      lower.includes('mentor assessment');

    if (hasExamTopic) {
      actions.push(
        <button
          key="view-exams"
          type="button"
          onClick={handleNavigateToExam}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-[11px] font-extrabold shadow-xs transition-transform active:scale-95 cursor-pointer"
        >
          <ClipboardList size={13} />
          <span>View Pending Exams</span>
        </button>
      );
    }

    return actions.length > 0 ? actions : null;
  };

  const quickPrompts = [
    { label: '👨‍🏫 Who is my mentor?', query: 'Who is my assigned mentor and how do I contact them?' },
    { label: '📝 Pending exams?', query: 'Do I have any pending exams or assessments right now?' },
    { label: '🚀 Practice modules', query: 'How do the AI practice test modules work?' },
    { label: '📄 Resume review', query: 'How does the AI Resume Review score work?' },
  ];

  return (
    <div className="bridge-ai-widget-root">
      {/* ── Chat Window Overlay ── */}
      <div
        className={`fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[390px] h-[500px] max-h-[75vh] flex flex-col z-40 rounded-3xl transition-all duration-300 transform origin-bottom-right shadow-2xl border border-gray-200/90 ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-6 scale-90 pointer-events-none'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 15px rgba(0,0,0,0.06)'
        }}
      >
        {/* Header (Themed to dark slate/gray matching top nav) */}
        <div className="px-4 py-3.5 bg-gray-900 text-white flex items-center justify-between rounded-t-3xl shadow-sm border-b border-gray-800 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white shadow-inner">
              <Bot size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm tracking-tight text-white leading-none">Bridge AI</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase">
                  Student
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
              title="Close chat"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs bg-gray-50/60">
          {messages.map((msg) => {
            const actions = getMessageActions(msg);
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-gray-900 text-white rounded-tr-none font-medium'
                      : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none font-normal'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <span className="whitespace-pre-line">{msg.text}</span>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}

                  {/* Dynamic Action Buttons (Call/Email Mentor, View Exams) */}
                  {actions && (
                    <div className="flex flex-wrap gap-2 mt-2.5 pt-2 border-t border-gray-100">
                      {actions}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs px-2 py-1">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Sparkles size={12} className="text-gray-700 animate-spin" />
              </div>
              <span className="font-semibold text-gray-500 animate-pulse">Bridge AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="px-3 py-2 bg-white/90 border-t border-gray-200/80 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((qp, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(qp.query)}
                className="text-[10px] font-bold bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/90 px-2.5 py-1 rounded-xl transition-all hover:scale-102 active:scale-95 cursor-pointer shadow-2xs"
              >
                {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-2.5 bg-white border-t border-gray-200/90 rounded-b-3xl flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Bridge AI anything..."
            disabled={isLoading}
            className="flex-1 bg-gray-100/90 hover:bg-gray-100 focus:bg-white text-gray-900 placeholder-gray-400 text-xs px-3.5 py-2.5 rounded-2xl border border-transparent focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-xs transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center justify-center shrink-0"
            title="Send Message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* ── Floating Action Button (FAB) (Themed to dark slate/gray matching top nav) ── */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white shadow-[0_8px_25px_rgba(0,0,0,0.3)] border border-gray-700/80 px-4 py-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer font-bold group"
          title={isOpen ? "Close Bridge AI" : "Ask Bridge AI"}
          aria-label="Toggle Bridge AI Assistant"
        >
          <div className="transition-transform duration-300 flex items-center justify-center">
            {isOpen ? (
              <X size={18} className="text-white" />
            ) : (
              <div className="relative flex items-center justify-center">
                <MessageSquare size={18} className="text-white fill-white/20" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border-2 border-gray-900" />
              </div>
            )}
          </div>
          <span className="text-xs font-black tracking-wide text-white">
            {isOpen ? 'Close AI' : 'Bridge AI'}
          </span>
        </button>
      </div>
    </div>
  );
}
