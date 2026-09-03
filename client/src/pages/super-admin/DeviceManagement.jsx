import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function DeviceManagement() {
  useDocumentTitle('Device Management | Super Admin');
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchSessions);

  const token = getAuthToken('supss');
  const currentSessionId = (() => {
    try {
      const payload = token?.split('.')[1];
      if (!payload) return null;
      return JSON.parse(atob(payload)).sessionId;
    } catch { return null; }
  })();

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data.sessions || []);
    } catch (err) {
      toast.error('Failed to load sessions.');
      if (err.response?.status === 401) navigate('/sudo-control-panel', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { navigate('/sudo-control-panel', { replace: true }); return; }
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId) => {
    if (sessionId === currentSessionId) {
      toast.error("You can't revoke your current session here. Use Logout instead.");
      return;
    }
    setRevoking(sessionId);
    try {
      await axios.delete(`/api/auth/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Session revoked successfully.');
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch (err) {
      toast.error('Failed to revoke session.');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    const others = sessions.filter(s => s.sessionId !== currentSessionId);
    if (others.length === 0) {
      toast('No other sessions to revoke.');
      return;
    }
    const loadingToast = toast.loading(`Revoking ${others.length} session(s)...`);
    let count = 0;
    for (const s of others) {
      try {
        await axios.delete(`/api/auth/sessions/${s.sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        count++;
      } catch {}
    }
    toast.dismiss(loadingToast);
    toast.success(`Revoked ${count} session(s).`);
    await fetchSessions();
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return 'Unknown'; }
  };

  const getBrowserIcon = (browser) => {
    const icons = { Chrome: '🌐', Firefox: '🦊', Safari: '🧭', Edge: '🔷', Opera: '🎵' };
    return icons[browser] || '💻';
  };

  const getOSIcon = (os) => {
    const icons = { Windows: '🪟', macOS: '🍎', Linux: '🐧', Android: '🤖', iOS: '📱' };
    return icons[os] || '💾';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col">
      {RefreshOverlay}

      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-b border-white/50 px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse" />
          <span
            className="text-lg font-black tracking-widest uppercase cursor-pointer text-gray-900"
            onClick={() => navigate('/super-admin/dashboard')}
          >
            Skill Sups
          </span>
        </div>
        <div className="flex items-center gap-4">
          {RefreshButton}
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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6">

        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Active Sessions</h1>
          <p className="text-xs text-gray-500 mt-1">
            Monitor and revoke all active login sessions for your Super Admin account across devices.
          </p>
        </div>

        {/* Stats + Actions Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl">
              🖥️
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Active Sessions</p>
              <p className="text-3xl font-black text-gray-900 leading-tight">
                {isLoading ? '—' : sessions.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleRevokeAll}
            disabled={isLoading || sessions.filter(s => s.sessionId !== currentSessionId).length === 0}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold rounded-xl text-xs tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            🔴 Log Out All Other Devices
          </button>
        </div>

        {/* Sessions Table */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="animate-spin w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-gray-400 font-bold">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-sm font-bold text-gray-500">No active sessions found.</p>
            </div>
          ) : (
            <>
              {/* Desktop View (min-width: 768px) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-extrabold tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4">Device / Browser</th>
                      <th className="px-6 py-4">Operating System</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Login Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const isCurrent = session.sessionId === currentSessionId;
                      return (
                        <tr
                          key={session.sessionId}
                          className={`border-t border-gray-100 transition-colors ${isCurrent ? 'bg-emerald-50/40' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{getBrowserIcon(session.deviceInfo?.browser)}</span>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{session.deviceInfo?.browser || 'Unknown Browser'}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{session.sessionId.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span>{getOSIcon(session.deviceInfo?.os)}</span>
                              <span className="text-xs font-semibold text-gray-700">{session.deviceInfo?.os || 'Unknown OS'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">
                            {session.deviceInfo?.ip || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 font-semibold">
                            {formatDate(session.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            {isCurrent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block" />
                                This Device
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wide">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isCurrent ? (
                              <span className="text-[10px] text-gray-400 font-bold">Current</span>
                            ) : (
                              <button
                                onClick={() => handleRevoke(session.sessionId)}
                                disabled={revoking === session.sessionId}
                                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold px-3 py-1.5 rounded-lg text-[10px] tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs"
                              >
                                {revoking === session.sessionId ? 'Revoking...' : 'Terminate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (max-width: 767px) */}
              <div className="block md:hidden p-3 space-y-3">
                {sessions.map((session) => {
                  const isCurrent = session.sessionId === currentSessionId;
                  return (
                    <div
                      key={session.sessionId}
                      className={`border rounded-xl p-4 space-y-3 shadow-xs bg-white ${
                        isCurrent ? 'border-emerald-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{getBrowserIcon(session.deviceInfo?.browser)}</span>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Active Session</span>
                            <h4 className="text-sm font-black text-gray-900 leading-tight">
                              {session.deviceInfo?.browser || 'Unknown Browser'}
                            </h4>
                            <div className="text-[9px] text-gray-400 font-mono mt-0.5">{session.sessionId.substring(0, 8)}...</div>
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block" />
                            This Device
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Operating System:</span>
                          <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                            <span>{getOSIcon(session.deviceInfo?.os)}</span>
                            <span>{session.deviceInfo?.os || 'Unknown OS'}</span>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">IP Address:</span>
                          <span className="font-semibold text-gray-800 font-mono">{session.deviceInfo?.ip || 'Unknown'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Login Time:</span>
                          <span className="font-semibold text-gray-600">{formatDate(session.createdAt)}</span>
                        </div>
                      </div>

                      {!isCurrent && (
                        <div className="pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleRevoke(session.sessionId)}
                            disabled={revoking === session.sessionId}
                            className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs text-center"
                          >
                            {revoking === session.sessionId ? 'Revoking Session...' : 'Terminate Session'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default DeviceManagement;
