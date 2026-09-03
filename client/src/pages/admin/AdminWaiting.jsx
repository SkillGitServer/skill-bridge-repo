import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw, ArrowLeft } from 'lucide-react';

function AdminWaiting() {
  useDocumentTitle('Awaiting Approval | Skill Bridge India');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pending_admin_email');
    if (!pendingEmail) {
      // If no pending registration exists on this device, redirect back to login
      navigate('/admin/auth?access=admin_launch_2026');
      return;
    }
    setEmail(pendingEmail);
  }, [navigate]);

  const checkStatus = async (manual = false) => {
    if (!email) return;
    if (manual) setIsChecking(true);

    try {
      const res = await axios.get(`/api/auth/admin-status/${encodeURIComponent(email)}`);
      if (res.data.status === 'active') {
        toast.success('Congratulations! Your admin request has been approved.');
        
        localStorage.removeItem('admin_status');
        localStorage.removeItem('pending_admin_email');
        localStorage.removeItem('pending_admin_name');
        
        navigate('/admin/auth?access=admin_launch_2026');
      } else if (res.data.status === 'revoked') {
        toast.error('Your admin access request has been rejected/revoked.');
        localStorage.removeItem('admin_status');
        localStorage.removeItem('pending_admin_email');
        localStorage.removeItem('pending_admin_name');
        navigate('/admin/auth?access=admin_launch_2026');
      } else if (manual) {
        toast.success('Application is currently under review by Super Admin.');
      }
    } catch (err) {
      if (manual) {
        toast.error('Unable to verify status. Please try again.');
      }
    } finally {
      if (manual) setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!email) return;

    // Auto-poll the status from the server every 5 seconds
    const interval = setInterval(() => {
      checkStatus(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [email, navigate]);

  const handleReturnToLogin = () => {
    navigate('/admin/auth?access=admin_launch_2026');
  };

  return (
    <div className="bg-transparent min-h-screen flex items-center justify-center p-6 text-center overflow-hidden relative font-sans">
      
      {/* ── Content Card (Original Light Theme - Perfectly Centered) ── */}
      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 rounded-3xl my-auto">

        {/* Pulsing clock icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-20 h-20">
            {/* Outer pulse ring */}
            <span className="absolute inset-0 rounded-full bg-yellow-400 opacity-30 animate-ping" />
            <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 border-2 border-yellow-400">
              {/* Clock SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
          Waiting for Approval
        </h2>

        <p className="text-gray-600 mb-4 leading-relaxed text-sm">
          Your request to join Skill Bridge India as an Administrator has been received.
          Our Super Admin team is currently reviewing your application. You cannot access the dashboard until approved.
        </p>

        {email && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl py-1.5 px-3 mb-5 inline-block text-xs font-mono font-semibold text-amber-800">
            {email}
          </div>
        )}

        {/* Status badge */}
        <div className="inline-flex items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Application under review
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => checkStatus(true)}
            disabled={isChecking}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Status Now'}</span>
          </button>

          <button
            onClick={handleReturnToLogin}
            className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all active:scale-95 border border-gray-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminWaiting;
