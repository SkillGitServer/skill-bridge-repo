import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Building, Briefcase, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

const DEFAULT_FALLBACK_REVIEWS = [
  {
    _id: 'fb-p1',
    name: 'Aarav Sharma',
    company: 'Tata Consultancy Services',
    role: 'Full Stack Engineer',
    joiningDate: 'August 2026',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    _id: 'fb-p2',
    name: 'Pooja Verma',
    company: 'ICICI Bank',
    role: 'Business Data Analyst',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    _id: 'fb-p3',
    name: 'Rohan Deshmukh',
    company: 'Infosys Limited',
    role: 'Associate Software Developer',
    joiningDate: 'July 2026',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    _id: 'fb-p4',
    name: 'Sneha Patel',
    company: 'Accenture India',
    role: 'Cloud Operations Trainee',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    _id: 'fb-p5',
    name: 'Vikram Joshi',
    company: 'Wipro Technologies',
    role: 'Systems Engineer',
    joiningDate: 'August 2026',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  },
  {
    _id: 'fb-p6',
    name: 'Ananya Iyer',
    company: 'Cognizant',
    role: 'AI Solutions Specialist',
    joiningDate: 'September 2026',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    status: 'approved'
  }
];

export default function StudentReviewCarousel() {
  const [reviews, setReviews] = useState(DEFAULT_FALLBACK_REVIEWS);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchApprovedReviews = async () => {
      try {
        const url = `${API_BASE_URL ? API_BASE_URL : ''}/api/reviews/approved`;
        const res = await axios.get(url);
        if (isMounted && res.data && Array.isArray(res.data.reviews) && res.data.reviews.length > 0) {
          setReviews(res.data.reviews);
        }
      } catch (err) {
        console.warn('Could not fetch placement reviews, displaying fallback stories:', err.message);
      }
    };

    fetchApprovedReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth auto-scroll loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationFrameId;
    const scrollSpeed = 0.75;

    const step = () => {
      if (!isPaused && el) {
        el.scrollLeft += scrollSpeed;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, reviews]);

  const handleManualScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const displayItems = [...reviews, ...reviews];

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getCardGradient = (idx) => {
    const gradients = [
      'from-amber-500/10 via-orange-500/5 to-white/90',
      'from-indigo-500/10 via-purple-500/5 to-white/90',
      'from-teal-500/10 via-emerald-500/5 to-white/90',
      'from-sky-500/10 via-blue-500/5 to-white/90'
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <section
      id="candidate-reviews"
      className="relative py-20 px-4 md:px-6 overflow-hidden bg-transparent select-none"
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs">
            <Sparkles size={13} className="text-amber-400" />
            <span>Placement Success</span>
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Real Candidates. Real Careers.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Meet the ambitious learners from Skill Bridge India who verified their skills and secured top industry placements.
          </p>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleManualScroll('left')}
              aria-label="Previous story"
              className="p-2.5 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-700 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-400">
              Auto-rotating {reviews.length} candidate placements
            </span>
            <button
              onClick={() => handleManualScroll('right')}
              aria-label="Next story"
              className="p-2.5 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-700 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative w-full overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Edge Blur Gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-white/90 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-white/90 to-transparent z-10" />

          {/* Scrolling Track */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-hidden py-4 scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayItems.map((item, idx) => {
              const bgGradient = getCardGradient(idx);

              return (
                <div
                  key={`${item._id || idx}-${idx}`}
                  className={`flex-shrink-0 w-[290px] sm:w-[320px] bg-gradient-to-br ${bgGradient} backdrop-blur-xl border border-white/70 rounded-3xl p-5 shadow-sm hover:shadow-[0_16px_40px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between text-left`}
                >
                  <div>
                    {/* Top Row: Candidate Photo without background + Verified Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      {item.photo ? (
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-amber-300 bg-white/40 p-0.5">
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center text-xl font-black shadow-md border-2 border-amber-300">
                          {getInitials(item.name)}
                        </div>
                      )}

                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black shrink-0 shadow-2xs">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Placed Candidate</span>
                      </div>
                    </div>

                    {/* Candidate Name */}
                    <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                      {item.name || 'Verified Candidate'}
                    </h3>
                  </div>

                  {/* Placement Details Card */}
                  <div className="mt-4 pt-3 border-t border-gray-200/60 space-y-2">
                    {/* Company (Where they got the job) */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                        <Building size={13} />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider leading-none">
                          Company
                        </span>
                        <span className="text-xs font-black text-gray-900 truncate block">
                          {item.company || 'Direct Corporate Placement'}
                        </span>
                      </div>
                    </div>

                    {/* Role in the job */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100/80 text-indigo-800 flex items-center justify-center shrink-0">
                        <Briefcase size={13} />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider leading-none">
                          Role
                        </span>
                        <span className="text-xs font-bold text-gray-800 truncate block">
                          {item.role || 'Full Time Role'}
                        </span>
                      </div>
                    </div>

                    {/* Date joined */}
                    {item.joiningDate && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0">
                          <Calendar size={13} />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider leading-none">
                            Joined
                          </span>
                          <span className="text-[11px] font-bold text-gray-700 truncate block">
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
      </div>
    </section>
  );
}
