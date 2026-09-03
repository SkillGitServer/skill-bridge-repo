import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAuthToken } from '../../utils/auth';
import { getInlineResumeUrl } from '../../utils/exportUtils';

function PreviousOpeningsList() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [viewingResumeUrl, setViewingResumeUrl] = useState(null);
  const [viewingStudentName, setViewingStudentName] = useState('');

  const fetchJobs = async () => {
    if (jobs.length === 0) setIsLoading(true);
    try {
      const token = getAuthToken('supss') || localStorage.getItem('supss_token') || sessionStorage.getItem('supss_token') || localStorage.getItem('auth_token');
      const res = await axios.get('/api/super-admin/jobs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const fetchedJobs = res.data || [];
      setJobs(fetchedJobs);

      if (selectedJob) {
        const updated = fetchedJobs.find(j => (j._id || j.id) === (selectedJob._id || selectedJob.id));
        if (updated) setSelectedJob(updated);
      }
    } catch (err) {
      console.error('Failed to fetch previous openings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const handleUpdate = () => fetchJobs();
    window.addEventListener('job_queue_updated', handleUpdate);
    return () => {
      window.removeEventListener('job_queue_updated', handleUpdate);
    };
  }, []);

  const previousJobs = jobs.filter(j => j.status === 'archived' || j.status === 'declined');

  const handleRestoreToLive = async (jobId) => {
    try {
      const token = getAuthToken('supss') || localStorage.getItem('supss_token') || sessionStorage.getItem('supss_token') || localStorage.getItem('auth_token');
      await axios.put(`/api/admin/jobs/${jobId}/status`, 
        { status: 'approved' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Job restored to Live Published Jobs!');
      window.dispatchEvent(new Event('job_queue_updated'));
    } catch (err) {
      console.error('Failed to restore job:', err);
      toast.error('Failed to restore job.');
    }
  };

  const [jobToDelete, setJobToDelete] = useState(null);

  const confirmPermanentDelete = async () => {
    if (!jobToDelete) return;
    try {
      const token = getAuthToken('supss') || localStorage.getItem('supss_token') || sessionStorage.getItem('supss_token') || localStorage.getItem('auth_token');
      await axios.delete(`/api/jobs/${jobToDelete._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Job posting permanently deleted.');
      setJobToDelete(null);
      window.dispatchEvent(new Event('job_queue_updated'));
    } catch (err) {
      console.error('Failed to delete job:', err);
      toast.error('Failed to delete job posting.');
    }
  };

  const filteredApplicants = selectedJob?.applicants ? selectedJob.applicants.filter(a => {
    const s = a.studentId || {};
    const q = applicantSearch.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.mobile || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q)
    );
  }) : [];

  const getInitialsAvatar = (name = 'Candidate') => {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
        {initials}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 border border-gray-800 shadow-xl rounded-3xl p-6 md:p-8 text-left text-white mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📁</span>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Previous Openings
              <span className="bg-gray-800 text-gray-300 border border-gray-700 font-mono font-extrabold px-2.5 py-0.5 rounded-full text-xs shadow-sm">
                {previousJobs.length} Archived
              </span>
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-semibold mt-1">
            Historical list of closed and archived corporate positions. Applicants data remains preserved for audit and review.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3 text-gray-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold">Loading previous openings history...</p>
        </div>
      ) : previousJobs.length === 0 ? (
        <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
          <span className="text-3xl">📁</span>
          <p className="text-sm font-bold text-gray-300 mt-2">No previous openings in history</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Jobs moved or deleted from live postings will appear in this bottom banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {previousJobs.map((job) => {
            const applicantCount = job.applicants ? job.applicants.length : 0;
            return (
              <div
                key={job._id}
                className="bg-gray-800/80 border border-gray-700/80 hover:border-gray-600 rounded-2xl p-5 flex flex-col justify-between transition-all text-left shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400">
                        {job.company}
                      </span>
                      <h3 className="text-base font-black text-white leading-tight mt-0.5">
                        {job.title}
                      </h3>
                    </div>
                    <span className="bg-gray-700 text-gray-300 border border-gray-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0">
                      Closed
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3 text-[10px] font-bold">
                    <span className="bg-gray-900/80 text-gray-300 px-2 py-0.5 rounded-md border border-gray-700">
                      📍 {job.location || 'Remote'}
                    </span>
                    <span className="bg-purple-950/60 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded-md">
                      💼 {job.jobType || 'Full-Time'}
                    </span>
                    <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 font-mono px-2 py-0.5 rounded-md">
                      💰 {job.salary || 'Not Disclosed'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700/60 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>👥</span>
                    <span>Applicants ({applicantCount})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRestoreToLive(job._id)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Restore job to Live Published list"
                    >
                      <span>🔄 Restore</span>
                    </button>
                    <button
                      onClick={() => setJobToDelete(job)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                      title="Permanently delete job record"
                    >
                      <span>🗑️ Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Applicants Modal (Rendered via React Portal directly to document.body) ── */}
      {selectedJob && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 text-left overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-gray-950 text-white flex items-center justify-between border-b border-gray-800 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
                  {selectedJob.company} (Previous Opening)
                </span>
                <h3 className="text-xl font-black text-white leading-tight">
                  Applicants for {selectedJob.title}
                </h3>
                <p className="text-xs text-gray-300 font-medium mt-0.5">
                  Total {selectedJob.applicants ? selectedJob.applicants.length : 0} student application(s) submitted
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setApplicantSearch('');
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0 flex items-center gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search applicants by name, email, mobile, city..."
                  value={applicantSearch}
                  onChange={(e) => setApplicantSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {applicantSearch && (
                <button
                  onClick={() => setApplicantSearch('')}
                  className="text-xs text-gray-500 hover:text-gray-700 font-bold px-2 py-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Modal Applicants List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {filteredApplicants.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl border border-gray-150">
                  {applicantSearch ? 'No applicants match your search criteria.' : 'No students applied for this previous opening.'}
                </div>
              ) : (
                filteredApplicants.map((app, idx) => {
                  const student = app.studentId || {};
                  return (
                    <div
                      key={student._id || idx}
                      className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        {student.profilePhoto ? (
                          <img
                            src={student.profilePhoto}
                            alt={student.name}
                            className="w-11 h-11 rounded-full object-cover border border-indigo-200 shadow-xs shrink-0"
                          />
                        ) : (
                          getInitialsAvatar(student.name || 'Candidate')
                        )}
                        <div>
                          <h4 className="text-sm font-black text-gray-900 leading-tight">
                            {student.name || 'Anonymous Student'}
                          </h4>
                          <div className="text-xs text-gray-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                            <span>📧 {student.email || 'N/A'}</span>
                            {student.mobile && (
                              <a href={`tel:${student.mobile}`} className="text-indigo-600 hover:underline font-bold">
                                📞 {student.mobile}
                              </a>
                            )}
                          </div>
                          {(student.city || student.state) && (
                            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              📍 {student.city ? `${student.city}, ` : ''}{student.state || ''}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5 shrink-0 border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0">
                        <div className="text-[10px] text-gray-400 font-mono">
                          Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleString() : 'N/A'}
                        </div>
                        {student.docResume ? (
                          <button
                            type="button"
                            onClick={() => {
                              setViewingStudentName(student.name || 'Candidate');
                              setViewingResumeUrl(getInlineResumeUrl(student.docResume));
                            }}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <span>📄</span>
                            <span>View Resume</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                            No Resume Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-right shrink-0">
              <button
                onClick={() => {
                  setSelectedJob(null);
                  setApplicantSearch('');
                }}
                className="bg-gray-900 hover:bg-black text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Close Applicants View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Custom Delete Confirmation Modal ── */}
      {jobToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-gray-900">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-left space-y-4 relative animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 text-2xl shadow-xs">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Permanently Delete Job?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                Are you sure you want to permanently delete <strong>"{jobToDelete.title}"</strong> ({jobToDelete.company})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── In-App Resume Viewer Modal (Embedded iframe) ── */}
      {viewingResumeUrl && createPortal(
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
                    {viewingStudentName ? `${viewingStudentName}'s Resume` : 'Resume Preview'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">In-App Document Viewer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingResumeUrl(null);
                  setViewingStudentName('');
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-base cursor-pointer transition-colors"
                aria-label="Close Resume Modal"
              >
                ✕
              </button>
            </div>

            {/* iframe Container */}
            <div className="flex-1 bg-slate-800 w-full h-full overflow-hidden relative">
              <iframe
                src={viewingResumeUrl}
                className="w-full h-full border-0"
                title="Resume Viewer"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PreviousOpeningsList;
