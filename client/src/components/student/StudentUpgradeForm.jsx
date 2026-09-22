import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
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
      <div className="bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black min-h-screen w-full flex flex-col items-center justify-center p-6 text-center font-sans text-white z-[9999] fixed inset-0">
        <div className="bg-white/10 backdrop-blur-2xl border border-emerald-500/40 rounded-3xl p-8 max-w-md w-full mx-auto shadow-[0_20px_60px_rgba(16,185,129,0.3)] text-center space-y-6 animate-scale-in">
          <div className="relative w-20 h-20 mx-auto">
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
            <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white text-4xl shadow-lg shadow-emerald-500/40">
              ✓
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight">Profile Completed!</h2>
            <p className="text-xs text-emerald-300 font-bold">
              Your credentials are saved. You now have permanent free access to all platform features.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold">Account Status:</span>
              <span className="text-emerald-400 font-extrabold uppercase flex items-center gap-1">
                <span>●</span> ACTIVE / FULL ACCESS (PERMANENT)
              </span>
            </div>
            {submissionData?.mobile && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Registered Mobile:</span>
                <span className="text-white font-mono font-bold">+91 {submissionData.mobile}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold">Job Applications:</span>
              <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Unlocked 🚀
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

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black z-[9999] relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-emerald-500/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 max-w-lg w-full mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-10 animate-fade-in-up">
          {showBack && (
            <div className="flex justify-start mb-6">
              <button
                onClick={onBack}
                className="group flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all duration-300 border border-white/10 hover:border-emerald-500/30 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:scale-102 active:scale-98"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          )}

          {/* ── Form Header ── */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4 shadow-lg shadow-emerald-500/30">
              🎓
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Complete Your Student Profile</h2>
            <p className="text-xs text-gray-300 mt-2 font-semibold leading-relaxed">
              Submit your academic qualifications and valid mobile number to complete your student credentials. Enjoy immediate, permanent free access to corporate job applications, verified assessments, and career mentorship.
            </p>
          </div>

          {/* ── Top Verified Job Openings Preview ── */}
          {jobs.length > 0 && (
            <div className="mb-6 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 rounded-3xl p-4 sm:p-5 text-left shadow-lg animate-fade-in">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💼</span>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Verified Job Openings
                    </h4>
                    <p className="text-[10px] text-emerald-300/90 font-medium">
                      Complete your profile credentials below to apply directly
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {jobs.length} Roles
                </span>
              </div>

              {/* Job Cards */}
              <div className="space-y-2.5">
                {jobs.slice(0, 3).map((job) => (
                  <div
                    key={job._id || job.id}
                    className="bg-black/35 hover:bg-black/55 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide truncate">
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
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 text-center flex items-center justify-center gap-1"
                    >
                      <span>Apply</span>
                      <span className="text-[10px]">📝</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitProfile} className="space-y-4">
            {/* ─── 10th Qualification Card ─── */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  🎓 10th Standard Qualification
                </span>
                {(docGrade10 || existingDocs.docGrade10) && percentage10th.trim() && (
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
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                      docGrade10
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : existingDocs.docGrade10
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{docGrade10 || existingDocs.docGrade10 ? '📄' : '📤'}</span>
                      <span className="truncate">
                        {docGrade10 ? docGrade10.name : (existingDocs.docGrade10 ? 'Uploaded Marksheet' : 'Upload 10th PDF')}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                      docGrade10 || existingDocs.docGrade10 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {docGrade10 ? 'PDF Attached' : (existingDocs.docGrade10 ? 'Uploaded' : 'Select PDF')}
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
                {(docGrade12 || existingDocs.docGrade12) && percentage12th.trim() && (
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
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                      docGrade12
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : existingDocs.docGrade12
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{docGrade12 || existingDocs.docGrade12 ? '📄' : '📤'}</span>
                      <span className="truncate">
                        {docGrade12 ? docGrade12.name : (existingDocs.docGrade12 ? 'Uploaded Marksheet' : 'Upload 12th PDF')}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                      docGrade12 || existingDocs.docGrade12 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {docGrade12 ? 'PDF Attached' : (existingDocs.docGrade12 ? 'Uploaded' : 'Select PDF')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Graduation Qualification Card (New Section) ─── */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                  🎓 Graduation Qualification
                </span>
                {(docGraduation || existingDocs.docGraduation) && percentageGraduation.trim() && (
                  <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    ✓ Ready
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="percentageGraduation" className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
                    Graduation Percentage / CGPA
                  </label>
                  <input
                    id="percentageGraduation"
                    name="percentageGraduation"
                    type="text"
                    placeholder="e.g. 8.4 CGPA or 78%"
                    value={percentageGraduation}
                    onChange={(e) => setPercentageGraduation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700/80 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase mb-1">
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
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 border flex items-center justify-between cursor-pointer ${
                      docGraduation
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : existingDocs.docGraduation
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{docGraduation || existingDocs.docGraduation ? '📄' : '📤'}</span>
                      <span className="truncate">
                        {docGraduation ? docGraduation.name : (existingDocs.docGraduation ? 'Uploaded Degree' : 'Upload Degree PDF')}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold shrink-0 ${
                      docGraduation || existingDocs.docGraduation ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white'
                    }`}>
                      {docGraduation ? 'PDF Attached' : (existingDocs.docGraduation ? 'Uploaded' : 'Select PDF')}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Resume Upload (Optional) ─── */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
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
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95 border cursor-pointer ${
                    docResume
                      ? 'bg-green-600 border-green-500/30 text-white'
                      : hasUploadedResume || existingDocs.docResume
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-500/30 text-white shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500/20 text-white'
                  }`}
                >
                  {docResume
                    ? 'File Selected'
                    : hasUploadedResume || existingDocs.docResume
                      ? 'Update File'
                      : 'Choose File'}
                </button>
                <span className="text-xs text-gray-400 font-semibold truncate max-w-xs">
                  {docResume ? docResume.name : (hasUploadedResume || existingDocs.docResume ? 'Resume already uploaded' : 'No file chosen')}
                </span>
              </div>
            </div>

            {/* ─── Mobile Number (Required) ─── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Mobile Number <span className="text-red-400 font-extrabold">* (Required)</span>
                </label>
                {mobile && mobile.replace(/\D/g, '').length === 10 && (
                  <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1">
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
              <p className="text-[10px] text-gray-400 mt-1 font-medium">
                Mandatory for interview calls, placement updates, and OTP account security.
              </p>
            </div>

            {/* Visible form error */}
            {formError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold px-4 py-3 rounded-xl flex items-start gap-2 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* ─── Submit Credentials Button ─── */}
            <button
              id="save-profile-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-black py-4 rounded-xl shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs"
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
            <p className="text-center text-[10px] text-gray-400 mt-1">
              Permanent Free Access • No hidden charges • Direct Corporate Placement Access
            </p>
          </form>
        </div>

        {/* ── Active Verified Job Openings (Bottom Side) ── */}
        {jobs.length > 0 && (
          <div className="max-w-lg w-full mx-auto mt-6 mb-8 z-10 animate-fade-in-up">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-left">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shadow-sm">
                    💼
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">
                      Active Job Openings
                    </h3>
                    <p className="text-[10px] text-gray-300 font-medium">
                      Complete student profile credentials above to apply directly
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
                    className="bg-black/25 hover:bg-black/45 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 text-left group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                          {job.company}
                        </span>
                        <span className="text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          {job.jobType || 'Full-Time'}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
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
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Apply</span>
                        <span className="text-[10px]">📝</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="text-[10px] text-gray-400 font-medium">
                  Corporate partner openings require completed student credentials to apply.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentUpgradeForm;
