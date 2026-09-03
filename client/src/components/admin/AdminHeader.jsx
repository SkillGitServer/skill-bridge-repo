import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { logoutUser, getAuthToken } from '../../utils/auth';

export default function AdminHeader({ refreshButton, showReferralCode = true }) {
  const navigate = useNavigate();
  const referralCode = localStorage.getItem('admin_referral_code') || '';
  const profilePhoto = localStorage.getItem('admin_profile_photo') || '';
  const [assignedFee, setAssignedFee] = useState(() => {
    const cached = localStorage.getItem('admin_assigned_fee');
    return cached ? Number(cached) : null;
  });

  useEffect(() => {
    const fetchAdminAssignedFee = async () => {
      try {
        const token = getAuthToken('vault') || localStorage.getItem('auth_token');
        if (!token) return;
        const res = await axios.get('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.assignedFee !== undefined) {
          setAssignedFee(res.data.assignedFee);
          localStorage.setItem('admin_assigned_fee', String(res.data.assignedFee));
        }
      } catch (err) {
        try {
          const cfg = await axios.get('/api/payment/config');
          if (cfg.data?.unlockFee) {
            setAssignedFee(cfg.data.unlockFee);
          }
        } catch (e) {}
      }
    };

    fetchAdminAssignedFee();
  }, []);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied to clipboard!');
  };

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  return (
    <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-3.5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      {/* Left side: Admin Profile Icon + Skill Admin Title */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/profile"
          className="w-9 h-9 rounded-full border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all shadow-xs shrink-0 cursor-pointer hover:scale-105 active:scale-95"
          title="Admin Profile Settings"
        >
          {profilePhoto ? (
            <img src={profilePhoto} className="w-full h-full object-cover" alt="Admin Profile" />
          ) : (
            <span className="text-sm font-bold text-gray-700">👤</span>
          )}
        </Link>
        <span
          onClick={() => navigate('/admin/dashboard')}
          className="text-xl font-black tracking-tight text-gray-900 cursor-pointer hover:opacity-90 transition-opacity select-none"
        >
          Skill Admin
        </span>
      </div>

      {/* Right side: Assigned Fee Badge + Referral Code (desktop) + Refresh + Logout */}
      <div className="flex items-center gap-2 md:gap-3">
        {assignedFee !== null && (
          <div
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300/80 text-emerald-800 font-extrabold px-2.5 md:px-3 py-1.5 rounded-xl text-xs shadow-2xs select-none"
            title="Assigned Candidate Unlock Fee set by Super Admin (SUPSS)"
          >
            <span className="text-sm">🏷️</span>
            <span>Fee: <strong className="font-mono text-emerald-950 font-black">₹{assignedFee}</strong></span>
          </div>
        )}

        {showReferralCode && referralCode && (
          <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-mono text-xs text-gray-700">
            <span>Ref: {referralCode}</span>
            <button onClick={copyReferralCode} title="Copy Referral Code" className="hover:text-emerald-600 transition-colors ml-1 cursor-pointer">
              📋
            </button>
          </div>
        )}

        {refreshButton}

        <button
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          className="w-9 h-9 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-full transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-red-600"
          >
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
