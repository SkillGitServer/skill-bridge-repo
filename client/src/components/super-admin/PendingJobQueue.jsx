import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

function PendingJobQueue({ onJobAction }) {
  const [pendingJobs, setPendingJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPendingJobs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get('/api/admin/jobs/pending', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPendingJobs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending jobs:', err);
      toast.error('Failed to load pending job queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const handleApprove = async (jobId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`/api/admin/jobs/${jobId}/status`, 
        { status: 'approved' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Job approved and published to Student Portal!');
      setPendingJobs(prev => prev.filter(j => j._id !== jobId));
      window.dispatchEvent(new Event('job_queue_updated'));
      if (onJobAction) onJobAction();
    } catch (err) {
      console.error('Failed to approve job:', err);
      toast.error('Failed to approve job.');
    }
  };

  const [jobToDecline, setJobToDecline] = useState(null);

  const confirmDeclineJob = async () => {
    if (!jobToDecline) return;
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`/api/admin/jobs/${jobToDecline._id}/status`, 
        { status: 'declined' },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      toast.success('Job submission declined and moved to history.');
      setPendingJobs(prev => prev.filter(j => j._id !== jobToDecline._id));
      setJobToDecline(null);
      window.dispatchEvent(new Event('job_queue_updated'));
      if (onJobAction) onJobAction();
    } catch (err) {
      console.error('Failed to decline job:', err);
      toast.error('Failed to decline job.');
    }
  };

  const handleSaveAndApproveEdit = async (e) => {
    e.preventDefault();
    if (!editingJob) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(`/api/admin/jobs/${editingJob._id}`, 
        {
          title: editingJob.title,
          company: editingJob.company,
          location: editingJob.location,
          jobType: editingJob.jobType,
          salary: editingJob.salary,
          applyLink: editingJob.applyLink,
          description: editingJob.description,
          status: 'approved'
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      toast.success('Job updated & approved for Student Portal!');
      setPendingJobs(prev => prev.filter(j => j._id !== editingJob._id));
      setEditingJob(null);
      window.dispatchEvent(new Event('job_queue_updated'));
      if (onJobAction) onJobAction();
    } catch (err) {
      console.error('Failed to edit and approve job:', err);
      toast.error('Failed to save job modifications.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg border border-emerald-500/50 shadow-lg rounded-2xl p-6 text-left transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full animate-pulse">
              🟢 Live Super Admin Approval Queue
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mt-1">
            Pending Job Submissions ({pendingJobs.length})
          </h3>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">
            Review, edit, approve, or decline job postings uploaded by platform Admins.
          </p>
        </div>

        <button
          onClick={fetchPendingJobs}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer shrink-0"
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-12 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          Loading pending job postings...
        </div>
      ) : pendingJobs.length === 0 ? (
        <div className="py-12 text-center bg-emerald-50/50 rounded-xl border border-emerald-100">
          <span className="text-3xl">✅</span>
          <p className="text-sm font-bold text-emerald-900 mt-2">All Pending Jobs Reviewed</p>
          <p className="text-xs text-emerald-700 mt-1">No admin job uploads waiting in the queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingJobs.map(job => (
            <div
              key={job._id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                      {job.jobType}
                    </span>
                    <h4 className="text-base font-black text-gray-900 mt-1 leading-tight">{job.title}</h4>
                    <p className="text-xs font-extrabold text-gray-600 mt-0.5">{job.company} • <span className="text-gray-500">{job.location}</span></p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    ⏳ Pending
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-3 line-clamp-3 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {job.description}
                </p>

                <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-400 mt-3">
                  <span>💰 {job.salary}</span>
                  <span>•</span>
                  <span>👤 Uploaded by: {job.uploadedBy}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleApprove(job._id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-sm text-center"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => setEditingJob(job)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold py-2 px-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer text-center"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => setJobToDecline(job)}
                  className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Job Modal (Portaled directly to document.body for full-screen overlay) */}
      {editingJob && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 text-left animate-fade-in-up relative my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Super Admin Review</span>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">Edit & Approve Job Details</h3>
              </div>
              <button
                onClick={() => setEditingJob(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAndApproveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    value={editingJob.title}
                    onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Company</label>
                  <input
                    type="text"
                    value={editingJob.company}
                    onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Location</label>
                  <input
                    type="text"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Job Type</label>
                  <select
                    value={editingJob.jobType}
                    onChange={(e) => setEditingJob({ ...editingJob, jobType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-bold bg-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Salary</label>
                  <input
                    type="text"
                    value={editingJob.salary}
                    onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Apply Link / Portal URL</label>
                <input
                  type="url"
                  value={editingJob.applyLink || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, applyLink: e.target.value })}
                  placeholder="https://company.com/careers"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={4}
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none text-xs font-semibold"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save & Publish Immediately ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* ── Custom Decline Confirmation Modal ── */}
      {jobToDecline && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-left space-y-4 relative animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-2xl shadow-xs">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Decline Job Submission?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                Are you sure you want to decline <strong>"{jobToDecline.title}"</strong> ({jobToDecline.company})? It will be moved to the Previous Openings history banner.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setJobToDecline(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeclineJob}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Decline Submission
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PendingJobQueue;
