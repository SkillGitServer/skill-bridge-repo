import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function SuperAdminApprovals() {
  useDocumentTitle('Registration Approvals | Super Admin');
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Fetch pending administrators from backend
  const fetchPendingAdmins = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/pending-admins', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to load pending admin requests:', err);
      toast.error('Failed to fetch pending registration requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAdmins();
  }, []);

  const handleApproveAdmin = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      await axios.put(`/api/super-admin/approve-admin/${id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(`Approved administrator access for ${email}`);
      fetchPendingAdmins();
    } catch (err) {
      console.error('Approve failed:', err);
      toast.error(err.response?.data?.error || 'Failed to approve admin.');
    }
  };

  const [confirmRejectModal, setConfirmRejectModal] = useState(null);

  const handleRejectAdmin = async (id, email) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.delete(`/api/super-admin/reject-admin/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success(res.data.message || `Rejected registration for ${email}`);
      setConfirmRejectModal(null);
      fetchPendingAdmins();
    } catch (err) {
      console.error('Reject failed:', err);
      toast.error(err.response?.data?.error || 'Failed to reject admin request.');
    }
  };

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchPendingAdmins);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      (req.name && req.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (req.email && req.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCity = selectedCity === '' || req.city === selectedCity;
    
    return matchesSearch && matchesCity;
  });

  const uniqueCities = [...new Set(requests.map(r => r.city).filter(Boolean))];

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
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3 text-left">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Admin Registration Requests</h1>
          <p className="text-xs text-gray-500 mt-1">Review, approve, or reject incoming administrator registration applications</p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.05)] rounded-2xl p-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search by name or email..." 
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
        </div>

        {/* Table Queue */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-x-auto w-full shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 bg-white">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-extrabold text-gray-550">Loading request queue...</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (min-width: 768px) */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                      <th className="px-6 py-4">Admin Name</th>
                      <th className="px-6 py-4">Contact Email</th>
                      <th className="px-6 py-4">State & City</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold text-sm bg-white">
                          No pending registration requests found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr
                          key={req._id}
                          className="border-t border-gray-150 hover:bg-gray-50/50 transition-colors bg-white/50"
                        >
                          <td className="px-6 py-4 font-bold text-xs text-gray-900">
                            {req.name}
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                            <div>{req.email}</div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                            {req.state ? `${req.state}, ${req.city}` : req.city || 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-200">
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleApproveAdmin(req._id, req.email)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] tracking-wide cursor-pointer transition-all active:scale-95 shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setConfirmRejectModal(req)}
                                className="border border-red-200 text-red-600 hover:bg-red-50 font-extrabold px-3 py-1.5 rounded-lg text-[10px] tracking-wide cursor-pointer transition-all active:scale-95 shadow-sm bg-white"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (max-width: 767px) */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                    No pending registration requests found matching your filters.
                  </div>
                ) : (
                  filteredRequests.map((req) => (
                    <div
                      key={req._id}
                      className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs"
                    >
                      {/* Top Identifier & Status */}
                      <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Pending Admin</span>
                          <h4 className="text-sm font-black text-gray-900 leading-tight">{req.name}</h4>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                          {req.status}
                        </span>
                      </div>

                      {/* Stacked Key-Value Pairs */}
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Email Contact:</span>
                          <span className="font-semibold text-gray-800 break-all">{req.email}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">State & City:</span>
                          <span className="font-semibold text-gray-800">
                            {req.state ? `${req.state}, ${req.city}` : req.city || 'Unknown'}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Group */}
                      <div className="pt-2 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => handleApproveAdmin(req._id, req.email)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setConfirmRejectModal(req)}
                          className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-black py-2.5 rounded-xl text-xs tracking-wide cursor-pointer transition-all active:scale-95 shadow-xs bg-white text-center"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* Custom Rejection Confirmation Modal */}
      {confirmRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl border border-red-200 rounded-2xl p-6 max-w-md w-full text-left shadow-2xl animate-in fade-in zoom-in duration-150 relative">
            <button
              onClick={() => setConfirmRejectModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <span className="w-12 h-12 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center text-xl shadow-inner shrink-0">
                🚫
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">Confirm Registration Rejection</h3>
                <p className="text-xs text-gray-500 font-medium">Decline pending mentor application</p>
              </div>
            </div>

            <div className="bg-red-50/60 border border-red-100 rounded-xl p-4 mb-6 space-y-1.5">
              <p className="text-xs text-gray-700 font-medium">
                Are you sure you want to reject registration for <strong className="text-red-900 font-black">{confirmRejectModal.name}</strong>?
              </p>
              <div className="text-xs text-red-700 font-mono font-semibold">{confirmRejectModal.email}</div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                This request will be rejected and removed from the approval queue.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => executeRejectAdmin(confirmRejectModal._id, confirmRejectModal.email)}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md active:scale-95 tracking-wide"
              >
                Yes, Reject Registration
              </button>
              <button
                onClick={() => setConfirmRejectModal(null)}
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

export default SuperAdminApprovals;