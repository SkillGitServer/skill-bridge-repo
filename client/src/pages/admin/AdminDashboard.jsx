import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import AdminOverview from './AdminOverview';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';

function AdminDashboard() {
  useDocumentTitle('Admin Dashboard | Skill Bridge India');
  const navigate = useNavigate();

  // Load Admin details from session
  const adminEmail = localStorage.getItem('admin_email') || localStorage.getItem('auth_email');
  const adminName = localStorage.getItem('admin_name') || localStorage.getItem('auth_name') || 'Admin';
  const referralCode = localStorage.getItem('admin_referral_code') || '';

  const [uploadLogs, setUploadLogs] = useState([]);

  // Retention & Auto-Delete Settings (1d, 3d, 7d, 30d, never)
  const [retentionSettings, setRetentionSettings] = useState({
    uploadLogsRetention: '7d',
    communicationsRetention: '7d'
  });
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [isCleaningNow, setIsCleaningNow] = useState(false);

  const fetchUploadLogs = async () => {
    try {
      const token = getAuthToken('vault');
      const res = await axios.get('/api/upload-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUploadLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch upload logs:', err);
    }
  };

  const fetchRetentionSettings = async () => {
    try {
      const token = getAuthToken('vault');
      const res = await axios.get('/api/admin/settings/retention', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data) {
        setRetentionSettings({
          uploadLogsRetention: res.data.uploadLogsRetention || '7d',
          communicationsRetention: res.data.communicationsRetention || '7d'
        });
      }
    } catch (err) {
      console.error('Failed to fetch retention settings:', err);
    }
  };

  const handleUpdateRetention = async (category, newRetention) => {
    try {
      setIsUpdatingRetention(true);
      const updated = {
        ...retentionSettings,
        [category]: newRetention
      };
      setRetentionSettings(updated);
      const token = getAuthToken('vault');
      await axios.post(
        '/api/admin/settings/retention',
        updated,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Auto-delete retention updated & database cleaned successfully!');
      fetchUploadLogs();
    } catch (err) {
      console.error('Failed to update retention:', err);
      toast.error('Failed to update retention setting.');
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const handleManualCleanup = async () => {
    try {
      setIsCleaningNow(true);
      const token = getAuthToken('vault');
      const res = await axios.post(
        '/api/admin/cleanup-logs-now',
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const report = res.data.report || {};
      toast.success(`Data Cleaned! Deleted ${report.uploadLogsDeleted || 0} Upload Logs, ${report.communicationsDeleted || 0} Communications.`);
      fetchUploadLogs();
    } catch (err) {
      console.error('Failed to run manual cleanup:', err);
      toast.error('Failed to execute manual cleanup.');
    } finally {
      setIsCleaningNow(false);
    }
  };

  useEffect(() => {
    fetchUploadLogs();
    fetchRetentionSettings();
  }, []);

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const fetchAllDashboardData = async () => {
    try {
      await Promise.allSettled([
        fetchUploadLogs(),
        fetchRetentionSettings()
      ]);
    } catch (err) {
      console.error('Error refreshing admin dashboard:', err);
    }
  };

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchAllDashboardData);

  const isAuthenticated = !!adminEmail || !!getAuthToken('vault');

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth?access=admin_launch_2026" replace />;
  }

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col">
      {RefreshOverlay}

      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8">

        {/* Admin Command Center Overview */}
        <AdminOverview />

        {/* Upload Activity Logs Card */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 text-left">
          <div className="flex flex-col gap-2.5 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Upload Activity Logs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track student file upload success and block malicious/unsupported upload attempts</p>
            </div>

            {/* Retention & Manual Cleanup Box (stacked below title area) */}
            <div className="flex items-center justify-between gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-1.5 bg-white border border-red-100 rounded-xl shadow-2xs shrink-0" title="Retention & Cleanup">🚫</span>

                <select
                  value={retentionSettings.uploadLogsRetention}
                  onChange={(e) => handleUpdateRetention('uploadLogsRetention', e.target.value)}
                  disabled={isUpdatingRetention}
                  className="text-xs font-bold bg-white text-gray-900 border border-gray-300 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs cursor-pointer outline-none hover:border-red-300 transition-all"
                >
                  <option value="1d">1 Day</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">1 Month</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <button
                onClick={handleManualCleanup}
                disabled={isCleaningNow}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
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
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {uploadLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-bold bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                No upload activity recorded yet.
              </div>
            ) : (
              uploadLogs.map((log) => (
                <div
                  key={log._id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${log.status === 'success'
                      ? 'bg-emerald-50/40 border-emerald-100/70 hover:bg-emerald-50/70'
                      : 'bg-red-50/40 border-red-100/70 hover:bg-red-50/70'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{log.status === 'success' ? '✅' : '⚠️'}</span>
                      <p className="text-xs font-bold text-gray-900 leading-relaxed">
                        <span className="text-gray-900 font-extrabold">{log.studentName}</span>
                        {log.status === 'success' ? ' uploaded ' : ' tried to upload '}
                        <span className="font-mono bg-gray-200/50 px-1.5 py-0.5 rounded text-gray-800 border border-gray-300/30 text-[10px]">{log.filename}</span>
                        {log.status === 'success' ? ' and it was fetched successfully.' : ' but the upload failed.'}
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono font-bold">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short'
                      })}
                    </span>
                  </div>
                  {log.message && (
                    <p className={`text-[10px] font-semibold mt-1.5 ml-6 ${log.status === 'success' ? 'text-emerald-700/80' : 'text-red-700/80'
                      }`}>
                      Reason: {log.message}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminDashboard;
