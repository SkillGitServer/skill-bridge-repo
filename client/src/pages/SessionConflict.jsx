import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';

function SessionConflict() {
  useDocumentTitle('Session Conflict | Skill Bridge India');
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingLoginData');
    if (!raw) {
      // Nothing pending — redirect to login
      navigate('/login', { replace: true });
      return;
    }
    try {
      setPendingData(JSON.parse(raw));
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleForceLogin = async () => {
    if (!pendingData) return;
    setIsLoading(true);
    const loadingToast = toast.loading('Logging out of other device...');
    try {
      const res = await axios.post('/api/auth/force-login', {
        email: pendingData.email,
        password: pendingData.password,
        requestedRole: pendingData.role,
        isGoogleLogin: pendingData.isGoogleLogin
      });

      const role = res.data.user.role;

      if (role === 'superadmin' || role === 'super_admin') {
        sessionStorage.setItem('supss_token', res.data.token);
        sessionStorage.setItem('supss_role', 'superadmin');
        sessionStorage.setItem('supss_email', res.data.user.email);
        sessionStorage.setItem('supss_name', res.data.user.name || '');
        sessionStorage.setItem('auth_token', res.data.token);
        sessionStorage.setItem('auth_role', 'superadmin');
      } else if (role === 'admin') {
        localStorage.setItem('vault_token', res.data.token);
        localStorage.setItem('vault_role', 'admin');
        localStorage.setItem('vault_email', res.data.user.email);
        localStorage.setItem('vault_name', res.data.user.name || '');
        sessionStorage.setItem('vault_token', res.data.token);
        sessionStorage.setItem('vault_role', 'admin');

        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_role', 'admin');
        localStorage.setItem('admin_email', res.data.user.email);
        localStorage.setItem('admin_name', res.data.user.name || '');
        localStorage.setItem('admin_status', 'active');
      } else {
        localStorage.setItem('spark_token', res.data.token);
        localStorage.setItem('spark_role', 'student');
        localStorage.setItem('spark_email', res.data.user.email);
        localStorage.setItem('spark_name', res.data.user.name || '');

        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_role', 'student');
        localStorage.setItem('student_email', res.data.user.email);
        
        // Handle profile photo & resume info to prevent leaks from previous users
        if (res.data.user.profilePhoto) {
          localStorage.setItem('student_profile_photo', res.data.user.profilePhoto);
        } else {
          localStorage.removeItem('student_profile_photo');
        }

        if (res.data.user.docResume) {
          const fileName = res.data.user.docResume.split('/').pop() || 'Resume.pdf';
          localStorage.setItem('student_resume_filename', fileName);
          localStorage.setItem('student_resume_timestamp', 'Uploaded from Cloud');
        } else {
          localStorage.removeItem('student_resume_filename');
          localStorage.removeItem('student_resume_timestamp');
        }
      }

      sessionStorage.removeItem('pendingLoginData');
      toast.dismiss(loadingToast);
      if (role === 'student') navigate('/student/dashboard', { replace: true });
      else if (role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (role === 'superadmin' || role === 'super_admin') navigate('/super-admin/dashboard', { replace: true });
      else navigate('/login', { replace: true });

    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to force login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('pendingLoginData');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 font-sans select-none px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-red-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)] text-center">
          
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
            <span className="text-4xl">⚠️</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            Already Logged In
          </h1>
          <p className="text-sm text-white/50 font-medium mb-8 leading-relaxed">
            Your account <span className="text-white/80 font-bold">{pendingData?.email || 'your account'}</span> is currently active on another device or browser session. Only one session is allowed at a time.
          </p>

          {/* Divider */}
          <div className="h-px bg-white/10 mb-8" />

          {/* Info box */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 text-left">
            <p className="text-xs font-bold text-amber-300/90 uppercase tracking-wider mb-1">What will happen</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Clicking "Continue on this device" will immediately invalidate the session on the other device. Anyone using that session will be logged out.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleForceLogin}
              disabled={isLoading || !pendingData}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-extrabold rounded-2xl text-sm tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Switching devices...
                </span>
              ) : (
                '🔐 Log out other device & continue here'
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-bold rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel — Go back to Login
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/25 mt-6 font-medium">
          Skill Bridge India · Secure Session Management
        </p>
      </div>
    </div>
  );
}

export default SessionConflict;
