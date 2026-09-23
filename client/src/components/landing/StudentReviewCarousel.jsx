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
  Award
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
  const [isManualInteracting, setIsManualInteracting] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [allSearchTerm, setAllSearchTerm] = useState('');
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const scrollRef = useRef(null);
  const manualTimeoutRef = useRef(null);

  // Fetch 12 most recent approved reviews for carousel
  useEffect(() => {
    let isMounted = true;
    const fetchApprovedReviews = async () => {
      try {
        const url = `${API_BASE_URL ? API_BASE_URL : ''}/api/reviews/approved`;
        const res = await axios.get(url);
        if (isMounted && res.data && Array.isArray(res.data.reviews)) {
          // Clean black background if previously saved as JPEG
          const processed = await Promise.all(
            res.data.reviews.slice(0, 12).map(async (r) => {
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

  // Continuous smooth auto-scroll loop (does NOT pause on mouse hover)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || reviews.length <= 1) return;

    let animationFrameId;
    const scrollSpeed = 0.7;

    const step = () => {
      if (!isManualInteracting && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += scrollSpeed;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          el.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isManualInteracting, reviews.length]);

  // Working manual scroll buttons (< and >) with smooth looping
  const handleManualScroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;

    setIsManualInteracting(true);
    if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
    manualTimeoutRef.current = setTimeout(() => {
      setIsManualInteracting(false);
    }, 2500);

    const stepAmount = 340;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (maxScroll <= 0) return;

    if (direction === 'right') {
      if (el.scrollLeft >= maxScroll - 15) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: stepAmount, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft <= 15) {
        el.scrollTo({ left: maxScroll, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -stepAmount, behavior: 'smooth' });
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getCardAccent = (idx) => {
    const accents = [
      { border: 'border-amber-300/60', glow: 'from-amber-400/25 to-yellow-400/5' },
      { border: 'border-indigo-300/60', glow: 'from-indigo-400/25 to-blue-400/5' },
      { border: 'border-teal-300/60', glow: 'from-teal-400/25 to-emerald-400/5' },
      { border: 'border-rose-300/60', glow: 'from-rose-400/25 to-orange-400/5' }
    ];
    return accents[idx % accents.length];
  };

  // Strictly 1 card per candidate, up to 12 candidates, NO repeats
  const displayItems = reviews.slice(0, 12);

  // Filtered all-candidates list for modal
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
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 space-y-3">
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
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-3 flex-nowrap max-w-full overflow-x-hidden">
            <button
              onClick={() => handleManualScroll('left')}
              aria-label="Previous story"
              disabled={displayItems.length <= 1}
              className={`p-2.5 sm:p-3 rounded-full bg-white/70 hover:bg-white border border-gray-200/80 text-gray-800 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md shrink-0 ${
                displayItems.length <= 1 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={handleOpenAllModal}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-black font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300 shrink-0 whitespace-nowrap"
            >
              <Award size={15} />
              <span>Placed Candidates</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => handleManualScroll('right')}
              aria-label="Next story"
              disabled={displayItems.length <= 1}
              className={`p-2.5 sm:p-3 rounded-full bg-white/70 hover:bg-white border border-gray-200/80 text-gray-800 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-md shrink-0 ${
                displayItems.length <= 1 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Container — No mouse hover pause, no white bars, pure seamless backdrop */}
        {displayItems.length > 0 ? (
          <div className="relative w-full overflow-visible py-4">
            {/* Scrolling Track: Centered when 1-2 items, scrollable when overflow */}
            <div
              ref={scrollRef}
              className={`flex gap-6 overflow-x-auto overflow-y-visible py-6 px-4 scroll-smooth no-scrollbar ${
                displayItems.length <= 2 ? 'justify-center' : 'justify-start'
              }`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {displayItems.map((item, idx) => {
                const accent = getCardAccent(idx);

                return (
                  <div
                    key={item._id || idx}
                    className={`group relative flex-shrink-0 w-[290px] sm:w-[320px] bg-white/40 hover:bg-white/60 backdrop-blur-2xl border ${accent.border} rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.12)] hover:-translate-y-2.5 transition-all duration-300 flex flex-col justify-between text-left`}
                  >
                    {/* Ambient Glow behind Cutout */}
                    <div
                      className={`absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 bg-gradient-to-tr ${accent.glow} rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
                    />

                    <div>
                      {/* Top Header: Cutout Silhouette Portrait + Placed Badge */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Background-less Cutout Portrait with 3D drop-shadow */}
                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt={item.name}
                              className="w-full h-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 pointer-events-none select-none"
                            />
                          ) : (
                            <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center text-xl font-black shadow-md border-2 border-amber-300">
                              {getInitials(item.name)}
                            </div>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-300/60 text-[10px] font-black shrink-0 shadow-xs">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Placed</span>
                        </div>
                      </div>

                      {/* Candidate Name */}
                      <h3 className="font-extrabold text-gray-900 text-lg leading-tight group-hover:text-amber-900 transition-colors">
                        {item.name || 'Verified Candidate'}
                      </h3>
                    </div>

                    {/* Placement Details Card */}
                    <div className="mt-4 pt-3 border-t border-gray-200/50 space-y-2.5">
                      {/* Company (Where they got the job) */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-900 flex items-center justify-center shrink-0">
                          <Building size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[9px] font-black text-gray-400 block uppercase tracking-wider leading-none">
                            Company
                          </span>
                          <span className="text-xs font-black text-gray-900 truncate block mt-0.5">
                            {item.company || 'Corporate Partner'}
                          </span>
                        </div>
                      </div>

                      {/* Role in the job */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-900 flex items-center justify-center shrink-0">
                          <Briefcase size={14} />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[9px] font-black text-gray-400 block uppercase tracking-wider leading-none">
                            Role
                          </span>
                          <span className="text-xs font-bold text-gray-800 truncate block mt-0.5">
                            {item.role || 'Professional Role'}
                          </span>
                        </div>
                      </div>

                      {/* Date joined */}
                      {item.joiningDate && (
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-900 flex items-center justify-center shrink-0">
                            <Calendar size={14} />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-[9px] font-black text-gray-400 block uppercase tracking-wider leading-none">
                              Joined Date
                            </span>
                            <span className="text-[11px] font-bold text-gray-700 truncate block mt-0.5">
                              {item.joiningDate}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 max-w-md mx-auto">
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
                  All Placed Candidates ({filteredAll.length})
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
                  {filteredAll.map((item, idx) => {
                    const accent = getCardAccent(idx);

                    return (
                      <div
                        key={item._id || idx}
                        className={`group relative bg-white/70 hover:bg-white backdrop-blur-xl border ${accent.border} rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
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
                    );
                  })}
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
