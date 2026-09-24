import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { ChevronDown } from 'lucide-react';
import PullToRefreshWrapper from '../shared/PullToRefreshWrapper';
import PhoneInput from '../shared/PhoneInput';
import { getAuthToken } from '../../utils/auth';

const API_BASE = import.meta.env.DEV ? '' : '';

function StudentUpgradeForm({ onBack, showBack, hasUploadedResume = false }) {
  const [mobile, setMobile] = useState(() => localStorage.getItem('student_mobile') || localStorage.getItem('auth_mobile') || '');
  const [countryCode, setCountryCode] = useState('+91');

  // Academic Qualifications state
  const [percentage10th, setPercentage10th] = useState('');
  const [percentage12th, setPercentage12th] = useState('');
  const [percentageGraduation, setPercentageGraduation] = useState('');

  // Marksheet files state
  const [docGrade10, setDocGrade10] = useState(null);
  const [docGrade12, setDocGrade12] = useState(null);
  const [docGraduation, setDocGraduation] = useState(null);
  const [docResume, setDocResume] = useState(null);

  // Existing uploaded document indicators from DB
  const [existingDocs, setExistingDocs] = useState({
    docGrade10: '',
    docGrade12: '',
    docGraduation: '',
    docResume: ''
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  // Verified Job Openings state
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [isBottomJobsExpanded, setIsBottomJobsExpanded] = useState(false);

  // 1-2 latest openings at top, remaining in collapsible bottom section
  const topJobs = jobs.slice(0, 2);
  const remainingJobs = jobs.slice(2);

  // Pre-load student profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getAuthToken('spark') || localStorage.getItem('auth_token');
        if (!token) return;
        const res = await axios.get(`${API_BASE}/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          if (res.data.mobile && !mobile) setMobile(res.data.mobile);
          if (res.data.percentage10th) setPercentage10th(res.data.percentage10th);
          if (res.data.percentage12th) setPercentage12th(res.data.percentage12th);
          if (res.data.percentageGraduation) setPercentageGraduation(res.data.percentageGraduation);
          setExistingDocs({
            docGrade10: res.data.docGrade10 || '',
            docGrade12: res.data.docGrade12 || '',
            docGraduation: res.data.docGraduation || '',
            docResume: res.data.docResume || ''
          });
        }
      } catch (e) {
        console.warn('Could not pre-load student profile details:', e);
      }
    };
    fetchProfile();
  }, []);

  // Fetch active jobs for preview
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = getAuthToken('spark') || localStorage.getItem('auth_token');
        const res = await axios.get(`${API_BASE}/api/jobs`, {
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
    toast.error(`📝 Profile Completion Required: Save your student credentials below to apply for ${job.title} at ${job.company}!`, {
      duration: 4000,
      icon: '💼'
    });
    const submitBtn = document.getElementById('save-profile-button');
    if (submitBtn) {
      submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitBtn.classList.add('ring-4', 'ring-emerald-400');
      setTimeout(() => {
        submitBtn.classList.remove('ring-4', 'ring-emerald-400');
      }, 2000);
    }
  };

  const handleFileSelect = (e, setFileState, expectedType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Enforce PDF only for marksheets and documents
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Invalid format. Only PDF documents (.pdf) are accepted for marksheets.');
      e.target.value = '';
      return;
    }

    const fileNameLower = file.name.toLowerCase();

    // Prevent cross-mismatching PDF uploads
    if (expectedType === '10th' && (fileNameLower.includes('12th') || fileNameLower.includes('hsc') || fileNameLower.includes('intermediate') || fileNameLower.includes('twelfth') || fileNameLower.includes('graduation') || fileNameLower.includes('degree'))) {
      toast.error('The selected file appears to be a 12th or Graduation document. Please upload your 10th marksheet here.');
      e.target.value = '';
      return;
    }

    if (expectedType === '12th' && (fileNameLower.includes('10th') || fileNameLower.includes('ssc') || fileNameLower.includes('matric') || fileNameLower.includes('tenth') || fileNameLower.includes('graduation') || fileNameLower.includes('degree'))) {
      toast.error('The selected file appears to be a 10th or Graduation document. Please upload your 12th marksheet here.');
      e.target.value = '';
      return;
    }

    if (expectedType === 'graduation' && (fileNameLower.includes('10th') || fileNameLower.includes('ssc') || fileNameLower.includes('matric') || fileNameLower.includes('12th') || fileNameLower.includes('hsc'))) {
      toast.error('The selected file appears to be a 10th or 12th marksheet. Please upload your Graduation degree/marksheet here.');
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

  const handleSubmitProfile = async (e) => {
    if (e) e.preventDefault();
    setFormError('');

    // 1. Mandatory Mobile Number Validation (Strict 10-digits)
    const cleanMobile = (mobile || '').replace(/\D/g, '');
    if (!cleanMobile) {
      const msg = 'Mobile number is required. Please enter your 10-digit mobile number.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      const msg = 'Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // 2. Strict Qualification Pair Validations
    // 10th Standard:
    if (percentage10th.trim() && !docGrade10 && !existingDocs.docGrade10) {
      const msg = 'You entered a 10th Percentage. Please upload your matching 10th Marksheet (PDF).';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    if (docGrade10 && !percentage10th.trim()) {
      const msg = 'You uploaded a 10th Marksheet. Please enter your 10th Percentage (%).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // 12th Standard:
    if (percentage12th.trim() && !docGrade12 && !existingDocs.docGrade12) {
      const msg = 'You entered a 12th Percentage. Please upload your matching 12th Marksheet (PDF).';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    if (docGrade12 && !percentage12th.trim()) {
      const msg = 'You uploaded a 12th Marksheet. Please enter your 12th Percentage (%).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Graduation:
    if (percentageGraduation.trim() && !docGraduation && !existingDocs.docGraduation) {
      const msg = 'You entered Graduation Percentage/CGPA. Please upload your Graduation Marksheet/Degree (PDF).';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    if (docGraduation && !percentageGraduation.trim()) {
      const msg = 'You uploaded a Graduation Marksheet/Degree. Please enter your Graduation Percentage or CGPA.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // 3. Require at least one complete qualification pair
    const has10thPair = (docGrade10 || existingDocs.docGrade10) && percentage10th.trim();
    const has12thPair = (docGrade12 || existingDocs.docGrade12) && percentage12th.trim();
    const hasGradPair = (docGraduation || existingDocs.docGraduation) && percentageGraduation.trim();

    if (!has10thPair && !has12thPair && !hasGradPair) {
      const msg = 'Please complete at least one qualification section (Percentage/CGPA and matching PDF upload for 10th, 12th, or Graduation).';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Saving your credentials and completing your profile...');

    try {
      const token = getAuthToken('spark') || localStorage.getItem('auth_token');
      const studentEmail = localStorage.getItem('student_email') || localStorage.getItem('auth_email') || '';

      const formData = new FormData();
      formData.append('email', studentEmail);
      formData.append('mobile', cleanMobile);
      if (percentage10th.trim()) formData.append('percentage10th', percentage10th.trim());
      if (percentage12th.trim()) formData.append('percentage12th', percentage12th.trim());
      if (percentageGraduation.trim()) formData.append('percentageGraduation', percentageGraduation.trim());

      if (docGrade10) formData.append('docGrade10', docGrade10);
      if (docGrade12) formData.append('docGrade12', docGrade12);
      if (docGraduation) formData.append('docGraduation', docGraduation);
      if (docResume) formData.append('docResume', docResume);

      const res = await axios.post(`${API_BASE}/api/student/complete-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      toast.dismiss(loadingToast);
      toast.success('🎉 Profile credentials saved successfully! Full platform access granted.', { duration: 4000 });

      // Save local storage state
      localStorage.setItem('student_is_unlocked', 'true');
      localStorage.setItem('student_mobile', cleanMobile);

      setSubmissionData({
        mobile: cleanMobile,
        percentage10th: percentage10th || res.data?.student?.percentage10th,
        percentage12th: percentage12th || res.data?.student?.percentage12th,
        percentageGraduation: percentageGraduation || res.data?.student?.percentageGraduation
      });
      setIsSuccess(true);
      setIsSubmitting(false);

    } catch (err) {
      toast.dismiss(loadingToast);
      const errMsg = err.response?.data?.error || err.message || 'Failed to save student profile. Please try again.';
      setFormError(errMsg);
      toast.error(errMsg, { duration: 5000 });
      console.error('[SUBMIT PROFILE ERROR]', err);
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ──
  if (isSuccess) {
    const handleGoToDashboard = () => {
      if (onBack) onBack();
      window.location.href = '/student/dashboard';
    };

    return (
      <div className="bg-slate-950/80 backdrop-blur-xl min-h-screen w-full flex flex-col items-center justify-center p-6 text-center font-sans z-[9999] fixed inset-0">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl border border-emerald-100 text-center space-y-6 animate-scale-in">
          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white text-4xl shadow-lg shadow-emerald-500/30">
              ✓
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Profile Completed!</h2>
            <p className="text-xs text-emerald-600 font-bold">
              Your credentials are saved. You now have permanent free access to all platform features.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-semibold">Account Status:</span>
              <span className="text-emerald-600 font-extrabold uppercase flex items-center gap-1">
                <span>●</span> ACTIVE / FULL ACCESS (PERMANENT)
              </span>
            </div>
            {submissionData?.mobile && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-semibold">Registered Mobile:</span>
                <span className="text-gray-900 font-mono font-bold">+91 {submissionData.mobile}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-semibold">Job Applications:</span>
              <span className="text-emerald-700 font-bold bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Unlocked 🚀
              </span>
            </div>
          </div>

          <button
            onClick={handleGoToDashboard}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold py-3.5 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            🚀 Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 font-sans w-full select-none text-left">
        {/* ── Sidebar / Header (Dark - matching StudentDashboard & ResumeReview) ── */}
        <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">
          {/* Ambient Glow Blobs */}
          <div className="absolute top-10 left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none z-0 animate-float" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none z-0 animate-float delay-400" />

          {/* Top Row: Back button anchored left, centered page label */}
          <div className="flex items-center justify-center relative w-full mb-8 md:mb-10 z-10">
            {showBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-0 p-2.5 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-white cursor-pointer group flex items-center justify-center shadow-md active:scale-95"
                aria-label="Back to Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-bold text-white tracking-wide">Complete Profile</h2>
          </div>

          {/* Feature Icon & Info */}
          <div className="flex flex-col items-center text-center relative z-10 md:mt-2">
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 shadow-xl mb-4 flex items-center justify-center text-3xl shadow-emerald-500/20">
              🎓
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Complete Your Student Profile
            </h1>
            <p className="text-xs text-gray-400 mt-2 max-w-lg mx-auto leading-relaxed px-2">
              Submit your academic qualifications and valid mobile number to complete your student credentials. Enjoy immediate, permanent free access to corporate job applications, verified assessments, and career mentorship.
            </p>
          </div>
        </div>

        {/* ── Main Content Area (Light - matching StudentDashboard & ResumeReview) ── */}
        <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-blue-50 rounded-t-[2.5rem] pt-8 pb-20 px-4 md:px-8 w-full flex-1 flex flex-col items-center select-none text-left">
          <div className="w-full max-w-xl mx-auto space-y-6">

            {/* ── Top Verified Job Openings Preview ── */}
            {topJobs.length > 0 && (
              <div className="bg-white/90 backdrop-blur-md border border-emerald-200/80 rounded-3xl p-5 sm:p-6 text-left shadow-[0_10px_30px_rgba(16,185,129,0.06)] animate-fade-in">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shadow-xs">
                      💼
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Verified Job Openings
                      </h4>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Complete your profile credentials below to apply directly
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {topJobs.length} {topJobs.length === 1 ? 'Role' : 'Roles'}
                  </span>
                </div>

                {/* Job Cards */}
                <div className="space-y-3">
                  {topJobs.map((job) => (
                    <div
                      key={job._id || job.id}
                      className="bg-slate-50/70 hover:bg-emerald-50/30 border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide truncate">
                            {job.company}
                          </span>
                          <span className="text-[9px] font-bold text-gray-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {job.jobType || 'Full-Time'}
                          </span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                          {job.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-mono">
                          <span>📍 {job.location || 'Remote'}</span>
                          <span>•</span>
                          <span>💰 {job.salary || 'Competitive'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyClick(job)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 text-center flex items-center justify-center gap-1.5"
                      >
                        <span>Apply</span>
                        <span className="text-[10px]">📝</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Main Form Card ── */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <form onSubmit={handleSubmitProfile} className="space-y-4">
                {/* ─── 10th Qualification Card ─── */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center gap-1.5">
                      🎓 10th Standard Qualification
                    </span>
                    {(docGrade10 || existingDocs.docGrade10) && percentage10th.trim() && (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="percentage10th" className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        10th Percentage (%)
                      </label>
                      <input
                        id="percentage10th"
                        name="percentage10th"
                        type="text"
                        placeholder="e.g. 85.5%"
                        value={percentage10th}
                        onChange={(e) => setPercentage10th(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-semibold shadow-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
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
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                          docGrade10
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                            : existingDocs.docGrade10
                              ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200'
                              : 'bg-white hover:bg-amber-50/40 text-gray-700 border-slate-200 hover:border-amber-400 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm">{docGrade10 || existingDocs.docGrade10 ? '📄' : '📤'}</span>
                          <span className="truncate">
                            {docGrade10 ? docGrade10.name : (existingDocs.docGrade10 ? 'Uploaded Marksheet' : 'Upload 10th PDF')}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                          docGrade10 || existingDocs.docGrade10 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {docGrade10 ? 'PDF Attached' : (existingDocs.docGrade10 ? 'Uploaded' : 'Select PDF')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── 12th Qualification Card ─── */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                      🎓 12th Standard Qualification
                    </span>
                    {(docGrade12 || existingDocs.docGrade12) && percentage12th.trim() && (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="percentage12th" className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        12th Percentage (%)
                      </label>
                      <input
                        id="percentage12th"
                        name="percentage12th"
                        type="text"
                        placeholder="e.g. 88.0%"
                        value={percentage12th}
                        onChange={(e) => setPercentage12th(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold shadow-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
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
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                          docGrade12
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                            : existingDocs.docGrade12
                              ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200'
                              : 'bg-white hover:bg-indigo-50/40 text-gray-700 border-slate-200 hover:border-indigo-400 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm">{docGrade12 || existingDocs.docGrade12 ? '📄' : '📤'}</span>
                          <span className="truncate">
                            {docGrade12 ? docGrade12.name : (existingDocs.docGrade12 ? 'Uploaded Marksheet' : 'Upload 12th PDF')}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                          docGrade12 || existingDocs.docGrade12 ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                          {docGrade12 ? 'PDF Attached' : (existingDocs.docGrade12 ? 'Uploaded' : 'Select PDF')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── Graduation Qualification Card ─── */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-teal-700 tracking-wider flex items-center gap-1.5">
                      🎓 Graduation Qualification
                    </span>
                    {(docGraduation || existingDocs.docGraduation) && percentageGraduation.trim() && (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ Ready
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="percentageGraduation" className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Graduation Percentage / CGPA
                      </label>
                      <input
                        id="percentageGraduation"
                        name="percentageGraduation"
                        type="text"
                        placeholder="e.g. 8.4 CGPA or 78%"
                        value={percentageGraduation}
                        onChange={(e) => setPercentageGraduation(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-semibold shadow-xs transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                        Degree / Marksheet (PDF Only)
                      </label>
                      <input
                        id="doc-graduation-upload"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={e => handleFileSelect(e, setDocGraduation, 'graduation')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('doc-graduation-upload').click()}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                          docGraduation
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                            : existingDocs.docGraduation
                              ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200'
                              : 'bg-white hover:bg-teal-50/40 text-gray-700 border-slate-200 hover:border-teal-400 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm">{docGraduation || existingDocs.docGraduation ? '📄' : '📤'}</span>
                          <span className="truncate">
                            {docGraduation ? docGraduation.name : (existingDocs.docGraduation ? 'Uploaded Degree' : 'Upload Degree PDF')}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                          docGraduation || existingDocs.docGraduation ? 'bg-emerald-600 text-white' : 'bg-teal-500 text-white'
                        }`}>
                          {docGraduation ? 'PDF Attached' : (existingDocs.docGraduation ? 'Uploaded' : 'Select PDF')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── Resume Upload (Optional) ─── */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-2 shadow-xs">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Resume (PDF Only) (Optional)
                  </label>
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
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 border cursor-pointer ${
                        docResume
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : hasUploadedResume || existingDocs.docResume
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500/30 text-white shadow-xs'
                            : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      {docResume
                        ? 'File Selected'
                        : hasUploadedResume || existingDocs.docResume
                          ? 'Update File'
                          : 'Choose File'}
                    </button>
                    <span className="text-xs text-gray-500 font-semibold truncate max-w-xs">
                      {docResume ? docResume.name : (hasUploadedResume || existingDocs.docResume ? 'Resume already uploaded' : 'No file chosen')}
                    </span>
                  </div>
                </div>

                {/* ─── Mobile Number (Required) ─── */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Mobile Number <span className="text-red-500 font-extrabold">* (Required)</span>
                    </label>
                    {mobile && mobile.replace(/\D/g, '').length === 10 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Valid 10-Digits
                      </span>
                    )}
                  </div>
                  <PhoneInput
                    value={mobile}
                    onChange={(val) => {
                      setMobile(val);
                      if (formError && val.replace(/\D/g, '').length === 10) setFormError('');
                    }}
                    countryCode={countryCode}
                    onCountryCodeChange={(code) => setCountryCode(code)}
                    placeholder="Enter 10-digit mobile number"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">
                    Mandatory for interview calls, placement updates, and OTP account security.
                  </p>
                </div>

                {/* Visible form error */}
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl flex items-start gap-2 animate-shake shadow-xs">
                    <span className="text-base leading-none">⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* ─── Submit Credentials Button ─── */}
                <button
                  id="save-profile-button"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-black py-4 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Saving Credentials...
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Save Profile & Submit Credentials
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-1 font-medium">
                  Permanent Free Access • No hidden charges • Direct Corporate Placement Access
                </p>
              </form>
            </div>

            {/* ── Active Verified Job Openings (Bottom Side - Collapsible) ── */}
            {remainingJobs.length > 0 && (
              <div className="w-full animate-fade-in-up">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] text-left transition-all">
                  <button
                    type="button"
                    onClick={() => setIsBottomJobsExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between cursor-pointer group text-left focus:outline-none"
                    aria-expanded={isBottomJobsExpanded}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform">
                        💼
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-gray-900 tracking-tight group-hover:text-emerald-700 transition-colors">
                            Active Job Openings
                          </h3>
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            {isBottomJobsExpanded ? 'Click to collapse' : 'Click to show more'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {isBottomJobsExpanded
                            ? 'Complete student profile credentials above to apply directly'
                            : `${remainingJobs.length} more verified opening${remainingJobs.length === 1 ? '' : 's'} available`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        +{remainingJobs.length} More
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-transform duration-300 ${
                          isBottomJobsExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isBottomJobsExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3.5 animate-fade-in">
                      {remainingJobs.map((job) => (
                        <div
                          key={job._id || job.id}
                          className="bg-slate-50/70 hover:bg-emerald-50/20 border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 text-left group shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                                {job.company}
                              </span>
                              <span className="text-[9px] font-bold text-gray-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                {job.jobType || 'Full-Time'}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {job.title}
                            </h4>
                            {job.description && (
                              <p className="text-[10px] text-gray-600 line-clamp-2 mt-1 leading-relaxed">
                                {job.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-gray-500 font-medium">
                              <span>📍 {job.location || 'Remote'}</span>
                              <span>💰 {job.salary || 'Best in Industry'}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleApplyClick(job)}
                              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Apply</span>
                              <span className="text-[10px]">📝</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-gray-400 font-medium">
                          Corporate partner openings require completed student credentials to apply.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentUpgradeForm;
