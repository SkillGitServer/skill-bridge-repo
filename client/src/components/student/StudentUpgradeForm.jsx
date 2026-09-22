import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import PullToRefreshWrapper from '../shared/PullToRefreshWrapper';
import PhoneInput from '../shared/PhoneInput';
import { getAuthToken } from '../../utils/auth';

const API_BASE = import.meta.env.DEV ? '' : '';

// Dynamically loads the Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function StudentUpgradeForm({ onBack, showBack, trialTimeRemaining = 0, hasUploadedResume = false }) {
  const [showExtension, setShowExtension] = useState(false);
  const [extensionReason, setExtensionReason] = useState('');
  const [localTimer, setLocalTimer] = useState(trialTimeRemaining || 0);
  const [mobile, setMobile] = useState(() => localStorage.getItem('student_mobile') || localStorage.getItem('auth_mobile') || '');
  const [countryCode, setCountryCode] = useState('+91');
  const [verificationError, setVerificationError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feeAmount, setFeeAmount] = useState(99);
  const [mentorCity, setMentorCity] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [verificationState, setVerificationState] = useState('idle');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Trial Extension Modal & Pending Status State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState('');
  const [extensionStatus, setExtensionStatus] = useState(() => {
    return localStorage.getItem('student_extension_status') || 'idle';
  });

  const checkExtensionStatus = async () => {
    const studentEmail = (localStorage.getItem('student_email') || localStorage.getItem('auth_email') || '').toLowerCase().trim();
    if (!studentEmail) return;

    try {
      const res = await axios.get('/api/trial/extensions');
      if (Array.isArray(res.data)) {
        const isPending = res.data.some(ext =>
          (ext.email || ext.studentEmail || '').toLowerCase().trim() === studentEmail
        );
        if (isPending) {
          setExtensionStatus('pending');
          localStorage.setItem('student_extension_status', 'pending');
          return;
        }
      }

      const profileRes = await axios.get(`/api/trial/status/${encodeURIComponent(studentEmail)}`);
      if (profileRes.data) {
        if (profileRes.data.isUnlocked || (profileRes.data.trialExpiresAt && new Date(profileRes.data.trialExpiresAt) > new Date())) {
          setExtensionStatus('approved');
          localStorage.setItem('student_extension_status', 'approved');
          return;
        }
      }

      const local = localStorage.getItem('student_extension_status');
      if (local === 'pending') {
        setExtensionStatus('denied');
        localStorage.setItem('student_extension_status', 'denied');
      }
    } catch (e) {
      console.error('Failed to fetch extension status:', e);
    }
  };

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    checkExtensionStatus();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = getAuthToken('spark');
        const res = await axios.get('/api/jobs', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setJobs(res.data);
        } else {
          setJobs([
            {
              _id: 'sample_job_1',
              title: 'Junior Technical Associate / Trainee',
              company: 'Skill Bridge Corporate Network',
              location: 'Hybrid / Remote',
              jobType: 'Full-Time',
              salary: '₹3.5 - 5.0 LPA',
              description: 'Verified entry-level corporate opening for certified students.'
            },
            {
              _id: 'sample_job_2',
              title: 'Operations & Business Analyst Intern',
              company: 'Corporate Partner Network',
              location: 'Pan India / Remote',
              jobType: 'Full-Time',
              salary: '₹18,000 - ₹28,000 / mo',
              description: 'Client coordination and operations trainee role with fast-track offer.'
            },
            {
              _id: 'sample_job_3',
              title: 'Quality & Process Associate',
              company: 'SBI Enterprise Partner',
              location: 'Mumbai / Pune / Remote',
              jobType: 'Full-Time',
              salary: '₹4.0 - 5.5 LPA',
              description: 'Process assurance & reporting specialist for verified candidates.'
            }
          ]);
        }
      } catch (e) {
        console.warn('Failed to load jobs for upgrade form preview:', e);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  const handleApplyClick = (job) => {
    toast.error(`🔒 Upgrade Required: Complete your profile upgrade below to apply for ${job.title} at ${job.company}!`, {
      duration: 4000,
      icon: '💼'
    });
    const payBtn = document.getElementById('pay-securely-button');
    if (payBtn) {
      payBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      payBtn.classList.add('ring-4', 'ring-amber-400');
      setTimeout(() => {
        payBtn.classList.remove('ring-4', 'ring-amber-400');
      }, 2000);
    }
  };

  const handleSubmitExtensionModal = async (e) => {
    if (e) e.preventDefault();
    if (!extensionMessage.trim()) {
      toast.error('Please enter a reason for the extension request.');
      return;
    }

    const loadingToast = toast.loading('Submitting extension request...');
    try {
      const email = localStorage.getItem('student_email') || localStorage.getItem('auth_email') || '';
      const name = localStorage.getItem('student_name') || localStorage.getItem('auth_name') || 'Student';

      await axios.post('/api/trial/extension', {
        email,
        name,
        reason: extensionMessage.trim()
      });

      toast.dismiss(loadingToast);
      toast.success('Trial extension request submitted!');
      setIsExtensionModalOpen(false);
      setExtensionStatus('pending');
      localStorage.setItem('student_extension_status', 'pending');
      setExtensionMessage('');
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Extension request error:', err);
      toast.error('Failed to submit request. Please try again.');
    }
  };

  const [docGrade10, setDocGrade10] = useState(null);
  const [docGrade12, setDocGrade12] = useState(null);
  const [docResume, setDocResume] = useState(null);
  const [percentage10th, setPercentage10th] = useState('');
  const [percentage12th, setPercentage12th] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    const urlRef = new URLSearchParams(window.location.search).get('ref') || new URLSearchParams(window.location.search).get('adminReferralCode');
    const storedRef = sessionStorage.getItem('student_pending_referral') || localStorage.getItem('student_pending_referral');
    return urlRef || storedRef || '';
  });

  useEffect(() => {
    const fetchStudentProfileForRef = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await axios.get(`${API_BASE}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.adminReferralCode) {
          setReferralCode(res.data.adminReferralCode);
        }
      } catch (e) { }
    };
    fetchStudentProfileForRef();
  }, []);



  useEffect(() => {
    const fetchFeeForCode = async () => {
      if (!referralCode.trim()) {
        try {
          const res = await axios.get(`${API_BASE}/api/payment/config`);
          if (res.data) setFeeAmount(res.data.unlockFee || 99);
        } catch (e) { }
        setMentorCity('');
        setMentorName('');
        return;
      }

      const studentEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '';
      try {
        const res = await axios.get(`${API_BASE}/api/payment/fee-by-code/${encodeURIComponent(referralCode.trim())}?email=${encodeURIComponent(studentEmail)}`);
        if (res.data && res.data.fee) {
          setFeeAmount(res.data.fee);
          setMentorCity(res.data.city || '');
          setMentorName(res.data.mentorName || '');
        }
      } catch (err) {
        // Fallback to base config
        try {
          const baseRes = await axios.get(`${API_BASE}/api/payment/config`);
          if (baseRes.data) setFeeAmount(baseRes.data.unlockFee || 99);
        } catch (e) { }
      }
    };

    const timer = setTimeout(() => {
      fetchFeeForCode();
    }, 400);

    return () => clearTimeout(timer);
  }, [referralCode]);

  useEffect(() => {
    setLocalTimer(trialTimeRemaining);
  }, [trialTimeRemaining]);

  useEffect(() => {
    if (localTimer <= 0) return;
    const interval = setInterval(() => {
      setLocalTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [localTimer]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleFileSelect = (e, setFileState, expectedType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Enforce PDF only for marksheets
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Invalid format. Only PDF documents (.pdf) are accepted for marksheets.');
      e.target.value = '';
      return;
    }

    const fileNameLower = file.name.toLowerCase();

    // Prevent cross-mismatching 10th and 12th PDF uploads
    if (expectedType === '10th' && (fileNameLower.includes('12th') || fileNameLower.includes('hsc') || fileNameLower.includes('intermediate') || fileNameLower.includes('twelfth'))) {
      toast.error('The selected file appears to be a 12th marksheet. Please upload your 10th marksheet in the 10th slot.');
      e.target.value = '';
      return;
    }

    if (expectedType === '12th' && (fileNameLower.includes('10th') || fileNameLower.includes('ssc') || fileNameLower.includes('matric') || fileNameLower.includes('tenth'))) {
      toast.error('The selected file appears to be a 10th marksheet. Please upload your 12th marksheet in the 12th slot.');
      e.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit. Please compress your PDF file.');
      e.target.value = '';
      return;
    }

    setFileState(file);
  };

  const [formError, setFormError] = useState('');

  const handlePay = async () => {
    setFormError('');

    // Strict validation rules:
    // If 10th percentage is entered, 10th PDF is required
    if (percentage10th.trim() && !docGrade10) {
      const msg = 'You entered a 10th Percentage. Please upload your corresponding 10th Marksheet (PDF).';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    // If 10th PDF is uploaded, 10th percentage is required
    if (docGrade10 && !percentage10th.trim()) {
      const msg = 'You uploaded a 10th Marksheet. Please enter your 10th Percentage (%).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // If 12th percentage is entered, 12th PDF is required
    if (percentage12th.trim() && !docGrade12) {
      const msg = 'You entered a 12th Percentage. Please upload your corresponding 12th Marksheet (PDF).';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    // If 12th PDF is uploaded, 12th percentage is required
    if (docGrade12 && !percentage12th.trim()) {
      const msg = 'You uploaded a 12th Marksheet. Please enter your 12th Percentage (%).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Require at least one complete qualification pair (10th pair OR 12th pair)
    const has10thPair = docGrade10 && percentage10th.trim();
    const has12thPair = docGrade12 && percentage12th.trim();

    if (!has10thPair && !has12thPair) {
      const msg = 'Please complete at least one qualification section (enter Percentage and upload matching PDF Marksheet for 10th or 12th).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!referralCode.trim()) {
      const msg = 'Please enter a valid Admin/Mentor Referral Code.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (mobile && mobile.trim()) {
      const cleanMob = mobile.replace(/\D/g, '');
      if (cleanMob.length < 10) {
        const msg = 'Please enter a valid 10-digit mobile number.';
        setFormError(msg);
        toast.error(msg);
        return;
      }
    }

    setIsProcessing(true);

    try {
      // 2. Load Razorpay checkout.js script dynamically
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your internet connection and try again.');
        setIsProcessing(false);
        return;
      }

      const token = localStorage.getItem('auth_token');
      const studentEmail = localStorage.getItem('student_email') || localStorage.getItem('auth_email') || '';
      const studentName = localStorage.getItem('auth_name') || localStorage.getItem('student_name') || 'Student';

      if (!studentEmail) {
        toast.error('Session expired. Please log in again.');
        setIsProcessing(false);
        return;
      }

      // 3. Create Razorpay order on our backend
      const orderRes = await axios.post(
        `${API_BASE}/api/payment/create-order`,
        { amount: feeAmount, referralCode: referralCode.trim(), email: studentEmail },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      const { orderId, amount: orderAmount, currency, keyId } = orderRes.data;

      // 4. Open Razorpay checkout modal
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderAmount,        // in paise from backend
        currency: currency || 'INR',
        name: 'Skill Bridge India',
        description: 'Student Profile Upgrade — Unlock Full Access',
        order_id: orderId,
        prefill: {
          name: studentName,
          email: studentEmail,
          contact: mobile || ''
        },
        theme: {
          color: '#f97316'          // Orange matching brand
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI / QR Code',
                instruments: [
                  {
                    method: 'upi',
                    flows: ['qr', 'intent', 'collect']
                  }
                ]
              }
            },
            sequence: ['block.upi'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the modal without completing payment
            toast.error('Payment cancelled. You can try again anytime.', { duration: 4000 });
            setIsProcessing(false);
          }
        },
        handler: async (paymentResponse) => {
          // 5. Payment succeeded in modal — transition to Waiting for Confirmation screen
          setVerificationState('waiting');
          const startTime = Date.now();

          try {
            const verifyRes = await axios.post(
              `${API_BASE}/api/payment/verify`,
              {
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                email: studentEmail,
                referralCode: referralCode.trim(),
                mobile: mobile || '',
                percentage10th: percentage10th || '',
                percentage12th: percentage12th || ''
              },
              token ? { headers: { Authorization: `Bearer ${token}` } } : {}
            );

            // 6. Attempt document upload safely
            try {
              const formData = new FormData();
              formData.append('email', studentEmail);
              formData.append('amount', feeAmount);
              if (docGrade10) formData.append('docGrade10', docGrade10);
              if (docGrade12) formData.append('docGrade12', docGrade12);
              if (docResume) formData.append('docResume', docResume);
              formData.append('referralCode', referralCode.trim());
              if (mobile) formData.append('mobile', mobile);
              if (percentage10th) formData.append('percentage10th', percentage10th);
              if (percentage12th) formData.append('percentage12th', percentage12th);

              await axios.post(`${API_BASE}/api/payment/unlock`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
            } catch (docErr) {
              console.warn('[DOC UPLOAD NON-FATAL WARNING]', docErr);
            }

            // Ensure waiting animation is visible for at least 1.8s for banking UX
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < 1800) {
              await new Promise(r => setTimeout(r, 1800 - elapsedTime));
            }

            setPaymentSuccessData({
              mentorName: verifyRes.data?.mentorName || 'Assigned Mentor',
              paymentId: paymentResponse.razorpay_payment_id || 'N/A'
            });
            setVerificationState('success');
            setIsProcessing(false);
          } catch (verifyErr) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < 1800) {
              await new Promise(r => setTimeout(r, 1800 - elapsedTime));
            }

            const errMsg = verifyErr.response?.data?.error || 'Payment verification failed. Please contact support with your payment ID.';
            setVerificationError(errMsg);
            setVerificationState('failed');
            console.error('[PAYMENT VERIFY ERROR]', verifyErr);
            setIsProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);

      // Handle payment failures inside the modal
      razorpay.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description || 'Unknown error'}. Please try again.`, { duration: 6000 });
        console.error('[RAZORPAY PAYMENT FAILED]', response.error);
        setIsProcessing(false);
      });

      razorpay.open();

    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to initiate payment. Please try again.';
      setFormError(errMsg);
      toast.error(errMsg, { duration: 5000 });
      console.error('[HANDLE PAY ERROR]', err);
      setIsProcessing(false);
    }
  };

  const handleExtension = async () => {
    if (!extensionReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    const loadingToast = toast.loading('Sending request...');
    try {
      const email = localStorage.getItem('student_email') || 'aniket@careerbridge.in';
      const name = localStorage.getItem('student_name') || 'Student';
      await axios.post('/api/trial/extension', {
        email,
        name,
        reason: extensionReason
      });
      toast.dismiss(loadingToast);
      toast.success('Request sent to Super Admin. Please check back later.');
      setShowExtension(false);
      setExtensionReason('');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to send request');
    }
  };

  // 1. Waiting for Confirmation Screen (styled like Admin Waiting)
  if (verificationState === 'waiting') {
    return (
      <div className="bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black min-h-screen w-full flex flex-col items-center justify-center p-6 text-center font-sans text-white z-[9999] fixed inset-0">
        <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 rounded-3xl space-y-6 animate-fade-in-up">

          {/* Pulsing clock / verification icon */}
          <div className="flex items-center justify-center mb-2">
            <div className="relative w-20 h-20">
              <span className="absolute inset-0 rounded-full bg-orange-400 opacity-30 animate-ping" />
              <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10 text-orange-400 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                </svg>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">
              Waiting for Confirmation
            </h2>
            <p className="text-gray-300 text-xs font-semibold leading-relaxed">
              Your payment transaction has been submitted. We are currently verifying your payment hash with Razorpay and setting up your assigned mentor records.
            </p>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold px-4 py-2 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            Verifying payment with bank & Razorpay...
          </div>

          <p className="text-[11px] text-gray-400 font-medium pt-2">
            Please do not refresh or close this window.
          </p>

        </div>
      </div>
    );
  }

  // 2. Success Screen (Payment Verified)
  if (verificationState === 'success' || paymentSuccessData) {
    const handleGoToDashboard = () => {
      if (onBack) onBack();
      window.location.href = '/student/dashboard';
    };

    return (
      <div className="bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black min-h-screen w-full flex flex-col items-center justify-center p-6 text-center font-sans text-white z-[9999] fixed inset-0">
        <div className="bg-white/10 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl p-8 max-w-md w-full mx-auto shadow-[0_20px_60px_rgba(16,185,129,0.3)] text-center space-y-6 animate-scale-in">

          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
            <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white text-4xl shadow-lg shadow-emerald-500/40">
              ✓
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight">Payment Verified!</h2>
            <p className="text-xs text-emerald-300 font-bold">
              Your profile has been upgraded & unlocked permanently.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold">Assigned Mentor:</span>
              <span className="text-white font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">{paymentSuccessData?.mentorName || 'Assigned Mentor'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold">Payment Transaction ID:</span>
              <span className="text-orange-400 font-mono font-bold">{paymentSuccessData?.paymentId || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold">Account Status:</span>
              <span className="text-emerald-400 font-extrabold uppercase flex items-center gap-1">
                <span>●</span> UNLOCKED (PERMANENT)
              </span>
            </div>
          </div>

          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black py-4 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            🚀 Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. Failed / Unverified Screen
  if (verificationState === 'failed') {
    return (
      <div className="bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black min-h-screen w-full flex flex-col items-center justify-center p-6 text-center font-sans text-white z-[9999] fixed inset-0">
        <div className="bg-white/10 backdrop-blur-2xl border border-rose-500/40 rounded-3xl p-8 max-w-md w-full mx-auto shadow-[0_20px_60px_rgba(244,63,94,0.3)] text-center space-y-6 animate-scale-in">

          <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-400 rounded-full flex items-center justify-center text-rose-400 text-4xl mx-auto shadow-lg shadow-rose-500/20">
            ⚠️
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">Payment Unverified</h2>
            <p className="text-xs text-rose-300 font-semibold">
              We could not verify your payment transaction.
            </p>
          </div>

          <div className="bg-rose-950/40 border border-rose-800/40 rounded-2xl p-4 text-left text-xs font-semibold text-rose-200">
            {verificationError || 'Payment verification failed. Please try again or contact support.'}
          </div>

          <button
            onClick={() => { setVerificationState('idle'); setVerificationError(''); }}
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            🔄 Return to Upgrade Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefreshWrapper onRefresh={checkExtensionStatus}>
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black z-[9999] relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 max-w-lg w-full mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-10 animate-fade-in-up">
        {showBack && (
          <div className="flex justify-start mb-6">
            <button
              onClick={onBack}
              className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 border border-white/10 hover:border-orange-500/30 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:scale-102 active:scale-98"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        )}
        <div className="text-center mb-6">
          {localTimer > 0 ? (
            <>
              <div className="w-16 h-16 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/30 animate-pulse">
                ⏱️
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Upgrade Your Profile</h2>
              <div className="bg-amber-400/10 text-amber-300 border border-amber-500/30 px-5 py-1.5 rounded-full text-base font-bold flex items-center justify-center gap-2 max-w-xs mx-auto my-3 shadow-[0_0_15px_rgba(245,158,11,0.1)] backdrop-blur-md">
                <span>Time Remaining:</span>
                <span translate="no" className="notranslate font-mono">{formatTime(localTimer)}</span>
              </div>
              <p className="text-sm text-gray-400 mt-2 font-semibold">
                You still have time! You can experience the platform or complete your profile and upgrade now to enjoy permanent access.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-orange-500/30">
                ⏳
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Free Trial Ended</h2>
              <p className="text-sm text-gray-400 mt-2 font-semibold">
                Your 24-hour trial has expired. Please upload your documents and pay the nominal fee to continue your journey.
              </p>
            </>
          )}
        </div>

        {/* ── Top Verified Job Cards (Under Clock Timer Section) ── */}
        {jobs.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 rounded-3xl p-4 sm:p-5 text-left shadow-lg animate-fade-in">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">💼</span>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Verified Job Openings
                  </h4>
                  <p className="text-[10px] text-amber-300/90 font-medium">
                    {localTimer <= 0 ? 'Trial ended — Complete profile upgrade to apply directly' : 'Active corporate placements available now'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {jobs.length} Roles
              </span>
            </div>

            {/* Job Cards — only with apply button */}
            <div className="space-y-2.5">
              {jobs.slice(0, 3).map((job) => (
                <div
                  key={job._id || job.id}
                  className="bg-black/35 hover:bg-black/55 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide truncate">
                        {job.company}
                      </span>
                      <span className="text-[9px] text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                        {job.jobType || 'Full-Time'}
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-white truncate">
                      {job.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-300 font-mono">
                      <span>📍 {job.location || 'Remote'}</span>
                      <span>•</span>
                      <span>💰 {job.salary || 'Competitive'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyClick(job)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 text-center flex items-center justify-center gap-1"
                  >
                    <span>Apply</span>
                    <span className="text-[10px]">🔒</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">

          {/* ─── 10th Qualification Card ─── */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                🎓 10th Standard Qualification
              </span>
              {docGrade10 && percentage10th.trim() && (
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ✓ Ready
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="percentage10th" className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  10th Percentage (%)
                </label>
                <input
                  id="percentage10th"
                  name="percentage10th"
                  type="text"
                  placeholder="e.g. 85.5%"
                  value={percentage10th}
                  onChange={(e) => setPercentage10th(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  10th Marksheet (PDF Only)
                </label>
                <input
                  id="doc-10th-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => handleFileSelect(e, setDocGrade10, '10th')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('doc-10th-upload').click()}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${docGrade10
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">{docGrade10 ? '📄' : '📤'}</span>
                    <span className="truncate">{docGrade10 ? docGrade10.name : 'Upload 10th PDF'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${docGrade10 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {docGrade10 ? 'PDF Attached' : 'Select PDF'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── 12th Qualification Card ─── */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                🎓 12th Standard Qualification
              </span>
              {docGrade12 && percentage12th.trim() && (
                <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ✓ Ready
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="percentage12th" className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  12th Percentage (%)
                </label>
                <input
                  id="percentage12th"
                  name="percentage12th"
                  type="text"
                  placeholder="e.g. 88.0%"
                  value={percentage12th}
                  onChange={(e) => setPercentage12th(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                  12th Marksheet (PDF Only)
                </label>
                <input
                  id="doc-12th-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => handleFileSelect(e, setDocGrade12, '12th')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('doc-12th-upload').click()}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${docGrade12
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm">{docGrade12 ? '📄' : '📤'}</span>
                    <span className="truncate">{docGrade12 ? docGrade12.name : 'Upload 12th PDF'}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${docGrade12 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {docGrade12 ? 'PDF Attached' : 'Select PDF'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── Resume Upload (Optional) ─── */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Resume (PDF Only) (Optional)</label>
            <div className="flex items-center gap-3">
              <input
                id="resume-upload"
                type="file"
                accept="application/pdf,.pdf"
                onChange={e => handleFileSelect(e, setDocResume, 'resume')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById('resume-upload').click()}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 border cursor-pointer ${docResume
                    ? 'bg-green-600 border-green-500/30 text-white'
                    : hasUploadedResume
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-orange-500/30 text-white hover:from-amber-650 hover:to-orange-650 shadow-md'
                      : 'bg-orange-500 border-orange-500/20 text-white hover:bg-orange-600'
                  }`}
              >
                {docResume
                  ? 'File Selected'
                  : hasUploadedResume
                    ? 'Update File'
                    : 'Choose File'}
              </button>
              <span className="text-xs text-gray-400 font-semibold truncate max-w-xs">
                {docResume ? docResume.name : (hasUploadedResume ? 'Resume already uploaded' : 'No file chosen')}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Admin Referral Code</label>
            <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} placeholder="Enter referral code" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder-gray-600" />
            {mentorCity && (
              <div className="mt-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between backdrop-blur-md">
                <span>📍 City Pricing ({mentorCity} • {mentorName})</span>
                <span className="text-amber-400 font-extrabold">₹{feeAmount}</span>
              </div>
            )}
          </div>
          <div>
            <PhoneInput
              label="MOBILE NUMBER (OPTIONAL)"
              value={mobile}
              onChange={(val) => setMobile(val)}
              countryCode={countryCode}
              onCountryCodeChange={(code) => setCountryCode(code)}
              placeholder="10-digit mobile number"
            />
          </div>

          {/* Inline visible error — always shows regardless of toast z-index */}
          {formError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold px-4 py-3 rounded-xl flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          <button
            id="pay-securely-button"
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-3.5 rounded-xl shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Opening Payment Gateway...
              </>
            ) : (
              <>
                🔒 Pay Securely
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-gray-500 mt-1.5">Secured by Razorpay</p>
        </div>

        {/* Trial Extension Section */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          {extensionStatus === 'pending' ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span>⏳ Extension Request Pending...</span>
            </div>
          ) : extensionStatus === 'denied' ? (
            <div className="flex flex-col items-center gap-1 animate-fade-in">
              <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <span>❌</span> <span>Admin denied your previous request.</span>
              </p>
              <button 
                type="button"
                onClick={() => setIsExtensionModalOpen(true)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/50 underline-offset-4 cursor-pointer mt-0.5"
              >
                Need more time? Contact Admin again
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsExtensionModalOpen(true)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/50 underline-offset-4 cursor-pointer"
            >
              Need more time? Contact Admin
            </button>
          )}
        </div>

      </div>

      {/* ── Active Verified Job Openings (Bottom Side) ── */}
      {jobs.length > 0 && (
        <div className="max-w-lg w-full mx-auto mt-6 mb-8 z-10 animate-fade-in-up">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl shadow-sm">
                  💼
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight">
                    Active Job Openings
                  </h3>
                  <p className="text-[10px] text-gray-300 font-medium">
                    {localTimer <= 0 ? 'Free trial ended — Unlock profile to apply directly' : 'Placement opportunities tailored to verified students'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {jobs.length} Verified
              </span>
            </div>

            <div className="space-y-3.5">
              {jobs.map((job) => (
                <div
                  key={job._id || job.id}
                  className="bg-black/25 hover:bg-black/45 border border-white/10 hover:border-orange-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 text-left group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider">
                        {job.company}
                      </span>
                      <span className="text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                        {job.jobType || 'Full-Time'}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-orange-300 transition-colors">
                      {job.title}
                    </h4>
                    {job.description && (
                      <p className="text-[10px] text-gray-300 line-clamp-2 mt-1 leading-relaxed">
                        {job.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-400 font-medium">
                      <span>📍 {job.location || 'Remote'}</span>
                      <span>💰 {job.salary || 'Best in Industry'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleApplyClick(job)}
                      className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Apply</span>
                      <span className="text-[10px]">🔒</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-[10px] text-gray-400 font-medium">
                🔒 Partner company openings require an upgraded student profile to apply.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Trial Extension Request Modal ── */}
      {isExtensionModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl max-w-md w-full p-6 text-left space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <h3 className="text-lg font-black text-white tracking-tight">Request Trial Extension</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExtensionModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 font-medium leading-relaxed">
              Please enter a brief reason for the Super Admin explaining why you require additional time for your trial period.
            </p>

            <form onSubmit={handleSubmitExtensionModal} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                  Reason / Message
                </label>
                <textarea
                  rows={4}
                  value={extensionMessage}
                  onChange={(e) => setExtensionMessage(e.target.value)}
                  placeholder="I just registered but haven't been able to explore the full platform assessments due to..."
                  className="w-full bg-white/5 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all resize-none font-sans"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsExtensionModalOpen(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PullToRefreshWrapper>
  );
}

export default StudentUpgradeForm;
