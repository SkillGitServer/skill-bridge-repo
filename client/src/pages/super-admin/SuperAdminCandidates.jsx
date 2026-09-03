import React, { useState, useEffect } from 'react';
import { exportToCSV, copyForGoogleSheets } from '../../utils/exportUtils';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function SuperAdminCandidates() {
  useDocumentTitle('All Candidates | Super Admin');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [candidates, setCandidates] = useState([]);
  const [activeModalUser, setActiveModalUser] = useState(null);
  const [assignModalStudent, setAssignModalStudent] = useState(null);
  const [unlockProfileCheck, setUnlockProfileCheck] = useState(true);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedMentor, setSelectedMentor] = useState(searchParams.get('mentor') || '');
  const [selectedEducation, setSelectedEducation] = useState('All'); // 'All' | '10th' | '10th_12th'

  // Active Admins list for assigning mentors
  const [activeAdmins, setActiveAdmins] = useState([]);
  const [globalUnlockFee, setGlobalUnlockFee] = useState(99);

  const fetchCandidates = async () => {
    try {
      const token = getAuthToken('supss');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [candRes, adminsRes, configRes] = await Promise.allSettled([
        axios.get('/api/super-admin/candidates', { headers }),
        axios.get('/api/super-admin/admins', { headers }),
        axios.get('/api/payment/config')
      ]);

      if (candRes.status === 'fulfilled') {
        setCandidates(candRes.value.data || []);
      }
      if (adminsRes.status === 'fulfilled' && adminsRes.value.data) {
        const active = adminsRes.value.data.filter(a => a.status === 'active');
        setActiveAdmins(active);
      }
      if (configRes.status === 'fulfilled' && configRes.value.data?.unlockFee) {
        setGlobalUnlockFee(configRes.value.data.unlockFee);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      toast.error('Failed to load candidate list.');
    }
  };

  useEffect(() => {
    const mentorParam = searchParams.get('mentor');
    const searchParam = searchParams.get('search');
    if (mentorParam) {
      setSelectedMentor(mentorParam);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    fetchCandidates();
  }, [searchParams]);

  const getCandidateAssignedFee = (cand) => {
    // 1. If candidate has upgraded, use their locked/paid fee
    if (cand && cand.isUnlocked) {
      if (cand.assignedUnlockFee !== null && cand.assignedUnlockFee !== undefined && cand.assignedUnlockFee !== '') {
        return Number(cand.assignedUnlockFee);
      }
    }

    // 2. Check if mentor has a custom fee override set in Revenue settings
    if (cand && (cand.assignedAdminId || cand.linkedAdminId || cand.linkedAdmin)) {
      const mentor = activeAdmins.find(a =>
        (cand.assignedAdminId && (a._id === cand.assignedAdminId || a.id === cand.assignedAdminId)) ||
        (cand.linkedAdminId && (a._id === cand.linkedAdminId || a.id === cand.linkedAdminId)) ||
        (cand.linkedAdmin && a.name && a.name.toLowerCase() === cand.linkedAdmin.toLowerCase()) ||
        (cand.linkedAdmin && a.email && a.email.toLowerCase() === cand.linkedAdmin.toLowerCase())
      );

      if (mentor && mentor.customUnlockFee !== null && mentor.customUnlockFee !== undefined && mentor.customUnlockFee !== '') {
        return Number(mentor.customUnlockFee);
      }
    }

    // 3. Candidate fee saved explicitly on candidate doc (if not default 99)
    if (cand && cand.assignedUnlockFee !== null && cand.assignedUnlockFee !== undefined && cand.assignedUnlockFee !== '' && cand.assignedUnlockFee !== 99) {
      return Number(cand.assignedUnlockFee);
    }

    // 4. Dynamic Platform Base Fee (e.g., ₹666)
    return Number(globalUnlockFee || 99);
  };

  const handleAssignMentor = async (studentId, adminId) => {
    if (!adminId) {
      toast.error('Please select an active mentor.');
      return;
    }
    const loadingToast = toast.loading('Assigning mentor to student...');
    try {
      const token = getAuthToken('supss');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post('/api/super-admin/assign-mentor', {
        studentId,
        adminId
      }, { headers });

      toast.dismiss(loadingToast);
      toast.success(res.data.message || 'Mentor assigned successfully!');
      setAssignModalStudent(null);
      fetchCandidates(); // Refresh candidate list
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to assign mentor.');
    }
  };

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const getAvatar = (name) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';
    return (
      <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shadow-sm shrink-0">
        {initials}
      </div>
    );
  };

  const getLargeAvatar = (user) => {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'C';
    return (
      <div className="w-16 h-16 rounded-full border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-black shadow-sm">
        {initials}
      </div>
    );
  };

  const getTimeRemainingBadge = (cand) => {
    if (!cand.isUnlocked) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold bg-gray-50 text-gray-500 border-gray-200">
          Pending Unlock
        </span>
      );
    }
    if (!cand.accessExpiresAt) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
          {cand.allocatedDurationMonths || 6} Mo (Active)
        </span>
      );
    }
    const expTime = new Date(cand.accessExpiresAt).getTime();
    const diffMs = expTime - Date.now();
    if (diffMs <= 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase bg-red-100 text-red-700 border-red-300 shadow-xs">
          🔴 Expired
        </span>
      );
    }
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const remDays = days % 30;
    let label = '';
    if (months > 0) {
      label = `${months} Mo${months > 1 ? 's' : ''}${remDays > 0 ? `, ${remDays} d` : ''}`;
    } else {
      label = `${days} Day${days > 1 ? 's' : ''}`;
    }
    const isWarning = days <= 14;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${isWarning
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
        {isWarning ? '⚠️ ' : '⏱️ '}{label}
      </span>
    );
  };

  const handleOpenMentorModal = async (mentorName) => {
    if (!mentorName || mentorName === 'Unassigned') {
      return;
    }

    // Look up in loaded activeAdmins
    let found = activeAdmins.find(a =>
      a.name && a.name.trim().toLowerCase() === mentorName.trim().toLowerCase()
    );

    // Fallback: fetch directly from super-admin/admins endpoint
    if (!found) {
      try {
        const token = getAuthToken('supss');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/super-admin/admins', { headers });
        if (res.data && Array.isArray(res.data)) {
          found = res.data.find(a => a.name && a.name.trim().toLowerCase() === mentorName.trim().toLowerCase());
        }
      } catch (e) {
        console.error('Failed to fetch admin details:', e);
      }
    }

    let cityVal = '';
    if (found) {
      cityVal = found.city || (found.institute && found.institute !== 'Branch Administrator' ? found.institute : '') || found.branch || '';
    }
    if (!cityVal) {
      const matchingCand = (candidates || []).find(c => c.linkedAdmin && c.linkedAdmin.trim().toLowerCase() === mentorName.trim().toLowerCase() && c.city);
      if (matchingCand) {
        cityVal = matchingCand.city;
      }
    }
    const cleanCity = cityVal ? cityVal.replace(/^Branch Administrator\s*(-->)?\s*/i, '').trim() : 'Chhatrapati Sambhajinagar';

    if (found) {
      setActiveModalUser({
        name: found.name,
        email: found.email,
        mobile: found.mobile || 'N/A',
        role: 'Mentor / Admin',
        status: found.status ? (found.status.charAt(0).toUpperCase() + found.status.slice(1)) : 'Active',
        id: found._id || found.id,
        referralCode: found.referralCode || 'N/A',
        city: cleanCity,
        institute: cleanCity
      });
    } else {
      setActiveModalUser({
        name: mentorName,
        email: `${mentorName.toLowerCase().replace(/\s+/g, '')}@cb.in`,
        mobile: 'N/A',
        role: 'Mentor / Admin',
        status: 'Active',
        id: 'N/A',
        city: cleanCity,
        institute: cleanCity
      });
    }
  };

  const handleOpenCandidateModal = (cand) => {
    const feeVal = getCandidateAssignedFee(cand);
    setActiveModalUser({
      name: cand.name,
      email: cand.email,
      mobile: cand.mobile || 'N/A',
      city: cand.city || 'N/A',
      role: 'Candidate / Student',
      status: cand.isUnlocked ? 'Upgraded' : (cand.status || 'Pending Upgrade'),
      id: cand.id,
      linkedAdmin: cand.linkedAdmin,
      assignedFee: `₹${feeVal}`
    });
  };

  // Students with Pending Mentor Assignment (unassigned mentor)
  const pendingRegistrationStudents = candidates.filter(c => !c.linkedAdmin || c.linkedAdmin === 'Unassigned' || c.linkedAdmin === 'None');

  const uniqueCities = [...new Set(candidates.map(c => (c.linkedAdmin === 'Unassigned' ? '-' : c.city)).filter(c => c && c !== '-' && c !== 'Delhi'))];
  const uniqueMentors = [...new Set(candidates.map(c => c.linkedAdmin).filter(Boolean))];

  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch =
      cand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.linkedAdmin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cand.mobile && cand.mobile.includes(searchTerm));

    const candCity = (cand.linkedAdmin === 'Unassigned' || !cand.city || cand.city === 'Delhi') ? '-' : cand.city;
    const matchesCity = selectedCity === '' || candCity === selectedCity;
    const matchesMentor = selectedMentor === '' || cand.linkedAdmin === selectedMentor;

    let matchesStatus = true;
    if (selectedStatus === 'Upgraded') {
      matchesStatus = cand.isUnlocked === true;
    } else if (selectedStatus === 'Pending Upgrade') {
      matchesStatus = !cand.isUnlocked;
    } else if (selectedStatus !== 'All') {
      matchesStatus = cand.status === selectedStatus;
    }

    let matchesEducation = true;
    if (selectedEducation === '10th') {
      matchesEducation = Boolean(cand.docGrade10);
    } else if (selectedEducation === '12th') {
      matchesEducation = Boolean(cand.docGrade12);
    } else if (selectedEducation === 'both') {
      matchesEducation = Boolean(cand.docGrade10 && cand.docGrade12);
    }

    return matchesSearch && matchesCity && matchesMentor && matchesStatus && matchesEducation;
  });

  const filteredPending = pendingRegistrationStudents.filter(cand => {
    const matchesSearch =
      cand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const candCity = (cand.linkedAdmin === 'Unassigned' || !cand.city || cand.city === 'Delhi') ? '-' : cand.city;
    const matchesCity = selectedCity === '' || candCity === selectedCity;
    return matchesSearch && matchesCity;
  });

  const buildCandidateExportData = () => {
    const headers = [
      'Candidate ID',
      'Candidate Name',
      'Email',
      'Mobile Contact',
      'State & City',
      'Assigned Mentor',
      'Referral Code Used',
      '10th Marks & Doc Link',
      '12th Marks & Doc Link',
      'Time Remaining / Validity',
      'Date Joined',
      'Subscription Status',
      'Fee (₹)',
      'Razorpay Payment ID / Ref'
    ];
    const rows = [];

    const upgradedList = filteredCandidates.filter(c => c.isUnlocked);
    const pendingUpgradeList = filteredCandidates.filter(c => !c.isUnlocked);
    const pendingMentorList = filteredPending;

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) {
        return 'N/A';
      }
    };

    const getCandidateRow = (c, statusName) => {
      const feeVal = getCandidateAssignedFee(c);
      const isPaid = c.isUnlocked;
      const feeStr = isPaid ? (c.paidFee ? `Paid ₹${c.paidFee}` : `Paid ₹${feeVal}`) : `Assigned ₹${feeVal}`;
      const displayCity = (c.linkedAdmin === 'Unassigned' || !c.city || c.city === 'Delhi') ? '-' : c.city;
      const refCode = c.adminReferralCode || 'N/A';

      // 10th & 12th Percentage + Clickable Cloudinary Doc Link
      const grade10Val = (c.grade10Percentage !== null && c.grade10Percentage !== undefined && c.grade10Percentage !== '') ? `${c.grade10Percentage}%` : 'N/A';
      const doc10Str = c.docGrade10
        ? `<a href="${c.docGrade10}" target="_blank" style="color: #0284C7; font-weight: bold; text-decoration: underline;">${grade10Val} (View 10th Doc)</a>`
        : `${grade10Val} (No Doc)`;

      const grade12Val = (c.grade12Percentage !== null && c.grade12Percentage !== undefined && c.grade12Percentage !== '') ? `${c.grade12Percentage}%` : 'N/A';
      const doc12Str = c.docGrade12
        ? `<a href="${c.docGrade12}" target="_blank" style="color: #0284C7; font-weight: bold; text-decoration: underline;">${grade12Val} (View 12th Doc)</a>`
        : `${grade12Val} (No Doc)`;

      // Helper to dynamically read linked mentor's current custom duration
      const getMentorCurrentDuration = (cand) => {
        if (cand.mentorCustomDurationMonths && Number(cand.mentorCustomDurationMonths) > 0) {
          return Number(cand.mentorCustomDurationMonths);
        }
        if (cand && (cand.assignedAdminId || cand.linkedAdminId || cand.linkedAdmin)) {
          const mentor = activeAdmins.find(a =>
            (cand.assignedAdminId && (a._id === cand.assignedAdminId || a.id === cand.assignedAdminId)) ||
            (cand.linkedAdminId && (a._id === cand.linkedAdminId || a.id === cand.linkedAdminId)) ||
            (cand.linkedAdmin && a.name && a.name.toLowerCase() === cand.linkedAdmin.toLowerCase()) ||
            (cand.linkedAdmin && a.email && a.email.toLowerCase() === cand.linkedAdmin.toLowerCase())
          );
          if (mentor) {
            if (mentor.customStudentDurationMonths && Number(mentor.customStudentDurationMonths) > 0) {
              return Number(mentor.customStudentDurationMonths);
            }
            if (mentor.passkeyAllocatedDurationMonths && Number(mentor.passkeyAllocatedDurationMonths) > 0) {
              return Number(mentor.passkeyAllocatedDurationMonths);
            }
          }
        }
        return 6;
      };

      // Time Remaining / Validity calculation based on upgrade status
      let validityStr = '';
      if (!isPaid) {
        // FOR PENDING_UPGRADE STUDENTS:
        // Dynamically read current custom duration assigned to linked mentor (fallback to default 6)
        const mentorCurrentDuration = getMentorCurrentDuration(c);
        validityStr = `${mentorCurrentDuration} Mo Plan (Pending Unlock)`;
      } else {
        // FOR UPGRADED (PAID) STUDENTS:
        // Strictly read student's allocatedDurationMonths snapshotted at time of payment
        const studentAllocatedMonths = c.allocatedDurationMonths || 6;
        let expTime = null;
        if (c.accessExpiresAt) {
          expTime = new Date(c.accessExpiresAt).getTime();
        } else if (c.createdAt) {
          const createdDate = new Date(c.createdAt);
          createdDate.setMonth(createdDate.getMonth() + studentAllocatedMonths);
          expTime = createdDate.getTime();
        }

        if (expTime) {
          const diffMs = expTime - Date.now();
          if (diffMs <= 0) {
            validityStr = `${studentAllocatedMonths} Mo (Expired)`;
          } else {
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            const remDays = days % 30;
            const remText = months > 0 ? `${months}m ${remDays}d left` : `${days}d left`;
            validityStr = `${studentAllocatedMonths} Mo (${remText})`;
          }
        } else {
          validityStr = `${studentAllocatedMonths} Mo Active`;
        }
      }

      // Date Joined formatted from createdAt
      const dateJoinedStr = formatDate(c.createdAt || c.dateJoined);

      return [
        c.id || c._id || 'N/A',
        c.name || 'N/A',
        c.email || 'N/A',
        c.mobile ? String(c.mobile).trim() : 'N/A',
        displayCity,
        c.linkedAdmin || 'Unassigned',
        refCode,
        doc10Str,
        doc12Str,
        validityStr,
        dateJoinedStr,
        statusName || (isPaid ? 'Upgraded' : 'Pending'),
        feeStr,
        c.razorpayPaymentId || (isPaid ? 'Paid' : 'N/A (Pending)')
      ];
    };

    // 🟢 Section 1: Upgraded Candidates (Green Merged Banner)
    if (selectedStatus === 'All' || selectedStatus === 'Upgraded') {
      rows.push({
        _isBanner: true,
        title: `🟢 UPGRADED CANDIDATES (${upgradedList.length} Total)`,
        bgColor: '#0F766E',
        textColor: '#FFFFFF'
      });

      if (upgradedList.length === 0) {
        rows.push(['-', 'No upgraded candidates found', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Upgraded', '-', '-']);
      } else {
        upgradedList.forEach(c => {
          rows.push(getCandidateRow(c, 'Upgraded'));
        });
      }
    }

    // 🟡 Section 2: Pending Upgrade Candidates (Yellow Merged Banner + Line Spacing)
    if (selectedStatus === 'All' || selectedStatus === 'Pending Upgrade') {
      if (rows.length > 0) rows.push({ _isBlank: true }); // Line gap spacing

      rows.push({
        _isBanner: true,
        title: `🟡 PENDING UPGRADE CANDIDATES (${pendingUpgradeList.length} Total)`,
        bgColor: '#D97706',
        textColor: '#FFFFFF'
      });

      if (pendingUpgradeList.length === 0) {
        rows.push(['-', 'No pending upgrade candidates found', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'Pending Upgrade', '-', '-']);
      } else {
        pendingUpgradeList.forEach(c => {
          rows.push(getCandidateRow(c, 'Pending Upgrade'));
        });
      }
    }

    // 🔴 Section 3: Candidates with Pending Mentor Assignment (Red Merged Banner + Line Spacing)
    if (selectedStatus === 'All' || selectedStatus === 'Pending Mentor') {
      if (pendingMentorList.length > 0) {
        if (rows.length > 0) rows.push({ _isBlank: true }); // Line gap spacing

        rows.push({
          _isBanner: true,
          title: `🔴 CANDIDATES WITH PENDING MENTOR ASSIGNMENT (${pendingMentorList.length} Total)`,
          bgColor: '#B91C1C',
          textColor: '#FFFFFF'
        });

        pendingMentorList.forEach(c => {
          rows.push(getCandidateRow(c, c.isUnlocked ? 'Upgraded' : 'Pending Mentor'));
        });
      }
    }

    return { headers, rows };
  };

  const handleExportExcel = () => {
    const { headers, rows } = buildCandidateExportData();
    const statusLabel = selectedStatus === 'All' ? 'All_Candidates' : `${selectedStatus}_Candidates`;
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '_');
    exportToCSV(`Skill_Bridge_${statusLabel}_${datePart}_${timePart}.xls`, headers, rows);
  };

  const handleCopyGoogleSheets = () => {
    const { headers, rows } = buildCandidateExportData();
    copyForGoogleSheets(headers, rows);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchCandidates);

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
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Total Platform Candidates ({filteredCandidates.length})</h1>
          <p className="text-xs text-gray-500 mt-1">View all registered candidates, their mobile contact details, and their linked administrator mentors</p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.05)] rounded-2xl p-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by candidate name, email, mentor name, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Filter by Mentor Dropdown */}
          <select
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            className="w-full md:w-56 px-3 py-2 text-xs font-bold text-blue-900 bg-blue-50/70 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
          >
            <option value="">👤 Filter by Mentor (All Mentors)</option>
            <option value="Unassigned">⚠️ Unassigned Candidates</option>
            {uniqueMentors.filter(m => m !== 'Unassigned').map(mentor => (
              <option key={mentor} value={mentor}>👤 {mentor}</option>
            ))}
          </select>

          {/* Qualification Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedEducation('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${selectedEducation === 'All'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedEducation('10th')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${selectedEducation === '10th'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-blue-600'
                }`}
            >
              10th
            </button>
            <button
              type="button"
              onClick={() => setSelectedEducation('12th')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${selectedEducation === '12th'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-amber-600'
                }`}
            >
              12th
            </button>
            <button
              type="button"
              onClick={() => setSelectedEducation('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${selectedEducation === 'both'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-purple-600'
                }`}
            >
              Both
            </button>
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full md:w-36 px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Cities</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-40 px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Upgraded">Upgraded (Paid & Linked)</option>
            <option value="Pending Upgrade">Pending Upgrade (No Payment / Referral)</option>
            <option value="Active">Trial Active</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>

        {/* Dedicated Section: Students with Pending Mentor Assignment */}
        {pendingRegistrationStudents.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-lg border border-amber-300/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-6 text-left relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center text-xl shadow-inner shrink-0">
                  📋
                </span>
                <div>
                  <h3 className="text-base font-black text-amber-900 tracking-tight flex items-center gap-2">
                    Students with Pending Mentor Assignment
                    <span className="bg-amber-500 text-white font-extrabold px-2.5 py-0.5 rounded-full text-[10px] tracking-wider uppercase shadow-sm">
                      {pendingRegistrationStudents.length}
                    </span>
                  </h3>
                  <p className="text-xs text-amber-800/80 font-medium mt-0.5">
                    These students do not have an assigned Admin/Mentor yet. Select an active mentor from the dropdown to pair with them.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 border border-amber-200/60 rounded-xl overflow-hidden shadow-sm">
              {/* Desktop View (min-width: 768px) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-amber-50/80 text-amber-900 text-[10px] uppercase font-black tracking-wider border-b border-amber-200/60">
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Email & Contact</th>
                      <th className="px-4 py-3">Registration Status</th>
                      <th className="px-4 py-3">Assign Mentor / Admin</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/60">
                    {filteredPending.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-amber-800/60 font-bold text-xs">
                          No pending registration students match your search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPending.map(student => (
                        <tr key={student.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-xs text-gray-900">
                            <button
                              onClick={() => handleOpenCandidateModal(student)}
                              className="font-bold text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                              title="Click to view student info card"
                            >
                              {student.name}
                            </button>
                            <div className="text-[9px] text-gray-400 font-mono">ID: {student.id}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-gray-600 font-mono">
                            <div>{student.email}</div>
                            {student.mobile && <div className="text-[10px] text-gray-400">📞 {student.mobile}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase ${student.isUnlocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {student.isUnlocked ? 'Upgraded' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              id={`pending-select-${student.id}`}
                              className="bg-white border border-amber-300 text-gray-900 text-xs rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full p-2 font-semibold shadow-sm outline-none"
                              defaultValue=""
                            >
                              <option value="" disabled>Select Mentor / Admin</option>
                              {activeAdmins.map(admin => (
                                <option key={admin._id || admin.id} value={admin._id || admin.id}>
                                  {admin.name} ({admin.email})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`pending-select-${student.id}`);
                                handleAssignMentor(student.id, sel ? sel.value : '');
                              }}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                              title="Assign mentor to student"
                            >
                              Assign Mentor
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (max-width: 767px) */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredPending.length === 0 ? (
                  <div className="p-6 text-center text-amber-800/60 font-bold text-xs bg-amber-50/40 rounded-xl">
                    No pending registration students match your search filter.
                  </div>
                ) : (
                  filteredPending.map(student => (
                    <div key={student.id} className="bg-white border border-amber-200 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex justify-between items-start gap-2 border-b border-amber-100 pb-2.5">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 leading-tight">
                            <button
                              onClick={() => handleOpenCandidateModal(student)}
                              className="font-black text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                            >
                              {student.name}
                            </button>
                          </h4>
                          <div className="text-[9px] text-gray-400 font-mono">ID: {student.id}</div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase shrink-0 ${student.isUnlocked
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                          {student.isUnlocked ? 'Upgraded' : 'Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Email & Mobile:</span>
                          <span className="font-semibold text-gray-800 break-all font-mono">{student.email}</span>
                          {student.mobile && <span className="text-[10px] text-gray-500 font-semibold">📞 {student.mobile}</span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Assign Mentor / Admin:</span>
                          <select
                            id={`pending-select-mobile-${student.id}`}
                            className="bg-white border border-amber-300 text-gray-900 text-xs rounded-xl focus:ring-amber-500 focus:border-amber-500 block w-full p-2 font-semibold shadow-xs outline-none mt-1"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Mentor / Admin</option>
                            {activeAdmins.map(admin => (
                              <option key={admin._id || admin.id} value={admin._id || admin.id}>
                                {admin.name} ({admin.email})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-100">
                        <button
                          onClick={() => {
                            const sel = document.getElementById(`pending-select-mobile-${student.id}`);
                            handleAssignMentor(student.id, sel ? sel.value : '');
                          }}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-center"
                        >
                          Assign Mentor
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Candidate Table */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden w-full text-left shadow-sm">
          {/* Desktop View (min-width: 768px) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 w-16">Photo</th>
                  <th className="px-6 py-4">Candidate Name</th>
                  <th className="px-6 py-4">Email & Contact</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Linked Mentor</th>
                  <th className="px-6 py-4">Fee (₹)</th>
                  <th className="px-6 py-4">Time Remaining</th>
                  <th className="px-6 py-4">Date Joined</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 font-bold text-sm">
                      No candidates found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((cand) => (
                    <tr
                      key={cand.id}
                      className="border-t border-gray-150 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenCandidateModal(cand)}
                          className="cursor-pointer bg-transparent border-0 p-0 hover:opacity-85 transition-opacity"
                          title="Click to view candidate info"
                        >
                          {getAvatar(cand.name)}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-bold text-xs text-gray-900">
                        <button
                          onClick={() => handleOpenCandidateModal(cand)}
                          className="font-bold text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                          title="Click to view candidate info"
                        >
                          {cand.name}
                        </button>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono">ID: {cand.id}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600 font-mono">
                        <div>{cand.email}</div>
                        {cand.mobile && (
                          <div className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                            <span>📞</span> {cand.mobile}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                        {cand.linkedAdmin === 'Unassigned' || !cand.city || cand.city === 'Delhi' || cand.city === '-' ? '-' : cand.city}
                      </td>
                      <td className="px-6 py-4">
                        {cand.linkedAdmin && cand.linkedAdmin !== 'Unassigned' ? (
                          <button
                            onClick={() => handleOpenMentorModal(cand.linkedAdmin)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                            title={`Click to view ${cand.linkedAdmin}'s profile`}
                          >
                            👤 {cand.linkedAdmin}
                          </button>
                        ) : (
                          <button
                            onClick={() => setAssignModalStudent(cand)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md hover:scale-105 transition-all cursor-pointer"
                            title="Click to assign a mentor to this student"
                          >
                            ⚡ Assign Mentor
                          </button>
                        )}
                      </td>
                      {/* FEE (₹): Amber "Assigned ₹500" if pending, Green "Paid ₹500" if upgraded */}
                      <td className="px-6 py-4">
                        {cand.isUnlocked ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-black shadow-xs" title="Total fee paid by candidate upon upgrade">
                            Paid ₹{cand.paidFee || getCandidateAssignedFee(cand)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-black" title="Assigned candidate unlock fee">
                            Assigned ₹{getCandidateAssignedFee(cand)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getTimeRemainingBadge(cand)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {cand.dateJoined}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${cand.isTrialActive === false || cand.status === 'Deactivated'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : (cand.isUnlocked
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200')
                          }`}>
                          {cand.isTrialActive === false || cand.status === 'Deactivated'
                            ? 'Deactivated'
                            : (cand.isUnlocked ? 'Upgraded' : 'Pending Upgrade')}
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
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                No candidates found matching your filters.
              </div>
            ) : (
              filteredCandidates.map((cand) => (
                <div key={cand.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs text-left">
                  {/* Header: Avatar, Name, ID & Status Badge */}
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <button
                      onClick={() => handleOpenCandidateModal(cand)}
                      className="cursor-pointer bg-transparent border-0 p-0 shrink-0"
                    >
                      {getAvatar(cand.name)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Candidate</span>
                      <h4 className="text-sm font-black text-gray-900 truncate">
                        <button
                          onClick={() => handleOpenCandidateModal(cand)}
                          className="font-black text-gray-900 hover:text-blue-700 hover:underline text-left cursor-pointer bg-transparent border-0 p-0"
                        >
                          {cand.name}
                        </button>
                      </h4>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {cand.id}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-extrabold uppercase shrink-0 ${cand.isTrialActive === false || cand.status === 'Deactivated'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : (cand.isUnlocked
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200')
                      }`}>
                      {cand.isTrialActive === false || cand.status === 'Deactivated'
                        ? 'Deactivated'
                        : (cand.isUnlocked ? 'Upgraded' : 'Pending')}
                    </span>
                  </div>

                  {/* Card Body Grid */}
                  <div className="space-y-2.5 text-xs">
                    {/* Email & Contact */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Email & Mobile:</span>
                      <span className="font-semibold text-gray-800 break-all font-mono">{cand.email}</span>
                      {cand.mobile && <span className="text-[10px] text-gray-500 font-semibold mt-0.5">📞 {cand.mobile}</span>}
                    </div>

                    {/* City & Date Joined Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">City:</span>
                        <span className="font-semibold text-gray-800 mt-0.5">{cand.linkedAdmin === 'Unassigned' || !cand.city || cand.city === 'Delhi' || cand.city === '-' ? '-' : cand.city}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Date Joined:</span>
                        <span className="font-semibold text-gray-700 font-mono mt-0.5">{cand.dateJoined}</span>
                      </div>
                    </div>

                    {/* Fee Status & Time Remaining Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Fee Status:</span>
                        <div className="mt-1">
                          {cand.isUnlocked ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-black">
                              Paid ₹{cand.paidFee || getCandidateAssignedFee(cand)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-black">
                              Assigned ₹{getCandidateAssignedFee(cand)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Time Remaining:</span>
                        <div className="mt-1">{getTimeRemainingBadge(cand)}</div>
                      </div>
                    </div>

                    {/* Linked Mentor & Referral Code Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Linked Mentor:</span>
                        <div className="mt-1">
                          {cand.linkedAdmin && cand.linkedAdmin !== 'Unassigned' ? (
                            <button
                              onClick={() => handleOpenMentorModal(cand.linkedAdmin)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              👤 {cand.linkedAdmin}
                            </button>
                          ) : (
                            <button
                              onClick={() => setAssignModalStudent(cand)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-xs cursor-pointer"
                            >
                              ⚡ Assign Mentor
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Referral Code:</span>
                        <span className="font-mono text-xs font-bold text-gray-700 mt-1">{cand.adminReferralCode || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* Candidate / Mentor Detail Modal */}
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
              {getLargeAvatar(activeModalUser)}
            </div>

            <h3 className="text-base font-black text-gray-900 leading-tight">{activeModalUser.name}</h3>

            <div className="mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${activeModalUser.role.includes('Mentor')
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {activeModalUser.role}
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
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Referral Code</span>
                  <span className="text-blue-700 font-extrabold font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                    {activeModalUser.referralCode}
                  </span>
                </div>
              )}

              {activeModalUser.institute && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px] shrink-0">Branch Administrator</span>
                  <span className="text-gray-700 font-bold text-[11px] text-right truncate max-w-[220px]" title={activeModalUser.city || activeModalUser.institute}>
                    {activeModalUser.city || activeModalUser.institute}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Assigned Unlock Fee</span>
                <span className="text-emerald-700 font-black font-mono text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {activeModalUser.assignedFee || '₹99'}
                </span>
              </div>

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
            </div>

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

      {/* Assign Mentor Modal */}
      {assignModalStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-2xl p-6 max-w-md w-full text-left shadow-2xl animate-in fade-in zoom-in duration-150 relative">
            <button
              onClick={() => setAssignModalStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center text-lg">
                👤
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">Assign Admin / Mentor</h3>
                <p className="text-xs text-gray-500 font-medium">Link candidate to an active platform mentor</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-5 space-y-1">
              <div className="text-xs font-bold text-gray-900">{assignModalStudent.name}</div>
              <div className="text-xs text-gray-500 font-mono">{assignModalStudent.email}</div>
              {assignModalStudent.mobile && (
                <div className="text-xs text-gray-500 font-mono">📞 {assignModalStudent.mobile}</div>
              )}
              <div className="pt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase ${assignModalStudent.isUnlocked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                  {assignModalStudent.isUnlocked ? 'Profile Upgraded' : 'Pending Payment Upgrade'}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-gray-600 block mb-1.5">
                  Select Active Mentor / Admin
                </label>
                <select
                  id="modal-assign-mentor-select"
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-3 text-xs font-semibold text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  defaultValue=""
                >
                  <option value="" disabled>-- Select Active Mentor --</option>
                  {activeAdmins.map(admin => (
                    <option key={admin._id || admin.id} value={admin._id || admin.id}>
                      {admin.name} — {admin.email} ({admin.referralCode || 'No Code'})
                    </option>
                  ))}
                </select>
                {activeAdmins.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-1">
                    No active admins found. Please approve an admin application first.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const sel = document.getElementById('modal-assign-mentor-select');
                  handleAssignMentor(assignModalStudent.id, sel ? sel.value : '');
                }}
                disabled={activeAdmins.length === 0}
                className="flex-1 bg-black hover:bg-gray-900 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer tracking-wide shadow-md"
              >
                Confirm Assignment
              </button>
              <button
                onClick={() => setAssignModalStudent(null)}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-extrabold py-3 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SuperAdminCandidates;