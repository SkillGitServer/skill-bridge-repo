import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import supIcon from '../../assets/sup-icon.png';
import OtpInput from '../shared/OtpInput';
import { getAuthToken, decodeToken } from '../../utils/auth';

// Password complexity: min 12 chars, 1 uppercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

function SuperAdminAuth() {
  useDocumentTitle('Secure Control | Skill Bridge India');

  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken('supss');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && (decoded.role === 'superadmin' || decoded.role === 'super_admin')) {
        navigate('/super-admin/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [step, setStep]               = useState(1);
  const [otp, setOtp]                 = useState('');

  // Shared fields
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [lockedPassword, setLockedPassword] = useState(false);

  // Register-only
  const [passkey,        setPasskey]        = useState('');
  const [showPasskey,    setShowPasskey]    = useState(false);
  const [lockedPasskey,  setLockedPasskey]  = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotStep, setForgotStep]       = useState(1);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotOtp, setForgotOtp]         = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [lockedNewPassword, setLockedNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lockedConfirmPassword, setLockedConfirmPassword] = useState(false);

  // OTP 30s Countdown timer states
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend]     = useState(false);

  // Timer effect for OTP Resend
  useEffect(() => {
    let interval = null;
    if ((step === 2 || (forgotMode && forgotStep === 2)) && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if ((step === 2 || (forgotMode && forgotStep === 2)) && resendTimer === 0) {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, forgotMode, forgotStep, resendTimer]);

  // Reset timer whenever step changes to 2 or forgotStep changes to 2
  useEffect(() => {
    if (step === 2 || (forgotMode && forgotStep === 2)) {
      setResendTimer(30);
      setCanResend(false);
    }
  }, [step, forgotMode, forgotStep]);

  const handleForgotResendOtp = async () => {
    if (!canResend) return;
    const emailToUse = forgotEmail.trim();
    if (!emailToUse) {
      toast.error('Master email is missing.');
      return;
    }
    const loadingToast = toast.loading('Resending reset code...');
    try {
      await axios.post('/api/auth/forgot-password', {
        email: emailToUse,
        role: 'superadmin'
      });
      toast.dismiss(loadingToast);
      toast.success('New reset OTP sent to your email!');
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    const emailToUse = email.trim();
    if (!emailToUse) {
      toast.error('Master Email is missing.');
      return;
    }
    const loadingToast = toast.loading('Resending verification code...');
    try {
      if (!isLoginMode) {
        const SYSTEM_PASSKEY = import.meta.env.VITE_SUPER_ADMIN_PASSKEY || 'SH-ROOT-2026-SECURE';
        await axios.post('/api/auth/register', {
          email: emailToUse,
          role: 'superadmin',
          password,
          name: 'Super Admin',
          passkey: passkey.trim() || SYSTEM_PASSKEY
        });
      }
      toast.dismiss(loadingToast);
      toast.success('New verification OTP sent to your email!');
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
  };

  // ── Forgot Password Handlers ──
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered Master Email.');
      return;
    }
    const loadingToast = toast.loading('Sending reset OTP...');
    try {
      await axios.post('/api/auth/forgot-password', {
        email: forgotEmail,
        role: 'superadmin'
      });
      toast.dismiss(loadingToast);
      toast.success('Reset OTP sent! Check your email or server terminal.');
      setForgotStep(2);
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to send reset OTP.');
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    if (forgotOtp.length !== 6 || isNaN(forgotOtp)) {
      toast.error('Please enter a valid 6-digit OTP.');
      return;
    }
    setForgotStep(3);
  };

  const handleForgotResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 12) {
      toast.error('New password must be at least 12 characters.');
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error('Password must include uppercase, number, and special character.', { duration: 5000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    const loadingToast = toast.loading('Resetting password...');
    try {
      await axios.post('/api/auth/reset-password', {
        email: forgotEmail,
        role: 'superadmin',
        otp: forgotOtp,
        newPassword
      });
      toast.dismiss(loadingToast);
      toast.success('Password reset successfully! You can now login.');
      setForgotMode(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setLockedNewPassword(false);
      setShowConfirmPassword(false);
      setLockedConfirmPassword(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Master Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Enter a valid Master Email address.');
      return;
    }

    if (!password) {
      toast.error('Password is required.');
      return;
    }

    // Enforce strong password on registration
    if (!isLoginMode && !PASSWORD_REGEX.test(password)) {
      toast.error(
        'Password must be 12+ chars with at least one uppercase letter, one number, and one special character.',
        { duration: 5000 }
      );
      return;
    }

    const loadingToast = toast.loading(isLoginMode ? 'Authenticating...' : 'Sending verification code...');

    try {
      if (!isLoginMode) {
        if (!passkey.trim()) {
          toast.dismiss(loadingToast);
          toast.error('System Passkey is required for registration.');
          return;
        }

        const regRes = await axios.post('/api/auth/register', {
          email,
          role: 'superadmin',
          password,
          name: 'Super Admin',
          passkey: passkey.trim()
        });

        toast.dismiss(loadingToast);
        toast.success(regRes.data?.message || 'Super Admin registered successfully! Please log in.');
        setIsLoginMode(true);
        setPassword('');
        setPasskey('');
      } else {
        // Login path — direct password authentication (no OTP)
        const res = await axios.post('/api/auth/login', {
          email,
          password,
          requestedRole: 'superadmin'
        });

        // Store JWT in sessionStorage (cleared on tab/app close)
        sessionStorage.setItem('supss_token', res.data.token);
        sessionStorage.setItem('supss_role', 'superadmin');
        sessionStorage.setItem('supss_email', res.data.user.email);
        sessionStorage.setItem('supss_name', res.data.user.name || '');
        sessionStorage.setItem('superadmin_email', res.data.user.email);
        sessionStorage.setItem('auth_token', res.data.token);
        sessionStorage.setItem('auth_role', 'superadmin');

        toast.dismiss(loadingToast);
        toast.success('Authenticated successfully!');
        setTimeout(() => navigate('/super-admin/dashboard'), 600);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('[SUPER ADMIN AUTH ERROR]', err);
      const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
      toast.error(serverError || 'Authentication failed.');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || isNaN(otp)) {
      toast.error('Please enter a valid 6-digit numerical OTP.');
      return;
    }

    const loadingToast = toast.loading('Verifying code...');
    try {
      const res = await axios.post('/api/auth/verify-otp', {
        email,
        otp,
        requestedRole: 'superadmin'
      });

      // Store JWT in sessionStorage (cleared on tab/app close)
      sessionStorage.setItem('supss_token', res.data.token);
      sessionStorage.setItem('supss_role', 'superadmin');
      sessionStorage.setItem('supss_email', res.data.user.email);
      sessionStorage.setItem('supss_name', res.data.user.name || '');
      sessionStorage.setItem('superadmin_email', res.data.user.email);
      sessionStorage.setItem('auth_token', res.data.token);
      sessionStorage.setItem('auth_role', 'superadmin');

      toast.dismiss(loadingToast);
      toast.success('Authenticated successfully!');
      setTimeout(() => navigate('/super-admin/dashboard'), 600);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 relative overflow-hidden flex flex-col items-center justify-center font-sans text-gray-900 select-none sm:p-4">

      

      {/* ── Form Card ── */}
      <div className="relative z-10 w-full min-h-screen min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white/95 sm:bg-white/80 backdrop-blur-xl border-0 sm:border sm:border-white/50 p-6 sm:p-8 rounded-none sm:rounded-[2rem] shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col justify-center my-auto">

        {/* Lock icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-4">
          <h1 className="text-3xl font-extrabold text-center tracking-tighter text-black">
            Skill Bridge India
          </h1>
        </div>

        <h2 className="text-xl font-bold text-center mb-8 text-gray-800">
          {forgotMode
            ? (forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Verify OTP' : 'Set New Password')
            : step === 2 ? 'Verify Master Session' : isLoginMode ? 'Super Admin Login' : 'Create Super Admin Account'}
        </h2>

        {forgotMode ? (
          /* ── Forgot Password Flow ── */
          <div className="space-y-5">
            {forgotStep === 1 && (
              <form onSubmit={handleForgotSendOtp} noValidate className="space-y-5">
                <p className="text-xs text-gray-400 text-center">Enter your registered Master Email to receive a password reset code.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-600">Master Email</label>
                  <input
                    type="email"
                    placeholder="superadmin@skillhub.in"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-full shadow-lg hover:bg-gray-900 transition-all tracking-wide">
                  Send Reset OTP
                </button>
              </form>
            )}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotVerifyOtp} noValidate className="space-y-5">
                <p className="text-xs text-gray-400 text-center">Enter the 6-digit code sent to <strong className="text-gray-600">{forgotEmail}</strong>.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-600">Secure OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-center tracking-[0.5em] font-bold text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-full shadow-lg hover:bg-gray-900 transition-all tracking-wide">
                  Verify Code
                </button>

                {/* Resend OTP Section with 30s Countdown */}
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {resendTimer > 0 ? (
                      <>Resend code in <strong className="text-gray-900">{resendTimer}s</strong></>
                    ) : (
                      "Didn't receive code?"
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={!canResend}
                    onClick={handleForgotResendOtp}
                    className={`text-xs font-bold transition-all ${
                      canResend
                        ? 'text-black hover:underline cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
            {forgotStep === 3 && (
              <form onSubmit={handleForgotResetPassword} noValidate className="space-y-5">
                <p className="text-xs text-gray-400 text-center">Choose a strong new password. Must be 12+ chars with uppercase, number, and special character.</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-600">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min. 12 chars, uppercase, number, symbol"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                    {/* Eye icon — hover to peek, click to lock */}
                    <button
                      type="button"
                      onMouseEnter={() => setShowNewPassword(true)}
                      onMouseLeave={() => { if (!lockedNewPassword) setShowNewPassword(false); }}
                      onClick={() => {
                        const next = !lockedNewPassword;
                        setLockedNewPassword(next);
                        setShowNewPassword(next);
                      }}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors rounded-lg ${
                        lockedNewPassword ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      tabIndex={-1}
                      title={lockedNewPassword ? 'Click to hide' : 'Hover to peek · Click to lock'}
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-600">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                    {/* Eye icon — hover to peek, click to lock */}
                    <button
                      type="button"
                      onMouseEnter={() => setShowConfirmPassword(true)}
                      onMouseLeave={() => { if (!lockedConfirmPassword) setShowConfirmPassword(false); }}
                      onClick={() => {
                        const next = !lockedConfirmPassword;
                        setLockedConfirmPassword(next);
                        setShowConfirmPassword(next);
                      }}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors rounded-lg ${
                        lockedConfirmPassword ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      tabIndex={-1}
                      title={lockedConfirmPassword ? 'Click to hide' : 'Hover to peek · Click to lock'}
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-full shadow-lg hover:bg-gray-900 transition-all tracking-wide">
                  Reset Password
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setForgotStep(1);
                setShowNewPassword(false);
                setLockedNewPassword(false);
                setShowConfirmPassword(false);
                setLockedConfirmPassword(false);
              }}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors mt-2"
            >
              ← Back to Login
            </button>
          </div>
        ) : step === 1 ? (
          <>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Master Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-600">
                  Master Email
                </label>
                <input
                  type="email"
                  placeholder="superadmin@skillhub.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-600">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 12 chars, uppercase, number, symbol"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                  {/* Eye icon — hover to peek, click to lock */}
                  <button
                    type="button"
                    onMouseEnter={() => setShowPassword(true)}
                    onMouseLeave={() => { if (!lockedPassword) setShowPassword(false); }}
                    onClick={() => {
                      const next = !lockedPassword;
                      setLockedPassword(next);
                      setShowPassword(next);
                    }}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors rounded-lg ${
                      lockedPassword ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-700'
                    }`}
                    tabIndex={-1}
                    title={lockedPassword ? 'Click to hide' : 'Hover to peek · Click to lock'}
                  >
                    {showPassword ? (
                      // Eye-off (hiding)
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      // Eye (peek)
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {!isLoginMode && (
                  <p className="text-[11px] text-gray-400 pl-1">
                    Must be 12+ characters with uppercase, number, and special character.
                  </p>
                )}
              </div>

              {/* System Passkey — Register only */}
              {!isLoginMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-600">
                    System Passkey
                  </label>
                  <div className="relative">
                    <input
                      type={showPasskey ? 'text' : 'password'}
                      placeholder="Issued by root system administrator"
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                    />
                    {/* Eye icon — hover to peek, click to lock */}
                    <button
                      type="button"
                      onMouseEnter={() => setShowPasskey(true)}
                      onMouseLeave={() => { if (!lockedPasskey) setShowPasskey(false); }}
                      onClick={() => {
                        const next = !lockedPasskey;
                        setLockedPasskey(next);
                        setShowPasskey(next);
                      }}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 transition-colors rounded-lg ${
                        lockedPasskey ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-700'
                      }`}
                      tabIndex={-1}
                      title={lockedPasskey ? 'Click to hide' : 'Hover to peek · Click to lock'}
                    >
                      {showPasskey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 pl-1">
                    This passkey is issued only by the root system. Contact the platform owner.
                  </p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-gray-100 my-2" />

              {/* Forgot Password Link — Login only */}
              {isLoginMode && (
                <div className="text-right -mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotStep(1);
                      setForgotEmail(email);
                    }}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-700 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-4 rounded-full shadow-lg hover:bg-gray-900 transition-all tracking-wide"
              >
                {isLoginMode ? 'Authenticate' : 'Create Super Admin Account'}
              </button>
            </form>

            {/* Mode toggle */}
            <p className="text-center text-gray-400 mt-6 text-xs">
              {isLoginMode ? 'Need to create an account? ' : 'Already have access? '}
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setEmail('');
                  setPassword('');
                  setPasskey('');
                  setStep(1);
                  setOtp('');
                }}
                className="font-bold text-gray-700 hover:underline"
              >
                {isLoginMode ? 'Register' : 'Login'}
              </button>
            </p>
          </>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
            <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
              Enter the 6-digit secure verification code sent to your Master Email.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-gray-600">
                Secure 6-Digit OTP Verification Code
              </label>
              <OtpInput value={otp} onChange={setOtp} autoFocus={true} />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-bold py-4 rounded-full shadow-lg hover:bg-gray-900 transition-all tracking-wide mt-2"
            >
              Verify & Authenticate
            </button>

            {/* Resend OTP Section with 30s Countdown */}
            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-xs text-gray-500 font-medium">
                {resendTimer > 0 ? (
                  <>Resend code in <strong className="text-gray-900">{resendTimer}s</strong></>
                ) : (
                  "Didn't receive code?"
                )}
              </span>
              <button
                type="button"
                disabled={!canResend}
                onClick={handleResendOtp}
                className={`text-xs font-bold transition-all ${
                  canResend
                    ? 'text-black hover:underline cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                Resend OTP
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
              }}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors mt-4"
            >
              Go back
            </button>
          </form>
        )}

        {/* Security notice */}
        <p className="text-center text-[10px] text-gray-300 mt-8 leading-relaxed">
          This portal is for authorized personnel only.<br />
          Unauthorized access attempts are logged and reported.
        </p>
      </div>
    </div>
  );
}

export default SuperAdminAuth;
