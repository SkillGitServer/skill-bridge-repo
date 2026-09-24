import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import RandomBlobs from '../shared/RandomBlobs';
import toast from 'react-hot-toast';
import axios from 'axios';
import logo from '../../assets/logo.png';
import OtpInput from '../shared/OtpInput';
import { getAuthToken, decodeToken } from '../../utils/auth';

function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAuthToken('spark');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.role === 'student') {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const isLoginMode = location.pathname === '/login';
  useDocumentTitle(isLoginMode ? "Login | Skill Bridge India" : "Register | Skill Bridge India");
  const [step, setStep] = useState(1);
  
  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // OTP 30s Countdown timer states
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Capture referral parameter ONLY from invite links (?ref=SKILL-HUB-XXXX) for the current session
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref') || params.get('adminReferralCode') || params.get('referralCode');
    if (refCode && refCode.trim()) {
      const cleanRef = refCode.trim();
      sessionStorage.setItem('student_pending_referral', cleanRef);
      localStorage.setItem('student_pending_referral', cleanRef);
    } else if (!isLoginMode) {
      // Direct registration attempt without ?ref= parameter in URL: clear any stale leftover referral code!
      sessionStorage.removeItem('student_pending_referral');
      localStorage.removeItem('student_pending_referral');
    }
  }, [location.search, location.pathname]);

  // Timer effect for OTP Resend
  useEffect(() => {
    let interval = null;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (step === 2 && resendTimer === 0) {
      setCanResend(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Reset timer whenever step changes to 2
  useEffect(() => {
    if (step === 2) {
      setResendTimer(30);
      setCanResend(false);
    }
  }, [step]);

  const handleResendOtp = async () => {
    if (!canResend || isOtpLoading) return;
    const email = identifier.trim();
    setIsOtpLoading(true);
    const toastId = 'student-otp-resend-toast';
    toast.loading('Resending verification code...', { id: toastId });
    try {
      if (!isLoginMode) {
        await axios.post('/api/auth/register', {
          email,
          role: 'student',
          name: `${firstName.trim()} ${lastName.trim()}`
        });
      } else {
        await axios.post('/api/auth/login', {
          email,
          requestedRole: 'student'
        });
      }
      toast.success('New verification OTP sent to your email!', { id: toastId });
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend code. Please try again.', { id: toastId });
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Reset page step/error when pathname changes
  useEffect(() => {
    setStep(1);
    setError('');
  }, [location.pathname]);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [showGcpDevConfig, setShowGcpDevConfig] = useState(false);
  const [tempClientId, setTempClientId] = useState('');

  // Auto pre-fill Google input if main form inputs have text
  useEffect(() => {
    if (identifier.trim() && !googleEmailInput) {
      setGoogleEmailInput(identifier.trim());
    }
    if (firstName.trim() || lastName.trim()) {
      setGoogleNameInput(`${firstName.trim()} ${lastName.trim()}`.trim());
    }
  }, [identifier, firstName, lastName]);

  const handleGoogleBackendAuth = async (googleData) => {
    if (!isLoginMode && !termsAccepted) {
      toast.error('You must accept the Terms and Conditions to proceed with registration.');
      return;
    }
    setIsGoogleLoading(true);
    const loadingToast = toast.loading('Authenticating with Google...');
    try {
      const params = new URLSearchParams(location.search);
      const urlRef = params.get('ref') || params.get('adminReferralCode') || params.get('referralCode');
      const pendingRef = (urlRef && urlRef.trim()) ? urlRef.trim() : (sessionStorage.getItem('student_pending_referral') || '');
      
      const res = await axios.post('/api/auth/google', {
        ...googleData,
        mode: isLoginMode ? 'login' : 'register',
        adminReferralCode: pendingRef
      });

      // Clear pending referral after registration
      sessionStorage.removeItem('student_pending_referral');
      localStorage.removeItem('student_pending_referral');

      // Store JWT and auth meta
      localStorage.setItem('spark_token', res.data.token);
      localStorage.setItem('spark_role', 'student');
      localStorage.setItem('spark_email', res.data.user.email);
      localStorage.setItem('spark_name', res.data.user.name || '');

      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_role', 'student');
      localStorage.setItem('auth_email', res.data.user.email);
      localStorage.setItem('auth_name', res.data.user.name || '');
      localStorage.setItem('student_email', res.data.user.email);

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

      toast.dismiss(loadingToast);
      toast.success(res.data.message || 'Logged in with Google successfully!');
      setShowGoogleModal(false);
      navigate('/student/dashboard');
    } catch (err) {
      toast.dismiss(loadingToast);
      if (err.response?.status === 409 && err.response?.data?.sessionConflict) {
        sessionStorage.setItem('pendingLoginData', JSON.stringify({
          email: err.response.data.user.email,
          isGoogleLogin: true,
          role: 'student'
        }));
        setShowGoogleModal(false);
        navigate('/session-conflict');
        return;
      }
      if ((err.response?.status === 404 || err.response?.status === 409) && err.response?.data?.redirect) {
        toast.error(err.response.data.error || 'Account status notice.', { duration: 4000 });
        setShowGoogleModal(false);
        navigate(err.response.data.redirect);
        return;
      }
      toast.error(err.response?.data?.error || 'Google authentication failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLoginClick = () => {
    if (!isLoginMode && !termsAccepted) {
      toast.error('You must accept the Terms and Conditions to proceed with registration.');
      return;
    }
    const configuredClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || tempClientId;

    if (configuredClientId && configuredClientId !== 'YOUR_GOOGLE_CLIENT_ID' && window.google?.accounts) {
      try {
        window.google.accounts.id.initialize({
          client_id: configuredClientId,
          callback: (res) => {
            if (res.credential) {
              handleGoogleBackendAuth({ credential: res.credential });
            }
          }
        });

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: configuredClientId,
          scope: 'email profile openid',
          callback: (tokenRes) => {
            if (tokenRes.access_token) {
              handleGoogleBackendAuth({ access_token: tokenRes.access_token });
            } else if (tokenRes.error) {
              toast.error('Google authentication popup closed.');
            }
          }
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('[GIS LAUNCH FALLBACK]', err);
      }
    }

    // Open Google Account Sign-In selector modal directly!
    setShowGoogleModal(true);
  };
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      toast.error('Google Sign-In failed to return credentials.');
      return;
    }

    try {
      const decoded = jwtDecode(credentialResponse.credential);
      if (!decoded?.email) {
        toast.error('Could not extract email from Google Sign-In.');
        return;
      }

      handleGoogleBackendAuth({
        email: decoded.email,
        name: decoded.name || 'Google User',
        picture: decoded.picture || ''
      });
    } catch (err) {
      console.error('Failed to decode Google Credential JWT:', err);
      toast.error('Invalid Google Sign-In credential token.');
    }
  };

  const handleManualGoogleAuth = (e) => {
    e.preventDefault();
    if (!isLoginMode && !termsAccepted) {
      toast.error('You must accept the Terms and Conditions to proceed with registration.');
      return;
    }
    if (!googleEmailInput.trim()) {
      toast.error('Please enter your Google Email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(googleEmailInput.trim())) {
      toast.error('Please enter a valid Google Email address.');
      return;
    }

    handleGoogleBackendAuth({
      email: googleEmailInput.trim(),
      name: googleNameInput.trim() || 'Google User',
      picture: ''
    });
  };

  const handleGoogleModalSubmit = handleManualGoogleAuth;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (isOtpLoading) return;

    if (!isLoginMode) {
      if (!firstName.trim() || !lastName.trim()) {
        toast.error('Please enter your first and last name.');
        return;
      }
      if (!termsAccepted) {
        toast.error('You must accept the Terms and Conditions to proceed.');
        return;
      }
    }
    if (!identifier.trim()) {
      toast.error('Please enter your Email Address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier.trim())) {
      toast.error('Please enter a valid Email Address.');
      return;
    }
    setError('');

    const email = identifier.trim();
    setIsOtpLoading(true);
    const toastId = 'student-otp-request-toast';
    toast.loading('Sending verification code...', { id: toastId });

    try {
      const params = new URLSearchParams(location.search);
      const urlRef = params.get('ref') || params.get('adminReferralCode') || params.get('referralCode');
      const pendingRef = (urlRef && urlRef.trim()) ? urlRef.trim() : (sessionStorage.getItem('student_pending_referral') || '');
      
      if (!isLoginMode) {
        // Register Student
        await axios.post('/api/auth/register', {
          email,
          role: 'student',
          name: `${firstName.trim()} ${lastName.trim()}`,
          adminReferralCode: pendingRef
        });
      } else {
        // Login Student
        await axios.post('/api/auth/login', {
          email,
          requestedRole: 'student'
        });
      }
      toast.success('Verification OTP sent to your email!', { id: toastId });
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send verification code. Please try again.', { id: toastId });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || isNaN(otp)) {
      toast.error('Please enter a valid 6-digit numerical OTP.');
      return;
    }
    setError('');
    
    const email = identifier.trim();
    const loadingToast = toast.loading('Verifying code...');

    try {
      const res = await axios.post('/api/auth/verify-otp', {
        email,
        otp,
        requestedRole: 'student'
      });

      // Store JWT and auth meta
      localStorage.setItem('spark_token', res.data.token);
      localStorage.setItem('spark_role', 'student');
      localStorage.setItem('spark_email', res.data.user.email);
      localStorage.setItem('spark_name', res.data.user.name || '');

      sessionStorage.removeItem('student_pending_referral');
      localStorage.removeItem('student_pending_referral');

      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_role', 'student');
      localStorage.setItem('auth_email', res.data.user.email);
      localStorage.setItem('auth_name', res.data.user.name || '');
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

      toast.dismiss(loadingToast);
      toast.success('Logged in successfully!');
      navigate('/student/dashboard');
    } catch (err) {
      toast.dismiss(loadingToast);
      // Handle session conflict — redirect to conflict resolution page
      if (err.response?.status === 409 && err.response?.data?.sessionConflict) {
        sessionStorage.setItem('pendingLoginData', JSON.stringify({
          email,
          password: otp, // store otp as password for student force-login override
          role: 'student'
        }));
        navigate('/session-conflict');
        return;
      }
      toast.error(err.response?.data?.error || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-transparent relative overflow-hidden flex flex-col items-center justify-center font-sans text-gray-900 select-none sm:p-4">
      {/* Dynamic random blobs — repositioned on every page load */}
      <RandomBlobs count={6} zIndex="z-0" />

      {/* Form Container — Glassmorphism Card */}
      <div className="relative z-10 w-full min-h-screen min-h-[100dvh] sm:min-h-0 sm:max-w-md px-0 sm:px-6 flex flex-col justify-center my-auto">
        <div
          className="rounded-none sm:rounded-3xl p-6 sm:p-8 min-h-screen min-h-[100dvh] sm:min-h-0 flex flex-col justify-center"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
        
          {/* Logo Brand */}
          <div className="flex flex-col items-center justify-center mb-3">
            <img 
              src={logo} 
              alt="Skill Bridge India Logo" 
              className="h-16 md:h-20 w-auto object-contain mb-2 transition-transform hover:scale-105" 
            />
            <h1 className="text-3xl md:text-4xl font-black text-center tracking-tighter text-black overflow-visible">
              Skill Bridge India
            </h1>
          </div>
          
          {/* Heading */}
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            {step === 2 
              ? "Verify your session" 
              : isLoginMode 
                ? "Login to your account" 
                : "Create your account"
            }
          </h2>


          {step === 1 ? (
            <form onSubmit={handleRequestOtp} noValidate className="space-y-5">
              {/* Registration Fields: First & Last Name */}
              {!isLoginMode && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-sm font-bold text-gray-700">First name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-sm font-bold text-gray-700">Last name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label htmlFor="identifier" className="text-sm font-bold text-gray-700">Email Address</label>
                <input
                  id="identifier"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors text-sm"
                />
              </div>

              {/* Terms Checkbox (Only for registration) */}
              {!isLoginMode && (
                <>
                  {/* Terms Checkbox */}
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      required
                      id="terms"
                      name="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none">
                      I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:underline">Terms and Conditions</a>
                    </label>
                  </div>
                </>
              )}

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={isOtpLoading}
                className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isOtpLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : isLoginMode ? (
                  "Request OTP"
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Google Login Option — Clean & Fast */}
              <div className="pt-2">
                <div className="flex items-center mb-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="px-3 text-gray-400 text-[10px] font-black uppercase tracking-widest bg-white/80 rounded-full py-0.5 border border-gray-100 shadow-2xs">
                    ⚡ Fast & Secure Access
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLoginClick}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center space-x-3 bg-white hover:bg-blue-50/40 border border-gray-200 hover:border-blue-300 text-gray-800 py-3.5 px-4 rounded-2xl transition-all duration-200 font-extrabold text-sm shadow-xs hover:shadow-md cursor-pointer disabled:opacity-50 group active:scale-[0.98]"
                >
                  <div className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center p-0.5 shadow-2xs group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <span className="truncate">
                    {isGoogleLoading
                      ? 'Connecting to Google...'
                      : isLoginMode
                      ? 'Instant Sign-In with Google'
                      : 'Fast Register with Google'}
                  </span>
                </button>
              </div>

              {/* Footer toggle */}
              <p className="text-center text-gray-500 mt-6 text-sm">
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    navigate(isLoginMode ? '/register' : '/login');
                  }}
                  className="font-bold text-gray-900 hover:underline"
                >
                  {isLoginMode ? "Register" : "Login"}
                </button>
              </p>


            </form>
          ) : (
            /* Step 2: OTP Verification */
            <form onSubmit={handleVerifyOtp} noValidate className="space-y-5">
              <p className="text-sm text-gray-500 text-center mb-6">
                Enter the 6-digit verification code sent to your email.
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
                Go back and change email address
              </button>


            </form>
          )}
        </div>
      </div>

      {/* Interactive Google Sign-In Account Selector Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Google Icon Header */}
            <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center shadow-md mb-4 mx-auto">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>

            <h3 className="text-xl font-extrabold text-center text-gray-900 mb-1">Sign in with Google</h3>
            <p className="text-xs text-center text-gray-500 mb-6 font-medium">
              Enter your Google Account email to continue to <span className="font-semibold text-gray-800">Skill Bridge India</span>
            </p>

            <form onSubmit={handleGoogleModalSubmit} className="space-y-4">
              <div>
                <label htmlFor="googleEmailInput" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Google Email Address
                </label>
                <input
                  id="googleEmailInput"
                  name="googleEmail"
                  type="email"
                  required
                  autoComplete="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:outline-none bg-gray-50/50 font-medium"
                />
              </div>

              {!isLoginMode && (
                <>
                  <div>
                    <label htmlFor="googleNameInput" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Your Full Name
                    </label>
                    <input
                      id="googleNameInput"
                      name="googleName"
                      type="text"
                      autoComplete="name"
                      value={googleNameInput}
                      onChange={(e) => setGoogleNameInput(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:outline-none bg-gray-50/50 font-medium"
                    />
                  </div>
                  {/* Terms Checkbox inside modal */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      required
                      id="modal-terms"
                      name="modalTerms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                    />
                    <label htmlFor="modal-terms" className="text-xs text-gray-600 cursor-pointer select-none">
                      I accept the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:underline">Terms and Conditions</a>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isGoogleLoading}
                className="w-full bg-[#111111] hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fill="#FFFFFF" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                </svg>
                <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google Account'}</span>
              </button>
            </form>

            {/* Developer GCP Setup Toggle */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => setShowGcpDevConfig(!showGcpDevConfig)}
                className="text-[11px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showGcpDevConfig ? '▲ Hide GCP Client ID settings' : '⚙️ Developers: Custom Google Cloud Client ID'}
              </button>

              {showGcpDevConfig && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-left text-xs space-y-2 animate-in fade-in duration-150">
                  <p className="font-bold text-gray-800">Custom Google Cloud OAuth Setup:</p>
                  <p className="text-gray-600 text-[11px]">
                    To use Google's native popup on hosted domains, add <code className="bg-gray-200 px-1 py-0.5 rounded font-mono">VITE_GOOGLE_CLIENT_ID</code> to host env vars.
                  </p>
                  <label htmlFor="tempClientId" className="block text-[10px] font-bold text-gray-600 uppercase">
                    Test GCP Client ID:
                  </label>
                  <input
                    id="tempClientId"
                    name="tempClientId"
                    type="text"
                    value={tempClientId}
                    onChange={(e) => setTempClientId(e.target.value)}
                    placeholder="Enter GCP Client ID to test native popup..."
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-black focus:outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (tempClientId.trim()) {
                        handleGoogleLoginClick();
                      } else {
                        toast.error('Please enter a valid Google Client ID.');
                      }
                    }}
                    className="w-full bg-gray-900 text-white py-2 rounded-lg font-bold text-xs hover:bg-black transition-colors"
                  >
                    Test Native Google Popup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
