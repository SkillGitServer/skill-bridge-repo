import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { decodeToken, getAuthToken } from '../../utils/auth';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';

function JobBoard() {
  useDocumentTitle('Career Matcher | Skill Bridge India');
  const navigate = useNavigate();

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [roleQuery, setRoleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const token = getAuthToken('spark');
  const decodedToken = decodeToken(token);
  const currentStudentId = decodedToken?.id;

  const isJobApplied = (job) => {
    if (!job || !job.applicants || !currentStudentId) return false;
    return job.applicants.some(a => {
      const applicantId = typeof a.studentId === 'object' ? a.studentId?._id : a.studentId;
      return applicantId && applicantId.toString() === currentStudentId.toString();
    });
  };

  useEffect(() => {
    const checkUpgradeStatus = async () => {
      try {
        if (!token) return;
        const res = await axios.get('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setIsUnlocked(Boolean(res.data.isUnlocked));
        }
      } catch (err) {
        console.warn('Failed to verify student profile upgrade status in JobBoard:', err);
      }
    };
    checkUpgradeStatus();
  }, [token]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get('/api/jobs', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const jobData = Array.isArray(res.data) ? res.data : [];
        setAllJobs(jobData);
        setFilteredJobs(jobData);
      } catch (err) {
        console.log('No backend job listings found or error fetching jobs:', err);
        setAllJobs([]);
        setFilteredJobs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [token]);

  const handleSearch = (e) => {
    e.preventDefault();
    const filtered = allJobs.filter((job) => {
      const matchRole = (job.title || '').toLowerCase().includes(roleQuery.toLowerCase()) ||
        (job.company || '').toLowerCase().includes(roleQuery.toLowerCase());
      const matchLoc = (job.location || '').toLowerCase().includes(locationQuery.toLowerCase());
      return matchRole && matchLoc;
    });
    setFilteredJobs(filtered);
  };

  const handleLockedAction = (actionName = 'Feature') => {
    toast.error(`🔒 Upgrade Required: ${actionName} is exclusive to Pro & Premium members. Please upgrade your profile!`, {
      duration: 3500,
    });
    setShowUpgradeModal(true);
  };

  const handleApply = async (job) => {
    if (!isUnlocked) {
      handleLockedAction('Job Application');
      return;
    }

    const targetJobId = job._id || job.id;
    if (isJobApplied(job)) {
      toast.error('You have already applied for this job.');
      return;
    }

    setApplyingJobId(targetJobId);
    try {
      const res = await axios.post(`/api/jobs/${targetJobId}/apply`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data.success) {
        toast.success(res.data.message || `Application submitted for ${job.title}!`);

        // Dynamically update local job state
        const newApplicantObj = {
          studentId: currentStudentId,
          appliedAt: res.data.appliedAt || new Date()
        };

        const updateState = (prevJobs) =>
          prevJobs.map(j => {
            if ((j._id || j.id) === targetJobId) {
              return {
                ...j,
                applicants: [...(j.applicants || []), newApplicantObj]
              };
            }
            return j;
          });

        setAllJobs(updateState);
        setFilteredJobs(updateState);
      }
    } catch (err) {
      console.error('Failed to submit job application:', err);
      toast.error(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/25 to-amber-50/35 font-sans w-full select-none text-slate-900">
        
        {/* ── Top Hero / Career Matcher Banner (Sleek Modern Dark Gradient) ── */}
        <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.35)] flex flex-col z-10 bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pt-6 pb-16 border-b border-white/10">
          
          {/* Ambient Glow Accents */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-tr from-indigo-600/25 via-violet-500/15 to-transparent rounded-full blur-[90px] pointer-events-none" />

          {/* Header Bar: Back Button & Title */}
          <div className="flex items-center justify-center relative w-full mb-6 md:mb-8 z-10">
            <Link
              to="/student/dashboard"
              className="absolute left-0 p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full transition-all text-white backdrop-blur-md shadow-sm hover:scale-105 active:scale-95"
              aria-label="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-base">💼</span>
              <h1 className="text-base md:text-lg font-black text-white tracking-wider uppercase">
                Career Matcher
              </h1>
            </div>
          </div>

          {/* Feature Badge, Icon & Headline */}
          <div className="flex flex-col items-center text-center md:mt-2 z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-pink-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Corporate Hiring Network</span>
            </div>

            <div className="relative group mb-4">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-2 border-white/25 shadow-2xl flex items-center justify-center text-4xl md:text-5xl backdrop-blur-xl">
                💼
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Placement & Opportunity <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">Matcher</span>
            </h2>
            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-lg mt-2 leading-relaxed px-4">
              Discover verified roles and corporate internships aligned with your academic credentials and verified skill evaluations.
            </p>
          </div>
        </div>

        {/* ── Content Canvas (Light Modern Surface) ── */}
        <main className="relative z-20 -mt-10 bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-6 shadow-[0_-12px_35px_rgba(0,0,0,0.06)]">
          <div className="space-y-6 max-w-5xl mx-auto w-full">

            {/* ── Header Row & Filter Box ── */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] border border-slate-200/80 p-6 md:p-8 flex flex-col gap-6 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-600" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                      Active Opportunities
                    </h2>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
                      {filteredJobs.length} {filteredJobs.length === 1 ? 'Opening' : 'Openings'} Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Search and apply directly to verified corporate openings
                  </p>
                </div>

                {!isUnlocked && (
                  <div className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 px-4 py-2 rounded-2xl shrink-0 shadow-xs">
                    <span className="text-amber-600 text-sm">🔒</span>
                    <span className="text-[11px] font-extrabold text-amber-900">Preview Mode</span>
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="ml-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-xl shadow-xs active:scale-95 cursor-pointer transition-all"
                    >
                      Upgrade to Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Form */}
              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                    Search Role / Company
                  </label>
                  <input
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="e.g. Associate, Analyst, Engineer"
                    className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-xs font-semibold text-slate-900 placeholder:text-slate-400 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 pl-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="e.g. Remote, Mumbai, Delhi, Bengaluru"
                    className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-xs font-semibold text-slate-900 placeholder:text-slate-400 shadow-inner"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-black hover:via-indigo-900 hover:to-black text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-950/20 hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <span>Search Openings</span>
                    <span>🔍</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── Cards Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <div
                    key={job._id || job.id}
                    className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_45px_rgba(99,102,241,0.13)] border border-slate-200/80 hover:border-indigo-400/50 flex flex-col hover:-translate-y-1.5 transition-all duration-300 text-left justify-between group relative overflow-hidden"
                  >
                    {/* Hover ambient accent glow */}
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-amber-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform pointer-events-none" />

                    <div>
                      {/* Top Row: Company Avatar & Title */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-indigo-500/15 border border-amber-300/40 flex items-center justify-center text-xl shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                          {job.logo || '💼'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-wider leading-tight truncate group-hover:text-indigo-700 transition-colors">
                            {job.company}
                          </h4>
                          <h3 className="text-base font-black text-slate-900 mt-1 leading-tight group-hover:text-indigo-950 transition-colors line-clamp-2">
                            {job.title}
                          </h3>
                        </div>
                      </div>

                      {/* Pill Badges */}
                      <div className="flex flex-wrap gap-2 mb-3.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-[10px] font-bold text-slate-700 shadow-2xs">
                          <span>📍</span> {job.location || 'Remote'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 text-[10px] font-extrabold text-indigo-700 shadow-2xs">
                          <span>💼</span> {job.jobType || job.type || 'Full-Time'}
                        </span>
                      </div>

                      {/* Job Description Box */}
                      {job.description && (
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-150 font-medium">
                          {job.description}
                        </p>
                      )}
                    </div>

                    {/* Salary and Action Buttons */}
                    <div className="border-t border-slate-150 pt-4 mt-auto space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Package / Stipend
                          </span>
                          <span className="text-xs md:text-sm font-black text-slate-900 font-mono mt-0.5 flex items-center gap-1 text-emerald-600">
                            💰 {job.salary || 'Competitive'}
                          </span>
                        </div>

                        {!isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleLockedAction('Job Application')}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-[11px] shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                            title="Upgrade profile to apply"
                          >
                            <span>🔒</span> <span>Unlock to Apply</span>
                          </button>
                        ) : isJobApplied(job) ? (
                          <button
                            disabled
                            className="bg-emerald-50 text-emerald-700 font-extrabold px-4 py-2.5 rounded-xl text-[11px] border border-emerald-300 cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                          >
                            <span>✓</span> <span>Applied</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApply(job)}
                            disabled={applyingJobId === (job._id || job.id)}
                            className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-600 text-white font-black px-4 py-2.5 rounded-xl text-[11px] shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {applyingJobId === (job._id || job.id) ? (
                              'Applying...'
                            ) : (
                              <>
                                <span>Apply Now</span>
                                <span>🚀</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Official Career Link */}
                      {job.applyLink && job.applyLink.trim() && (
                        !isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleLockedAction('Official Career Link')}
                            className="w-full bg-amber-50/70 hover:bg-amber-100/90 text-amber-800 border border-amber-200/80 font-bold py-2.5 px-3 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                          >
                            <span>🔒</span> <span>Official Career Link</span> <span className="text-[9px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-extrabold">Upgrade Req.</span>
                          </button>
                        ) : (
                          <a
                            href={job.applyLink.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-slate-50/90 hover:bg-slate-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200/80 font-bold py-2.5 px-3.5 rounded-xl text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                          >
                            <span>🌐</span> <span>Official Career Link</span> <span>↗</span>
                          </a>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : isLoading ? (
                <div className="col-span-full bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-sm border border-slate-200/80 text-center flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold text-slate-500">Matching Verified Job Postings...</span>
                </div>
              ) : allJobs.length === 0 ? (
                <div className="col-span-full bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-sm border border-slate-200/80 text-center flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-center text-3xl shadow-xs">
                    💼
                  </div>
                  <h3 className="text-base font-black text-slate-900">No Job Openings Posted Yet</h3>
                  <p className="text-xs text-slate-500 font-semibold max-w-md leading-relaxed">
                    Administrators have not uploaded any active job postings on the portal yet. Please check back later for verified corporate positions and placement opportunities!
                  </p>
                </div>
              ) : (
                <div className="col-span-full bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-sm border border-slate-200/80 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-4">🔎</span>
                  <h3 className="text-base font-black text-slate-900">No jobs match your search criteria</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Try resetting your filters or exploring different keywords.</p>
                  <button
                    onClick={() => {
                      setRoleQuery('');
                      setLocationQuery('');
                      setFilteredJobs(allJobs);
                    }}
                    className="mt-4 px-5 py-3 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-xs font-extrabold text-slate-700 cursor-pointer transition-all shadow-xs"
                  >
                    Reset Search Filters ↺
                  </button>
                </div>
              )}
            </div>

          </div>
        </main>

        <footer className="w-full text-center py-6 text-xs text-slate-400 font-semibold tracking-wide border-t border-slate-200/80 bg-white/60 backdrop-blur-md mt-auto z-20">
          Skill Bridge India • Career Matcher Network
        </footer>

        {/* ── Upgrade Prompt Modal ── */}
        {showUpgradeModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowUpgradeModal(false)}
          >
            <div 
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Accent Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-amber-400/25 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Close button */}
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-amber-500/30">
                💼
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 inline-block mb-2 border border-amber-200">
                Placement Network Access
              </span>

              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Complete Profile to Apply
              </h3>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Direct portal applications, verified candidate recommendations, and corporate placement links require complete student academic credentials.
              </p>

              {/* Benefits checklist */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-5 text-left text-xs space-y-2.5 text-slate-700">
                <div className="flex items-center gap-2.5 font-semibold">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                  <span>1-Click direct job & internship applications</span>
                </div>
                <div className="flex items-center gap-2.5 font-semibold">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                  <span>Verified candidate recommendation to hiring partners</span>
                </div>
                <div className="flex items-center gap-2.5 font-semibold">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                  <span>Unrestricted access to official external career links</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/student/complete-profile');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:via-teal-600 hover:to-indigo-700 text-white font-black rounded-2xl text-xs tracking-wide shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer uppercase"
                >
                  Complete Student Profile 🚀
                </button>

                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PullToRefreshWrapper>
  );
}

export default JobBoard;
