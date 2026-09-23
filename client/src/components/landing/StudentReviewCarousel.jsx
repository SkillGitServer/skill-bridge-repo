import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  Sparkles,
  Search,
  X,
  ArrowRight,
  Award,
  Quote,
  ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

// Smart helper to auto-detect and remove accidental black backgrounds on cutout photos
const cleanCutoutImage = (src) => {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string' || !src.startsWith('data:image/')) {
      return resolve(src);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        // Check the 4 corners: top-left, top-right, bottom-left, bottom-right
        const corners = [
          0,
          (canvas.width - 1) * 4,
          (canvas.height - 1) * canvas.width * 4,
          ((canvas.height - 1) * canvas.width + (canvas.width - 1)) * 4
        ];

        const blackCorners = corners.filter(
          (i) => d[i] < 35 && d[i + 1] < 35 && d[i + 2] < 35 && d[i + 3] > 200
        ).length;

        // If corners are black, remove the black background to reveal clean cutout
        if (blackCorners >= 3) {
          for (let i = 0; i < d.length; i += 4) {
            if (d[i] < 35 && d[i + 1] < 35 && d[i + 2] < 35) {
              d[i + 3] = 0; // Alpha = 0 (Transparent)
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(src);
        }
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
};

export default function StudentReviewCarousel() {
  const [reviews, setReviews] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' | 'prev'
  const [isAnimating, setIsAnimating] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [allSearchTerm, setAllSearchTerm] = useState('');
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const autoRotateTimerRef = useRef(null);

  // Fetch up to 12 approved reviews, randomly shuffled
  useEffect(() => {
    let isMounted = true;
    const fetchApprovedReviews = async () => {
      try {
        const url = `${API_BASE_URL ? API_BASE_URL : ''}/api/reviews/approved`;
        const res = await axios.get(url);
        if (isMounted && res.data && Array.isArray(res.data.reviews)) {
          // Shuffle randomly and take up to 12
          const list = [...res.data.reviews].sort(() => 0.5 - Math.random()).slice(0, 12);
          const processed = await Promise.all(
            list.map(async (r) => {
              if (r.photo) {
                const cleaned = await cleanCutoutImage(r.photo);
                return { ...r, photo: cleaned };
              }
              return r;
            })
          );
          setReviews(processed);
        }
      } catch (err) {
        console.warn('Could not fetch placement reviews:', err.message);
      }
    };

    fetchApprovedReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch all reviews when View All modal is opened
  const handleOpenAllModal = async () => {
    setIsAllModalOpen(true);
    if (allReviews.length === 0) {
      try {
        setIsLoadingAll(true);
        const url = `${API_BASE_URL ? API_BASE_URL : ''}/api/reviews/approved?all=true`;
        const res = await axios.get(url);
        if (res.data && Array.isArray(res.data.reviews)) {
          const processed = await Promise.all(
            res.data.reviews.map(async (r) => {
              if (r.photo) {
                const cleaned = await cleanCutoutImage(r.photo);
                return { ...r, photo: cleaned };
              }
              return r;
            })
          );
          setAllReviews(processed);
        }
      } catch (err) {
        console.warn('Failed to load all reviews:', err.message);
      } finally {
        setIsLoadingAll(false);
      }
    }
  };

  // Auto-carousel playback cycling up to 12 reviews
  useEffect(() => {
    if (reviews.length <= 1) return;

    const startTimer = () => {
      if (autoRotateTimerRef.current) clearInterval(autoRotateTimerRef.current);
      autoRotateTimerRef.current = setInterval(() => {
        setSlideDirection('next');
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
        setTimeout(() => setIsAnimating(false), 500);
      }, 5500);
    };

    startTimer();
    return () => {
      if (autoRotateTimerRef.current) clearInterval(autoRotateTimerRef.current);
    };
  }, [reviews.length]);

  const handleNext = () => {
    if (reviews.length <= 1) return;
    setSlideDirection('next');
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handlePrev = () => {
    if (reviews.length <= 1) return;
    setSlideDirection('prev');
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const activeCandidate = reviews[currentIndex] || null;

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Filtered list for the Placed Candidates modal
  const filteredAll = (allReviews.length > 0 ? allReviews : reviews).filter((item) => {
    if (!allSearchTerm.trim()) return true;
    const term = allSearchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.company?.toLowerCase().includes(term) ||
      item.role?.toLowerCase().includes(term)
    );
  });

  return (
    <section
      id="candidate-reviews"
      className="relative py-20 px-4 md:px-6 overflow-hidden bg-transparent select-none"
    >
      {/* Scoped CSS animations for floating avatar and sequential staggered text reveal */}
      <style>{`
        @keyframes avatarFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
        }
        @keyframes haloPulse {
          0%, 100% {
            opacity: 0.55;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.08);
          }
        }
        @keyframes staggerRevealLeft {
          from {
            opacity: 0;
            transform: translateX(-28px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .anim-float-avatar {
          animation: avatarFloat 4.8s ease-in-out infinite;
        }
        .anim-halo-pulse {
          animation: haloPulse 4s ease-in-out infinite;
        }
        .anim-slide-next {
          animation: slideInFromRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .anim-slide-prev {
          animation: slideInFromLeft 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .stagger-step-1 {
          animation: staggerRevealLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.04s;
        }
        .stagger-step-2 {
          animation: staggerRevealLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.12s;
        }
        .stagger-step-3 {
          animation: staggerRevealLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.20s;
        }
        .stagger-step-4 {
          animation: staggerRevealLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.28s;
        }
        .stagger-step-5 {
          animation: staggerRevealLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.36s;
        }
      `}</style>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8 space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs">
            <Sparkles size={13} className="text-amber-400" />
            <span>Placement Success</span>
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Real Candidates. Real Careers.
          </h2>

          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Meet the ambitious candidates from Skill Bridge India who verified their skills and secured direct industry placements.
          </p>

          {/* Navigation Controls & Placed Candidates Button (Clean Single Row on Mobile) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 flex-nowrap max-w-full overflow-x-hidden">
            <button
              onClick={handlePrev}
              aria-label="Previous candidate"
              disabled={reviews.length <= 1}
              className={`p-2.5 sm:p-3 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-800 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md shrink-0 ${
                reviews.length <= 1 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={handleOpenAllModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-black font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300 shrink-0 whitespace-nowrap"
            >
              <Award size={15} />
              <span>Placed Candidates</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next candidate"
              disabled={reviews.length <= 1}
              className={`p-2.5 sm:p-3 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-800 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md shrink-0 ${
                reviews.length <= 1 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* ── Large-Format Card Layout ── */}
        {activeCandidate ? (
          <div className="w-full max-w-4xl mx-auto px-2">
            <div
              key={activeCandidate._id || currentIndex}
              className={`relative bg-white/55 hover:bg-white/65 backdrop-blur-3xl border border-white/80 rounded-[36px] p-6 sm:p-10 md:p-12 shadow-[0_25px_60px_rgba(0,0,0,0.06),0_1px_3px_rgba(255,255,255,0.9)_inset] transition-all duration-300 overflow-hidden ${
                slideDirection === 'next' ? 'anim-slide-next' : 'anim-slide-prev'
              }`}
            >
              {/* Subtle ambient luxury background tint */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-400/15 via-orange-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 via-purple-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-8 md:gap-10">
                {/* ── Left Column: Larger Transparent Cutout Avatar with Glowing Halo ── */}
                <div className="relative flex flex-col items-center shrink-0 w-full md:w-5/12">
                  {/* Glowing Ambient Pedestal behind Cutout */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-gradient-to-tr from-amber-400/35 via-orange-400/25 to-yellow-300/15 rounded-full blur-3xl anim-halo-pulse pointer-events-none" />

                  {/* Cutout Silhouette Portrait — Heroic & High-Impact Size */}
                  <div className="relative w-56 h-64 sm:w-72 sm:h-80 md:w-80 md:h-92 flex items-center justify-center anim-float-avatar">
                    {activeCandidate.photo ? (
                      <img
                        src={activeCandidate.photo}
                        alt={activeCandidate.name}
                        className="w-full h-full object-contain filter drop-shadow-[0_22px_28px_rgba(0,0,0,0.22)] pointer-events-none select-none"
                      />
                    ) : (
                      <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 text-black flex items-center justify-center text-4xl sm:text-5xl font-black shadow-xl border-2 border-amber-300">
                        {getInitials(activeCandidate.name)}
                      </div>
                    )}
                  </div>

                  {/* Floating Placed Badge below silhouette */}
                  <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-300/70 text-[10px] sm:text-[11px] font-black shadow-xs backdrop-blur-md">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span>Verified Placed Candidate</span>
                  </div>
                </div>

                {/* ── Right Column: Sleek, Well-Proportioned Typography & Stack ── */}
                <div className="flex-1 flex flex-col justify-center text-left w-full space-y-3">
                  {/* Stagger 1: Category Tag */}
                  <div className="stagger-step-1 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300/60 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      <Sparkles size={11} className="text-amber-600" />
                      <span>Direct Corporate Hire</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold">•</span>
                    <span className="text-[10px] text-gray-500 font-bold">Skill Bridge India Alumni</span>
                  </div>

                  {/* Stagger 2: Candidate Name (Refined, Modern Size) */}
                  <div className="stagger-step-2">
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                      {activeCandidate.name || 'Verified Candidate'}
                    </h3>
                  </div>

                  {/* Stagger 3: Vertically Stacked Placement Details (Compact & Sleek) */}
                  <div className="stagger-step-3 space-y-2 sm:space-y-2.5 pt-0.5">
                    {/* Company */}
                    <div className="bg-white/60 hover:bg-white/80 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/80 shadow-2xs flex items-center gap-3 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-400/10 text-amber-900 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Building size={16} className="text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">
                          Company / Organization
                        </span>
                        <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 truncate mt-0.5">
                          {activeCandidate.company || 'Corporate Partner'}
                        </h4>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="bg-white/60 hover:bg-white/80 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/80 shadow-2xs flex items-center gap-3 transition-all">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 text-indigo-900 border border-indigo-300/40 flex items-center justify-center shrink-0 shadow-2xs">
                        <Briefcase size={16} className="text-indigo-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">
                          Job Role / Designation
                        </span>
                        <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 truncate mt-0.5">
                          {activeCandidate.role || 'Professional Role'}
                        </h4>
                      </div>
                    </div>

                    {/* Joined Date */}
                    {activeCandidate.joiningDate && (
                      <div className="bg-white/60 hover:bg-white/80 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/80 shadow-2xs flex items-center gap-3 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-teal-900 border border-teal-300/40 flex items-center justify-center shrink-0 shadow-2xs">
                          <Calendar size={16} className="text-teal-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none">
                            Joining Date
                          </span>
                          <h4 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 truncate mt-0.5">
                            {activeCandidate.joiningDate}
                          </h4>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stagger 4: Super Admin Verification Seal */}
                  <div className="stagger-step-4 pt-1 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                    <span className="text-[10px] font-semibold text-gray-500">
                      Verified credentials archived on Skill Bridge India National Placement Network
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Pagination Dots (if multiple reviews) */}
              {reviews.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-gray-200/40">
                  {reviews.map((r, idx) => (
                    <button
                      key={r._id || idx}
                      onClick={() => {
                        setSlideDirection(idx > currentIndex ? 'next' : 'prev');
                        setCurrentIndex(idx);
                      }}
                      aria-label={`Candidate ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer ${
                        currentIndex === idx
                          ? 'w-8 h-2 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 max-w-md mx-auto">
            <Sparkles size={28} className="text-amber-500 mx-auto mb-2 animate-bounce" />
            <h4 className="text-base font-extrabold text-gray-800">Placement Stories Updating</h4>
            <p className="text-xs text-gray-500 mt-1">
              Verified candidate placement reviews will appear right here as soon as approved!
            </p>
          </div>
        )}
      </div>

      {/* ── View All Placed Candidates Modal ── */}
      {isAllModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white/90 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 md:p-6 border-b border-gray-200/70 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  <Award size={12} />
                  <span>National Placement Hall of Fame</span>
                </span>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mt-1">
                  Placed Candidates ({filteredAll.length})
                </h3>
              </div>

              <button
                onClick={() => setIsAllModalOpen(false)}
                className="p-2.5 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 shadow-sm cursor-pointer transition-all active:scale-95"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 md:px-6 border-b border-gray-100 bg-white/50">
              <div className="relative w-full max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={allSearchTerm}
                  onChange={(e) => setAllSearchTerm(e.target.value)}
                  placeholder="Search by candidate name, company, or role..."
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Grid of All Candidates */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6">
              {isLoadingAll ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-500">Loading placed candidates...</p>
                </div>
              ) : filteredAll.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAll.map((item, idx) => (
                    <div
                      key={item._id || idx}
                      className="group relative bg-white/70 hover:bg-white backdrop-blur-xl border border-gray-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          {/* Cutout silhouette */}
                          <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="w-full h-full object-contain filter drop-shadow-[0_10px_14px_rgba(0,0,0,0.2)] group-hover:scale-105 transition-transform select-none"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center text-lg font-black shadow-sm">
                                {getInitials(item.name)}
                              </div>
                            )}
                          </div>

                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black shrink-0">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Placed</span>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-gray-900 text-base leading-tight mt-1">
                          {item.name || 'Verified Candidate'}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building size={13} className="text-amber-600 shrink-0" />
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {item.company || 'Corporate Partner'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Briefcase size={13} className="text-indigo-600 shrink-0" />
                          <span className="text-xs font-semibold text-gray-700 truncate">
                            {item.role || 'Role'}
                          </span>
                        </div>

                        {item.joiningDate && (
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-teal-600 shrink-0" />
                            <span className="text-[11px] font-medium text-gray-500 truncate">
                              {item.joiningDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400">
                  <p className="text-sm font-semibold">No placed candidates found matching "{allSearchTerm}".</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
