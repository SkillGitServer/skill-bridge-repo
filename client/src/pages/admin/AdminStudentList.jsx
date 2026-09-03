import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportToCSV, copyForGoogleSheets } from '../../utils/exportUtils';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import { getAuthToken } from '../../utils/auth';
import AdminHeader from '../../components/admin/AdminHeader';

function AdminStudentList() {
  useDocumentTitle('Student Roster | Skill Bridge India');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 8;

  const token = getAuthToken('vault');
  const referralCode = localStorage.getItem('admin_referral_code') || '';
  const [globalUnlockFee, setGlobalUnlockFee] = useState(99);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const [res, configRes] = await Promise.allSettled([
        axios.get('/api/admin/students', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        axios.get('/api/payment/config')
      ]);

      if (res.status === 'fulfilled') {
        setStudents(res.value.data.students || []);
      }
      if (configRes.status === 'fulfilled' && configRes.value.data?.unlockFee) {
        setGlobalUnlockFee(configRes.value.data.unlockFee);
      }
    } catch (err) {
      console.error('Failed to load referred students:', err);
      toast.error('Failed to load student list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchStudents);

  const toggleStatus = async (id) => {
    try {
      const res = await axios.post(`/api/admin/toggle-student/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || 'Student status updated successfully.');
      fetchStudents();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      toast.error(err.response?.data?.error || 'Failed to toggle student status.');
    }
  };

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const [educationFilter, setEducationFilter] = useState('all'); // 'all' | '10th' | '12th' | 'both'

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.mobile && String(student.mobile).toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (educationFilter === '10th') {
      return Boolean(student.docGrade10);
    }
    if (educationFilter === '12th') {
      return Boolean(student.docGrade12);
    }
    if (educationFilter === 'both') {
      return Boolean(student.docGrade10 && student.docGrade12);
    }
    return true;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return 'N/A'; }
  };

  const buildBranchStudentExportData = () => {
    const headers = ['Student Category', 'Student Name', 'Email', 'Mobile', 'Overall Points (pts)', 'Leaderboard Rank', '10th Percentage', '12th Percentage', 'Resume Status', 'Unlock Status', 'Paid Fee (₹)', 'Registration Date'];
    const rows = [];

    const unlockedList = filteredStudents.filter(s => s.isUnlocked);
    const trialList = filteredStudents.filter(s => !s.isUnlocked);

    const getFeeVal = (s) => {
      if (s && s.assignedUnlockFee !== null && s.assignedUnlockFee !== undefined && s.assignedUnlockFee !== '') {
        return Number(s.assignedUnlockFee);
      }
      return Number(globalUnlockFee || 99);
    };

    // 🟢 Section 1: Unlocked / Upgraded Students (Green Merged Banner)
    rows.push({
      _isBanner: true,
      title: `🟢 UNLOCKED / UPGRADED STUDENTS (${unlockedList.length} Total)`,
      bgColor: '#059669',
      textColor: '#FFFFFF'
    });

    if (unlockedList.length === 0) {
      rows.push(['Unlocked Student', 'No unlocked students found', '-', '-', '-', '-', '-', '-', '-', 'Unlocked', '-', '-']);
    } else {
      unlockedList.forEach(s => {
        const feeVal = getFeeVal(s);
        const paidFeeVal = s.paidFee ? s.paidFee : (s.isUnlocked ? feeVal : null);
        const paidFeeStr = paidFeeVal ? `₹${paidFeeVal}` : '-';
        rows.push([
          'Unlocked Student',
          s.name || 'Student',
          s.email || 'N/A',
          s.mobile ? String(s.mobile).trim() : 'N/A',
          s.pts !== undefined ? `${s.pts} pts` : '0 pts',
          s.rank ? `#${s.rank}` : 'N/A',
          s.percentage10th || 'N/A',
          s.percentage12th || 'N/A',
          s.docResume ? 'Uploaded' : 'Not Uploaded',
          'Unlocked / Upgraded',
          paidFeeStr,
          new Date(s.createdAt).toLocaleDateString('en-IN')
        ]);
      });
    }

    // 🟡 Section 2: Trial / Pending Students (Yellow Merged Banner + Line Spacing)
    rows.push({ _isBlank: true }); // Line gap spacing

    rows.push({
      _isBanner: true,
      title: `🟡 TRIAL / ACTIVE STUDENTS (${trialList.length} Total)`,
      bgColor: '#D97706',
      textColor: '#FFFFFF'
    });

    if (trialList.length === 0) {
      rows.push(['Trial Student', 'No trial students found', '-', '-', '-', '-', '-', '-', '-', 'Trial', '-', '-']);
    } else {
      trialList.forEach(s => {
        const paidFeeStr = s.paidFee ? `₹${s.paidFee}` : '-';
        rows.push([
          'Trial Student',
          s.name || 'Student',
          s.email || 'N/A',
          s.mobile ? String(s.mobile).trim() : 'N/A',
          s.pts !== undefined ? `${s.pts} pts` : '0 pts',
          s.rank ? `#${s.rank}` : 'N/A',
          s.percentage10th || 'N/A',
          s.percentage12th || 'N/A',
          s.docResume ? 'Uploaded' : 'Not Uploaded',
          'Trial / Active',
          paidFeeStr,
          new Date(s.createdAt).toLocaleDateString('en-IN')
        ]);
      });
    }

    return { headers, rows };
  };

  const handleExportExcel = () => {
    const { headers, rows } = buildBranchStudentExportData();
    exportToCSV(`Branch_Students_${referralCode || 'Roster'}_${new Date().toISOString().slice(0, 10)}.xls`, headers, rows);
  };

  const handleCopyGoogleSheets = () => {
    const { headers, rows } = buildBranchStudentExportData();
    copyForGoogleSheets(headers, rows);
  };

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}

      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main content area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">

        {/* Navigation Bar & Export Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Download Microsoft Excel document"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            <button
              onClick={handleCopyGoogleSheets}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-extrabold px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copy Branch Students for Google Sheets"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Copy for Google Sheets</span>
              <span className="sm:hidden">Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Active Student Database ({filteredStudents.length})</h1>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">Manage, verify, and view overall metrics of branch-affiliated students</p>
        </div>

        {/* Search Bar & Filter Options */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => { setEducationFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${educationFilter === 'all'
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setEducationFilter('10th'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${educationFilter === '10th'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-blue-600'
                  }`}
              >
                🎓 10th Pass
              </button>
              <button
                type="button"
                onClick={() => { setEducationFilter('12th'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${educationFilter === '12th'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-amber-600'
                  }`}
              >
                🎓 12th Pass
              </button>
              <button
                type="button"
                onClick={() => { setEducationFilter('both'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${educationFilter === 'both'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-purple-600'
                  }`}
              >
                🎓 Both (10th & 12th)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-gray-550">
            <span>Showing {filteredStudents.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, filteredStudents.length)} of {filteredStudents.length} entries</span>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-extrabold text-gray-500">Loading student roster...</p>
            </div>
          ) : (
            <>
              {/* Desktop View (min-width: 768px) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full min-w-[950px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4 text-left">Student Details</th>
                      <th className="px-6 py-4 text-left">Academics & Resume</th>
                      <th className="px-6 py-4 text-left">Registration Date</th>
                      <th className="px-6 py-4 text-left">Referral Code Used</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentStudents.length > 0 ? (
                      currentStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50/80 transition-colors bg-white/40 group">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center font-black text-xs text-blue-700 shadow-2xs group-hover:scale-105 transition-transform">
                                {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-black text-gray-900 leading-tight">{student.name}</h4>
                                  {student.rank === 1 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-amber-950 border border-yellow-400 shadow-xs animate-pulse">
                                      🥇 Rank #1 • {student.pts ?? 0} pts
                                    </span>
                                  ) : student.rank === 2 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-slate-200 via-gray-200 to-slate-300 text-slate-900 border border-slate-400 shadow-xs">
                                      🥈 Rank #2 • {student.pts ?? 0} pts
                                    </span>
                                  ) : student.rank === 3 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-orange-200 via-amber-200 to-orange-300 text-amber-950 border border-amber-400 shadow-xs">
                                      🥉 Rank #3 • {student.pts ?? 0} pts
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                                      ⚡ {student.pts ?? 0} pts
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-gray-500 font-mono block mt-0.5">{student.email}</span>
                                {student.mobile && (
                                  <span className="text-[11px] font-bold text-blue-700 font-mono block mt-0.5">
                                    📞 {student.mobile}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 font-mono">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100 text-[11px]">
                                  10th: <strong className="font-black">{student.percentage10th || 'N/A'}</strong>
                                </span>
                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 text-[11px]">
                                  12th: <strong className="font-black">{student.percentage12th || 'N/A'}</strong>
                                </span>
                              </div>
                              <div>
                                {student.docResume ? (
                                  <a
                                    href={student.docResume}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-lg border border-emerald-200 text-[11px] transition-colors shadow-2xs"
                                    title="Click to view or download uploaded student resume"
                                  >
                                    <span>📄</span>
                                    <span>Resume Uploaded</span>
                                    <span className="text-[9px] underline">↗</span>
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-400 font-semibold rounded-lg text-[11px] border border-gray-200">
                                    <span>⚠️</span> No Resume Uploaded
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 font-mono font-semibold">
                            {formatDate(student.createdAt)}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-xs font-mono font-bold text-gray-800">
                            <span className="bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700">
                              {student.referralCodeUsed || referralCode}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            {student.isTrialActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Deactivated
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <button
                              onClick={() => toggleStatus(student.id)}
                              className={`px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${student.isTrialActive
                                  ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
                                }`}
                            >
                              {student.isTrialActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-bold text-sm bg-white">
                          No students found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (max-width: 767px) */}
              <div className="block md:hidden p-3 space-y-3">
                {currentStudents.length > 0 ? (
                  currentStudents.map((student) => (
                    <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0">
                            {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-gray-900 leading-tight">{student.name}</h4>
                              {student.rank === 1 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 text-amber-950 border border-yellow-400 shadow-xs animate-pulse">
                                  🥇 Rank #1 • {student.pts ?? 0} pts
                                </span>
                              ) : student.rank === 2 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-slate-200 via-gray-200 to-slate-300 text-slate-900 border border-slate-400 shadow-xs">
                                  🥈 Rank #2 • {student.pts ?? 0} pts
                                </span>
                              ) : student.rank === 3 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-orange-200 via-amber-200 to-orange-300 text-amber-950 border border-amber-400 shadow-xs">
                                  🥉 Rank #3 • {student.pts ?? 0} pts
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                                  ⚡ {student.pts ?? 0} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {student.isTrialActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-green-100 text-green-700 border border-green-200 shrink-0">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200 shrink-0">
                            Deactivated
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Email Contact:</span>
                          <span className="font-semibold text-gray-800 break-all font-mono">{student.email}</span>
                          {student.mobile && (
                            <span className="font-bold text-blue-700 font-mono text-[11px] mt-0.5">📞 {student.mobile}</span>
                          )}
                        </div>

                        {/* Academics & Resume Section */}
                        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Academics & Resume:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100 text-[11px]">
                              10th: <strong className="font-black">{student.percentage10th || 'N/A'}</strong>
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100 text-[11px]">
                              12th: <strong className="font-black">{student.percentage12th || 'N/A'}</strong>
                            </span>
                            {student.docResume ? (
                              <a
                                href={student.docResume}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-lg border border-emerald-200 text-[11px] flex items-center gap-1"
                              >
                                📄 View Resume ↗
                              </a>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-400 font-semibold rounded-lg border border-gray-200 text-[11px]">
                                No Resume
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col pt-2 border-t border-gray-100">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Registration Date:</span>
                          <span className="font-semibold text-gray-600 font-mono">{formatDate(student.createdAt)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Referral Code Used:</span>
                          <span className="font-bold text-gray-800 font-mono">{student.referralCodeUsed || referralCode}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={() => toggleStatus(student.id)}
                          className={`w-full py-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${student.isTrialActive
                              ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                              : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
                            }`}
                        >
                          {student.isTrialActive ? 'Deactivate Student' : 'Activate Student'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                    No students found matching your criteria.
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-xl text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminStudentList;
