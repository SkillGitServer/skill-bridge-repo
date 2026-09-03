import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import StudentUpgradeForm from '../../components/student/StudentUpgradeForm';
import { getAuthToken } from '../../utils/auth';
import { getInlineResumeUrl } from '../../utils/exportUtils';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';

const MOCK_RESULTS = [
  {
    id: 'mock-1',
    examTitle: 'Aptitude & Logical Reasoning',
    date: '2026-07-10T00:00:00.000Z',
    score: 85,
    status: 'Pass',
    isPass: true,
  },
  {
    id: 'mock-2',
    examTitle: 'Communication & Verbal Ability',
    date: '2026-07-12T00:00:00.000Z',
    score: 92,
    status: 'Pass',
    isPass: true,
  },
  {
    id: 'mock-3',
    examTitle: 'Situational Judgment & Problem Solving',
    date: '2026-07-14T00:00:00.000Z',
    score: 45,
    status: 'Fail',
    isPass: false,
  },
];

function StudentResults() {
  useDocumentTitle('My Results | Skill Bridge India');

  const [name, setName] = useState(() => localStorage.getItem('auth_name') || 'Student');
  const [email, setEmail] = useState(() => localStorage.getItem('auth_email') || 'student@careerbridge.in');
  const [mobile, setMobile] = useState(() => localStorage.getItem('student_mobile') || '');
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('student_profile_photo') || '');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // In-App PDF Document Viewer modal state
  const [viewingPdfUrl, setViewingPdfUrl] = useState(null);
  const [viewingExamTitle, setViewingExamTitle] = useState('');

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const token = getAuthToken('spark');
        if (!token) return;
        
        const profileRes = await axios.get('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (profileRes.data) {
          setIsUnlocked(profileRes.data.isUnlocked || false);
          const { name: dbName, email: dbEmail, mobile: dbMobile, profilePhoto: dbPhoto } = profileRes.data;
          if (dbName) {
            setName(dbName);
            localStorage.setItem('auth_name', dbName);
          }
          if (dbEmail) {
            setEmail(dbEmail);
            localStorage.setItem('auth_email', dbEmail);
          }
          if (dbMobile) {
            setMobile(dbMobile);
            localStorage.setItem('student_mobile', dbMobile);
          }
          if (dbPhoto) {
            setProfilePhoto(dbPhoto);
            localStorage.setItem('student_profile_photo', dbPhoto);
          }
        }
      } catch (err) {
        console.error('Failed to load student profile details:', err);
      }
    };

    const loadResults = async () => {
      try {
        const activeEmail = localStorage.getItem('auth_email') || email;
        // Get results filtered by the active student email
        const res = await axios.get(`/api/results?email=${encodeURIComponent(activeEmail)}`);
        setResults(res.data);
      } catch (err) {
        console.error('Failed to load results from server:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData().then(loadResults);
  }, []);

  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'ST';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
    return fullName.slice(0, 2).toUpperCase() || 'ST';
  };

  const handleViewPdf = (result) => {
    if (!isUnlocked) {
      toast.error('🔒 Upgrade Required: PDF view is locked for free accounts. Please upgrade your profile.');
      setShowUpgradeForm(true);
      return;
    }
    const resultId = result._id || result.id;
    if (resultId && resultId.toString().startsWith('mock-')) {
      toast.error('PDF preview is simulated for local fallback data.');
      return;
    }

    const rawPdfUrl = result.pdfUrl || result.cloudinaryUrl || `/api/results/pdf/${resultId}?admin=true`;
    const wrappedUrl = getInlineResumeUrl(rawPdfUrl);
    setViewingExamTitle(result.examTitle || 'Assessment Report');
    setViewingPdfUrl(wrappedUrl);
  };

  const handleInstantDownload = async (result) => {
    if (!isUnlocked) {
      toast.error('🔒 Upgrade Required: PDF downloads are locked for free accounts. Please upgrade your profile.');
      setShowUpgradeForm(true);
      return;
    }
    const resultId = result._id || result.id;
    if (resultId && resultId.toString().startsWith('mock-')) {
      toast.error('PDF download is simulated for local fallback data.');
      return;
    }

    const rawPdfUrl = result.pdfUrl || result.cloudinaryUrl || `/api/results/pdf/${resultId}?admin=true`;
    toast.success(`Downloading "${result.examTitle || 'Report'}" PDF…`);

    try {
      const response = await fetch(rawPdfUrl);
      if (!response.ok) throw new Error('Network error');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Skill_Bridge_Report_${(result.examTitle || 'Assessment').replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const link = document.createElement('a');
      link.href = rawPdfUrl;
      link.target = '_blank';
      link.download = `Skill_Bridge_Report_${resultId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (showUpgradeForm) {
    return (
      <StudentUpgradeForm 
        onBack={() => setShowUpgradeForm(false)} 
        showBack={true} 
        trialTimeRemaining={86400}
      />
    );
  }

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-violet-50 font-sans w-full select-none">

      {/* ── Sidebar (Dark) — Fixed on Desktop, Header on Mobile ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">

        {/* Top: Centered title with back button anchored left */}
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
          <h2 className="text-xl font-bold text-white tracking-wide">My Results</h2>
        </div>

        {/* Avatar & Info */}
        <div className="flex flex-col items-center text-center md:mt-4">
          <div className="w-24 h-24 rounded-full border-4 border-gray-850 shadow-xl mb-4 relative overflow-hidden flex items-center justify-center">
            {profilePhoto ? (
              <img src={profilePhoto} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-orange-400 to-yellow-300 flex items-center justify-center font-extrabold text-white text-3xl">
                {getInitials(name)}
              </div>
            )}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{name}</h2>
          <p className="text-sm text-gray-400 mt-1">{email}</p>
          {mobile && <p className="text-xs text-gray-500 mt-1 font-medium">{mobile}</p>}
        </div>
      </div>

      {/* ── Content Area (Light) — offset by sidebar width on desktop ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-violet-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-6">

        <div className="space-y-6 max-w-4xl mx-auto w-full">

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Stat Card 1 */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-50/50 text-blue-600 flex items-center justify-center text-xl font-bold">
                📝
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Exams</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{results.length}</p>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-50/50 text-purple-600 flex items-center justify-center text-xl font-bold">
                📈
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Score</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">
                  {results.length > 0 
                    ? Math.round(results.reduce((acc, curr) => acc + (typeof curr.score === 'number' ? curr.score : parseInt(curr.score)), 0) / results.length) 
                    : 0}%
                </p>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-50/50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                🎓
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">
                  {results.length > 0 
                    ? Math.round((results.filter(r => r.status === 'Pass').length / results.length) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 2: Results Cards Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400">Retrieving results from secure database...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="text-sm font-bold text-gray-400">No assessment results found.</p>
              </div>
            ) : (
              results.map((result) => (
                <div
                  key={result._id || result.id}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Date & Status Badge */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-400">
                        {new Date(result.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {result.status === 'Pass' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100/50">PASS</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100/50">FAIL</span>
                      )}
                    </div>

                    {/* Middle: Exam Title */}
                    <h3 className="text-xl font-semibold text-gray-900 mt-4 leading-snug group-hover:text-blue-600 transition-colors">
                      {result.examTitle}
                    </h3>
                  </div>

                  {/* Bottom: Score and Action Buttons */}
                  <div className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between border-t border-gray-100 pt-5 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Score</span>
                      <span className={`text-3xl sm:text-4xl font-black tracking-tight ${result.score >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {result.score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {isUnlocked ? (
                        <>
                          {/* In-Site Pop-up Viewer Button */}
                          <button
                            type="button"
                            onClick={() => handleViewPdf(result)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <span>👁️</span>
                            <span>View PDF</span>
                          </button>

                          {/* Instant File Download Button */}
                          <button
                            type="button"
                            onClick={() => handleInstantDownload(result)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <span>📥</span>
                            <span>Download</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleViewPdf(result)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-extrabold text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-all cursor-pointer"
                        >
                          <span>🔒</span>
                          <span>Upgrade Required</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      </main>

      {/* ── In-App Assessment Report Viewer Modal (Matching SUPSS View Resume Design) ── */}
      {viewingPdfUrl && createPortal(
        <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-slate-900 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-700 text-left overflow-hidden relative">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm font-black">
                  📄
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white leading-tight">
                    {viewingExamTitle ? `${viewingExamTitle} - Assessment Report` : 'Assessment Report Preview'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">In-App Document Viewer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingPdfUrl(null);
                  setViewingExamTitle('');
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                aria-label="Close Assessment Report Modal"
              >
                ✕
              </button>
            </div>

            {/* iframe Container */}
            <div className="flex-1 bg-slate-800 w-full h-full overflow-hidden relative">
              <iframe
                src={viewingPdfUrl}
                className="w-full h-full border-0"
                title="In-App Document Viewer"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentResults;
