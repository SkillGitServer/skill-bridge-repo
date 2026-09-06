import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { decodeToken, getAuthToken } from '../../utils/auth';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';

function JobBoard() {
  useDocumentTitle('Job Board | Skill Bridge India');

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [roleQuery, setRoleQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState(null);

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

  const handleApply = async (job) => {
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
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50 font-sans w-full select-none">
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
          <h2 className="text-xl font-bold text-white tracking-wide">Job Board</h2>
        </div>

        {/* Feature Icon & Info */}
        <div className="flex flex-col items-center text-center md:mt-8">
          <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/15 shadow-xl mb-6 flex items-center justify-center text-4xl">
            💼
          </div>
          <h3 className="text-lg font-bold tracking-tight">Career Matchmaker</h3>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed px-4">
            Discover verified jobs and corporate internships tailored to match your verified skill levels and profiles.
          </p>
        </div>
      </div>

      {/* ── Content Area (Light) ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-orange-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-6">
        <div className="space-y-6 max-w-4xl mx-auto w-full">

          {/* Header Row & Filters */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/40 p-6 md:p-8 flex flex-col gap-6 text-left">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Active Opportunities</h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">Filter and apply to verified positions</p>
            </div>

            {/* Filter Form */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Search Role / Company</label>
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  placeholder="e.g. SBI Officer, SSC, ONGC, Data Analyst"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-xs font-semibold text-gray-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Location</label>
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="e.g. New Delhi, Mumbai, All India"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-xs font-semibold text-gray-900"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-900 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  Search Jobs 🔍
                </button>
              </div>
            </form>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div
                  key={job._id || job.id}
                  className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-white/40 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300 text-left justify-between"
                >
                  <div>
                    {/* Top row details */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-lg shrink-0">
                        {job.logo || '💼'}
                      </div>
                      <div>
                        <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider leading-none">
                          {job.company}
                        </h4>
                        <h3 className="text-sm font-black text-gray-900 mt-1.5 leading-tight">
                          {job.title}
                        </h3>
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-extrabold text-gray-500">
                        📍 {job.location || 'Remote'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-extrabold text-orange-600">
                        💼 {job.jobType || job.type || 'Full-Time'}
                      </span>
                    </div>

                    {job.description && (
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed mb-4 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                        {job.description}
                      </p>
                    )}
                  </div>

                  {/* Salary and Apply actions */}
                  <div className="border-t border-gray-150 pt-4 mt-auto space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">
                          Salary Range
                        </span>
                        <span className="text-xs font-black text-gray-900 font-mono mt-0.5">
                          {job.salary || 'Not Disclosed'}
                        </span>
                      </div>
                      {isJobApplied(job) ? (
                        <button
                          disabled
                          className="bg-emerald-50 text-emerald-700 font-extrabold px-4 py-2.5 rounded-xl text-[11px] border border-emerald-200 cursor-not-allowed flex items-center gap-1.5 shadow-xs"
                        >
                          <span>✓</span> <span>Applied</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApply(job)}
                          disabled={applyingJobId === (job._id || job.id)}
                          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-[11px] shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {applyingJobId === (job._id || job.id) ? (
                            'Applying...'
                          ) : (
                            'Apply via Portal'
                          )}
                        </button>
                      )}
                    </div>

                    {job.applyLink && job.applyLink.trim() && (
                      <a
                        href={job.applyLink.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gray-50 hover:bg-gray-100 text-indigo-700 border border-indigo-200/60 font-bold py-2 px-3 rounded-xl text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shadow-xs"
                      >
                        <span>🌐</span> <span>Official Career Link</span> <span>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : isLoading ? (
              <div className="col-span-full bg-white/80 backdrop-blur-md rounded-3xl p-12 shadow-sm border border-white/40 text-center flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-gray-400">Loading Job Postings...</span>
              </div>
            ) : allJobs.length === 0 ? (
              <div className="col-span-full bg-white/80 backdrop-blur-md rounded-3xl p-12 shadow-sm border border-white/40 text-center flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-3xl">
                  💼
                </div>
                <h3 className="text-base font-extrabold text-gray-900">No Job Openings Posted Yet</h3>
                <p className="text-xs text-gray-400 font-semibold max-w-md leading-relaxed">
                  Administrators have not uploaded any active job postings on the portal yet. Please check back later for verified corporate positions and placement opportunities!
                </p>
              </div>
            ) : (
              <div className="col-span-full bg-white/80 backdrop-blur-md rounded-3xl p-12 shadow-sm border border-white/40 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-4">🔎</span>
                <h3 className="text-base font-extrabold text-gray-900">No jobs match your search</h3>
                <p className="text-xs text-gray-400 font-semibold mt-1">Try resetting the search filters or using other keywords.</p>
                <button
                  onClick={() => {
                    setRoleQuery('');
                    setLocationQuery('');
                    setFilteredJobs(allJobs);
                  }}
                  className="mt-4 px-5 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-extrabold text-gray-700 cursor-pointer min-h-[44px]"
                >
                  Reset Search Filter
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
      </div>
    </PullToRefreshWrapper>
  );
}

export default JobBoard;
