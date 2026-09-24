import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import stuIcon from '../../assets/stu-icon.png';
import StudentUpgradeForm from '../../components/student/StudentUpgradeForm';
import { getAuthToken } from '../../utils/auth';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';

function ResumeReview() {
  useDocumentTitle('Resume Review | Skill Bridge India');
  const navigate = useNavigate();

  const [docResume, setDocResume] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const fileInputRef = useRef(null);

  // Load genuine AI Analysis from localStorage caching to prevent unnecessary repeat runs
  const [aiAnalysis, setAiAnalysis] = useState(() => {
    try {
      const cached = localStorage.getItem('student_resume_analysis');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [mentorReview, setMentorReview] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = getAuthToken('spark');
      if (!token) return;
      
      const res = await axios.get('/api/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDocResume(res.data.docResume || '');
      setIsUnlocked(res.data.isUnlocked || false);
      if (res.data.resumeReview) {
        setMentorReview(res.data.resumeReview);
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    window.addEventListener('storage', fetchProfile);
    return () => window.removeEventListener('storage', fetchProfile);
  }, []);

  const handleResumeUpload = async (e) => {
    const file = e.target ? e.target.files[0] : e;
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file only.');
      return;
    }

    const token = getAuthToken('spark');
    if (!token) {
      toast.error('Session expired. Please log in.');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading resume to server...');

    try {
      const formData = new FormData();
      formData.append('docResume', file);

      const res = await axios.post('/api/student/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const newUrl = res.data.docResume;
      setDocResume(newUrl);

      const nowStr = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).replace(',', '');

      localStorage.setItem('student_resume_filename', file.name);
      localStorage.setItem('student_resume_timestamp', nowStr);
      window.dispatchEvent(new Event('storage'));
      
      // Clear previous analysis when a new resume file is uploaded
      setAiAnalysis(null);
      localStorage.removeItem('student_resume_analysis');
      
      // Log the upload
      await axios.post('/api/student/log-upload', {
        filename: file.name,
        fileType: 'resume',
        status: 'success',
        message: 'Resume uploaded and saved to Cloudinary.'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      toast.dismiss(loadingToast);
      toast.success('Resume uploaded successfully!');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to upload resume.');
      console.error('Resume upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeResume = async () => {
    const token = getAuthToken('spark');
    if (!token) {
      toast.error('Session expired. Please log in.');
      return;
    }

    setIsAnalyzing(true);
    const loadingToast = toast.loading('Extracting and analyzing resume text...');

    try {
      const res = await axios.post('/api/resume/analyze-ai', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const analysisData = res.data;
      setAiAnalysis(analysisData);
      localStorage.setItem('student_resume_analysis', JSON.stringify(analysisData));

      toast.dismiss(loadingToast);
      toast.success('Genuine AI Review completed successfully!');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to analyze resume.');
      console.error('AI analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper values derived from genuine AI analysis
  const score = aiAnalysis?.score || 0;
  const strokeDashoffset = 251.2 - (251.2 * score) / 100;
  const metrics = aiAnalysis?.metrics || [];
  const suggestions = aiAnalysis?.suggestions || [];

  const getScoreRating = (val) => {
    if (val >= 85) return 'Rating: Excellent';
    if (val >= 70) return 'Rating: Good';
    if (val >= 50) return 'Rating: Average';
    return 'Rating: Needs Work';
  };

  if (showUpgradeForm) {
    return (
      <StudentUpgradeForm 
        onBack={() => setShowUpgradeForm(false)} 
        showBack={true} 
        trialTimeRemaining={86400}
        hasUploadedResume={!!docResume}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 animate-pulse">Loading Resume Details...</span>
        </div>
      </div>
    );
  }

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-teal-50 font-sans w-full select-none text-left">
      {/* ── Sidebar (Dark) ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">
        
        {/* Header/Back arrow */}
        <div className="flex items-center justify-center relative w-full mb-8 md:mb-10">
          <Link
            to="/student/dashboard"
            className="absolute left-0 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
            aria-label="Go Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-wide">Resume Review</h2>
        </div>

        {/* Feature Icon & Info */}
        <div className="flex flex-col items-center text-center md:mt-8">
          <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/15 shadow-xl mb-6 flex items-center justify-center p-4">
            <img src={stuIcon} alt="Student Tier Icon" className="w-full h-full object-contain" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">ATS Resume Checker</h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed px-4">
            Optimize, adjust, and audit your CV metrics to align with top MERN stack industry positions.
          </p>
        </div>
      </div>

      {/* ── Content Area (Light) ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-teal-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-6">
        <div className="space-y-6 max-w-4xl mx-auto w-full">
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Resume Review & Feedback</h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">AI and Expert evaluation of your current CV</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-extrabold tracking-wider uppercase text-orange-600 self-start sm:self-center">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              Live ATS Parser Active
            </span>
          </div>

          {!docResume ? (
            /* Upload Gate / File Dropzone Interface */
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/40 text-center max-w-xl mx-auto w-full py-12 flex flex-col items-center justify-center gap-4 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 text-3xl">
                📥
              </div>
              <h3 className="text-lg font-bold text-gray-900">Upload Your Resume</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                Please upload a PDF copy of your resume. Once uploaded, our AI engine will analyze it and provide customized ATS feedback and scores.
              </p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    handleResumeUpload({ target: { files: [file] } });
                  }
                }}
                className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-2xl p-8 text-center bg-gray-50 hover:bg-gray-100/60 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 w-full group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-gray-600">
                  Drag & drop your resume PDF here or <span className="text-orange-500 hover:underline">click to browse</span>
                </p>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleResumeUpload} 
                accept=".pdf" 
                className="hidden" 
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-8 py-4 rounded-2xl text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>📄</span> Select PDF Resume
                  </>
                )}
              </button>

              {/* Locked/Disabled Analyze Button */}
              <button 
                disabled 
                className="mt-4 w-full bg-gray-100 text-gray-400 font-extrabold py-3.5 rounded-2xl text-xs cursor-not-allowed border border-gray-200 flex items-center justify-center gap-2"
              >
                🔒 Analyze/Review Resume (Upload required)
              </button>
            </div>
          ) : (
            /* Resume Exists - Render Document Status & Feedback Grid */
            <>
              {/* Document Status Card with Unlocked AI Button */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-scale-in">
                <div className="flex items-center gap-3 text-left w-full md:w-auto">
                  <div className="text-3xl">📄</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-gray-900 tracking-tight">Active Resume Document</p>
                    <a 
                      href={docResume} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-teal-600 font-semibold hover:underline block truncate mt-0.5 font-mono"
                    >
                      {docResume.split('/').pop() || 'View Resume.pdf'}
                    </a>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleResumeUpload} 
                    accept=".pdf" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-black hover:bg-gray-900 text-white font-extrabold px-5 py-3.5 rounded-2xl text-xs transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    Re-upload Resume
                  </button>
                  {isUnlocked ? (
                    <button 
                      onClick={handleAnalyzeResume}
                      disabled={isAnalyzing}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          ⚡ Analyze/Review Resume
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowUpgradeForm(true)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold px-6 py-3.5 rounded-2xl text-xs border border-emerald-200 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                    >
                      📝 Complete Profile to Analyze Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Mentor / Expert Review Section */}
              {mentorReview && mentorReview.status === 'reviewed' ? (
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm border border-blue-100 flex flex-col space-y-6 text-left animate-scale-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                        👨‍🏫
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900">Mentor & Expert Resume Feedback</h3>
                        <p className="text-xs text-gray-400 font-semibold">
                          Reviewed by <span className="text-blue-600 font-bold">{mentorReview.reviewedBy || 'Mentor Admin'}</span> on {mentorReview.reviewedAt ? new Date(mentorReview.reviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black uppercase text-emerald-700 self-start sm:self-center">
                      ✅ Review Completed
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ATS Score Card */}
                    <div className="md:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-6 border border-blue-100/60 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black uppercase text-blue-500 tracking-wider mb-2">Mentor Assigned ATS Score</span>
                      <span className="text-5xl font-black text-blue-900 font-mono">{mentorReview.atsScore}%</span>
                      <div className="w-full bg-blue-150 h-3 rounded-full overflow-hidden mt-4">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            mentorReview.atsScore >= 80 ? 'bg-emerald-500' : mentorReview.atsScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${mentorReview.atsScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Feedback details */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Formatting & Keywords */}
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/70">
                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5 flex items-center gap-2">
                          <span>📐</span> Formatting & Keywords Feedback
                        </h4>
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {mentorReview.formattingFeedback || 'No formatting feedback provided.'}
                        </p>
                      </div>

                      {/* Impact & Action Verbs */}
                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/70">
                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5 flex items-center gap-2">
                          <span>🚀</span> Impact & Action Verbs Feedback
                        </h4>
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {mentorReview.impactFeedback || 'No impact feedback provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-amber-100 flex items-center gap-4 text-left animate-scale-in">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 text-2xl shrink-0">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-900">Awaiting Mentor Review</h3>
                    <p className="text-xs text-amber-700 font-medium mt-0.5">
                      Your uploaded resume has been submitted to your assigned mentor. Once your mentor completes their manual review, their ATS evaluation and feedback will appear right here.
                    </p>
                  </div>
                </div>
              )}

              {!isUnlocked ? (
                /* Profile Completion Lock Notification card */
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-emerald-100 text-center py-12 flex flex-col items-center justify-center gap-4 w-full animate-scale-in relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black tracking-widest uppercase px-4 py-1.5 rounded-bl-2xl">
                    Profile Verification
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-3xl shadow-xs">
                    🎓
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-sans">Complete Profile to Unlock AI Analysis</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                    AI Resume Critique and ATS Score ratings require completed student credentials. Submit your academic qualifications and mobile number to instantly unlock full access.
                  </p>
                  <button
                    onClick={() => setShowUpgradeForm(true)}
                    className="mt-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold px-8 py-4 rounded-2xl text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    🎓 Complete Student Profile Now
                  </button>
                </div>
              ) : !aiAnalysis ? (
                /* Prompt to trigger the genuine analysis */
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-sm border border-white/40 text-center py-12 flex flex-col items-center justify-center gap-4 w-full animate-scale-in">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-500 text-3xl">
                    ⚡
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-sans">AI Analysis Ready</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-md">
                    Your resume PDF has been uploaded successfully. Click the **Analyze/Review Resume** button in the status card above to extract your CV text and run a live AI evaluation using our Groq LLM integration.
                  </p>
                </div>
              ) : (
                /* Render Genuine AI Analysis results */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-scale-in">
                  
                  {/* Col 1: Score & Metrics */}
                  <div className="md:col-span-1 flex flex-col gap-6">
                    
                    {/* ATS circular score card */}
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/40 flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-6">ATS Score Overview</h3>
                      
                      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-gray-100"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="stroke-orange-500 transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="251.2"
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-gray-900 tracking-tight font-mono">{score}%</span>
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">{getScoreRating(score)}</span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                        Your resume ranks higher than <strong>{score}%</strong> of industry profiles. Follow the suggestions below to improve.
                      </p>
                    </div>

                    {/* Core Metric Scores */}
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/40 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                      <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-5">Core Metric Scores</h4>
                      <div className="space-y-4">
                        {metrics.map((m) => (
                          <div key={m.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                              <span>{m.name}</span>
                              <span className="font-mono">{m.value}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${m.color === 'bg-green-500' ? 'from-emerald-400 to-teal-500' : m.color === 'bg-orange-500' ? 'from-orange-400 to-amber-500' : 'from-amber-400 to-yellow-500'} transition-all duration-700`}
                                style={{ width: `${m.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Actionable feedback */}
                  <div className="md:col-span-2 text-left">
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm border border-white/40 h-full">
                      <h3 className="text-base font-extrabold text-gray-900 tracking-tight mb-6">Expert & AI Feedback Suggestions</h3>
                      
                      <div className="flex flex-col gap-4">
                        {suggestions.length > 0 ? (
                          suggestions.map((item) => (
                            <div
                              key={item.id}
                              className="p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100/40 transition-colors flex flex-col sm:flex-row items-start gap-4"
                            >
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold tracking-wider uppercase whitespace-nowrap ${item.badgeColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.dotColor}`} />
                                {item.type}
                              </span>
                              <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 font-bold py-4">No suggestions found. Your resume looks highly optimized!</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
      </div>
    </PullToRefreshWrapper>
  );
}

export default ResumeReview;
