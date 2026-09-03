import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAuthToken } from '../../utils/auth';
import { getInlineResumeUrl } from '../../utils/exportUtils';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';

function AdminReports() {
  useDocumentTitle('Platform Analytics | Skill Bridge India');
  const navigate = useNavigate();
  const [reportsData, setReportsData] = useState({
    overallAverage: '0%',
    rawAverage: 0,
    totalExams: 0,
    totalSubmissions: 0,
    modulePerformance: [],
    topPerformers: [],
    recentSubmissions: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal state for Subject Scoreboard & Leaderboard
  const [selectedModuleScoreboard, setSelectedModuleScoreboard] = useState(null);

  // Direct Candidate Messaging Modal state
  const [messageModalTarget, setMessageModalTarget] = useState(null); // { name, email, subject, score }
  const [messageType, setMessageType] = useState('Exam Feedback & Guidance');
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Search & PDF Report Viewer state
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');
  const [pdfModalState, setPdfModalState] = useState(null); // { title, name, pdfUrl }

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token') || localStorage.getItem('vault_token') || sessionStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let res = null;
      try {
        res = await axios.get('/api/admin/reports', { headers });
      } catch (e) {
        console.warn('Reports endpoint fallback:', e);
      }

      if (res && res.data) {
        setReportsData({
          overallAverage: res.data.overallAverage || '0%',
          rawAverage: res.data.rawAverage || 0,
          totalExams: res.data.totalExams || 0,
          totalSubmissions: res.data.totalSubmissions || 0,
          modulePerformance: res.data.modulePerformance || [],
          topPerformers: res.data.topPerformers || [],
          recentSubmissions: res.data.recentSubmissions || []
        });
      } else {
        // Smooth fallback to stats endpoint
        const statsRes = await axios.get('/api/admin/stats', { headers }).catch(() => null);
        const stats = statsRes?.data || {};
        setReportsData({
          overallAverage: stats.averageScore || '0%',
          rawAverage: parseInt(stats.averageScore || '0'),
          totalExams: stats.totalExams || 0,
          totalSubmissions: 0,
          modulePerformance: [],
          topPerformers: [],
          recentSubmissions: []
        });
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchReports);

  const { overallAverage, totalExams, totalSubmissions, modulePerformance, topPerformers, recentSubmissions } = reportsData;

  const DEFAULT_DYNAMIC_MODULES = [
    { key: 'mentor_assessments', name: 'Mentor & Custom Assessments', icon: '👑', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-amber-500 to-yellow-600', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'aptitude', name: 'Aptitude & Reasoning', icon: '🧠', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-blue-500 to-indigo-600', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'problem_solving', name: 'Problem Solving & Logic', icon: '🧩', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-emerald-500 to-teal-600', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'communication', name: 'Communication & Verbal', icon: '💬', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-purple-500 to-violet-600', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'behaviour', name: 'Behaviour & Personality', icon: '🎭', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-amber-500 to-orange-600', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'situational', name: 'Situational Judgment', icon: '⚖️', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-indigo-500 to-blue-700', summary: 'No candidate submissions evaluated yet', candidates: [] },
    { key: 'workplace_skills', name: 'Workplace & Professional Skills', icon: '🛠️', average: 0, delta: '0%', performingWellCount: 0, needsImprovementCount: 0, totalEvaluated: 0, barColor: 'from-rose-500 to-pink-600', summary: 'No candidate submissions evaluated yet', candidates: [] }
  ];

  const displayModules = (modulePerformance && modulePerformance.length > 0) ? modulePerformance : DEFAULT_DYNAMIC_MODULES;

  // Filtered Exam Submissions based on search query (subject, student name, email, score)
  const filteredSubmissions = (recentSubmissions || []).filter(sub => {
    if (!submissionSearchQuery.trim()) return true;
    const q = submissionSearchQuery.toLowerCase().trim();
    const nameMatch = (sub.studentName || '').toLowerCase().includes(q);
    const emailMatch = (sub.studentEmail || '').toLowerCase().includes(q);
    const subjectMatch = (sub.subject || '').toLowerCase().includes(q);
    const scoreMatch = String(sub.score).includes(q) || `${sub.score}%`.includes(q);
    const statusMatch = (sub.status || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || subjectMatch || scoreMatch || statusMatch;
  });

  const handleOpenMessageModal = (candidate, module) => {
    setMessageModalTarget({
      name: candidate.name || 'Candidate',
      email: candidate.email || '',
      subject: module ? module.name : 'Assessment',
      score: candidate.score || 0
    });
    setMessageType('Exam Feedback & Guidance');
    setMessageText(
      candidate.score < 60
        ? `Hi ${candidate.name || 'Student'}, I reviewed your test results in ${module ? module.name : 'Assessment'} (${candidate.score || 0}%). Let's review the core concepts together before your next test.`
        : `Hi ${candidate.name || 'Student'}, great work on your test score of ${candidate.score || 0}% in ${module ? module.name : 'Assessment'}! Keep up the excellent effort.`
    );
  };

  const handleSendMessage = async () => {
    if (!messageModalTarget || !messageModalTarget.email) {
      toast.error('Candidate email is required to send feedback.');
      return;
    }
    if (!messageText.trim()) {
      toast.error('Please enter a feedback message.');
      return;
    }

    const loadingToast = toast.loading(`Delivering message to ${messageModalTarget.name}...`);
    setIsSendingMessage(true);
    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token') || localStorage.getItem('vault_token');
      const res = await axios.post(
        '/api/admin/send-notification',
        {
          recipient: messageModalTarget.email,
          type: messageType,
          message: messageText
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      toast.dismiss(loadingToast);
      toast.success(res.data?.message || `Feedback message sent to ${messageModalTarget.name}!`);
      setMessageModalTarget(null);
      setMessageText('');
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Send message error:', err);
      toast.error(err.response?.data?.error || 'Failed to deliver message to candidate.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Platform Reports & Analytics</h1>
          <p className="text-xs text-gray-400 mt-1">Real-time statistics regarding student exam performance and assessment outcomes</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white/80 backdrop-blur-lg border border-white/50 shadow-sm rounded-3xl">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-extrabold text-gray-500">Loading live analytics report...</p>
          </div>
        ) : (
          <>
            {/* Key Metric Card */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block">Overall Platform Average</span>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">{overallAverage}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    overallAverage !== '0%'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}>
                    {overallAverage !== '0%' ? 'Overall Average Evaluated' : 'Not enough data'}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-600 font-semibold bg-gray-50 border border-gray-150 p-3 rounded-xl sm:max-w-xs text-left w-full sm:w-auto">
                ℹ️ Calculated across <strong>{totalExams}</strong> published examinations and <strong>{totalSubmissions}</strong> active student submissions.
              </div>
            </div>

            {/* Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Performance by Module (All Modules in Single Scroller) */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 sm:p-6 space-y-4 flex flex-col">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span>Performance by Module</span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                        All Modules
                      </span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Click any score card below to view candidate rankings & scoreboard</p>
                  </div>
                </div>

                {/* Single Scroller Container */}
                <div className="max-h-[720px] overflow-y-auto pr-1 pb-4 space-y-3.5 scrollbar-thin scrollbar-thumb-gray-200 flex-1">
                  {displayModules.map((module, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedModuleScoreboard(module)}
                      className="bg-white/90 border border-gray-150/80 hover:border-blue-300 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                    >
                      {/* Title & Score / Delta Header */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 font-black text-gray-900">
                          <span className="text-base">{module.icon || '🧠'}</span>
                          <span className="truncate max-w-[160px] sm:max-w-none">{module.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="font-extrabold text-emerald-700 text-xs">{module.average}% Avg</span>
                          {module.delta && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              String(module.delta).startsWith('+') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {module.delta}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Animated Line Progress Bar */}
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${module.barColor || 'from-blue-500 to-indigo-600'}`} 
                          style={{ width: `${Math.min(100, Math.max(0, module.average))}%` }}
                        />
                      </div>

                      {/* Candidate Breakdown & Ratio Line */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] pt-0.5">
                        <span className="text-gray-600 font-semibold truncate max-w-full">
                          {module.summary || `${module.performingWellCount ?? 0} of ${module.totalEvaluated ?? 0} candidates performing well`}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                            🟢 {module.performingWellCount ?? 0} Pass
                          </span>
                          <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                            🔴 {module.needsImprovementCount ?? 0} Needs Work
                          </span>
                          <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform font-sans ml-1 text-xs">
                            📊
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column Stack */}
              <div className="space-y-6">
                
                {/* Recent Top Performers Card */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900">Recent Top Performers</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Top performing students in recent assessments</p>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
                    {topPerformers.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 font-bold py-6">No performers yet.</div>
                    ) : (
                      topPerformers.map((performer, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-[10px] text-blue-700 shrink-0">
                              {performer.name ? performer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-gray-900 block leading-tight truncate">{performer.name}</span>
                              <span className="text-[10px] text-gray-400 font-semibold truncate block">{performer.test}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono">
                            <span className="text-xs font-black text-emerald-600 block">{performer.score}</span>
                            <span className="text-[9px] text-gray-450 font-semibold block">{performer.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Exam Submissions & PDF Reports Card (Just below Recent Top Performers) */}
                <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                        <span>Recent Exam Submissions</span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                          PDF Reports
                        </span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">Search subject, candidate name/email, or score to view Cloudinary PDF report</p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={submissionSearchQuery}
                      onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                      placeholder="🔍 Search subject, candidate name, email, score (e.g. Aptitude, 85%, Pass)..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {submissionSearchQuery && (
                      <button
                        onClick={() => setSubmissionSearchQuery('')}
                        className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-700 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Submissions List */}
                  <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto pr-1">
                    {filteredSubmissions.length === 0 ? (
                      <div className="text-center text-xs text-gray-400 font-bold py-8 space-y-1">
                        <span className="text-xl block">🔍</span>
                        <p>{submissionSearchQuery ? 'No matching exam submissions found.' : 'No recent exam submissions.'}</p>
                      </div>
                    ) : (
                      filteredSubmissions.map((sub, idx) => {
                        const isGolden = Boolean(sub.isMentorExam);

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 my-1.5 ${
                              isGolden
                                ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-600/20 border-2 border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.18)] text-amber-950'
                                : 'bg-white/80 border border-gray-150/80 shadow-2xs text-gray-900'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black tracking-tight flex items-center gap-1">
                                  <span>{isGolden ? '✨' : '📝'}</span>
                                  <span>{sub.studentName}</span>
                                </span>

                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  sub.score >= 60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                                }`}>
                                  {sub.score}% • {sub.status}
                                </span>

                                {isGolden && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400 text-black px-2 py-0.5 rounded-full border border-yellow-500 shadow-2xs flex items-center gap-1">
                                    <span>✨</span> <span>GOLDEN ASSESSMENT</span>
                                  </span>
                                )}
                              </div>

                              <span className={`text-[10px] font-semibold block truncate ${isGolden ? 'text-amber-900' : 'text-gray-500'}`}>
                                📚 {sub.subject} {sub.studentEmail ? `• ${sub.studentEmail}` : ''}
                              </span>

                              <span className={`text-[9px] font-mono block ${isGolden ? 'text-amber-800/80 font-bold' : 'text-gray-400'}`}>
                                Submitted: {sub.date}
                              </span>
                            </div>

                            {/* PDF View Action */}
                            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                              <button
                                onClick={() => setPdfModalState({
                                  title: sub.subject,
                                  name: sub.studentName,
                                  pdfUrl: getInlineResumeUrl(sub.pdfUrl)
                                })}
                                className={`font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0 ${
                                  isGolden
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                <span>📄</span> <span>View PDF Report</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </main>

      {/* ── Mobile-Optimized Subject Scoreboard & Candidate Ranking Modal ── */}
      {selectedModuleScoreboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] text-left">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-150 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl sm:text-2xl shadow-xs shrink-0">
                  {selectedModuleScoreboard.icon || '🧠'}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                    {selectedModuleScoreboard.name} Scoreboard
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                    <span className="text-[11px] sm:text-xs font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Overall Avg: {selectedModuleScoreboard.average}%
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-gray-500">
                      • {selectedModuleScoreboard.totalEvaluated ?? 0} Submissions
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedModuleScoreboard(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Candidate Scoreboard & Rankings */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
              {(!selectedModuleScoreboard.candidates || selectedModuleScoreboard.candidates.length === 0) ? (
                <div className="p-8 sm:p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <span className="text-3xl block">📊</span>
                  <h4 className="text-sm font-bold text-gray-700">No Candidate Evaluations Yet</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    When your assigned candidates complete assessments in {selectedModuleScoreboard.name}, their scores and rankings will automatically populate here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Pills (Mobile Responsive Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-3">
                      <span className="text-lg sm:text-xl">🟢</span>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">Performing Well (≥60%)</span>
                        <span className="text-xs sm:text-base font-black text-emerald-950 font-mono">
                          {selectedModuleScoreboard.performingWellCount ?? 0} Candidates
                        </span>
                      </div>
                    </div>
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center gap-3">
                      <span className="text-lg sm:text-xl">🔴</span>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-extrabold text-red-700 uppercase tracking-wider block">Needs Mentor Attention (&lt;60%)</span>
                        <span className="text-xs sm:text-base font-black text-red-950 font-mono">
                          {selectedModuleScoreboard.needsImprovementCount ?? 0} Candidates
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Table */}
                  <div className="space-y-2.5 sm:space-y-3">
                    <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Candidate Rankings & Scores</h4>
                    
                    <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                      {selectedModuleScoreboard.candidates.map((candidate, rankIdx) => (
                        <div 
                          key={rankIdx} 
                          className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 transition-colors ${
                            candidate.score >= 60 ? 'bg-white hover:bg-gray-50' : 'bg-red-50/30 hover:bg-red-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            {/* Rank Badge */}
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0 border ${
                              rankIdx === 0 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                              rankIdx === 1 ? 'bg-slate-100 text-slate-800 border-slate-300' :
                              rankIdx === 2 ? 'bg-orange-100 text-orange-950 border-orange-300' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : rankIdx === 2 ? '🥉' : `#${candidate.rank || rankIdx + 1}`}
                            </div>

                            {/* Candidate Info */}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-900 truncate block">{candidate.name}</span>
                                {candidate.score < 60 && (
                                  <span className="text-[9px] font-extrabold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full shrink-0">
                                    Needs Work
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 truncate block font-mono">
                                {candidate.examTitle} {candidate.email ? `• ${candidate.email}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Candidate Score & Direct Message Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-150/60">
                            <div className="text-left sm:text-right font-mono">
                              <span className={`text-xs sm:text-sm font-black block ${
                                candidate.score >= 60 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {candidate.score}% Score
                              </span>
                              <span className="text-[9px] text-gray-400 font-semibold block">{candidate.date}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessageModal(candidate, selectedModuleScoreboard);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                              title={`Send direct feedback message to ${candidate.name}`}
                            >
                              <span>💬</span> <span>Message</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-gray-150 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedModuleScoreboard(null)}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Scoreboard
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Direct Candidate Messaging Modal ── */}
      {messageModalTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-left">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 bg-gradient-to-r from-blue-50/50 via-white to-blue-50/50 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  💬
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    Send Direct Message & Guidance
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-semibold">
                    To: <strong>{messageModalTarget.name}</strong> ({messageModalTarget.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalTarget(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Category Dropdown */}
              <div>
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider block mb-1">
                  Message Category / Type
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Exam Feedback & Guidance">Exam Feedback & Guidance</option>
                  <option value="Subject Mentor Review">Subject Mentor Review</option>
                  <option value="Performance Praise">Performance Praise</option>
                  <option value="General Info">General Info</option>
                </select>
              </div>

              {/* Message Text Area */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                    Message Content
                  </label>
                  <span className="text-[10px] text-gray-400 font-semibold font-mono">
                    Subject: {messageModalTarget.subject} ({messageModalTarget.score}%)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your feedback, advice, or guidance for this candidate..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Quick Template Fillers */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Quick Feedback Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMessageText(`Hi ${messageModalTarget.name}, I reviewed your score in ${messageModalTarget.subject} (${messageModalTarget.score}%). Let's schedule a brief discussion to work on your weak areas.`)}
                    className="text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    ⚠️ Needs Work Guidance
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageText(`Hi ${messageModalTarget.name}, great job on scoring ${messageModalTarget.score}% in ${messageModalTarget.subject}! Keep up the excellent performance.`)}
                    className="text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    🎉 Praise Performance
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMessageModalTarget(null)}
                className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingMessage || !messageText.trim()}
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>✉️</span> <span>Send Feedback Message</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── In-App Assessment Report Viewer Modal (Matching SUPS Job Applications Resume Modal) ── */}
      {pdfModalState && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-slate-900 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-700 text-left overflow-hidden relative">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm font-black">
                  📄
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white leading-tight">
                    {pdfModalState.name ? `${pdfModalState.name}'s Assessment Report` : 'Assessment Report Preview'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">In-App Document Viewer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfModalState(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                aria-label="Close Assessment Report Modal"
              >
                ✕
              </button>
            </div>

            {/* iframe Container */}
            <div className="flex-1 bg-slate-800 w-full h-full overflow-hidden relative">
              <iframe
                src={pdfModalState.pdfUrl}
                className="w-full h-full border-0"
                title="Assessment Report Viewer"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminReports;
