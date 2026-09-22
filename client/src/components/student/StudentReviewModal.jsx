import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Star, X, Send, Sparkles, HeartHandshake } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { API_BASE_URL } from '../../utils/api';

export default function StudentReviewModal({ studentName: initialName = '', studentEmail = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [name, setName] = useState(initialName || '');
  const [role, setRole] = useState('Verified Candidate');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check local preferences
    const hasOptedOut = localStorage.getItem('sbi_review_optout') === 'true';
    const hasSubmitted = localStorage.getItem('sbi_review_submitted') === 'true';
    const hasDismissedInSession = sessionStorage.getItem('sbi_review_dismissed') === 'true';

    if (hasOptedOut || hasSubmitted || hasDismissedInSession) {
      return;
    }

    // Prefill name if available
    if (!name) {
      const storedName = localStorage.getItem('auth_name') || localStorage.getItem('student_name');
      if (storedName) setName(storedName);
    }

    // Elegant delayed entrance after 2.5 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('sbi_review_optout', 'true');
    } else {
      sessionStorage.setItem('sbi_review_dismissed', 'true');
    }
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || reviewText.trim().length < 5) {
      toast.error('Please write a review of at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken('student');
      const url = `${API_BASE_URL ? API_BASE_URL : ''}/api/reviews`;
      
      const payload = {
        name: name.trim() || 'Verified Candidate',
        email: studentEmail || localStorage.getItem('auth_email') || '',
        role: role.trim() || 'Verified Candidate',
        rating,
        reviewText: reviewText.trim()
      };

      const res = await axios.post(url, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        toast.success('Thank you! Your review has been submitted.');
        localStorage.setItem('sbi_review_submitted', 'true');
        setIsOpen(false);
      } else {
        throw new Error(res.data?.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error(err.response?.data?.error || 'Could not submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9990] max-w-md w-[calc(100vw-2.5rem)] animate-slide-up select-none">
      <div
        className="relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.22)] border border-white/70"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.92) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        {/* Glow accent pill on top */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Close review popup"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3 pr-6">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-sm shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Candidate Feedback
              </span>
            </div>
            <h3 className="text-sm md:text-base font-extrabold text-gray-900 leading-snug mt-0.5">
              Enjoying Skill Bridge India?
            </h3>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Your feedback helps other candidates discover opportunities and inspires us to improve!
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Star Rating Selector */}
          <div className="flex items-center justify-between bg-amber-50/60 border border-amber-200/70 rounded-2xl px-4 py-2.5">
            <span className="text-xs font-bold text-gray-700">Your Rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    aria-label={`${star} Star`}
                  >
                    <Star
                      size={20}
                      className={
                        active
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-gray-200 text-gray-300'
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Textarea */}
          <div>
            <textarea
              rows={2}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us what you liked about tests, career matching, or mentors..."
              className="w-full text-xs font-medium bg-white/90 border border-gray-200 rounded-2xl p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none shadow-xs"
              required
            />
          </div>

          {/* Quick Details Row (Name & Role) */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full text-xs bg-white/90 border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Student / Trainee"
              className="w-full text-xs bg-white/90 border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Action Row: Don't show again + Submit button */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-gray-100">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium cursor-pointer hover:text-gray-700">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Don't show this again</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-200/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              <span>{isSubmitting ? 'Submitting...' : 'Post Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
