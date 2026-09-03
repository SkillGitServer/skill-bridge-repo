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

  // State for referred students
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    let active = true;
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const token = getAuthToken('vault');
        const res = await axios.get('/api/admin/students', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (active) {
          setStudents(res.data.students || []);
        }
      } catch (err) {
        console.error('Failed to load referred students:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (referralCode) {
      fetchStudents();
    }
    return () => {
      active = false;
    };
  }, [referralCode]);

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const fetchAllDashboardData = async () => {
    try {
      const token = getAuthToken('vault');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await Promise.allSettled([
        fetchUploadLogs(),
        fetchRetentionSettings(),
        axios.get('/api/admin/students', { headers }).then(res => setStudents(res.data.students || [])).catch(console.error)
      ]);
    } catch (err) {
      console.error('Error refreshing admin dashboard:', err);
    }
  };

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchAllDashboardData);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const isAuthenticated = !!adminEmail || !!getAuthToken('vault');

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth?access=admin_launch_2026" replace />;
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return 'N/A'; }
  };

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

        {/* Referred Students Table */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Referred Students</h2>
              <p className="text-xs text-gray-400 mt-0.5">View and track students registered using your referral code</p>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
              Active Code: {referralCode || 'None'}
            </span>
          </div>

          {/* Table wrapper for mobile responsiveness */}
          <div className="w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-extrabold text-gray-500">Loading referred students...</p>
              </div>
            ) : (
              <>
                {/* Desktop View (min-width: 768px) */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-4 text-left">Student Name</th>
                        <th className="px-6 py-4 text-left">Email Address</th>
                        <th className="px-6 py-4 text-left">Mobile Number</th>
                        <th className="px-6 py-4 text-left">Registration Date</th>
                        <th className="px-6 py-4 text-center">Account Status</th>
                        <th className="px-6 py-4 text-right">Referral Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-bold text-sm bg-white">
                            No referred students data available.
                          </td>
                        </tr>
                      ) : (
                        students.map((student) => (
                          <tr key={student.id} className="hover:bg-gray-50/80 transition-colors bg-white/40 group">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-700 shadow-2xs group-hover:scale-105 transition-transform">
                                  {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-gray-900 leading-tight">{student.name}</h4>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Referred Student</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-xs font-mono text-gray-700 font-semibold">
                              {student.email}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-xs font-mono">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-700 font-bold border border-blue-100/80">
                                📞 {student.mobile || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 font-mono font-semibold">
                              {formatDate(student.createdAt)}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${student.isTrialActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${student.isTrialActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                {student.isTrialActive ? 'Active' : 'Deactivated'}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right text-xs font-mono font-bold text-gray-800">
                              <span className="bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700">
                                {student.referralCodeUsed || referralCode || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (max-width: 767px) */}
                <div className="block md:hidden p-3 space-y-3">
                  {students.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                      No referred students data available.
                    </div>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                        <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-700 shrink-0">
                              {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Referred Student</span>
                              <h4 className="text-sm font-black text-gray-900 leading-tight">{student.name}</h4>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border shrink-0 ${student.isTrialActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${student.isTrialActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {student.isTrialActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Email Address:</span>
                            <span className="font-semibold text-gray-800 break-all font-mono">{student.email}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Mobile Number:</span>
                            <span className="font-bold text-blue-700 font-mono flex items-center gap-1">
                              <span>📞</span> {student.mobile || 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Registration Date:</span>
                            <span className="font-semibold text-gray-600 font-mono">{formatDate(student.createdAt)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Referral Code Used:</span>
                            <span className="font-bold text-gray-800 font-mono">{student.referralCodeUsed || referralCode || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
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
