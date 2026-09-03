import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { logoutUser } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import { exportToCSV, copyForGoogleSheets } from '../../utils/exportUtils';

function SuperAdminRevenue() {
  useDocumentTitle('Platform Revenue & Settings | Super Admin');
  const navigate = useNavigate();

  // Fee & Duration Settings State
  const [unlockFee, setUnlockFee] = useState(99);
  const [defaultDurationMonths, setDefaultDurationMonths] = useState(6);
  const [adminFees, setAdminFees] = useState([]);
  const [customFeeInputs, setCustomFeeInputs] = useState({});
  const [customDurationInputs, setCustomDurationInputs] = useState({});
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Payment History State
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Fetch Payment Configuration Settings, Duration Allocation & City Admin Fees
  const fetchConfig = async () => {
    try {
      const res = await axios.get('/api/payment/config');
      setUnlockFee(res.data.unlockFee || 99);
      setDefaultDurationMonths(res.data.defaultStudentDurationMonths || 6);
      const admins = res.data.adminFees || [];
      setAdminFees(admins);
      const feeInputs = {};
      const durInputs = {};
      admins.forEach(a => {
        feeInputs[a._id] = (a.customUnlockFee !== null && a.customUnlockFee !== undefined) ? a.customUnlockFee.toString() : '';
        durInputs[a._id] = (a.customStudentDurationMonths !== null && a.customStudentDurationMonths !== undefined) ? a.customStudentDurationMonths.toString() : '';
      });
      setCustomFeeInputs(feeInputs);
      setCustomDurationInputs(durInputs);
    } catch (err) {
      console.error('Failed to load payment & duration configurations:', err);
      toast.error('Failed to fetch platform configuration details.');
    }
  };

  // Fetch Payment History Logs
  const fetchPaymentHistory = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/payment/history');
      setPayments(res.data);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      toast.error('Failed to retrieve student payment logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchPaymentHistory();
  }, []);

  const fetchAllRevenueData = async () => {
    await Promise.allSettled([
      fetchConfig(),
      fetchPaymentHistory()
    ]);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchAllRevenueData);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const handleAdminFeeChange = (adminId, val) => {
    setCustomFeeInputs(prev => ({
      ...prev,
      [adminId]: val
    }));
  };

  const handleAdminDurationChange = (adminId, val) => {
    setCustomDurationInputs(prev => ({
      ...prev,
      [adminId]: val
    }));
  };

  // Save Settings to Backend
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    const loadingToast = toast.loading('Updating fee & duration configurations...');

    try {
      const payload = {
        unlockFee: Number(unlockFee),
        defaultStudentDurationMonths: Number(defaultDurationMonths),
        adminFees: customFeeInputs,
        adminDurations: customDurationInputs
      };

      const res = await axios.post('/api/payment/config', payload);

      toast.dismiss(loadingToast);
      toast.success(res.data.message || 'Payment fees & duration allocation settings updated!');
      if (res.data.config) {
        setUnlockFee(res.data.config.unlockFee);
        setDefaultDurationMonths(res.data.config.defaultStudentDurationMonths || 6);
        if (res.data.config.adminFees) {
          setAdminFees(res.data.config.adminFees);
          const feeInputs = {};
          const durInputs = {};
          res.data.config.adminFees.forEach(a => {
            feeInputs[a._id] = (a.customUnlockFee !== null && a.customUnlockFee !== undefined) ? a.customUnlockFee.toString() : '';
            durInputs[a._id] = (a.customStudentDurationMonths !== null && a.customStudentDurationMonths !== undefined) ? a.customStudentDurationMonths.toString() : '';
          });
          setCustomFeeInputs(feeInputs);
          setCustomDurationInputs(durInputs);
        }
      }
    } catch (err) {
      console.error('Save config failed:', err);
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to update configurations.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filters payments list
  const filteredPayments = payments.filter(p => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return true;
    return (
      (p.studentName && p.studentName.toLowerCase().includes(term)) ||
      (p.studentEmail && p.studentEmail.toLowerCase().includes(term)) ||
      (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(term)) ||
      (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(term))
    );
  });

  const totalRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalCollected = totalRevenue;

  const handleExportPaymentsExcel = () => {
    const headers = ['Student Name', 'Email', 'Amount Paid', 'Order ID', 'Payment ID', 'Status', 'Date & Time'];
    const rows = filteredPayments.map(p => [
      p.studentName || 'Student',
      p.studentEmail || 'N/A',
      `₹${p.amount}`,
      p.razorpayOrderId || 'N/A',
      p.razorpayPaymentId || 'N/A',
      p.status || 'paid',
      new Date(p.createdAt).toLocaleString('en-IN')
    ]);
    exportToCSV(`Skill_Bridge_Revenue_${new Date().toISOString().slice(0, 10)}.xls`, headers, rows);
  };
  const handleExportExcel = handleExportPaymentsExcel;

  const handleCopyPaymentsGoogleSheets = () => {
    const headers = ['Student Name', 'Email', 'Amount Paid', 'Order ID', 'Payment ID', 'Status', 'Date & Time'];
    const rows = filteredPayments.map(p => [
      p.studentName || 'Student',
      p.studentEmail || 'N/A',
      `₹${p.amount}`,
      p.razorpayOrderId || 'N/A',
      p.razorpayPaymentId || 'N/A',
      p.status || 'paid',
      new Date(p.createdAt).toLocaleString('en-IN')
    ]);
    copyForGoogleSheets(headers, rows);
  };
  const handleCopyGoogleSheets = handleCopyPaymentsGoogleSheets;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col">
      {RefreshOverlay}
      
      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"></span>
          <span 
            className="text-lg font-black tracking-widest uppercase cursor-pointer text-gray-900"
            onClick={() => navigate('/super-admin/dashboard')}
          >
            Skill Sups
          </span>
        </div>
        <div className="flex items-center gap-2">
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
              onClick={handleExportPaymentsExcel}
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
              onClick={handleCopyPaymentsGoogleSheets}
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
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Platform Revenue & Payment Settings</h1>
          <p className="text-xs text-gray-500 mt-1">Manage global candidate unlock fees, upload payment QR codes, and review student payment history.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT/MIDDLE COLUMNS: Revenue Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Card */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.05)] rounded-3xl p-6 flex items-center justify-between">
              <div className="text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Collected Revenue</span>
                <h3 className="text-3xl font-black text-gray-900 mt-1">₹{totalCollected}</h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ Live transaction aggregation</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-2xl border border-purple-100">
                💰
              </div>
            </div>

            {/* Payments List Container */}
            <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 space-y-4">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <h3 className="text-lg font-bold text-gray-900 text-left">Student Unlock Transactions</h3>
                
                {/* Search field */}
                <div className="w-full sm:w-64 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search by student name or email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Transactions Table */}
              <div className="w-full">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-extrabold text-gray-500">Loading payments list...</p>
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium text-xs">
                    No unlock payments recorded yet matching your criteria.
                  </div>
                ) : (
                  <>
                    {/* Desktop View (min-width: 768px) */}
                    <div className="hidden md:block overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Contact Email</th>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4 text-right">Amount Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-xs font-semibold text-gray-700">
                          {filteredPayments.map(p => (
                            <tr key={p._id} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-extrabold text-gray-900">{p.studentName}</span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">{p.studentEmail}</td>
                              <td className="px-6 py-4 text-gray-400 font-medium">
                                {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-purple-700">
                                ₹{p.amount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View (max-width: 767px) */}
                    <div className="block md:hidden p-3 space-y-3">
                      {filteredPayments.map((p) => (
                        <div key={p._id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                          <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Unlock Transaction</span>
                              <h4 className="text-sm font-black text-gray-900 leading-tight">{p.studentName}</h4>
                            </div>
                            <span className="font-black text-purple-700 text-sm bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full shrink-0">
                              ₹{p.amount}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase text-gray-400">Contact Email:</span>
                              <span className="font-semibold text-gray-800 break-all font-mono">{p.studentEmail}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase text-gray-400">Date & Time:</span>
                              <span className="font-semibold text-gray-600 font-mono">
                                {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Settings Side Panel */}
          <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 h-fit space-y-6 text-left">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Fee & Duration Configuration</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                  Settings Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                Configure default student access duration (months) and unlock fee globally or per mentor tier.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              
              {/* Global Base Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                {/* Global Base Fee */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold text-purple-900 block">Base Unlock Fee (₹)</label>
                    <span className="text-[9px] font-bold text-purple-600 uppercase">Default</span>
                  </div>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-extrabold">₹</span>
                    <input
                      type="number"
                      value={unlockFee}
                      onChange={(e) => setUnlockFee(e.target.value)}
                      required
                      min="1"
                      className="w-full pl-7 pr-3 py-2 text-xs font-black bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all text-purple-950"
                    />
                  </div>
                </div>

                {/* Global Base Duration */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-extrabold text-indigo-900 block">Default Access (Months)</label>
                    <span className="text-[9px] font-bold text-indigo-600 uppercase">Default</span>
                  </div>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-xs font-extrabold">📅</span>
                    <input
                      type="number"
                      value={defaultDurationMonths}
                      onChange={(e) => setDefaultDurationMonths(e.target.value)}
                      required
                      min="1"
                      max="120"
                      className="w-full pl-8 pr-3 py-2 text-xs font-black bg-white border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-indigo-950"
                    />
                  </div>
                </div>
                
                <p className="sm:col-span-2 text-[10px] text-purple-600/80 font-medium">Applied to new registrations when mentor has no custom overrides set.</p>
              </div>

              {/* City / Admin Search & Custom Fee/Duration Section */}
              <div className="space-y-3 pt-2 border-t border-gray-150">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">Custom Mentor Overrides</h4>
                </div>

                {/* Admin Search Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input
                    type="text"
                    placeholder="Search admin by name, city, or referral code..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all text-gray-900 placeholder-gray-400"
                  />
                  {adminSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAdminSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {adminFees.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-2xl italic">
                    No active admins found. Once admins are approved, you can set custom fees and access durations here.
                  </div>
                ) : (() => {
                  const filteredAdmins = adminFees.filter(admin => {
                    if (!adminSearchQuery.trim()) return false;
                    const q = adminSearchQuery.toLowerCase().trim();
                    return (
                      (admin.name && admin.name.toLowerCase().includes(q)) ||
                      (admin.city && admin.city.toLowerCase().includes(q)) ||
                      (admin.state && admin.state.toLowerCase().includes(q)) ||
                      (admin.referralCode && admin.referralCode.toLowerCase().includes(q))
                    );
                  });

                  // Check if any admin has a custom fee or custom duration currently configured
                  const customOverriddenAdmins = adminFees.filter(a => {
                    const feeVal = customFeeInputs[a._id];
                    const durVal = customDurationInputs[a._id];
                    const hasCustomFee = feeVal !== undefined && feeVal !== '' && !isNaN(feeVal) && Number(feeVal) > 0;
                    const hasCustomDur = durVal !== undefined && durVal !== '' && !isNaN(durVal) && Number(durVal) > 0;
                    return hasCustomFee || hasCustomDur;
                  });

                  const adminsToDisplay = adminSearchQuery.trim() ? filteredAdmins : customOverriddenAdmins;

                  if (!adminSearchQuery.trim() && customOverriddenAdmins.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-2xl italic">
                        🔍 Type an Admin's name or city above to set custom fee (₹) or duration (months).
                      </div>
                    );
                  }

                  if (adminSearchQuery.trim() && filteredAdmins.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-2xl italic">
                        No admin found matching "{adminSearchQuery}".
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {adminsToDisplay.map(admin => {
                        const currentFeeVal = customFeeInputs[admin._id] !== undefined ? customFeeInputs[admin._id] : '';
                        const currentDurVal = customDurationInputs[admin._id] !== undefined ? customDurationInputs[admin._id] : '';
                        const isFeeCustom = currentFeeVal !== '' && !isNaN(currentFeeVal) && Number(currentFeeVal) > 0;
                        const isDurCustom = currentDurVal !== '' && !isNaN(currentDurVal) && Number(currentDurVal) > 0;

                        return (
                          <div key={admin._id} className="p-3.5 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-2.5 transition-all hover:bg-white">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-extrabold text-gray-900 leading-tight">{admin.name}</p>
                                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                                  📍 {admin.city}, {admin.state} • Code: <span className="font-mono text-gray-700 font-bold">{admin.referralCode}</span>
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isFeeCustom ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-200/70 text-gray-600 border-gray-300'}`}>
                                  {isFeeCustom ? `Fee: ₹${currentFeeVal}` : `Fee: Base ₹${unlockFee}`}
                                </span>
                                <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${isDurCustom ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : 'bg-gray-200/70 text-gray-600 border-gray-300'}`}>
                                  {isDurCustom ? `Duration: ${currentDurVal} Mo` : `Duration: Base ${defaultDurationMonths} Mo`}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* Custom Fee Input */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-gray-500">Custom Fee (₹)</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-bold">₹</span>
                                  <input
                                    type="number"
                                    placeholder={`Base ₹${unlockFee}`}
                                    value={currentFeeVal}
                                    onChange={(e) => handleAdminFeeChange(admin._id, e.target.value)}
                                    min="1"
                                    className="w-full pl-6 pr-2 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 transition-all text-gray-900 placeholder-gray-400"
                                  />
                                </div>
                              </div>

                              {/* Custom Duration Input */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold uppercase text-gray-500">Access Duration (Mo)</label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">📅</span>
                                  <input
                                    type="number"
                                    placeholder={`Base ${defaultDurationMonths} mo`}
                                    value={currentDurVal}
                                    onChange={(e) => handleAdminDurationChange(admin._id, e.target.value)}
                                    min="1"
                                    max="120"
                                    className="w-full pl-7 pr-2 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-gray-900 placeholder-gray-400"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-[#111111] hover:bg-gray-800 text-white font-black py-3.5 rounded-full text-xs transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98 tracking-wide uppercase"
              >
                {isSavingSettings ? 'Saving Fee Settings...' : 'Save Fee Configurations'}
              </button>

            </form>
          </div>

        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default SuperAdminRevenue;