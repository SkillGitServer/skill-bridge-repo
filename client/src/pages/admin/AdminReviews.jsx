import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';
import { getAuthToken, logoutUser } from '../../utils/auth';
import { getInlineResumeUrl } from '../../utils/exportUtils';

function AdminReviews() {
  useDocumentTitle('Student Docs Queue | Skill Bridge India');
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = getAuthToken('vault');

  // Search Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Accordion Collapsible State: Map of student.id -> boolean
  const [expandedStudentIds, setExpandedStudentIds] = useState({});

  // Modal State for viewing student documents in-app
  const [viewingDoc, setViewingDoc] = useState(null); // { title, studentName, url }

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/admin/pending-reviews', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch pending reviews:', err);
      toast.error('Failed to load student documents queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchReviews);

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  // Toggle individual student accordion expansion
  const toggleStudentExpand = (id) => {
    setExpandedStudentIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle Expand All / Collapse All
  const areAllExpanded = reviews.length > 0 && reviews.every(s => expandedStudentIds[s.id]);
  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedStudentIds({});
    } else {
      const allMap = {};
      reviews.forEach(s => { allMap[s.id] = true; });
      setExpandedStudentIds(allMap);
    }
  };

  // Filter student list based on search query
  const displayedReviews = reviews.filter((student) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = student.studentName?.toLowerCase().includes(q);
      const matchEmail = student.email?.toLowerCase().includes(q);
      const matchMobile = student.mobile?.toLowerCase().includes(q);
      const matchRef = student.adminReferralCode?.toLowerCase().includes(q);
      return matchName || matchEmail || matchMobile || matchRef;
    }
    return true;
  });

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleExpandAll}
              className="bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{areAllExpanded ? '▲ Collapse All' : '▼ Expand All'}</span>
            </button>
            <div className="text-xs font-bold text-gray-500 bg-white/80 border border-gray-200 px-3.5 py-1.5 rounded-xl shadow-xs">
              📂 Candidates: <span className="text-indigo-600 font-black">{reviews.length}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Student Docs Verification</h1>
          <p className="text-xs text-gray-400 mt-1">Click any student row or the arrow button (▼) to expand and view 10th marksheets, 12th marksheets, and resumes</p>
        </div>

        {/* Reviews Queue Container */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl overflow-hidden p-6">
          
          {/* Header Bar */}
          <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-gray-900">Student Verification Queue</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 self-start sm:self-auto">
              ⏳ Showing {displayedReviews.length} of {reviews.length} Candidates
            </span>
          </div>

          {/* ── Search Filter Bar ── */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-blue-50/90 border border-indigo-100/80 rounded-2xl p-3.5 my-5 flex items-center gap-3">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search candidate by name, email, mobile, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-indigo-200/80 pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
              />
              <span className="absolute left-3 top-2.5 text-xs">🔍</span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Student Cards List */}
          <div className="space-y-4 pt-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white rounded-2xl">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-extrabold text-gray-500">Loading candidate verification documents...</p>
              </div>
            ) : displayedReviews.length === 0 ? (
              <div className="text-center text-xs text-gray-400 font-bold py-12 bg-white rounded-2xl">
                {searchTerm ? 'No matching student found.' : 'No uploaded student documents yet.'}
              </div>
            ) : (
              displayedReviews.map((student) => {
                const isExpanded = Boolean(expandedStudentIds[student.id]);

                return (
                  <div 
                    key={student.id} 
                    className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
                  >
                    {/* ── Collapsible Student Bar Header (Clickable) ── */}
                    <div 
                      onClick={() => toggleStudentExpand(student.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-indigo-50/40 transition-colors cursor-pointer select-none"
                    >
                      {/* Left: Avatar & Candidate Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {student.profilePhoto ? (
                          <img 
                            src={student.profilePhoto} 
                            alt={student.studentName} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-indigo-100 shadow-xs shrink-0" 
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-sm text-indigo-700 shrink-0">
                            {student.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-black text-gray-900 leading-tight truncate">
                              {student.studentName}
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider shrink-0">
                              📂 {student.docCount || 0} File(s)
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-semibold mt-1">
                            <span>📧 {student.email}</span>
                            <span>📱 {student.mobile || 'N/A'}</span>
                            {student.adminReferralCode && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                Code: {student.adminReferralCode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Date & Interactive Arrow Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="text-[11px] font-bold text-gray-400">{student.time}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStudentExpand(student.id);
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all cursor-pointer ${
                            isExpanded 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                          }`}
                          title={isExpanded ? 'Collapse documents' : 'Expand to view documents'}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* ── Collapsible Document Details Body (Only rendered when expanded) ── */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-gradient-to-b from-indigo-50/30 to-slate-50/50 border-t border-gray-150 space-y-3 animate-fadeIn">
                        
                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          📑 Uploaded Qualification & Verification Files
                        </div>

                        {/* 1. 10th Marksheet Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-xl p-3.5 gap-2 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                              📄
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900">10th Grade Marksheet</p>
                              <p className="text-[11px] text-gray-500 font-medium">
                                {student.percentage10th ? `Scored: ${student.percentage10th}%` : 'Percentage record'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {student.docGrade10 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc({
                                    title: '10th Marksheet',
                                    studentName: student.studentName,
                                    url: student.docGrade10
                                  })}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>👁️</span> <span>View 10th Marksheet</span>
                                </button>
                                <a
                                  href={student.docGrade10}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                  title="Download File"
                                >
                                  ⬇️
                                </a>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2.5 py-1 rounded-md">
                                Not Uploaded
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. 12th Marksheet Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-xl p-3.5 gap-2 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0">
                              📜
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900">12th Grade Marksheet</p>
                              <p className="text-[11px] text-gray-500 font-medium">
                                {student.percentage12th ? `Scored: ${student.percentage12th}%` : 'Percentage record'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {student.docGrade12 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc({
                                    title: '12th Marksheet',
                                    studentName: student.studentName,
                                    url: student.docGrade12
                                  })}
                                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>👁️</span> <span>View 12th Marksheet</span>
                                </button>
                                <a
                                  href={student.docGrade12}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                  title="Download File"
                                >
                                  ⬇️
                                </a>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2.5 py-1 rounded-md">
                                Not Uploaded
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. Resume Document Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-xl p-3.5 gap-2 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                              📑
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900">Student Resume Document</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {student.reviewStatus === 'reviewed' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                    ✅ Reviewed ({student.resumeReview?.atsScore || 85}% ATS)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase tracking-wider">
                                    ⏳ Pending Review
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {student.docResume ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc({
                                    title: 'Candidate Resume',
                                    studentName: student.studentName,
                                    url: student.docResume
                                  })}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>👁️</span> <span>View Resume</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate('/admin/resume-review', { state: { student: student } })}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>📝</span> <span>ATS Review</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2.5 py-1 rounded-md">
                                Not Uploaded
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* ── In-App Document Viewer Modal ── */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-left">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg">
                  📄
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate">
                    {viewingDoc.title} — {viewingDoc.studentName}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">In-App Document Viewer</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={viewingDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-all"
                >
                  <span>🔗</span> Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Google Docs PDF/Image Viewer Iframe */}
            <div className="flex-1 w-full bg-slate-950 p-2 sm:p-4 relative">
              <iframe
                src={getInlineResumeUrl(viewingDoc.url)}
                className="w-full h-full rounded-2xl border border-slate-800 bg-white"
                title={`${viewingDoc.title} - ${viewingDoc.studentName}`}
              />
            </div>

          </div>
        </div>
      )}

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminReviews;
