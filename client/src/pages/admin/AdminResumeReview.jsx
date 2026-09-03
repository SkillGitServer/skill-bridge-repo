import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';
import { getAuthToken, logoutUser } from '../../utils/auth';
import { getInlineResumeUrl } from '../../utils/exportUtils';

function getFullResumeUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${url}`;
  return `/${url}`;
}

function AdminResumeReview() {
  const navigate = useNavigate();
  const location = useLocation();

  const passedStudent = location.state?.student || null;

  const [student, setStudent] = useState(passedStudent);
  const [atsScore, setAtsScore] = useState(85);
  const [formattingFeedback, setFormattingFeedback] = useState('');
  const [impactFeedback, setImpactFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!passedStudent);

  // Bridge AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState(passedStudent?.aiAnalysis || null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [showAiBreakdown, setShowAiBreakdown] = useState(false);

  const studentName = student?.studentName || student?.name || 'Student';
  const studentId = student?.id || student?._id;
  const resumeUrl = student?.resumeUrl || student?.docResume || '';

  useDocumentTitle(`Review ${studentName}'s Resume | Skill Bridge India`);

  useEffect(() => {
    // If student state wasn't passed via location, attempt to fetch from URL params if available
    const searchParams = new URLSearchParams(location.search);
    const paramId = searchParams.get('studentId');
    const targetId = studentId || paramId;

    if (!student && targetId) {
      const fetchStudentReviewData = async () => {
        setIsLoading(true);
        try {
          const token = getAuthToken('vault');
          const res = await axios.get(`/api/admin/student-review/${targetId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.data && res.data.student) {
            setStudent(res.data.student);
            if (res.data.student.aiAnalysis) {
              setAiAnalysis(res.data.student.aiAnalysis);
            }
            if (res.data.student.resumeReview) {
              setAtsScore(res.data.student.resumeReview.atsScore || 85);
              setFormattingFeedback(res.data.student.resumeReview.formattingFeedback || '');
              setImpactFeedback(res.data.student.resumeReview.impactFeedback || '');
            }
          }
        } catch (err) {
          console.error('Failed to fetch student details:', err);
          toast.error('Could not load student resume review details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStudentReviewData();
    } else {
      if (student?.aiAnalysis) {
        setAiAnalysis(student.aiAnalysis);
      }
      if (student?.resumeReview) {
        setAtsScore(student.resumeReview.atsScore || 85);
        setFormattingFeedback(student.resumeReview.formattingFeedback || '');
        setImpactFeedback(student.resumeReview.impactFeedback || '');
      }
      setIsLoading(false);
    }
  }, [student, location.search]);

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const handleRunAiAnalysis = async () => {
    if (!studentId) {
      toast.error('No student selected for AI analysis.');
      return;
    }

    setIsAnalyzingAi(true);
    const loadingToast = toast.loading('Running Bridge AI analysis on student resume...');

    try {
      const token = getAuthToken('vault');
      const res = await axios.post(
        `/api/admin/analyze-student-resume/${studentId}`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      setAiAnalysis(res.data.aiAnalysis);
      if (res.data.aiAnalysis?.score) {
        setAtsScore(res.data.aiAnalysis.score);
      }

      toast.dismiss(loadingToast);
      toast.success('Bridge AI Resume Evaluation completed successfully!');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to run Bridge AI analysis.');
      console.error('Bridge AI analysis error:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!studentId) {
      toast.error("No student selected for review.");
      return;
    }

    if (atsScore < 0 || atsScore > 100) {
      toast.error("ATS Score must be between 0 and 100.");
      return;
    }

    if (!formattingFeedback.trim() || !impactFeedback.trim()) {
      toast.error("Please fill in both feedback sections.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Saving review and notifying student...");

    try {
      const token = getAuthToken('vault');
      await axios.post(
        '/api/admin/resume-review',
        {
          studentId,
          atsScore: Number(atsScore),
          formattingFeedback: formattingFeedback.trim(),
          impactFeedback: impactFeedback.trim()
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      toast.dismiss(loadingToast);
      toast.success(`Review and ATS score successfully submitted to ${studentName}!`);
      navigate('/admin/reviews');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || "Failed to submit resume review.");
      console.error('Submit review error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullPdfUrl = getFullResumeUrl(resumeUrl);
  const streamUrl = resumeUrl ? getInlineResumeUrl(resumeUrl) : (studentId ? `/api/resume/pdf-stream/${studentId}` : '');
  
  const { RefreshButton, RefreshOverlay } = useAdminRefresh();

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/reviews')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Reviews</span>
          </button>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Reviewing: {studentName}'s Resume
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Provide ATS evaluation feedback and formatting critique for candidate profile enhancement.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white/80 rounded-3xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-extrabold text-gray-500">Loading student resume details...</p>
          </div>
        ) : (
          /* Two Column Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column (Real Document Viewer) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col space-y-3 min-h-[650px]">
              
              {/* Header Info & Action */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">📄</span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-gray-900 truncate">
                      {resumeUrl ? (resumeUrl.split('/').pop() || 'Student_Resume.pdf') : 'No resume file'}
                    </p>
                    <span className="text-[10px] text-gray-400 font-semibold">
                      Uploaded candidate document
                    </span>
                  </div>
                </div>

                {streamUrl && (
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all shrink-0 cursor-pointer"
                  >
                    <span>🔗</span> Open PDF in New Tab
                  </a>
                )}
              </div>

              {/* PDF Container */}
              <div className="flex-1 w-full bg-gray-100 rounded-xl overflow-hidden relative flex flex-col items-center justify-center min-h-[600px]">
                {resumeUrl || studentId ? (
                  <object
                    data={streamUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[600px] border-0 rounded-xl"
                  >
                    <iframe
                      src={streamUrl}
                      className="w-full h-full min-h-[600px] border-0 rounded-xl"
                      title={`Resume for ${studentName}`}
                    >
                      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-600">
                        <p className="text-sm font-bold mb-2">Unable to display PDF inline inside iframe.</p>
                        <a
                          href={streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md"
                        >
                          Open Resume Document in New Tab
                        </a>
                      </div>
                    </iframe>
                  </object>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <span className="text-5xl mb-3">⚠️</span>
                    <p className="text-sm font-bold text-gray-700">No Resume Uploaded</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      The candidate has not uploaded a PDF resume yet.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column (Feedback Form & Bridge AI Score) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between space-y-6">
              
              {/* ── Bridge AI Evaluation Card for Mentor ── */}
              <div className="bg-gradient-to-br from-orange-50/90 to-amber-50/90 rounded-2xl p-5 border border-orange-200/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-orange-950">Bridge AI Evaluation</h4>
                      <p className="text-[10px] text-orange-700 font-medium">Automated ATS & Keyword Parser Result</p>
                    </div>
                  </div>

                  {aiAnalysis ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black font-mono text-orange-950">
                        {aiAnalysis.score}%
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRunAiAnalysis}
                      disabled={isAnalyzingAi}
                      className="px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isAnalyzingAi ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Analyzing...
                        </>
                      ) : (
                        <>⚡ Run Bridge AI Analysis</>
                      )}
                    </button>
                  )}
                </div>

                {aiAnalysis ? (
                  <div className="space-y-3 pt-2 border-t border-orange-200/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-700">
                        Bridge AI ATS Score: <strong className="text-orange-600 font-mono text-sm">{aiAnalysis.score}%</strong>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAtsScore(aiAnalysis.score)}
                          className="px-3 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          Use AI Score ({aiAnalysis.score}%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAiBreakdown(!showAiBreakdown)}
                          className="px-3 py-1 bg-orange-200 hover:bg-orange-300 text-orange-900 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer"
                        >
                          {showAiBreakdown ? 'Hide Breakdown' : 'View AI Breakdown'}
                        </button>
                      </div>
                    </div>

                    {showAiBreakdown && (
                      <div className="space-y-3 pt-3 border-t border-orange-200/50 text-left animate-fade-in-up">
                        {/* AI Metrics */}
                        {aiAnalysis.metrics && aiAnalysis.metrics.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">AI Metric Breakdown</p>
                            <div className="grid grid-cols-2 gap-2">
                              {aiAnalysis.metrics.map(m => (
                                <div key={m.name} className="bg-white/90 p-2 rounded-xl border border-orange-100 flex justify-between items-center text-xs font-bold text-gray-700">
                                  <span>{m.name}</span>
                                  <span className="font-mono text-orange-600">{m.value}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Suggestions */}
                        {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">AI Suggestions & Critiques</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {aiAnalysis.suggestions.map((s, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-white/95 border border-orange-150 text-xs font-medium text-gray-700 leading-relaxed shadow-2xs">
                                  <span className="font-extrabold text-orange-600 mr-1">[{s.type}]:</span> {s.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-orange-700 font-medium">
                    Bridge AI analysis has not been executed for this candidate yet. Click the button above to trigger live LLM resume parsing.
                  </p>
                )}
              </div>

              {/* ── Mentor Feedback Form ── */}
              <form onSubmit={handleSubmitReview} className="space-y-6">
                
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-1">Mentor Evaluation & Custom Feedback</h3>
                  <p className="text-xs text-gray-400">Score recommendations and formatting review criteria below.</p>
                </div>

                {/* ATS Score */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                      Assigned ATS Score (%)
                    </label>
                    {aiAnalysis && (
                      <button
                        type="button"
                        onClick={() => setAtsScore(aiAnalysis.score)}
                        className="text-[10px] font-bold text-orange-600 hover:underline"
                      >
                        Match Bridge AI Score ({aiAnalysis.score}%)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={atsScore}
                      onChange={(e) => setAtsScore(Number(e.target.value))}
                      className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-sm font-extrabold text-gray-900"
                      required
                    />
                    <div className="w-full bg-gray-150 h-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          atsScore >= 80 ? 'bg-emerald-500' : atsScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${atsScore}%` }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Formatting & Keywords Feedback */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Formatting & Keywords Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={formattingFeedback}
                    onChange={(e) => setFormattingFeedback(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-sm font-medium leading-relaxed"
                    placeholder="Detail spacing, margins, keyword alignment, or parser compatibility comments..."
                    required
                  />
                </div>

                {/* Impact & Action Verbs Feedback */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                    Impact & Action Verbs Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={impactFeedback}
                    onChange={(e) => setImpactFeedback(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-sm font-medium leading-relaxed"
                    placeholder="Review verbs used, metrics quantizations, and responsibility achievements..."
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/reviews')}
                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel Review
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>
        )}

      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminResumeReview;
