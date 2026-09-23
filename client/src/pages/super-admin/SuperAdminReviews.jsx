import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import supIcon from '../../assets/sup-icon.png';
import {
  ArrowLeft,
  Send,
  Edit3,
  CheckCircle2,
  EyeOff,
  Trash2,
  Search,
  Building,
  Briefcase,
  Calendar,
  Sparkles,
  UserCheck,
  Clock,
  Upload,
  X
} from 'lucide-react';

export default function SuperAdminReviews() {
  useDocumentTitle('Student Review Handler | Super Admin');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('sent'); // 'sent' | 'pending'
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [counts, setCounts] = useState({ submitted: 0, pending: 0, approved: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingId, setSendingId] = useState(null);

  // Edit Review Modal state
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    company: '',
    role: '',
    joiningDate: '',
    photo: '',
    status: 'approved'
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken('supss');
      const res = await axios.get('/api/super-admin/reviews/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data && res.data.success) {
        setSubmittedReviews(res.data.submittedReviews || []);
        setPendingStudents(res.data.pendingStudents || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to load review data:', err);
      toast.error('Failed to load review queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchDashboardData);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  // Send Review Request to Student
  const handleSendRequest = async (student) => {
    try {
      setSendingId(student._id);
      const token = getAuthToken('supss');
      const res = await axios.post(
        '/api/super-admin/reviews/request',
        { studentId: student._id, email: student.email },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        toast.success(res.data.message || `Review request sent to ${student.name}!`);
        // Mark student locally as review requested
        setPendingStudents((prev) =>
          prev.map((s) =>
            s._id === student._id
              ? { ...s, reviewRequested: true, reviewRequestedAt: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Failed to send review request:', err);
      toast.error(err.response?.data?.error || 'Failed to send review request.');
    } finally {
      setSendingId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (review) => {
    setEditingReview(review);
    setEditForm({
      name: review.name || '',
      company: review.company || '',
      role: review.role || '',
      joiningDate: review.joiningDate || '',
      photo: review.photo || '',
      status: review.status || 'approved'
    });
  };

  const compressDataUrl = async (dataUrl) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width || 500;
            let height = img.height || 500;
            const maxDim = 500;
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  };

  // Handle Photo Upload in Edit Modal (Converts to clean compressed Base64)
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawUrl = event.target.result;
      const compressed = await compressDataUrl(rawUrl);
      setEditForm((prev) => ({ ...prev, photo: compressed }));
    };
    reader.readAsDataURL(file);
  };

  // Save Edited Review
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.company.trim() || !editForm.role.trim()) {
      toast.error('Please fill in candidate name, company, and role.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const token = getAuthToken('supss');
      const res = await axios.put(
        `/api/super-admin/reviews/${editingReview._id}`,
        editForm,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        toast.success('Review updated successfully!');
        setEditingReview(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to save review:', err);
      toast.error(err.response?.data?.error || 'Failed to save review changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Toggle Status (Approve / Hide)
  const handleToggleStatus = async (reviewId, newStatus) => {
    try {
      const token = getAuthToken('supss');
      const res = await axios.put(
        `/api/super-admin/reviews/${reviewId}/status`,
        { status: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        toast.success(`Review ${newStatus === 'approved' ? 'published to landing page' : 'hidden from public'}.`);
        setSubmittedReviews((prev) =>
          prev.map((r) => (r._id === reviewId ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status.');
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this student review?')) {
      return;
    }

    try {
      const token = getAuthToken('supss');
      const res = await axios.delete(`/api/super-admin/reviews/${reviewId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        toast.success('Review deleted permanently.');
        setSubmittedReviews((prev) => prev.filter((r) => r._id !== reviewId));
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      toast.error('Failed to delete review.');
    }
  };

  // Filtered lists
  const filteredSubmitted = submittedReviews.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.company?.toLowerCase().includes(term) ||
      r.role?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term)
    );
  });

  const filteredPending = pendingStudents.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term) ||
      s.mobile?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col">
      {RefreshOverlay}

      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="p-2 bg-white/80 hover:bg-white border border-gray-200 text-gray-700 rounded-xl transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/super-admin/dashboard')}>
            <img src={supIcon} alt="Skill Sups" className="h-7 w-7 object-contain" />
            <span className="text-base font-black tracking-widest uppercase text-gray-900">
              Skill Sups
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {RefreshButton}
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6 text-left">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                👑 Super Admin Management
              </span>
              <span className="text-xs text-gray-400 font-bold">•</span>
              <span className="text-xs text-gray-500 font-bold">Public Landing Showcase</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mt-1">
              Student Review Handler
            </h1>
            <p className="text-xs text-gray-500 font-semibold mt-1">
              Manage candidate placement reviews, edit student feedback, and dispatch golden review notifications.
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="bg-white/80 border border-white/60 shadow-sm rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] uppercase font-black text-gray-400 block tracking-wider">
                  Live Showcase
                </span>
                <span className="text-sm font-black text-emerald-600">
                  {counts.approved} Reviews on Landing
                </span>
              </div>
              <Sparkles size={20} className="text-amber-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs (2 Sections) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-2 rounded-2xl border border-white/60 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Section 1: Sent Review */}
            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'sent'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <UserCheck size={16} />
              <span>1. Sent Review ({submittedReviews.length})</span>
            </button>

            {/* Section 2: Pending for Review */}
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Clock size={16} />
              <span>2. Pending for Review ({pendingStudents.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'sent' ? 'Search by candidate, company...' : 'Search pending students...'}
              className="w-full bg-white/90 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: SENT REVIEWS */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-left">
              <div>
                <h2 className="text-lg font-black text-gray-900">Submitted Placement Reviews</h2>
                <p className="text-xs text-gray-500 font-semibold">
                  Students who have completed their review. Click "Edit Review" to update candidate details or photo.
                </p>
              </div>
              <span className="text-xs font-extrabold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                {filteredSubmitted.length} Total
              </span>
            </div>

            {filteredSubmitted.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-sm">
                <Sparkles size={36} className="mx-auto text-amber-400 mb-3" />
                <h3 className="text-base font-black text-gray-900">No Submitted Reviews Found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Switch to the "Pending for Review" tab to send notification requests to students.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSubmitted.map((rev) => {
                  const isApproved = rev.status === 'approved';

                  return (
                    <div
                      key={rev._id}
                      className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left group"
                    >
                      <div>
                        {/* Top: Candidate Photo & Status */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {rev.photo ? (
                              <img
                                src={rev.photo}
                                alt={rev.name}
                                className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-300 shadow-sm bg-gradient-to-tr from-amber-50 to-orange-50"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center text-base font-black shadow-sm">
                                {rev.name ? rev.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                              </div>
                            )}

                            <div>
                              <h3 className="text-sm font-black text-gray-900 group-hover:text-amber-600 transition-colors">
                                {rev.name}
                              </h3>
                              <p className="text-[11px] text-gray-400 font-mono">
                                {rev.email || 'No email provided'}
                              </p>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={10} />
                                  <span>{isApproved ? 'Live on Landing' : 'Hidden'}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Placement details cards */}
                        <div className="bg-gray-50/90 rounded-2xl p-3.5 space-y-2 border border-gray-100">
                          {/* Where they got the job */}
                          <div className="flex items-center gap-2">
                            <Building size={14} className="text-amber-600 shrink-0" />
                            <span className="text-[11px] font-bold text-gray-500">Company:</span>
                            <span className="text-xs font-black text-gray-900 truncate">
                              {rev.company || 'Not Specified'}
                            </span>
                          </div>

                          {/* Role in the job */}
                          <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-indigo-600 shrink-0" />
                            <span className="text-[11px] font-bold text-gray-500">Role:</span>
                            <span className="text-xs font-bold text-gray-800 truncate">
                              {rev.role || 'Verified Candidate'}
                            </span>
                          </div>

                          {/* Joining Date */}
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-teal-600 shrink-0" />
                            <span className="text-[11px] font-bold text-gray-500">Joined:</span>
                            <span className="text-xs font-bold text-gray-700">
                              {rev.joiningDate || 'Recent'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rev)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Edit3 size={13} />
                          <span>Edit Review</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(rev._id, isApproved ? 'rejected' : 'approved')}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isApproved
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={isApproved ? 'Hide from landing page' : 'Publish to landing page'}
                          >
                            {isApproved ? <EyeOff size={15} /> : <CheckCircle2 size={15} />}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev._id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-colors active:scale-95 cursor-pointer"
                            title="Delete review permanently"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: PENDING FOR REVIEW */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-left">
              <div>
                <h2 className="text-lg font-black text-gray-900">Pending Review Requests</h2>
                <p className="text-xs text-gray-500 font-semibold">
                  Students who have not submitted a review yet. Click "Send" to dispatch the golden placement notification.
                </p>
              </div>
              <span className="text-xs font-extrabold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                {filteredPending.length} Students Pending
              </span>
            </div>

            {filteredPending.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-sm">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
                <h3 className="text-base font-black text-gray-900">All Students Have Submitted!</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Every registered student has submitted their placement review.
                </p>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl overflow-hidden shadow-sm text-left">
                <div className="divide-y divide-gray-100">
                  {filteredPending.map((student) => {
                    const isRequested = Boolean(student.reviewRequested);
                    const isSendingThis = sendingId === student._id;

                    return (
                      <div
                        key={student._id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                      >
                        {/* Student info */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0">
                            {student.name ? student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-gray-900">{student.name}</h3>
                              <span className="text-xs text-gray-400 font-mono">({student.email})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {student.mobile && (
                                <span className="text-[10px] text-gray-500 font-semibold">
                                  📱 {student.mobile}
                                </span>
                              )}
                              {isRequested && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                                  <span>👑</span>
                                  <span>Golden Notification Sent</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Send Request Button */}
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          {isRequested && (
                            <span className="text-[10px] text-gray-400 font-bold hidden sm:inline">
                              Awaiting student submission
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendRequest(student)}
                            disabled={isSendingThis}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                              isRequested
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:brightness-105 border border-amber-300'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                            }`}
                          >
                            <Send size={13} className={isSendingThis ? 'animate-spin' : ''} />
                            <span>
                              {isSendingThis ? 'Sending...' : isRequested ? 'Resend Request' : 'Send'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* EDIT REVIEW MODAL */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {editingReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative text-left animate-scale-in">
            {/* Close */}
            <button
              onClick={() => setEditingReview(null)}
              className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Edit3 size={18} />
              </span>
              <div>
                <h3 className="text-base font-black text-gray-900">Edit Student Review</h3>
                <p className="text-xs text-gray-400 font-semibold">
                  Update candidate placement details for public landing page
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Photo Preview & Upload */}
              <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80">
                {editForm.photo ? (
                  <img
                    src={editForm.photo}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-sm bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400">
                    No Photo
                  </div>
                )}
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Candidate Photo (Without Background)
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 cursor-pointer shadow-xs transition-colors">
                    <Upload size={13} />
                    <span>Upload New Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Where got job (Company) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Where they got the job (Company)</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g. Google, Tata Consultancy Services, ICICI Bank"
                  required
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Role in the job</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Associate Software Engineer, Data Analyst"
                  required
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Date Joined */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date when they joined the job</label>
                <input
                  type="text"
                  value={editForm.joiningDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
                  placeholder="e.g. September 2026 or 15/09/2026"
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Showcase Visibility</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="approved">Approved & Live on Landing Page</option>
                  <option value="rejected">Hidden from Public</option>
                  <option value="pending">Pending Verification</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingReview(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Review Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
