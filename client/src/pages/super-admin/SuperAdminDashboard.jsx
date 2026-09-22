import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import ApkDownloadMenu from '../../components/super-admin/ApkDownloadMenu';
import { exportPlatformActivityLogs, exportUploadActivityLogs } from '../../utils/exportUtils';

import supIcon from '../../assets/sup-icon.png';

function SuperAdminDashboard() {
  useDocumentTitle('Platform Management | Skill Bridge India');
  const navigate = useNavigate();

  const defaultDashboardStats = {
    totalCandidates: 5,
    activeCandidates: 5,
    upgradedCandidates: 4,
    pendingCandidates: 1,
    disabledCandidates: 0,
    totalAdmins: 2,
    activeAdmins: 1,
    pendingAdmins: 0,
    revokedAdmins: 1,
    totalExams: 2,
    totalJobs: 2,
    activeJobs: 2,
    pendingJobs: 1,
    totalApplications: 2,
    totalRevenue: 4096,
    totalChatLogs: 0,
    admins: { total: 2, active: 1, pending: 0, revoked: 1 },
    students: { total: 5, upgraded: 4, disabled: 0, pending: 1, active: 5 },
    jobs: { total: 2, active: 2, pending: 1, applied: 2 }
  };

  const getInitialStatsCache = () => {
    try {
      const cached = sessionStorage.getItem('supss_dashboard_stats_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.stats) return parsed.stats;
      }
    } catch (e) { }
    return defaultDashboardStats;
  };

  const initialCache = getInitialStatsCache();

  // Primary Metrics Cache State
  const [stats, setStats] = useState(initialCache || defaultDashboardStats);
  const [activitiesList, setActivitiesList] = useState([]);
  const [activeModalUser, setActiveModalUser] = useState(null);

  const [extensionRequests, setExtensionRequests] = useState([]);
  const [uploadLogs, setUploadLogs] = useState([]);

  // Student Review Handler State
  const [reviewsList, setReviewsList] = useState([]);
  const [reviewCounts, setReviewCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [reviewFilter, setReviewFilter] = useState('all');
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewActionLoadingId, setReviewActionLoadingId] = useState(null);

  // Read states for dynamic card highlights (resets when user clicks/opens card)
  const [readJobsCount, setReadJobsCount] = useState(() => Number(localStorage.getItem('supss_read_jobs') || 0));
  const [readApplicationsCount, setReadApplicationsCount] = useState(() => Number(localStorage.getItem('supss_read_applications') || 0));
  const [readExamsCount, setReadExamsCount] = useState(() => Number(localStorage.getItem('supss_read_exams') || 0));
  const [readDisabledCount, setReadDisabledCount] = useState(() => Number(localStorage.getItem('supss_read_disabled') || 0));
  const [readChatLogsCount, setReadChatLogsCount] = useState(() => Number(localStorage.getItem('supss_read_chat_logs') || 0));

  const hasUnreadJobs = Boolean(stats && stats.totalJobs > 0 && stats.totalJobs > readJobsCount);
  const hasUnreadApplications = Boolean(stats && (stats.totalApplications ?? 0) > 0 && (stats.totalApplications ?? 0) > readApplicationsCount);
  const hasUnreadExams = Boolean(stats && stats.totalExams > 0 && stats.totalExams > readExamsCount);
  const hasUnreadDisabled = Boolean(stats && stats.disabledCandidates > 0 && stats.disabledCandidates > readDisabledCount);
  const hasUnreadChatLogs = Boolean(stats && stats.totalChatLogs > 0 && stats.totalChatLogs > readChatLogsCount);

  const handleJobCardClick = () => {
    if (stats?.totalJobs !== undefined) {
      localStorage.setItem('supss_read_jobs', stats.totalJobs);
      setReadJobsCount(stats.totalJobs);
    }
    if (stats?.totalApplications !== undefined) {
      localStorage.setItem('supss_read_applications', stats.totalApplications);
      setReadApplicationsCount(stats.totalApplications);
    }
    navigate('/super-admin/jobs');
  };

  const handleExamsCardClick = () => {
    if (stats?.totalExams !== undefined) {
      localStorage.setItem('supss_read_exams', stats.totalExams);
      setReadExamsCount(stats.totalExams);
    }
    navigate('/super-admin/published-exams');
  };

  const handleCandidateCardClick = () => {
    if (stats?.disabledCandidates !== undefined) {
      localStorage.setItem('supss_read_disabled', stats.disabledCandidates);
      setReadDisabledCount(stats.disabledCandidates);
    }
    navigate('/super-admin/candidates');
  };

  const handleChatLogsCardClick = () => {
    if (stats?.totalChatLogs !== undefined) {
      localStorage.setItem('supss_read_chat_logs', stats.totalChatLogs);
      setReadChatLogsCount(stats.totalChatLogs);
    }
    navigate('/super-admin/ai-chat-logs');
  };

  // Groq AI API Keys State (Chatbot & Resume ATS)
  const [groqChatInput, setGroqChatInput] = useState('');
  const [groqResumeInput, setGroqResumeInput] = useState('');
  const [groqKeysInfo, setGroqKeysInfo] = useState({
    chatKey: { masked: '', hasCustomKey: false, source: 'environment', keyLength: 0 },
    resumeKey: { masked: '', hasCustomKey: false, source: 'environment', keyLength: 0 },
    updatedAt: null
  });
  const [isSavingChatKey, setIsSavingChatKey] = useState(false);
  const [isSavingResumeKey, setIsSavingResumeKey] = useState(false);
  const [showChatKey, setShowChatKey] = useState(false);
  const [showResumeKey, setShowResumeKey] = useState(false);

  const fetchGroqKeySettings = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/settings/groq-keys', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setGroqKeysInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch Groq API key settings:', err);
    }
  };

  const handleSaveGroqKey = async (targetKey, keyToSet) => {
    if (targetKey === 'chat') setIsSavingChatKey(true);
    if (targetKey === 'resume') setIsSavingResumeKey(true);
    try {
      const token = getAuthToken('supss');
      const res = await axios.post(
        '/api/super-admin/settings/groq-keys',
        { targetKey, activeGroqApiKey: keyToSet },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(res.data.message || 'Groq AI API Key updated successfully!');
      if (targetKey === 'chat') setGroqChatInput('');
      if (targetKey === 'resume') setGroqResumeInput('');
      fetchGroqKeySettings();
    } catch (err) {
      console.error('Failed to update Groq API key:', err);
      toast.error(err.response?.data?.error || 'Failed to update Groq API key.');
    } finally {
      if (targetKey === 'chat') setIsSavingChatKey(false);
      if (targetKey === 'resume') setIsSavingResumeKey(false);
    }
  };

  // Retention & Auto-Delete Settings (1d, 3d, 7d, 30d, never)
  const [retentionSettings, setRetentionSettings] = useState({
    uploadLogsRetention: '7d',
    communicationsRetention: '7d',
    aiChatLogsRetention: '7d'
  });
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [isCleaningNow, setIsCleaningNow] = useState(false);

  // Google Drive Database Backup Status State & Handlers
  const getInitialBackupCache = () => {
    try {
      const cached = sessionStorage.getItem('supss_backup_status_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return {
      status: 'Success',
      relativeTime: 'Just now',
      size: '3.4 MB',
      autoBackupFrequency: 'Daily'
    };
  };

  const [backupStatus, setBackupStatus] = useState(getInitialBackupCache());
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);

  const fetchBackupStatus = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/backup-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data) {
        setBackupStatus(res.data);
        sessionStorage.setItem('supss_backup_status_cache', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to fetch backup status:', err);
    }
  };

  const handleTriggerBackupNow = async (e) => {
    if (e) e.stopPropagation();
    setIsTriggeringBackup(true);
    try {
      const token = getAuthToken('supss');
      const res = await axios.post('/api/super-admin/backup-now', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.status !== 'Failed') {
        toast.success('Google Drive Database Backup synced successfully!');
        setBackupStatus(res.data);
      } else {
        throw new Error(res.data?.message || res.data?.error || 'Backup failed. Check server logs for Google Drive errors.');
      }
    } catch (err) {
      console.error('Failed to trigger backup:', err);
      toast.error('Backup failed. Check server logs for Google Drive errors.');
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleUpdateBackupFrequency = async (newFrequency) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.post('/api/super-admin/settings/backup-frequency',
        { autoBackupFrequency: newFrequency },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success(`Auto Backup Frequency updated to ${newFrequency}!`);
      setBackupStatus(prev => prev ? { ...prev, autoBackupFrequency: newFrequency } : null);
    } catch (err) {
      console.error('Failed to update backup frequency:', err);
      toast.error(err.response?.data?.error || 'Failed to update backup frequency.');
    }
  };

  const fetchUploadLogs = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/upload-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUploadLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch upload logs:', err);
    }
  };

  const fetchCommunications = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/communications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && Array.isArray(res.data.communications)) {
        setActivitiesList(res.data.communications);
      }
    } catch (err) {
      console.error('Failed to fetch communications:', err);
    }
  };

  const fetchRetentionSettings = async () => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/settings/retention', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data) {
        setRetentionSettings({
          uploadLogsRetention: res.data.uploadLogsRetention || '7d',
          communicationsRetention: res.data.communicationsRetention || '7d',
          aiChatLogsRetention: res.data.aiChatLogsRetention || '7d'
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
      const token = getAuthToken('supss');
      const res = await axios.post(
        '/api/super-admin/settings/retention',
        updated,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Auto-delete retention updated & database cleaned successfully!');
      fetchUploadLogs();
      fetchCommunications();
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
      const token = getAuthToken('supss');
      const res = await axios.post(
        '/api/super-admin/cleanup-logs-now',
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const report = res.data.report || {};
      toast.success(`Data Cleaned! Deleted ${report.uploadLogsDeleted || 0} Upload Logs, ${report.communicationsDeleted || 0} Communications, ${report.aiChatLogsDeleted || 0} AI Chat Logs.`);
      fetchUploadLogs();
      fetchCommunications();
    } catch (err) {
      console.error('Failed to run manual cleanup:', err);
      toast.error('Failed to execute manual cleanup.');
    } finally {
      setIsCleaningNow(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setIsLoadingReviews(true);
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/reviews', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.success) {
        setReviewsList(res.data.reviews || []);
        if (res.data.counts) {
          setReviewCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleUpdateReviewStatus = async (reviewId, newStatus) => {
    try {
      setReviewActionLoadingId(reviewId);
      const token = getAuthToken('supss');
      const res = await axios.put(
        `/api/super-admin/reviews/${reviewId}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.data && res.data.success) {
        toast.success(res.data.message || `Review marked as ${newStatus}`);
        fetchReviews();
      }
    } catch (err) {
      console.error('Failed to update review status:', err);
      toast.error(err.response?.data?.error || 'Failed to update review status.');
    } finally {
      setReviewActionLoadingId(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this student review?')) {
      return;
    }
    try {
      setReviewActionLoadingId(reviewId);
      const token = getAuthToken('supss');
      const res = await axios.delete(`/api/super-admin/reviews/${reviewId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.data && res.data.success) {
        toast.success('Review deleted permanently.');
        fetchReviews();
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error(err.response?.data?.error || 'Failed to delete review.');
    } finally {
      setReviewActionLoadingId(null);
    }
  };

  useEffect(() => {
    fetchUploadLogs();
    fetchCommunications();
    fetchRetentionSettings();
    fetchGroqKeySettings();
    fetchReviews();
  }, []);

  useEffect(() => {
    const fetchExtensions = async () => {
      try {
        const res = await axios.get('/api/trial/extensions');
        setExtensionRequests(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchExtensions();
  }, []);

  const handleGrant = async (id) => {
    try {
      await axios.post(`/api/trial/extension/${id}/grant`);
      toast.success('Granted +24hrs extension to student.');
      setExtensionRequests(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      toast.error('Failed to grant extension');
    }
  };

  const handleDeny = async (id) => {
    try {
      await axios.post(`/api/trial/extension/${id}/deny`);
      toast.success('Extension request denied.');
      setExtensionRequests(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      toast.error('Failed to deny extension');
    }
  };

  const handleOpenStudentModal = async (req) => {
    try {
      const token = getAuthToken('supss');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const candidatesRes = await axios.get('/api/super-admin/candidates', { headers }).catch(() => null);
      let cand = null;
      if (candidatesRes && candidatesRes.data) {
        cand = candidatesRes.data.find(c => c.email.toLowerCase().trim() === req.studentEmail.toLowerCase().trim());
      }
      setActiveModalUser({
        name: cand ? cand.name : (req.studentName && req.studentName !== 'Student' ? req.studentName : req.studentEmail),
        email: req.studentEmail,
        mobile: (cand && cand.mobile) || req.mobile || '+91 98765 43210',
        role: 'Candidate / Student',
        status: cand ? (cand.isUnlocked ? 'Upgraded' : 'Pending Upgrade') : (req.status || 'Active'),
        id: (cand && cand.id) || req.studentId || 'N/A',
        linkedAdmin: cand ? cand.linkedAdmin : (req.linkedAdmin || 'Unassigned')
      });
    } catch (e) {
      setActiveModalUser({
        name: req.studentName && req.studentName !== 'Student' ? req.studentName : req.studentEmail,
        email: req.studentEmail,
        mobile: req.mobile || '+91 98765 43210',
        role: 'Candidate / Student',
        status: req.status || 'Active',
        id: req.studentId || 'N/A',
        linkedAdmin: req.linkedAdmin || 'Unassigned'
      });
    }
  };

  const fetchAllDashboardData = async () => {
    try {
      const token = getAuthToken('supss');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const results = await Promise.allSettled([
        axios.get('/api/dashboard/stats?refresh=true', { headers }).catch(() => null),
        axios.get('/api/trial/extensions', { headers }).catch(() => null),
        fetchUploadLogs().catch(() => null),
        fetchCommunications().catch(() => null),
        fetchRetentionSettings().catch(() => null),
        fetchGroqKeySettings().catch(() => null),
        fetchBackupStatus().catch(() => null),
        fetchReviews().catch(() => null)
      ]);

      const statsRes = results[0];
      const extRes = results[1];

      if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.data) {
        setStats(statsRes.value.data);
        sessionStorage.setItem('supss_dashboard_stats_cache', JSON.stringify({ stats: statsRes.value.data }));
      } else {
        setStats(prev => prev || defaultDashboardStats);
      }

      if (extRes.status === 'fulfilled' && extRes.value && extRes.value.data) {
        setExtensionRequests(extRes.value.data || []);
      }
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setStats(prev => prev || defaultDashboardStats);
    }
  };

  useEffect(() => {
    fetchAllDashboardData();
    fetchBackupStatus();
  }, []);

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchAllDashboardData);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getAvatar = (name) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    return (
      <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[9px] font-black text-blue-700 shadow-sm shrink-0">
        {initials}
      </div>
    );
  };

  const getLargeAvatar = (user) => {
    const name = user?.name || '';
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    const isMentor = Boolean(user?.role && String(user.role).includes('Mentor'));
    const colorClasses = isMentor
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return (
      <div className={`w-16 h-16 rounded-full border flex items-center justify-center text-xl font-black shadow-sm ${colorClasses}`}>
        {initials}
      </div>
    );
  };

  const publishedExams = [];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 w-full flex flex-col">
      {RefreshOverlay}

      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/super-admin/dashboard')}>
          <img src={supIcon} alt="Super Admin Tier Icon" className="h-8 w-8 object-contain" />
          <span className="text-lg font-black tracking-widest uppercase text-gray-900">
            Skill Sups
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ApkDownloadMenu />
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6 text-left">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Super Admin Dashboard</h2>
            <p className="text-xs text-gray-500 font-semibold mt-1">Platform management, live exams auditing, and settings panel.</p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-mono text-gray-500 shadow-sm">
              📅 {currentDate}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-55 border border-emerald-200 text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-ping"></span>
              Sys Active
            </span>
          </div>
        </div>

        {/* ── Key Management & Analytics Cards Grid (3x3 Layout) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 text-left">

          {/* 1. Admin Manager (Merged Pending Approvals & Mentor Governance) */}
          <div
            onClick={() => navigate('/super-admin/institutes')}
            className={`${(stats?.pendingAdmins || 0) > 0
              ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-lg shadow-emerald-100/50'
              : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group`}
          >
            {(stats?.pendingAdmins || 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider mb-2 self-start animate-pulse">
                🟢 Pending Approvals ({stats.pendingAdmins})
              </span>
            )}
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">🏫</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Mentor Governance
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                {stats ? `${stats.totalAdmins} Admin` : '...'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              <span className="text-yellow-500">{stats ? (stats.admins?.pending ?? stats.pendingAdmins ?? 0) : '...'} pending</span> • {stats ? (stats.admins?.active ?? stats.activeAdmins ?? 0) : '...'} active • {stats ? (stats.admins?.revoked ?? stats.revokedAdmins ?? 0) : '...'} revoked →
            </p>
          </div>

          {/* 2. Active Candidates */}
          <div
            onClick={handleCandidateCardClick}
            className={`${hasUnreadDisabled
              ? 'bg-red-50/90 border-2 border-red-500 shadow-lg shadow-red-100/50'
              : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group`}
          >
            {hasUnreadDisabled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 text-[10px] font-black uppercase tracking-wider mb-2 self-start animate-pulse">
                🔴 Deactivated Candidates ({stats.disabledCandidates})
              </span>
            )}
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">👥</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Student Governance
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                {stats ? `${stats.students?.total ?? stats.totalCandidates} Candidate` : '...'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              <span className="text-yellow-500">{stats ? (stats.students?.pending ?? stats.pendingCandidates ?? 0) : '...'} pending mentor</span> • {stats ? (stats.students?.active ?? stats.activeCandidates ?? 0) : '...'} active • <span className="text-emerald-600">{stats ? (stats.students?.upgraded ?? stats.upgradedCandidates ?? 0) : '...'} upgraded</span> • <span className="text-red-500">{stats ? (stats.students?.disabled ?? stats.disabledCandidates ?? 0) : '...'} disabled</span> →
            </p>
          </div>

          {/* 3. AI Chat Logs */}
          <div
            onClick={handleChatLogsCardClick}
            className={`${hasUnreadChatLogs
              ? 'bg-amber-50/90 border-2 border-amber-500 shadow-lg shadow-amber-100/50'
              : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group`}
          >
            {hasUnreadChatLogs && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase tracking-wider mb-2 self-start animate-pulse">
                ⭐ New AI Chat Queries
              </span>
            )}
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">🤖</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                System Analytics
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                AI Chat Logs
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              Review anonymous student queries →
            </p>
          </div>

          {/* 4. Published Exam */}
          <div
            onClick={handleExamsCardClick}
            className={`${hasUnreadExams
              ? 'bg-pink-50/90 border-2 border-pink-500 shadow-lg shadow-pink-100/50'
              : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group`}
          >
            {hasUnreadExams && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-100 text-pink-800 border border-pink-300 text-[10px] font-black uppercase tracking-wider mb-2 self-start animate-pulse">
                🌸 Mentor Published Exam
              </span>
            )}
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">📝</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Mentor Activity
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                {stats ? `${stats.totalExams} Published Exams` : '...'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              Audit & manage mentor created tests →
            </p>
          </div>

          {/* 5. JOB Portal */}
          <div
            onClick={handleJobCardClick}
            className={`${(stats && stats.pendingJobs > 0) || hasUnreadApplications
              ? 'bg-amber-50/90 border-2 border-amber-500 shadow-lg shadow-amber-100/50'
              : stats && stats.totalJobs > 0
              ? 'bg-emerald-50/40 border-2 border-emerald-400/60 shadow-md shadow-emerald-50/50'
              : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
              } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group`}
          >
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">💼</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Career Management
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                {stats && stats.totalJobs > 0
                  ? `${stats.totalJobs} ${stats.totalJobs === 1 ? 'Ongoing Job' : 'Ongoing Jobs'}`
                  : 'Job Management'}
              </h3>
            </div>
            <div className="mt-4 flex items-start justify-between gap-2">
              <p className="text-[10px] text-gray-500 font-extrabold flex items-center gap-1 flex-wrap">
                <span className={(stats?.jobs?.pending ?? stats?.pendingJobs ?? 0) > 0 ? 'text-amber-600 font-black' : ''}>
                  {stats ? (stats.jobs?.pending ?? stats.pendingJobs ?? 0) : 0} pending
                </span>
                <span>•</span>
                <span className={(stats?.jobs?.active ?? stats?.activeJobs ?? stats?.totalJobs ?? 0) > 0 ? 'text-emerald-600 font-black' : ''}>
                  {stats ? (stats.jobs?.active ?? stats.activeJobs ?? stats.totalJobs ?? 0) : 0} active
                </span>
                <span>•</span>
                <span className="text-indigo-600 font-black">
                  {stats ? (stats.jobs?.applied ?? stats.totalApplications ?? 0) : 0} applied
                </span>
                <span>→</span>
              </p>

              {/* Popping Badges Stack (New Job Pending for Review Top, New Candidate Applied Below) */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {stats && stats.pendingJobs > 0 && (
                  <span className="px-2.5 py-1 bg-amber-500 text-white font-extrabold rounded-xl text-[10px] shrink-0 shadow-xs animate-pulse flex items-center gap-1">
                    <span>💼</span>
                    <span>
                      {stats.pendingJobs} New Job{stats.pendingJobs > 1 ? 's' : ''} Pending for Review
                    </span>
                  </span>
                )}
                {hasUnreadApplications && (
                  <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-extrabold rounded-xl text-[10px] shrink-0 shadow-xs animate-pulse flex items-center gap-1">
                    <span>🎓</span>
                    <span>
                      {(stats?.totalApplications || 0) - readApplicationsCount} New Candidate{(stats?.totalApplications || 0) - readApplicationsCount > 1 ? 's' : ''} Applied
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 6. Landing Editor */}
          <div
            onClick={() => navigate('/super-admin/landing-editor')}
            className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
          >
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">✍️</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Content Management
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                Landing Editor
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              Update platform marketing copy →
            </p>
          </div>

          {/* 7. Total Revenue */}
          <div
            onClick={() => navigate('/super-admin/revenue')}
            className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black uppercase tracking-wider mb-2 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              LIVE DATA
            </span>
            <span className="absolute top-5 right-5 text-xl opacity-70 group-hover:scale-110 transition-transform">💰</span>
            <div>
              <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                Financial Analytics
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none text-emerald-600">
                ₹{stats ? stats.totalRevenue : '...'}
              </h3>
            </div>
            <p className="text-[10px] text-gray-400 font-extrabold mt-4">
              Platform revenue to date →
            </p>
          </div>

          {/* 8. System Passkey */}
          <div
            onClick={() => navigate('/super-admin/passkeys')}
            className="bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-white/80 backdrop-blur-lg border border-amber-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-5 md:p-6 flex flex-col justify-between relative cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group"
          >
            <span className="absolute top-5 right-5 text-xl opacity-80 group-hover:scale-110 transition-transform">🔑</span>
            <div>
              <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider block">
                Security & Passkeys
              </span>
              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                System Passkey
              </h3>
            </div>
            <p className="text-[10px] text-gray-500 font-extrabold mt-4 flex items-center justify-between">
              <span>Super Admin Registration Audit</span>
              <span className="text-amber-600 font-black">Manage Keys →</span>
            </p>
          </div>

          {/* 9. Database Backup (Google Drive Automated Backup) */}
          <div className={`${backupStatus?.status === 'Failed'
            ? 'bg-red-50/90 border-2 border-red-500 shadow-lg shadow-red-100/50'
            : 'bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-white/80 backdrop-blur-lg border border-cyan-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
            } rounded-2xl p-5 md:p-6 flex flex-col justify-between relative hover:shadow-xl hover:scale-[1.01] transition-all group`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-cyan-700 uppercase tracking-wider block">
                  Automated Backup
                </span>
                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${backupStatus?.status === 'Failed'
                    ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  {backupStatus?.status === 'Failed' ? '🔴 Backup Failed' : 'Healthy'}
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-2 text-gray-900 leading-none">
                Database Backup
              </h3>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${backupStatus?.status === 'Success' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'
                    }`} />
                  <span className="text-[10px] text-gray-500 font-extrabold truncate" title={backupStatus?.formattedDate}>
                    {backupStatus?.relativeTime || 'Just now'} ({backupStatus?.size || '3.4 MB'})
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isTriggeringBackup}
                  onClick={handleTriggerBackupNow}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl text-[10px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50 shadow-xs"
                  title="Trigger Google Drive Backup now"
                >
                  {isTriggeringBackup ? (
                    <>
                      <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <span>Backup Now</span>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-cyan-100/70">
                <span className="text-[10px] text-cyan-800 font-extrabold">Auto Backup Frequency:</span>
                <select
                  value={backupStatus?.autoBackupFrequency || 'Daily'}
                  onChange={(e) => handleUpdateBackupFrequency(e.target.value)}
                  className="bg-white border border-cyan-300 rounded-lg px-2 py-0.5 text-[10px] font-bold text-gray-700 shadow-xs focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="7 Days">7 Days</option>
                  <option value="1 Month">1 Month</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Extension Requests (Student Management) */}
        <div className={`${extensionRequests.length > 0
          ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-lg shadow-emerald-100/50'
          : 'bg-white/80 backdrop-blur-lg border border-blue-400/50 shadow-md'
          } rounded-2xl p-5 md:p-6 flex flex-col text-left transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider block">Student Management</span>
                {extensionRequests.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                    🟢 New Notification
                  </span>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mt-1 text-gray-900 leading-none">Trial Extension Requests</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">Review and approve candidate requests for 24-hour trial extension passes</p>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${extensionRequests.length > 0 ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
              {extensionRequests.length} Pending
            </span>
          </div>

          <div className="space-y-3 mt-2">
            {extensionRequests.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold py-4">No pending extension requests.</p>
            ) : (
              extensionRequests.map(req => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-blue-100 rounded-xl p-4 shadow-sm gap-4 hover:border-blue-300 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenStudentModal(req)}
                        className="text-sm font-black text-gray-900 hover:text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
                        title="Click to view candidate info card"
                      >
                        {req.studentName && req.studentName !== 'Student' ? req.studentName : (req.studentEmail || 'Student')}
                      </button>
                      <span className="text-[10px] text-gray-400 font-mono">({req.studentEmail})</span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">"{req.reason}"</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleGrant(req._id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold uppercase px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95 cursor-pointer"
                    >
                      Grant +24hrs
                    </button>
                    <button
                      onClick={() => handleDeny(req._id)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-red-600 text-[11px] font-extrabold uppercase px-4 py-2 rounded-lg transition-colors active:scale-95 cursor-pointer"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Student Review Handler (Dedicated Management Queue) */}
        <div className={`${reviewCounts.pending > 0
          ? 'bg-amber-50/90 border-2 border-amber-500 shadow-lg shadow-amber-100/50'
          : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
          } rounded-3xl p-5 md:p-6 flex flex-col text-left transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider block">Candidate Feedback</span>
                {reviewCounts.pending > 0 && (
                  <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                    ⭐ {reviewCounts.pending} Pending Review{reviewCounts.pending > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mt-1 text-gray-900 leading-none">Review Handler</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Audit, approve, reject, or delete student-submitted reviews. Only approved reviews are displayed in the landing page carousel.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100/90 p-1 rounded-2xl shrink-0 self-start sm:self-center">
              {[
                { id: 'all', label: 'All', count: reviewCounts.total },
                { id: 'pending', label: 'Pending', count: reviewCounts.pending },
                { id: 'approved', label: 'Approved', count: reviewCounts.approved },
                { id: 'rejected', label: 'Rejected', count: reviewCounts.rejected }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setReviewFilter(tab.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    reviewFilter === tab.id
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    tab.id === 'pending' && tab.count > 0
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-gray-200/70 text-gray-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List of Reviews */}
          <div className="space-y-3 mt-2 max-h-96 overflow-y-auto pr-1">
            {reviewsList.filter(r => reviewFilter === 'all' ? true : r.status === reviewFilter).length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-bold bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                No reviews found under the "{reviewFilter}" filter.
              </div>
            ) : (
              reviewsList
                .filter(r => reviewFilter === 'all' ? true : r.status === reviewFilter)
                .map((rev) => {
                  const isApproved = rev.status === 'approved';
                  const isPending = rev.status === 'pending';
                  const isRejected = rev.status === 'rejected';

                  return (
                    <div
                      key={rev._id}
                      className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all duration-200 shadow-xs flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0">
                            {rev.name ? rev.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-gray-900">{rev.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">({rev.email || 'No email provided'})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 font-bold">
                                {rev.role || 'Verified Candidate'}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs ${i < (rev.rating || 5) ? 'text-amber-400' : 'text-gray-200'}`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            <span>{isApproved ? '🟢' : isPending ? '🟡' : '🔴'}</span>
                            <span>{rev.status || 'pending'}</span>
                          </span>

                          {/* Action buttons */}
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(rev._id, 'approved')}
                              disabled={reviewActionLoadingId === rev._id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>✓</span>
                              <span>Approve</span>
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(rev._id, 'rejected')}
                              disabled={reviewActionLoadingId === rev._id}
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold uppercase px-3 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              <span>✕</span>
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev._id)}
                            disabled={reviewActionLoadingId === rev._id}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Delete review permanently"
                            aria-label="Delete review"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Review message text */}
                      <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 text-xs text-gray-700 font-medium italic leading-relaxed">
                        "{rev.reviewText}"
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Submitted on: {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {isApproved && <span className="text-emerald-600 font-bold">✓ Live in Landing Page Carousel</span>}
                        {isPending && <span className="text-amber-600 font-bold">⏳ Awaiting Super Admin Verification</span>}
                        {isRejected && <span className="text-rose-500 font-bold">Hidden from Public</span>}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Recent Platform Activity Card */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Recent Platform Activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Live audit feed of admin actions, account status changes, notifications, and student activities.</p>
            </div>

            {/* Retention, Export & Manual Cleanup Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportPlatformActivityLogs(activitiesList)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Export Recent Platform Activity to Excel"
              >
                <span>📊</span>
                <span>Export Activity Log</span>
              </button>

              <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs shrink-0">
                <span className="text-xs px-2 py-1.5 bg-white border border-red-100 rounded-xl shadow-2xs shrink-0" title="Retention & Cleanup">🚫</span>

                <select
                  value={retentionSettings.communicationsRetention}
                  onChange={(e) => handleUpdateRetention('communicationsRetention', e.target.value)}
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
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {activitiesList.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-bold bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                No activity recorded yet.
              </div>
            ) : (
              activitiesList.map((act) => {
                const typeStr = act?.type || '';
                const typeUpper = typeStr.toUpperCase();
                const typeLower = typeStr.toLowerCase();

                const isJob = typeUpper.includes('JOB') || typeLower.includes('application');
                const isExam = typeUpper.includes('EXAM') || typeLower.includes('assignment') || typeLower.includes('test');
                const isNotification = typeUpper.includes('NOTIFICATION') || typeLower.includes('message') || typeLower.includes('feedback');
                const isApproved = typeUpper.includes('APPROVED') || typeLower.includes('approved');
                const isMentorAssigned = typeUpper.includes('MENTOR_ASSIGNED') || typeUpper.includes('MENTOR ASSIGNED') || typeLower.includes('mentor assigned');
                const isDeactivated = typeLower.includes('deactivated') || typeUpper.includes('DISABLE');
                const isActivated = typeLower.includes('activated') || typeUpper.includes('ENABLE');
                const isNewUser = typeUpper.includes('REGISTERED') || typeUpper.includes('JOINED') || typeLower.includes('registered');
                const isUpgraded = typeUpper.includes('UPGRADED') || typeUpper.includes('UNLOCKED') || typeLower.includes('upgraded');

                let badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                let badgeIcon = '📌';

                if (isJob) {
                  badgeClass = 'bg-indigo-100 text-indigo-700 border-indigo-200 font-extrabold';
                  badgeIcon = '💼';
                } else if (isExam) {
                  badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-extrabold';
                  badgeIcon = '📝';
                } else if (isNotification) {
                  badgeClass = 'bg-blue-100 text-blue-800 border-blue-200 font-extrabold';
                  badgeIcon = '🔔';
                } else if (isApproved) {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
                  badgeIcon = '✅';
                } else if (isMentorAssigned) {
                  badgeClass = 'bg-cyan-100 text-cyan-800 border-cyan-300 font-extrabold';
                  badgeIcon = '🤝';
                } else if (isUpgraded) {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold';
                  badgeIcon = '🚀';
                } else if (isNewUser) {
                  badgeClass = 'bg-teal-100 text-teal-800 border-teal-300 font-extrabold';
                  badgeIcon = '🌟';
                } else if (isDeactivated) {
                  badgeClass = 'bg-red-100 text-red-700 border-red-200';
                  badgeIcon = '🔴';
                } else if (isActivated) {
                  badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                  badgeIcon = '🟢';
                }

                const senderName = act?.sender?.name || 'System';
                const recipientName = act?.recipient?.name || 'N/A';

                const isSystemEntity = (person) => {
                  if (!person || !person.name) return true;
                  const name = String(person.name).trim().toLowerCase();
                  const email = String(person.email || '').trim().toLowerCase();
                  const nonUserNames = [
                    'super admin',
                    'superadmin',
                    'super admin / system',
                    'platform audit',
                    'candidate registration',
                    'mentor governance',
                    'platform exams',
                    'all students',
                    'admin / system',
                    'system',
                    'upload',
                    'corporate partner',
                    'mentor account'
                  ];
                  if (nonUserNames.includes(name)) return true;
                  if (!email || email === 'system@skillbridge.in' || email.includes('audit') || email.includes('registration')) return true;
                  return false;
                };

                const isSenderRealUser = !isSystemEntity(act?.sender);
                const isRecipientRealUser = !isSystemEntity(act?.recipient);

                return (
                  <div
                    key={act.id || act._id || Math.random()}
                    className="p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/70 transition-all duration-200 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSenderRealUser ? (
                          <button
                            type="button"
                            onClick={() => setActiveModalUser({
                              name: act.sender.name,
                              email: act.sender.email || '',
                              role: act.sender.role || 'Candidate / Student',
                              status: act.sender.status || 'Active',
                              mobile: act.sender.mobile || '+91 98765 43210'
                            })}
                            className="font-bold text-blue-700 hover:underline cursor-pointer bg-transparent border-0 p-0 text-left flex items-center gap-2"
                          >
                            {getAvatar(senderName)}
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{senderName}</span>
                              <span className="text-[10px] text-gray-400 font-mono block">{act?.sender?.email || ''}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getAvatar(senderName)}
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{senderName}</span>
                              {act?.sender?.email && (
                                <span className="text-[10px] text-gray-400 font-mono block">{act.sender.email}</span>
                              )}
                            </div>
                          </div>
                        )}

                        <span className="text-gray-400 text-xs font-bold px-1">➔</span>

                        {isJob ? (
                          <button
                            type="button"
                            onClick={() => navigate('/super-admin/jobs')}
                            className="font-bold flex items-center gap-2 bg-transparent border-0 p-0 text-left text-indigo-700 hover:underline cursor-pointer"
                          >
                            {getAvatar(recipientName)}
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{recipientName}</span>
                              <span className="text-[10px] text-gray-400 font-mono block">{act?.recipient?.email || ''}</span>
                            </div>
                          </button>
                        ) : isRecipientRealUser ? (
                          <button
                            type="button"
                            onClick={() => setActiveModalUser({
                              name: act.recipient.name,
                              email: act.recipient.email || '',
                              role: act.recipient.role || 'Candidate / Student',
                              status: act.recipient.status || 'Active',
                              mobile: act.recipient.mobile || '+91 98765 43210'
                            })}
                            className="font-bold flex items-center gap-2 bg-transparent border-0 p-0 text-left text-emerald-700 hover:underline cursor-pointer"
                          >
                            {getAvatar(recipientName)}
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{recipientName}</span>
                              <span className="text-[10px] text-gray-400 font-mono block">{act?.recipient?.email || ''}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getAvatar(recipientName)}
                            <div>
                              <span className="text-xs font-black text-gray-900 block">{recipientName}</span>
                              {act?.recipient?.email && (
                                <span className="text-[10px] text-gray-400 font-mono block">{act.recipient.email}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${badgeClass}`}>
                          <span>{badgeIcon}</span>
                          <span>{typeStr || 'ACTIVITY'}</span>
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono font-bold">
                          {act?.rawTimestamp ? new Date(act.rawTimestamp).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                          }) : act?.timestamp || ''}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-medium text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                      {act?.message || ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upload Activity Logs Card */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Upload Activity Logs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track student file upload success, failures, and their assigned mentors across all branches</p>
            </div>

            {/* Retention, Export & Manual Cleanup Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportUploadActivityLogs(uploadLogs)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                title="Export Upload Activity Logs to Excel"
              >
                <span>📊</span>
                <span>Export Upload Logs</span>
              </button>

              <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs shrink-0">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2 py-0.5 font-bold">
                        Mentor: {log.mentorName || 'Unassigned'}
                      </span>
                      <span className="text-[9px] text-gray-400 font-mono font-bold">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short'
                        })}
                      </span>
                    </div>
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

        {/* Section Header */}
        <div className="text-left pt-4">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            🤖 AI API Key Management
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Dynamic, zero-downtime key rotation for Production.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">

          {/* Card 1: AI Chatbot API Key */}
          <div className={`${(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted')
            ? 'bg-red-50 border-2 border-red-500 shadow-lg shadow-red-100 transition-colors duration-300'
            : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
            } rounded-3xl p-6 space-y-4`}>

            {(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted') && (
              <div className="bg-red-100 border border-red-300 text-red-800 text-[11px] font-black px-3.5 py-2 rounded-xl flex items-center gap-2 animate-pulse">
                <span>⚠️</span> API Key Exhausted - AI Offline
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md">
                  💬
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 tracking-tight">1. AI Chatbot API Key</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Customer-facing AI Chatbot on landing page</p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border self-start sm:self-center ${(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted')
                ? 'bg-red-100 text-red-800 border-red-300'
                : groqKeysInfo?.chatKey?.hasCustomKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                <span className={`w-2 h-2 rounded-full ${(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted')
                  ? 'bg-red-600 animate-ping'
                  : groqKeysInfo?.chatKey?.hasCustomKey
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                  }`}></span>
                {(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted')
                  ? 'Exhausted'
                  : groqKeysInfo?.chatKey?.hasCustomKey
                    ? 'Custom Key'
                    : 'System Active'
                }
              </span>
            </div>

            <div className={`${(groqKeysInfo?.chatKey?.status === 'exhausted' || groqKeysInfo?.chatbot?.status === 'exhausted')
              ? 'bg-red-100/50 border border-red-200'
              : 'bg-gray-50/80 border border-gray-200'
              } rounded-xl p-3`}>
              <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Active Key</span>
              <p className="font-mono font-bold text-gray-800 truncate text-xs mt-0.5">
                {groqKeysInfo?.chatKey?.masked || '••••••••••••••••'}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveGroqKey('chat', groqChatInput); }} className="space-y-3 pt-1">
              <label className="block text-xs font-black text-gray-700">
                Update Chatbot API Key
              </label>
              <div className="relative">
                <input
                  type={showChatKey ? "text" : "password"}
                  placeholder="Paste Chatbot API key..."
                  value={groqChatInput}
                  onChange={(e) => setGroqChatInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowChatKey(!showChatKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  {showChatKey ? '👁️' : '🔒'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingChatKey || !groqChatInput.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {isSavingChatKey ? 'Saving...' : 'Update Chatbot Key'}
                </button>
                {groqKeysInfo?.chatKey?.hasCustomKey && (
                  <button
                    type="button"
                    onClick={() => handleSaveGroqKey('chat', '')}
                    disabled={isSavingChatKey}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-gray-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Card 2: Resume ATS Review API Key */}
          <div className={`${(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted')
            ? 'bg-red-50 border-2 border-red-500 shadow-lg shadow-red-100 transition-colors duration-300'
            : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
            } rounded-3xl p-6 space-y-4`}>

            {(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted') && (
              <div className="bg-red-100 border border-red-300 text-red-800 text-[11px] font-black px-3.5 py-2 rounded-xl flex items-center gap-2 animate-pulse">
                <span>⚠️</span> API Key Exhausted - AI Offline
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 flex items-center justify-center text-white text-xl shadow-md">
                  📄
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 tracking-tight">2. Resume ATS Review API Key</h4>
                  <p className="text-[11px] text-gray-500 font-medium">Backend AI Student Resume Evaluator</p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wide border self-start sm:self-center ${(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted')
                ? 'bg-red-100 text-red-800 border-red-300'
                : groqKeysInfo?.resumeKey?.hasCustomKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                <span className={`w-2 h-2 rounded-full ${(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted')
                  ? 'bg-red-600 animate-ping'
                  : groqKeysInfo?.resumeKey?.hasCustomKey
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                  }`}></span>
                {(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted')
                  ? 'Exhausted'
                  : groqKeysInfo?.resumeKey?.hasCustomKey
                    ? 'Custom Key'
                    : 'System Active'
                }
              </span>
            </div>

            <div className={`${(groqKeysInfo?.resumeKey?.status === 'exhausted' || groqKeysInfo?.ats?.status === 'exhausted')
              ? 'bg-red-100/50 border border-red-200'
              : 'bg-gray-50/80 border border-gray-200'
              } rounded-xl p-3`}>
              <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">Active Key</span>
              <p className="font-mono font-bold text-gray-800 truncate text-xs mt-0.5">
                {groqKeysInfo?.resumeKey?.masked || '••••••••••••••••'}
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveGroqKey('resume', groqResumeInput); }} className="space-y-3 pt-1">
              <label className="block text-xs font-black text-gray-700">
                Update Resume ATS API Key
              </label>
              <div className="relative">
                <input
                  type={showResumeKey ? "text" : "password"}
                  placeholder="Paste Resume ATS API key..."
                  value={groqResumeInput}
                  onChange={(e) => setGroqResumeInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResumeKey(!showResumeKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                >
                  {showResumeKey ? '👁️' : '🔒'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSavingResumeKey || !groqResumeInput.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {isSavingResumeKey ? 'Saving...' : 'Update Resume Key'}
                </button>
                {groqKeysInfo?.resumeKey?.hasCustomKey && (
                  <button
                    type="button"
                    onClick={() => handleSaveGroqKey('resume', '')}
                    disabled={isSavingResumeKey}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-gray-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>


      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* User Info Detail Modal */}
      {activeModalUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-150 relative">

            {/* Close Button */}
            <button
              onClick={() => setActiveModalUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>

            {/* Large Avatar Block */}
            <div className="flex justify-center mb-4 mt-2">
              {getLargeAvatar(activeModalUser)}
            </div>

            {/* Name */}
            <h3 className="text-base font-black text-gray-900 leading-tight">{activeModalUser.name}</h3>

            {/* Role Badge */}
            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                (activeModalUser?.role || '').toLowerCase().includes('super') || activeModalUser?.name === 'Super Admin'
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : (activeModalUser?.role || '').toLowerCase().includes('mentor')
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {(activeModalUser?.role || '').toLowerCase().includes('super') || activeModalUser?.name === 'Super Admin'
                  ? 'Super Admin'
                  : (activeModalUser?.role || 'Candidate / Student')}
              </span>
            </div>

            {/* Profile Info Rows */}
            <div className="mt-6 space-y-3.5 border-t border-gray-100 pt-4 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Email</span>
                <a href={`mailto:${activeModalUser.email}`} className="text-gray-700 font-bold hover:underline font-mono">
                  {activeModalUser.email}
                </a>
              </div>

              {/* Hide Contact number for Super Admin or when mobile is not available */}
              {activeModalUser.name !== 'Super Admin' &&
               !(activeModalUser?.role || '').toLowerCase().includes('super') &&
               activeModalUser.mobile && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Contact</span>
                  <span className="text-gray-700 font-semibold font-mono">
                    {activeModalUser.mobile}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide ${activeModalUser.status === 'Active' || activeModalUser.status === 'Upgraded'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : activeModalUser.status === 'Revoked'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                  {activeModalUser.status || 'Active'}
                </span>
              </div>

              {activeModalUser.linkedAdmin && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Linked Mentor</span>
                  <span className="text-gray-700 font-bold font-mono">
                    {activeModalUser.linkedAdmin}
                  </span>
                </div>
              )}
            </div>

            {/* Modal CTA Buttons */}
            <div className="mt-6 flex">
              <button
                onClick={() => setActiveModalUser(null)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboard;
