import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import { exportToCSV, copyForGoogleSheets } from '../../utils/exportUtils';

function SuperAdminInstitutes() {
  useDocumentTitle('All Mentors | Super Admin');
  const navigate = useNavigate();

  const [adminsList, setAdminsList] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeModalUser, setActiveModalUser] = useState(null);
  const [pendingAdminsList, setPendingAdminsList] = useState([]);
  const [globalUnlockFee, setGlobalUnlockFee] = useState(99);

  // Load mentors/admins, pending registration requests, and payment configs from MongoDB
  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken('supss');
      const [adminsRes, pendingRes, configRes] = await Promise.allSettled([
        axios.get('/api/super-admin/admins', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/api/super-admin/pending-admins', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/api/payment/config')
      ]);

      if (adminsRes.status === 'fulfilled') {
        setAdminsList(adminsRes.value.data || []);
      }
      if (pendingRes.status === 'fulfilled') {
        setPendingAdminsList(pendingRes.value.data || []);
      }
      if (configRes.status === 'fulfilled' && configRes.value.data?.unlockFee) {
        setGlobalUnlockFee(configRes.value.data.unlockFee);
      }
    } catch (err) {
      console.error('Failed to load admins list:', err);
      toast.error('Failed to fetch mentors/administrators.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const getAdminAssignedFee = (adminObj) => {
    if (adminObj && adminObj.customUnlockFee !== null && adminObj.customUnlockFee !== undefined && adminObj.customUnlockFee !== '') {
      return `₹${adminObj.customUnlockFee}`;
    }
    return `₹${globalUnlockFee || 99}`;
  };

  const handleApproveAdminInManager = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      await axios.put(`/api/super-admin/approve-admin/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(`Approved administrator access for ${email}`);
      fetchAdmins();
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error(err.response?.data?.error || 'Failed to approve admin.');
    }
  };

  const handleRejectAdminInManager = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.delete(`/api/super-admin/reject-admin/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || `Rejected registration for ${email}`);
      fetchAdmins();
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error(err.response?.data?.error || 'Failed to reject admin request.');
    }
  };

  const [confirmRevokeModal, setConfirmRevokeModal] = useState(null);

  const handleRevokeClick = (adminObj) => {
    setConfirmRevokeModal(adminObj);
  };

  const executeRevokeAccess = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.post(`/api/super-admin/revoke-admin/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || `Revoked access for ${email}`);
      setConfirmRevokeModal(null);
      fetchAdmins();
    } catch (err) {
      console.error('Revoke failed:', err);
      toast.error(err.response?.data?.error || 'Failed to revoke access.');
    }
  };

  const handleRestoreAccess = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.post(`/api/super-admin/restore-admin/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || `Restored access for ${email}`);
      fetchAdmins();
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error(err.response?.data?.error || 'Failed to restore access.');
    }
  };

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const getAdminAllocatedDuration = (app) => {
    if (app.customStudentDurationMonths && Number(app.customStudentDurationMonths) > 0) {
      return `${app.customStudentDurationMonths} Mo (Custom)`;
    }
    return `6 Mo (Default)`;
  };

  const toggleKeyDropdown = (id) => {
    setExpandedKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleOpenMentorModal = (adminObj) => {
    const cityVal = adminObj.city || (adminObj.institute && adminObj.institute !== 'Branch Administrator' ? adminObj.institute : '') || adminObj.branch || '';
    const cleanCity = cityVal ? cityVal.replace(/^Branch Administrator\s*(-->)?\s*/i, '').trim() : 'Chhatrapati Sambhajinagar';

    setActiveModalUser({
      name: adminObj.name,
      email: adminObj.email,
      mobile: adminObj.mobile || 'N/A',
      role: 'Mentor / Admin',
      status: adminObj.status ? (adminObj.status.charAt(0).toUpperCase() + adminObj.status.slice(1)) : 'Active',
      id: adminObj._id || adminObj.id,
      referralCode: adminObj.referralCode || 'N/A',
      referralKeysHistory: adminObj.referralKeysHistory || [],
      city: cleanCity,
      institute: cleanCity,
      assignedStudentsCount: adminObj.assignedStudents ? adminObj.assignedStudents.length : 0
    });
  };

  const [keysModalAdmin, setKeysModalAdmin] = useState(null);

  const getAvatar = (email, name, adminObj) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M';
    return (
      <button
        onClick={() => handleOpenMentorModal(adminObj)}
        className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 cursor-pointer hover:scale-105 transition-transform"
        title="Click to view mentor details card"
      >
        {initials}
      </button>
    );
  };

  const renderReferralKeysTrigger = (app) => {
    const allKeys = Array.isArray(app.referralKeysHistory) && app.referralKeysHistory.length > 0
      ? app.referralKeysHistory
      : (app.referralCode ? [{ code: app.referralCode, status: 'Active' }] : []);

    if (allKeys.length === 0) {
      return <span className="text-[10px] text-gray-400 italic">None</span>;
    }

    const activeCode = (app.referralCode || '').trim().toUpperCase();
    const activeKey = allKeys.find(k => k.status === 'Active' || k.code.trim().toUpperCase() === activeCode);
    const deactivatedCount = allKeys.filter(k => k.code.trim().toUpperCase() !== activeCode).length;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setKeysModalAdmin(app);
        }}
        className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
        title="Click to view all Active & Deactivated keys in pop-up modal card"
      >
        <span>🔑</span>
        <span>{allKeys.length} {allKeys.length === 1 ? 'Key' : 'Keys'}</span>
        <span className="text-[10px]">↗</span>
      </button>
    );
  };

  const filteredList = adminsList.filter(app => {
    const matchesSearch =
      (app.name && app.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCity = selectedCity === '' || app.city === selectedCity;

    let matchesStatus = true;
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'Active') {
        matchesStatus = app.status === 'active';
      } else if (selectedStatus === 'Revoked') {
        matchesStatus = app.status === 'revoked';
      }
    }

    return matchesSearch && matchesCity && matchesStatus;
  });

  const uniqueCities = [...new Set(adminsList.map(r => r.city).filter(Boolean))];

  const activeMentors = filteredList.filter(app => app.status === 'active');
  const revokedMentors = filteredList.filter(app => app.status === 'revoked');

  const getKeysSummary = (app) => {
    const allKeys = Array.isArray(app.referralKeysHistory) && app.referralKeysHistory.length > 0
      ? app.referralKeysHistory
      : (app.referralCode ? [{ code: app.referralCode, status: 'Active' }] : []);

    if (allKeys.length === 0) return { activeKey: 'N/A', keysHistory: 'None' };

    const activeCode = (app.referralCode || '').trim().toUpperCase();
    const activeKeys = allKeys.filter(k => k.status === 'Active' || k.code.trim().toUpperCase() === activeCode);
    const deactivatedKeys = allKeys.filter(k => !(k.status === 'Active' || k.code.trim().toUpperCase() === activeCode));

    const activeKeyStr = activeKeys.map(k => k.code).join(', ') || app.referralCode || 'N/A';

    // Format keys 1 below another: Active key at top, line space, then Deactivated keys
    const lines = [];
    activeKeys.forEach(k => {
      lines.push(`${k.code} (Active)`);
    });

    if (deactivatedKeys.length > 0) {
      if (lines.length > 0) lines.push(''); // line spacing
      deactivatedKeys.forEach(k => {
        lines.push(`${k.code} (Deactivated)`);
      });
    }

    return { activeKey: activeKeyStr, keysHistory: lines.join('\n') };
  };

  const buildExportData = () => {
    const headers = [
      'Mentor ID',
      'Admin / Mentor Name',
      'Admin Email',
      'Mobile Contact',
      'State & City',
      'Active Referral Key',
      'Allocated Duration',
      'All Keys Breakdown (Active Top / Deactivated Below)',
      'Assigned Candidate Fee (₹)',
      'Linked Candidate Count',
      'Mentor Status',
      'Date Registered',
      'Last Updated At'
    ];
    const rows = [];

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        return 'N/A';
      }
    };

    // 🟢 Section 1: Active Mentors (Merged Green Banner)
    if (selectedStatus === 'All' || selectedStatus === 'Active') {
      const activeList = filteredList.filter(a => a.status === 'active');
      rows.push({
        _isBanner: true,
        title: `🟢 ACTIVE MENTORS (${activeList.length} Total)`,
        bgColor: '#0F766E',
        textColor: '#FFFFFF'
      });

      activeList.forEach(a => {
        const { activeKey, keysHistory } = getKeysSummary(a);
        const durationStr = getAdminAllocatedDuration(a);
        const feeVal = getAdminAssignedFee(a);
        rows.push([
          a._id || a.id || 'N/A',
          a.name || 'N/A',
          a.email || 'N/A',
          a.mobile && a.mobile !== 'N/A' ? a.mobile : 'N/A',
          `${a.state || 'Maharashtra'}, ${a.city || a.branch || a.institute || 'Chhatrapati Sambhajinagar'}`,
          activeKey,
          durationStr,
          keysHistory,
          feeVal,
          Array.isArray(a.assignedStudents) ? a.assignedStudents.length : (a.assignedStudentsCount || 0),
          'Active',
          formatDate(a.createdAt),
          formatDate(a.updatedAt || a.createdAt)
        ]);
      });
    }

    // 🟡 Section 2: Pending Mentors (Merged Yellow Banner + Line Spacing)
    if (selectedStatus === 'All' || selectedStatus === 'Pending') {
      if (rows.length > 0) rows.push({ _isBlank: true }); // Line gap spacing

      rows.push({
        _isBanner: true,
        title: `🟡 PENDING MENTORS (${pendingAdminsList.length} Total)`,
        bgColor: '#D97706',
        textColor: '#FFFFFF'
      });

      if (pendingAdminsList.length === 0) {
        rows.push(['-', 'No pending registration requests', '-', '-', '-', '-', '-', '-', '-', 0, 'Pending', '-', '-']);
      } else {
        pendingAdminsList.forEach(req => {
          rows.push([
            req._id || req.id || 'N/A',
            req.name || 'N/A',
            req.email || 'N/A',
            req.mobile && req.mobile !== 'N/A' ? req.mobile : 'N/A',
            `${req.state || 'Maharashtra'}, ${req.city || req.branch || 'Chhatrapati Sambhajinagar'}`,
            'Pending Approval',
            'N/A',
            'N/A (Pending)',
            getAdminAssignedFee(req),
            0,
            'Pending Approval',
            formatDate(req.createdAt),
            formatDate(req.updatedAt || req.createdAt)
          ]);
        });
      }
    }

    // 🔴 Section 3: Revoked Mentors (Merged Red Banner + Line Spacing)
    if (selectedStatus === 'All' || selectedStatus === 'Revoked') {
      const revokedList = filteredList.filter(a => a.status === 'revoked');
      if (rows.length > 0) rows.push({ _isBlank: true }); // Line gap spacing

      rows.push({
        _isBanner: true,
        title: `🔴 REVOKED MENTORS (${revokedList.length} Total)`,
        bgColor: '#B91C1C',
        textColor: '#FFFFFF'
      });

      if (revokedList.length === 0) {
        rows.push(['-', 'No revoked mentors found', '-', '-', '-', '-', '-', '-', '-', 0, 'Revoked', '-', '-']);
      } else {
        revokedList.forEach(a => {
          const { activeKey, keysHistory } = getKeysSummary(a);
          const durationStr = getAdminAllocatedDuration(a);
          rows.push([
            a._id || a.id || 'N/A',
            a.name || 'N/A',
            a.email || 'N/A',
            a.mobile && a.mobile !== 'N/A' ? a.mobile : 'N/A',
            `${a.state || 'Maharashtra'}, ${a.city || a.branch || a.institute || 'Chhatrapati Sambhajinagar'}`,
            activeKey,
            durationStr,
            keysHistory,
            getAdminAssignedFee(a),
            Array.isArray(a.assignedStudents) ? a.assignedStudents.length : (a.assignedStudentsCount || 0),
            'Revoked',
            formatDate(a.createdAt),
            formatDate(a.updatedAt || a.createdAt)
          ]);
        });
      }
    }

    return { headers, rows };
  };

  const handleExportExcel = () => {
    const { headers, rows } = buildExportData();
    const statusLabel = selectedStatus === 'All' ? 'All_Mentors' : `${selectedStatus}_Mentors`;
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '_');
    exportToCSV(`Skill_Bridge_${statusLabel}_${datePart}_${timePart}.xls`, headers, rows);
  };

  const handleCopyGoogleSheets = () => {
    const { headers, rows } = buildExportData();
    copyForGoogleSheets(headers, rows);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchAdmins);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col">
      {RefreshOverlay}

      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"></span>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            SKILL SUPS
          </span>
        </div>

        <div className="flex items-center gap-3">
          {RefreshButton}
          <button
            onClick={() => logoutUser()}
            className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 flex items-center justify-center text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Log Out"
          >
            ⏻
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* Navigation Bar & Export Action Bar */}
        <div className="flex items-center justify-between gap-3 text-left">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>

          {/* Export Action Bar (Glassmorphic & Micro-Animated Buttons) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              className="relative group overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs transition-all shadow-[0_4px_15px_rgba(5,150,105,0.3)] hover:shadow-[0_6px_25px_rgba(5,150,105,0.5)] flex items-center gap-2 cursor-pointer active:scale-95 border border-emerald-400/40"
              title="Download Microsoft Excel document (.xls)"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-700/60 border border-emerald-400/30 flex items-center justify-center text-xs sm:text-sm shadow-xs group-hover:scale-110 transition-transform">
                📊
              </div>
              <span className="font-extrabold tracking-wide hidden sm:inline">Export Excel</span>
              <span className="font-extrabold tracking-wide sm:hidden">Excel</span>
            </button>
            <button
              onClick={handleCopyGoogleSheets}
              className="relative group overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-900 border border-emerald-400/40 font-black px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer active:scale-95 backdrop-blur-md"
              title="Copy formatted table for 1-click paste into Google Sheets"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-200/80 border border-emerald-300 flex items-center justify-center text-xs sm:text-sm shadow-xs group-hover:scale-110 transition-transform">
                📋
              </div>
              <span className="font-extrabold tracking-wide hidden sm:inline">Copy for Google Sheets</span>
              <span className="font-extrabold tracking-wide sm:hidden">Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Header Title */}
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Platform Mentors & Administrators</h1>
          <p className="text-xs text-gray-500 mt-1">Manage all authorized mentors, review assigned referral codes, and audit pending admin approvals</p>
        </div>

        {/* ── KPI Overview Summary Cards (Order: Pending > Active > Revoked) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {/* 1. Pending Approvals KPI Card */}
          <div
            onClick={() => setSelectedStatus('Pending')}
            className={`p-4 md:p-5 rounded-2xl border backdrop-blur-lg transition-all cursor-pointer ${selectedStatus === 'Pending'
                ? 'bg-amber-50/90 border-amber-400 shadow-md ring-2 ring-amber-400/50'
                : pendingAdminsList.length > 0
                  ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50/90 shadow-xs'
                  : 'bg-white/80 border-white/50 hover:bg-gray-50/80 shadow-xs'
              }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Pending Approvals</span>
                {pendingAdminsList.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                    {pendingAdminsList.length} New
                  </span>
                )}
              </span>
              <span className="text-lg">⏳</span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-gray-900 mt-2">{pendingAdminsList.length}</div>
            <p className="text-[10px] font-extrabold text-amber-700 mt-1">
              {pendingAdminsList.length > 0 ? 'Click to show pending requests →' : 'No pending admin requests'}
            </p>
          </div>

          {/* 2. Active Mentors KPI Card */}
          <div
            onClick={() => setSelectedStatus('Active')}
            className={`p-4 md:p-5 rounded-2xl border backdrop-blur-lg transition-all cursor-pointer ${selectedStatus === 'Active' ? 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-400/50' : 'bg-white/80 border-white/50 hover:bg-gray-50/80 shadow-xs'
              }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Active Mentors</span>
              <span className="text-lg">🏫</span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-gray-900 mt-2">{activeMentors.length}</div>
            <p className="text-[10px] font-extrabold text-emerald-700 mt-1">Click to show active mentors →</p>
          </div>

          {/* 3. Revoked Mentors KPI Card */}
          <div
            onClick={() => setSelectedStatus('Revoked')}
            className={`p-4 md:p-5 rounded-2xl border backdrop-blur-lg transition-all cursor-pointer ${selectedStatus === 'Revoked' ? 'bg-red-50/90 border-red-400 shadow-md ring-2 ring-red-400/50' : 'bg-white/80 border-white/50 hover:bg-gray-50/80 shadow-xs'
              }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-extrabold text-red-700 uppercase tracking-wider">Revoked Mentors</span>
              <span className="text-lg">🚫</span>
            </div>
            <div className="text-2xl md:text-3xl font-black text-gray-900 mt-2">{revokedMentors.length}</div>
            <p className="text-[10px] font-extrabold text-red-700 mt-1">Click to show revoked mentors →</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.05)] rounded-2xl p-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by mentor name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full md:w-48 px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-48 px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Approvals ({pendingAdminsList.length})</option>
            <option value="Active">Active Mentors</option>
            <option value="Revoked">Revoked Mentors</option>
          </select>
        </div>

        {/* ── Pending Admin Approvals Section ── */}
        {(selectedStatus === 'All' || selectedStatus === 'Pending') && (
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              Pending Mentors
              <span className="bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
                {pendingAdminsList.length}
              </span>
            </h2>

            {pendingAdminsList.length === 0 ? (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-2xl p-6 text-center text-xs font-bold text-amber-800/60">
                No pending administrator registration requests at this time.
              </div>
            ) : (
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 md:p-5 space-y-3">
                {pendingAdminsList.map(req => (
                  <div key={req._id || req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-amber-200 rounded-xl p-4 shadow-xs gap-4 hover:border-amber-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">{req.name}</span>
                        <span className="text-xs font-semibold text-gray-500 font-mono">({req.email})</span>
                      </div>
                      <div className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-3">
                        <span>📍 City: {req.city || req.branch || 'Chhatrapati Sambhajinagar'}</span>
                        {req.mobile && <span>📞 {req.mobile}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveAdminInManager(req._id || req.id, req.email)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        Approve Admin
                      </button>
                      <button
                        onClick={() => handleRejectAdminInManager(req._id || req.id, req.email)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-extrabold uppercase px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 1: Active Mentors */}
        {(selectedStatus === 'All' || selectedStatus === 'Active') && (
          <div className="space-y-4 text-left">
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              Active Mentors
              <span className="bg-emerald-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
                {activeMentors.length}
              </span>
            </h2>
            <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden w-full shadow-sm">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-extrabold text-gray-500">Loading active mentors...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (min-width: 768px) */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                          <th className="px-3 py-3 md:px-4 md:py-3.5 w-14">Photo</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Admin Name</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Email & Contact</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">State & City</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Referral Key</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Duration</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Assigned Fee (₹)</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Linked Students</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMentors.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-12 text-center text-gray-400 font-bold text-sm bg-white">
                              No active mentors found.
                            </td>
                          </tr>
                        ) : (
                          activeMentors.map((app) => (
                            <tr
                              key={app._id}
                              className="border-t border-gray-150 transition-colors hover:bg-gray-50/50 bg-white/50"
                            >
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                {getAvatar(app.email, app.name, app)}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 font-bold text-xs text-gray-900">
                                <button
                                  onClick={() => handleOpenMentorModal(app)}
                                  className="font-bold text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                                  title="Click to view mentor info card"
                                >
                                  {app.name}
                                </button>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono">ID: {app._id}</div>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-xs font-semibold text-gray-600 font-mono">
                                <div>{app.email}</div>
                                {app.mobile && (
                                  <div className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                                    <span>📞</span> {app.mobile}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-xs font-semibold text-gray-600">
                                {app.state ? `${app.state}, ${app.city}` : app.city || 'Unknown'}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                {renderReferralKeysTrigger(app)}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold" title="Student duration allocated to this mentor">
                                  {getAdminAllocatedDuration(app)}
                                </span>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-black" title="Candidate unlock fee assigned to this mentor">
                                  {getAdminAssignedFee(app)}
                                </span>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/super-admin/candidates?mentor=${encodeURIComponent(app.name)}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                                  title={`Click to view candidates linked to ${app.name}`}
                                >
                                  <span>👥</span>
                                  <span>{app.assignedStudents ? app.assignedStudents.length : 0} Students</span>
                                  <span className="text-[10px]">↗</span>
                                </button>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-center">
                                <button
                                  onClick={() => handleRevokeClick(app)}
                                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold px-3 py-1.5 rounded-xl text-[10px] tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs whitespace-nowrap"
                                >
                                  Revoke Access
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View (max-width: 767px) */}
                  <div className="block md:hidden p-3 space-y-3">
                    {activeMentors.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                        No active mentors found.
                      </div>
                    ) : (
                      activeMentors.map((app) => (
                        <div key={app._id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs text-left">
                          {/* Header: Avatar, Name, ID & Status Badge */}
                          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <button
                              onClick={() => handleOpenMentorModal(app)}
                              className="cursor-pointer bg-transparent border-0 p-0 shrink-0"
                            >
                              {getAvatar(app.email, app.name, app)}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Mentor / Admin</span>
                              <h4 className="text-sm font-black text-gray-900 truncate">
                                <button
                                  onClick={() => handleOpenMentorModal(app)}
                                  className="font-black text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                                >
                                  {app.name}
                                </button>
                              </h4>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {app._id}</div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase shrink-0">
                              Active
                            </span>
                          </div>

                          {/* Card Body Grid */}
                          <div className="space-y-2.5 text-xs">
                            {/* Email & Contact */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Email & Mobile:</span>
                              <span className="font-semibold text-gray-800 break-all font-mono">{app.email}</span>
                              {app.mobile && <span className="text-[10px] text-gray-500 font-semibold mt-0.5">📞 {app.mobile}</span>}
                            </div>

                            {/* City / State */}
                            <div className="flex flex-col pt-1 border-t border-gray-100">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">City / State:</span>
                              <span className="font-semibold text-gray-800 mt-0.5">{app.state ? `${app.state}, ${app.city}` : app.city || 'Unknown'}</span>
                            </div>

                            {/* Duration & Assigned Fee Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Allocated Duration:</span>
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold">
                                    {getAdminAllocatedDuration(app)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Assigned Fee:</span>
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-black">
                                    {getAdminAssignedFee(app)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Referral Key & Linked Students Actions Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 items-center">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Referral Key:</span>
                                <div>
                                  {renderReferralKeysTrigger(app)}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Linked Students:</span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/super-admin/candidates?mentor=${encodeURIComponent(app.name)}`);
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
                                    title={`Click to view candidates linked to ${app.name}`}
                                  >
                                    <span>👥</span>
                                    <span>{app.assignedStudents ? app.assignedStudents.length : 0} Students</span>
                                    <span className="text-[10px]">↗</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2 border-t border-gray-100">
                              <button
                                onClick={() => handleRevokeClick(app)}
                                className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs text-center"
                              >
                                Revoke Access
                              </button>
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
        )}

        {/* Section 2: Revoked Mentors */}
        {(selectedStatus === 'All' || selectedStatus === 'Revoked') && (
          <div className="space-y-4 text-left pt-4">
            <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              Revoked Mentors
              <span className="bg-red-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
                {revokedMentors.length}
              </span>
            </h2>
            <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden w-full shadow-sm">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-extrabold text-gray-500">Loading revoked mentors...</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (min-width: 768px) */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                          <th className="px-3 py-3 md:px-4 md:py-3.5 w-14">Photo</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Admin Name</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Email & Contact</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">State & City</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Referral Key</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Assigned Fee (₹)</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5">Linked Students</th>
                          <th className="px-3 py-3 md:px-4 md:py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revokedMentors.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-gray-400 font-bold text-sm bg-white">
                              No revoked mentors found.
                            </td>
                          </tr>
                        ) : (
                          revokedMentors.map((app) => (
                            <tr
                              key={app._id}
                              className="border-t border-gray-150 bg-gray-50/20 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="px-3 py-3 md:px-4 md:py-3.5 opacity-75">
                                {getAvatar(app.email, app.name, app)}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 font-bold text-xs text-gray-900 opacity-75">
                                <button
                                  onClick={() => handleOpenMentorModal(app)}
                                  className="font-bold text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                                  title="Click to view mentor info card"
                                >
                                  {app.name}
                                </button>
                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono">ID: {app._id}</div>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-xs font-semibold text-gray-600 opacity-75 font-mono">
                                <div>{app.email}</div>
                                {app.mobile && (
                                  <div className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                                    <span>📞</span> {app.mobile}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-xs font-semibold text-gray-600 opacity-75">
                                {app.state ? `${app.state}, ${app.city}` : app.city || 'Unknown'}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 opacity-75">
                                {renderReferralKeysTrigger(app)}
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 opacity-75">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-xs font-mono font-black">
                                  {getAdminAssignedFee(app)}
                                </span>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/super-admin/candidates?mentor=${encodeURIComponent(app.name)}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap opacity-90"
                                  title={`Click to view candidates linked to ${app.name}`}
                                >
                                  <span>👥</span>
                                  <span>{app.assignedStudents ? app.assignedStudents.length : 0} Students</span>
                                  <span className="text-[10px]">↗</span>
                                </button>
                              </td>
                              <td className="px-3 py-3 md:px-4 md:py-3.5 text-center">
                                <button
                                  onClick={() => handleRestoreAccess(app._id, app.email)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] tracking-wide cursor-pointer transition-all active:scale-95 shadow-sm"
                                >
                                  Restore Access
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View (max-width: 767px) */}
                  <div className="block md:hidden p-3 space-y-3">
                    {revokedMentors.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                        No revoked mentors found.
                      </div>
                    ) : (
                      revokedMentors.map((app) => (
                        <div key={app._id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs text-left opacity-90">
                          {/* Header: Avatar, Name, ID & Status Badge */}
                          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <button
                              onClick={() => handleOpenMentorModal(app)}
                              className="cursor-pointer bg-transparent border-0 p-0 shrink-0"
                            >
                              {getAvatar(app.email, app.name, app)}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Mentor / Admin</span>
                              <h4 className="text-sm font-black text-gray-900 truncate">
                                <button
                                  onClick={() => handleOpenMentorModal(app)}
                                  className="font-black text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                                >
                                  {app.name}
                                </button>
                              </h4>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {app._id}</div>
                            </div>
                            <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase shrink-0">
                              Revoked
                            </span>
                          </div>

                          {/* Card Body Grid */}
                          <div className="space-y-2.5 text-xs">
                            {/* Email & Contact */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Email & Mobile:</span>
                              <span className="font-semibold text-gray-800 break-all font-mono">{app.email}</span>
                              {app.mobile && <span className="text-[10px] text-gray-500 font-semibold mt-0.5">📞 {app.mobile}</span>}
                            </div>

                            {/* City / State */}
                            <div className="flex flex-col pt-1 border-t border-gray-100">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">City / State:</span>
                              <span className="font-semibold text-gray-800 mt-0.5">{app.state ? `${app.state}, ${app.city}` : app.city || 'Unknown'}</span>
                            </div>

                            {/* Duration & Assigned Fee Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Allocated Duration:</span>
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold">
                                    {getAdminAllocatedDuration(app)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Assigned Fee:</span>
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-black">
                                    {getAdminAssignedFee(app)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Referral Key & Linked Students Actions Grid */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 items-center">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Referral Key:</span>
                                <div>
                                  {renderReferralKeysTrigger(app)}
                                </div>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">Linked Students:</span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/super-admin/candidates?mentor=${encodeURIComponent(app.name)}`);
                                    }}
                                    className="inline-flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-xs whitespace-nowrap opacity-90"
                                    title={`Click to view candidates linked to ${app.name}`}
                                  >
                                    <span>👥</span>
                                    <span>{app.assignedStudents ? app.assignedStudents.length : 0} Students</span>
                                    <span className="text-[10px]">↗</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2 border-t border-gray-100">
                              <button
                                onClick={() => handleRestoreAccess(app._id, app.email)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs text-center"
                              >
                                Restore Access
                              </button>
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
        )}

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* Mentor Detail Card Modal */}
      {activeModalUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-150 relative">
            <button
              onClick={() => setActiveModalUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>

            <div className="flex justify-center mb-4 mt-2">
              <div className="w-16 h-16 rounded-full border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black shadow-sm">
                {activeModalUser.name ? activeModalUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'M'}
              </div>
            </div>

            <h3 className="text-base font-black text-gray-900 leading-tight">{activeModalUser.name}</h3>

            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">
                Mentor / Admin
              </span>
            </div>

            <div className="mt-6 space-y-3.5 border-t border-gray-100 pt-4 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Email</span>
                <a href={`mailto:${activeModalUser.email}`} className="text-gray-700 font-bold hover:underline font-mono">
                  {activeModalUser.email}
                </a>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Contact</span>
                <span className="text-gray-700 font-semibold font-mono">
                  {activeModalUser.mobile && activeModalUser.mobile !== 'N/A' ? activeModalUser.mobile : 'N/A'}
                </span>
              </div>

              {activeModalUser.referralCode && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Active Referral Key</span>
                  <span className="text-emerald-700 font-extrabold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs flex items-center gap-1">
                    <span>🟢</span> {activeModalUser.referralCode}
                  </span>
                </div>
              )}

              {/* Referral Keys Asset Card */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 mt-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔑</span> Admin Referral Keys Breakdown
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full">
                    {1 + (activeModalUser.referralKeysHistory ? activeModalUser.referralKeysHistory.filter(k => k.code !== activeModalUser.referralCode).length : 0)} Total Keys
                  </span>
                </div>

                {/* Active Key Section */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Current Active Key (Single)</span>
                  <div className="flex items-center justify-between p-2 bg-white border border-emerald-300 rounded-xl font-mono font-extrabold text-xs text-emerald-800 shadow-xs">
                    <span>{activeModalUser.referralCode}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-black rounded-full text-[9px] uppercase">
                      Active
                    </span>
                  </div>
                </div>

                {/* Deactivated Keys Section */}
                {(() => {
                  const deactivatedKeys = (activeModalUser.referralKeysHistory || [])
                    .filter(k => k.code && k.code !== activeModalUser.referralCode);

                  if (deactivatedKeys.length === 0) return null;

                  return (
                    <div className="space-y-1.5 pt-1 border-t border-gray-200/60">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-500">Deactivated / Past Keys ({deactivatedKeys.length})</span>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {deactivatedKeys.map((keyObj, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white/70 border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-500">
                            <span>{keyObj.code}</span>
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 font-extrabold rounded-full text-[8px] uppercase">
                              Deactivated
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {activeModalUser.institute && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px] shrink-0">Branch Administrator</span>
                  <span className="text-gray-700 font-bold text-[11px] text-right truncate max-w-[220px]" title={activeModalUser.city || activeModalUser.institute}>
                    {activeModalUser.city || activeModalUser.institute}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Linked Students</span>
                <span className="text-gray-900 font-extrabold font-mono">
                  {activeModalUser.assignedStudentsCount} Students
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide ${activeModalUser.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                  {activeModalUser.status}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  const mentorQuery = encodeURIComponent(activeModalUser.name);
                  setActiveModalUser(null);
                  navigate(`/super-admin/candidates?mentor=${mentorQuery}`);
                }}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer tracking-wide"
              >
                View Students
              </button>
              <button
                onClick={() => setActiveModalUser(null)}
                className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Revoke Access Confirmation Modal */}
      {confirmRevokeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-red-200 rounded-2xl p-6 max-w-md w-full text-left shadow-2xl animate-in fade-in zoom-in duration-150 relative">
            <button
              onClick={() => setConfirmRevokeModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <span className="w-12 h-12 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-xl shadow-inner shrink-0">
                ⚠️
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">Confirm Revoke Access</h3>
                <p className="text-xs text-gray-500 font-medium">Revoke platform privileges for mentor</p>
              </div>
            </div>

            <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 mb-6 space-y-1.5">
              <p className="text-xs text-gray-700 font-medium">
                Are you sure you want to revoke platform access for <strong className="text-red-900 font-black">{confirmRevokeModal.name}</strong>?
              </p>
              <div className="text-xs text-red-700 font-mono font-semibold">{confirmRevokeModal.email}</div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                This mentor will be immediately logged out, their active keys invalidated, and their status changed to <span className="font-extrabold text-red-700">Revoked</span>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => executeRevokeAccess(confirmRevokeModal._id, confirmRevokeModal.email)}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95 tracking-wide"
              >
                Yes, Revoke Access
              </button>
              <button
                onClick={() => setConfirmRevokeModal(null)}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-extrabold py-3 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pop-Up Card Modal: All Admin Referral Keys Portfolio ── */}
      {keysModalAdmin && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-fade-in font-sans">
          <div
            className="absolute inset-0"
            onClick={() => setKeysModalAdmin(null)}
          />

          <div className="bg-white border border-gray-100 rounded-[28px] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 text-left relative animate-scale-in z-10">

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setKeysModalAdmin(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition-colors text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
                🔑
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Admin Referral Keys Portfolio</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">
                  Mentor: <span className="text-indigo-600 font-bold">{keysModalAdmin.name}</span>
                </p>
              </div>
            </div>

            {/* Keys Portfolio Breakdown Card Body */}
            <div className="space-y-4">
              {/* Active Referral Key Card (Single Active Key) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Current Active Key (Single)</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border border-emerald-300 rounded-xl font-mono font-black text-base text-emerald-900 shadow-xs select-all">
                  <span>{keysModalAdmin.referralCode || 'None'}</span>
                  {keysModalAdmin.referralCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(keysModalAdmin.referralCode);
                        toast.success('Active key copied to clipboard!');
                      }}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold font-sans transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>

              {/* Deactivated / Past Referral Keys List Card */}
              {(() => {
                const allKeys = Array.isArray(keysModalAdmin.referralKeysHistory) && keysModalAdmin.referralKeysHistory.length > 0
                  ? keysModalAdmin.referralKeysHistory
                  : (keysModalAdmin.referralCode ? [{ code: keysModalAdmin.referralCode, status: 'Active' }] : []);

                const activeCode = (keysModalAdmin.referralCode || '').trim().toUpperCase();
                const deactivatedKeys = allKeys.filter(k => k.code && k.code.trim().toUpperCase() !== activeCode);

                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200/80 pb-2">
                      <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                        Deactivated / Past Keys ({deactivatedKeys.length})
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">
                        Total Keys: {allKeys.length}
                      </span>
                    </div>

                    {deactivatedKeys.length === 0 ? (
                      <p className="text-xs text-gray-400 italic font-medium text-center py-2">
                        No past deactivated keys found for this mentor.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {deactivatedKeys.map((keyObj, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-600 shadow-xs">
                            <span className="select-all">{keyObj.code}</span>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 font-extrabold rounded-md text-[9px] uppercase">
                                Deactivated
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(keyObj.code);
                                  toast.success(`Copied key ${keyObj.code}!`);
                                }}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors"
                                title="Copy key code"
                              >
                                📋
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Footer Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setKeysModalAdmin(null)}
                className="w-full bg-gray-900 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all cursor-pointer shadow-md active:scale-95 tracking-wide"
              >
                Close Card Modal
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminInstitutes;