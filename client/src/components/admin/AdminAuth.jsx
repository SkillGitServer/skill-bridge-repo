import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { indiaLocations } from '../../data/locations';
import admIcon from '../../assets/adm-icon.png';
import OtpInput from '../shared/OtpInput';
import PhoneInput from '../shared/PhoneInput';
import { getAuthToken, decodeToken } from '../../utils/auth';

const validatePassword = (password, firstName, lastName, mobile) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_]/;
  if (!specialCharRegex.test(password)) {
    return 'Password must contain at least one special character.';
  }
  const lowerPassword = password.toLowerCase();
  
  // Reject sequential numbers/characters (e.g. "1234", "abcd")
  for (let i = 0; i < password.length - 3; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    const char4 = password.charCodeAt(i + 3);

    // Ascending sequence
    if (char2 === char1 + 1 && char3 === char2 + 1 && char4 === char3 + 1) {
      return "Password cannot contain sequential letters or numbers.";
    }
    // Descending sequence
    if (char2 === char1 - 1 && char3 === char2 - 1 && char4 === char3 - 1) {
      return "Password cannot contain sequential letters or numbers.";
    }
  }

  // Reject repeating patterns of same character
  if (/^(.)\1+$/.test(password)) {
    return "Password cannot consist of repeating characters.";
  }

  // Common simple passwords
  const commonPasswords = ["123456", "12345678", "password", "qwerty", "admin123", "welcome123"];
  if (commonPasswords.some(common => lowerPassword.includes(common))) {
    return "Password is too simple or common.";
  }

  // Cannot contain user's own name
  if (firstName && lowerPassword.includes(firstName.toLowerCase())) {
    return "Password cannot contain your first name.";
  }
  if (lastName && lowerPassword.includes(lastName.toLowerCase())) {
    return "Password cannot contain your last name.";
  }

  // Cannot contain user's own mobile number
  if (mobile) {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length >= 6 && lowerPassword.includes(cleanMobile)) {
      return "Password cannot contain your mobile number.";
    }
  }
  return null;
};

function AdminAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getAuthToken('vault');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const [isLoginMode, setIsLoginMode] = useState(true);
  useDocumentTitle(isLoginMode ? 'Admin Login | Skill Bridge India' : 'Admin Register | Skill Bridge India');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [mobile, setMobile]       = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword]   = useState('');
  const [city, setCity]           = useState('');
  const [step, setStep]           = useState(1);
  const [otp, setOtp]             = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [lockedPassword, setLockedPassword] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode]       = useState(false);
  const [forgotStep, setForgotStep]       = useState(1); // 1=email, 2=otp, 3=new password
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
  const [isOtpLoading, setIsOtpLoading] = useState(false);

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
      toast.error('Registered email is missing.');
      return;
    }
    const loadingToast = toast.loading('Resending reset code...');
    try {
      await axios.post('/api/auth/forgot-password', {
        email: emailToUse,
        role: 'admin'
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
      toast.error('Work Email is missing.');
      return;
    }
    const loadingToast = toast.loading('Resending verification code...');
    try {
      if (!isLoginMode) {
        await axios.post('/api/auth/register', {
          email: emailToUse,
          role: 'admin',
          password,
          name: `${firstName.trim()} ${lastName.trim()}`,
          mobile,
          state: stateName,
          city
        });
      } else {
        await axios.post('/api/auth/login', {
          email: emailToUse,
          password,
          requestedRole: 'admin'
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
  
  const [stateName, setStateName] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const stateDropdownRef = useRef(null);

  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDropdownRef = useRef(null);

  const indianStates = Object.keys(indiaLocations);
  const filteredStates = indianStates
    .filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));

  const stateCities = stateName && indiaLocations[stateName] ? indiaLocations[stateName] : [];
  const filteredCities = stateCities
    .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    .slice(0, 50);

  // Handle outside click for custom dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target)) {
        setShowStateDropdown(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redirect to waiting page if a pending registration already exists on this device
  useEffect(() => {
    if (localStorage.getItem('admin_status') === 'pending') {
      navigate('/admin/waiting');
    }
  }, [navigate]);

  // Reset fields when mode changes
  useEffect(() => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setMobile('');
    setPassword('');
    setCity('');
    setCitySearch('');
    setShowCityDropdown(false);
    setCity('');
    setCitySearch('');
    setShowCityDropdown(false);
    setStateName('');
    setStateSearch('');
    setShowStateDropdown(false);
    setStep(1);
    setOtp('');
    setForgotMode(false);
    setForgotStep(1);
    setShowPassword(false);
    setLockedPassword(false);
    setShowNewPassword(false);
    setLockedNewPassword(false);
    setShowConfirmPassword(false);
    setLockedConfirmPassword(false);
  }, [isLoginMode]);

  // ── Forgot Password Handlers ──
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (isOtpLoading) return;
    if (!forgotEmail.trim()) {
      toast.error('Please enter your registered email.');
      return;
    }
    setIsOtpLoading(true);
    const toastId = 'admin-forgot-otp-toast';
    toast.loading('Sending reset OTP...', { id: toastId });
    try {
      await axios.post('/api/auth/forgot-password', {
        email: forgotEmail,
        role: 'admin'
      });
      toast.success('Reset OTP sent to your email!', { id: toastId });
      setForgotStep(2);
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset OTP.', { id: toastId });
    } finally {
      setIsOtpLoading(false);
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
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
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
        role: 'admin',
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

    if (!isLoginMode) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Please enter your first and last name.');
        return;
      }
      if (!mobile.trim()) {
        toast.error('Mobile number is required.');
        return;
      }
      const cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length < 10) {
        toast.error('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!stateName.trim()) {
        toast.error('Please select your state.');
        return;
      }
      if (!city.trim()) {
        toast.error('Please select your city.');
        return;
      }
    }

    if (!email.trim()) {
      toast.error('Work Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid Work Email address.');
      return;
    }
    if (!password) {
      toast.error('Password is required.');
      return;
    }
    if (!isLoginMode) {
      const passError = validatePassword(password, firstName, lastName, mobile);
      if (passError) {
        toast.error(passError);
        return;
      }
    }

    const loadingToast = toast.loading(isLoginMode ? 'Authenticating...' : 'Submitting registration...');

    try {
      if (isLoginMode) {
        const res = await axios.post('/api/auth/login', {
          email,
          password,
          requestedRole: 'admin'
        });

        // Direct login — store JWT in localStorage & sessionStorage with vault_token prefix
        localStorage.setItem('vault_token', res.data.token);
        localStorage.setItem('vault_role', 'admin');
        localStorage.setItem('vault_email', res.data.user.email);
        localStorage.setItem('vault_name', res.data.user.name || '');
        sessionStorage.setItem('vault_token', res.data.token);
        sessionStorage.setItem('vault_role', 'admin');

        sessionStorage.setItem('auth_token', res.data.token);
        sessionStorage.setItem('auth_role', 'admin');
        sessionStorage.setItem('auth_email', res.data.user.email);
        sessionStorage.setItem('auth_name', res.data.user.name || '');
        sessionStorage.setItem('admin_email', res.data.user.email);
        sessionStorage.setItem('admin_name', res.data.user.name || '');

        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('auth_role', 'admin');
        localStorage.setItem('admin_status', 'active');
        localStorage.setItem('admin_mobile', res.data.user.mobile || '');
        localStorage.setItem('admin_referral_code', res.data.user.referralCode || '');
        const instName = `${res.data.user.city || ''} ${res.data.user.state || ''} Branch`.trim().replace(/^Branch$/, '');
        localStorage.setItem('admin_institute', instName || 'Chhatrapati Sambhajinagar Branch');

        toast.dismiss(loadingToast);
        toast.success('Logged in successfully!');
        setTimeout(() => navigate('/admin/dashboard'), 600);
      } else {
        await axios.post('/api/auth/register', {
          email,
          role: 'admin',
          password,
          name: `${firstName.trim()} ${lastName.trim()}`,
          mobile,
          state: stateName,
          city
        });

        localStorage.setItem('admin_status', 'pending');
        localStorage.setItem('pending_admin_email', email);
        localStorage.setItem('pending_admin_name', `${firstName.trim()} ${lastName.trim()}`);

        toast.dismiss(loadingToast);
        toast.success('Registration submitted! Awaiting Super Admin approval.');
        setTimeout(() => navigate('/admin/waiting'), 1000);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      
      const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
      const lowerErr = (serverError || '').toLowerCase();

      // Gracefully handle account pending/revoked approval without logging error traces
      const isPendingOrAuthStatus = 
        err.response?.data?.pending ||
        err.response?.status === 403 ||
        lowerErr.includes('pending') ||
        lowerErr.includes('approval') ||
        lowerErr.includes('authorization') ||
        lowerErr.includes('revoked');

      if (isPendingOrAuthStatus) {
        if (lowerErr.includes('revoked')) {
          toast.error(serverError || 'Your admin access has been revoked. Please contact Super Admin.');
          return;
        }

        localStorage.setItem('admin_status', 'pending');
        localStorage.setItem('pending_admin_email', email);
        localStorage.setItem('pending_admin_name', `${firstName.trim()} ${lastName.trim()}`.trim() || email);
        toast.error(serverError || 'Your account registration is pending Super Admin approval.');
        setTimeout(() => navigate('/admin/waiting'), 600);
        return;
      }

      console.error('[ADMIN AUTH ERROR]', err);

      // Handle session conflict from direct login
      if (isLoginMode && err.response?.status === 409 && err.response?.data?.sessionConflict) {
        sessionStorage.setItem('pendingLoginData', JSON.stringify({
          email,
          password,
          role: 'admin'
        }));
        navigate('/session-conflict');
        return;
      }

      toast.error(serverError || 'Registration failed. Please check your inputs.');
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
        requestedRole: 'admin'
      });

      // Store JWT in sessionStorage (cleared on tab/app close)
      localStorage.setItem('vault_token', res.data.token);
      localStorage.setItem('vault_role', 'admin');
      localStorage.setItem('vault_email', res.data.user.email);
      localStorage.setItem('vault_name', res.data.user.name || '');
      sessionStorage.setItem('vault_token', res.data.token);
      sessionStorage.setItem('vault_role', 'admin');

      sessionStorage.setItem('auth_token', res.data.token);
      sessionStorage.setItem('auth_role', 'admin');
      sessionStorage.setItem('auth_email', res.data.user.email);
      sessionStorage.setItem('auth_name', res.data.user.name || '');
      sessionStorage.setItem('admin_email', res.data.user.email);
      sessionStorage.setItem('admin_name', res.data.user.name || '');

      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_role', 'admin');
      localStorage.setItem('admin_status', 'active');
      localStorage.setItem('admin_mobile', res.data.user.mobile || '');
      localStorage.setItem('admin_referral_code', res.data.user.referralCode || '');
      const instNameOtp = `${res.data.user.city || ''} ${res.data.user.state || ''} Branch`.trim().replace(/^Branch$/, '');
      localStorage.setItem('admin_institute', instNameOtp || 'Chhatrapati Sambhajinagar Branch');

      toast.dismiss(loadingToast);
      toast.success('Logged in successfully!');
      setTimeout(() => navigate('/admin/dashboard'), 600);
    } catch (err) {
      toast.dismiss(loadingToast);
      // Handle session conflict — redirect to conflict resolution page
      if (err.response?.status === 409 && err.response?.data?.sessionConflict) {
        sessionStorage.setItem('pendingLoginData', JSON.stringify({
          email,
          password: password, // store original password for force-login verification
          role: 'admin'
        }));
        navigate('/session-conflict');
        return;
      }
      toast.error(err.response?.data?.error || 'Verification failed.');
    }
  };

  return (
    <div className="bg-transparent min-h-screen min-h-[100dvh] flex flex-col items-center justify-center w-full relative overflow-hidden font-sans text-gray-900 select-none sm:p-4">

      {/* ── Decorative Blobs ── */}
      {/* Top Left (Teal) */}
      <div className="absolute -top-10 -left-10 w-24 h-24 md:w-52 md:h-52 bg-teal-500 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] z-0 animate-float-slow opacity-90" />
      {/* Top Right (Yellow) */}
      <div className="absolute -top-14 -right-10 w-20 h-20 md:w-44 md:h-44 bg-yellow-400 rounded-[40%_60%_30%_70%/60%_40%_70%_30%] -rotate-12 z-0 animate-float-fast opacity-85" />
      {/* Bottom Left (Blue) */}
      <div className="absolute -bottom-16 -left-8 w-28 h-28 md:w-64 md:h-64 bg-blue-500 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] z-0 animate-float-fast opacity-80" />
      {/* Bottom Right (Purple) */}
      <div className="absolute -bottom-12 -right-16 w-32 h-32 md:w-72 md:h-72 bg-indigo-500 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] rotate-12 z-0 animate-float-slow opacity-80" />

      {/* ── Form Card ── */}
      <div className="relative z-10 w-full min-h-screen min-h-[100dvh] sm:min-h-0 sm:max-w-md bg-white/95 sm:bg-white/80 backdrop-blur-xl border-0 sm:border sm:border-white/50 shadow-none sm:shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-none sm:rounded-2xl p-6 sm:p-8 flex flex-col justify-center my-auto">

        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-4">
          <h1 className="text-3xl md:text-4xl font-black text-center tracking-tighter text-gray-900">
            Skill Bridge India
          </h1>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-extrabold text-center mb-8 text-gray-900">
          {forgotMode
            ? (forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Verify OTP' : 'Set New Password')
            : step === 2 ? 'Verify Your Session' : isLoginMode ? 'Admin Login' : 'Admin Portal Registration'}
        </h2>

        {forgotMode ? (
          /* ── Forgot Password Flow ── */
          <div className="space-y-5">
            {forgotStep === 1 && (
              <form onSubmit={handleForgotSendOtp} noValidate className="space-y-5">
                <p className="text-sm text-gray-500 text-center">Enter your registered admin email to receive a reset code.</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Registered Email</label>
                  <input
                    type="email"
                    placeholder="admin@institute.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                  />
                </div>
                <button type="submit" className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors">
                  Send Reset OTP
                </button>
              </form>
            )}
            {forgotStep === 2 && (
              <form onSubmit={handleForgotVerifyOtp} noValidate className="space-y-5">
                <p className="text-sm text-gray-500 text-center">Enter the 6-digit code sent to <strong>{forgotEmail}</strong>.</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="0 0 0 0 0 0"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-center tracking-[0.5em] font-bold text-lg"
                  />
                </div>
                <button type="submit" className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors">
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
                <p className="text-sm text-gray-500 text-center">Choose a strong new password for your account.</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
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
                  <label className="text-sm font-bold text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
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
                <button type="submit" className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors">
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
              className="w-full text-center text-sm font-bold text-gray-500 hover:text-black transition-colors mt-2"
            >
              ← Back to Login
            </button>
          </div>
        ) : step === 1 ? (
          <>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Name fields — Register only */}
              {!isLoginMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">First name</label>
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Last name</label>
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Number — Register only */}
              {!isLoginMode && (
                <div className="space-y-1.5 text-left">
                  <PhoneInput
                    label="Mobile Number"
                    value={mobile}
                    onChange={(val) => setMobile(val)}
                    countryCode={countryCode}
                    onCountryCodeChange={(code) => setCountryCode(code)}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              )}

              {/* State & City — Register only */}
              {!isLoginMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative" ref={stateDropdownRef}>
                    <label className="text-sm font-bold text-gray-700">State</label>
                    <div 
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-sm cursor-text flex justify-between items-center transition-colors focus-within:border-black focus-within:ring-1 focus-within:ring-black"
                      onClick={() => setShowStateDropdown(true)}
                    >
                      {showStateDropdown ? (
                        <input
                          type="text"
                          className="w-full focus:outline-none bg-transparent"
                          placeholder="Search state..."
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className={stateName ? 'text-gray-900' : 'text-gray-400'}>
                          {stateName || 'Select State'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">▼</span>
                    </div>

                    {showStateDropdown && (
                      <div className="absolute top-[105%] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 py-1">
                        {filteredStates.length > 0 ? (
                          filteredStates.map((s, i) => (
                            <div
                              key={i}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                              onClick={() => {
                                setStateName(s);
                                setStateSearch('');
                                setShowStateDropdown(false);
                                setCity('');
                              }}
                            >
                              {s}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center font-bold">
                            No states found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 relative" ref={cityDropdownRef}>
                    <label className="text-sm font-bold text-gray-700">City</label>
                    <div 
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-sm flex justify-between items-center transition-colors ${!stateName ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-text focus-within:border-black focus-within:ring-1 focus-within:ring-black'}`}
                      onClick={() => stateName && setShowCityDropdown(true)}
                    >
                      {showCityDropdown && stateName ? (
                        <input
                          type="text"
                          className="w-full focus:outline-none bg-transparent"
                          placeholder="Search city..."
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className={city ? 'text-gray-900' : 'text-gray-400'}>
                          {city || 'Select City'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">▼</span>
                    </div>

                    {showCityDropdown && stateName && (
                      <div className="absolute top-[105%] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 py-1">
                        {filteredCities.length > 0 ? (
                          filteredCities.map((c, i) => (
                            <div
                              key={i}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer font-medium transition-colors"
                              onClick={() => {
                                setCity(c);
                                setCitySearch('');
                                setShowCityDropdown(false);
                              }}
                            >
                              {c}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center font-bold">
                            No cities found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Work Email</label>
                <input
                  type="email"
                  placeholder="admin@institute.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isLoginMode ? 'Your password' : 'Min. 8 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
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

              {/* Forgot Password Link — Login only */}
              {isLoginMode && (
                <div className="text-right -mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotStep(1);
                      setForgotEmail(email);
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors mt-2"
              >
                {isLoginMode ? 'Login' : 'Request Access'}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-gray-500 mt-6 text-sm">
              {isLoginMode ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                className="font-bold text-gray-900 hover:underline"
              >
                {isLoginMode ? 'Register' : 'Login'}
              </button>
            </p>
          </>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter the 6-digit verification code sent to your admin email.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">6-Digit OTP Verification Code</label>
              <OtpInput value={otp} onChange={setOtp} autoFocus={true} />
            </div>

            <button
              type="submit"
              className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors mt-2"
            >
              Verify & Login
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
              className="w-full text-center text-sm font-bold text-gray-500 hover:text-black transition-colors mt-4"
            >
              Go back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminAuth;
