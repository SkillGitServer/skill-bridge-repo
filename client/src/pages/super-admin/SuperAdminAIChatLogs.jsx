import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function SuperAdminAIChatLogs() {
  useDocumentTitle('AI Chat Logs | Super Admin');
  const navigate = useNavigate();

  const [chatLogs, setChatLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh();

  const fetchChatLogs = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/ai-chat-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data.logs)) {
        setChatLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch AI chat logs:', err);
      toast.error('Failed to load AI chat logs.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const executeClearLogs = async () => {
    try {
      setIsClearing(true);
      setShowClearConfirmModal(false);
      const token = getAuthToken('supss');
      await axios.delete('/api/super-admin/ai-chat-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setChatLogs([]);
      toast.success('All AI chat logs cleared successfully.');
    } catch (err) {
      console.error('Failed to clear AI chat logs:', err);
      toast.error('Failed to clear chat logs.');
    } finally {
      setIsClearing(false);
    }
  };

  const [retention, setRetention] = useState('7d');
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [isCleaningNow, setIsCleaningNow] = useState(false);

  const fetchRetentionSetting = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/settings/retention', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.aiChatLogsRetention) {
        setRetention(res.data.aiChatLogsRetention);
      }
    } catch (err) {
      console.error('Failed to fetch retention setting:', err);
    }
  };

  const handleUpdateRetention = async (newRetention) => {
    try {
      setIsUpdatingRetention(true);
      setRetention(newRetention);
      const token = getAuthToken('supss');
      await axios.post(
        '/api/super-admin/settings/retention',
        { aiChatLogsRetention: newRetention },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('AI Chat Log retention updated & database cleaned successfully!');
      fetchChatLogs();
    } catch (err) {
      console.error('Failed to update AI Chat Log retention:', err);
      toast.error('Failed to update retention setting.');
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const handleManualCleanup = async () => {
    try {
      setIsCleaningNow(true);
      const token = getAuthToken('supss');
      const res = await axios.post(
        '/api/super-admin/cleanup-logs-now',
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const report = res.data.report || {};
      toast.success(`Data Cleaned! Deleted ${report.aiChatLogsDeleted || 0} AI Chat Logs.`);
      fetchChatLogs();
    } catch (err) {
      console.error('Failed to run manual cleanup:', err);
      toast.error('Failed to execute manual cleanup.');
    } finally {
      setIsCleaningNow(false);
    }
  };

  useEffect(() => {
    fetchChatLogs();
    fetchRetentionSetting();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Header ── */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse"></span>
          <span 
            className="text-lg font-black tracking-widest uppercase cursor-pointer text-gray-900"
            onClick={() => navigate('/super-admin/dashboard')}
          >
            Skill Sups
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {RefreshButton}
          <Link 
            to="/super-admin/approvals" 
            className="text-xs font-extrabold text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
          >
            Approvals
          </Link>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main content area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Navigation Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/super-admin/dashboard')}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm">←</span> <span>Dashboard</span>
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Retention & Manual Cleanup Box */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs shrink-0">
              <span className="text-xs px-2 py-1.5 bg-white border border-red-100 rounded-xl shadow-2xs shrink-0" title="Retention & Cleanup">🚫</span>

              <select
                value={retention}
                onChange={(e) => handleUpdateRetention(e.target.value)}
                disabled={isUpdatingRetention}
                className="text-xs font-bold bg-white text-gray-900 border border-gray-300 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs cursor-pointer outline-none hover:border-red-300 transition-all"
              >
                <option value="1d">1 Day</option>
                <option value="3d">3 Days</option>
                <option value="7d">7 Days</option>
                <option value="30d">1 Month</option>
                <option value="never">Never</option>
              </select>

              <button
                onClick={handleManualCleanup}
                disabled={isCleaningNow}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Immediately delete expired records from database"
              >
                {isCleaningNow ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>

            <button
              onClick={() => fetchChatLogs(true)}
              disabled={isRefreshing || isLoading}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span> {isRefreshing ? 'Refreshing...' : 'Refresh Logs'}
            </button>
            {chatLogs.length > 0 && (
              <button
                onClick={() => setShowClearConfirmModal(true)}
                disabled={isClearing}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>🗑️</span> {isClearing ? 'Clearing...' : 'Clear All Logs'}
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Anonymous AI Chat Logs</h1>
          <p className="text-xs text-gray-500 font-semibold mt-1">Monitor candidate interactions with Bridge AI to identify common learning hurdles.</p>
        </div>

        {/* Info Badge */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm max-w-3xl">
          <span className="text-lg">🔒</span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-0.5">Strict Privacy Mode Active</h4>
            <p className="text-[11px] leading-relaxed opacity-90">
              Only student prompt text and AI responses are recorded for analysis. Zero personal details, IP addresses, or user IDs are stored.
            </p>
          </div>
        </div>

        {/* Chat Logs Table Wrapper */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden mt-6">
          <div className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500 font-bold text-sm">
                <span className="inline-block animate-spin mr-2">⏳</span> Loading AI Chat Logs...
              </div>
            ) : chatLogs.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-bold text-sm">
                <p className="text-2xl mb-2">💬</p>
                <p className="text-gray-800 font-extrabold text-base">No AI Chat Logs Found</p>
                <p className="text-xs text-gray-500 font-medium mt-1">Candidate queries to Bridge AI will automatically show up here in real time.</p>
              </div>
            ) : (
              <>
                {/* Desktop View (min-width: 768px) */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider w-44">Timestamp</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider w-1/3">User Question</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider w-auto">Bridge AI Response</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {chatLogs.map((log) => (
                        <tr key={log._id || log.id || Math.random()} className="hover:bg-white/90 transition-colors">
                          <td className="px-6 py-5 align-top">
                            <span className="text-xs font-mono font-bold text-gray-500 whitespace-nowrap bg-gray-100/80 px-2 py-1 rounded-md border border-gray-200 block text-center">
                              {formatDate(log.createdAt || log.timestamp)}
                            </span>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <p className="text-sm font-bold text-gray-900 leading-snug">"{log.userMessage || log.question}"</p>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 relative">
                              <span className="absolute -left-3 top-4 text-lg">🤖</span>
                              <p className="text-sm font-semibold text-gray-700 leading-relaxed pl-3 whitespace-pre-wrap">
                                {log.aiResponse || log.response}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (max-width: 767px) */}
                <div className="block md:hidden p-3 space-y-3">
                  {chatLogs.map((log) => (
                    <div key={log._id || log.id || Math.random()} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex justify-between items-center gap-2 border-b border-gray-100 pb-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Anonymous AI Query</span>
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {formatDate(log.createdAt || log.timestamp)}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">User Question:</span>
                          <p className="font-black text-gray-900 leading-tight mt-0.5">"{log.userMessage || log.question}"</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-indigo-500">Bridge AI Response:</span>
                          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 mt-1 relative">
                            <p className="text-xs font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">
                              🤖 {log.aiResponse || log.response}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* Custom Clear Logs Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-left space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 text-2xl">
              🗑️
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Clear All AI Chat Logs?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Are you sure you want to permanently clear all anonymous AI chat history? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeClearLogs}
                disabled={isClearing}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear All Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminAIChatLogs;
