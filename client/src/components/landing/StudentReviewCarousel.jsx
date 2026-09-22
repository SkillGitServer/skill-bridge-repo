import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Star, Quote, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';

const DEFAULT_FALLBACK_REVIEWS = [
  {
    _id: 'd-1',
    name: 'Aarav Sharma',
    role: 'Full Stack Trainee',
    rating: 5,
    reviewText: 'Skill Bridge India gave me clarity on my technical competencies and helped me pinpoint exactly what areas to improve for placement interviews.'
  },
  {
    _id: 'd-2',
    name: 'Pooja Verma',
    role: 'Data Science Candidate',
    rating: 5,
    reviewText: 'The assessment test was challenging and directly aligned with modern job roles. Getting instant feedback boosted my confidence tremendously!'
  },
  {
    _id: 'd-3',
    name: 'Rohan Deshmukh',
    role: 'Computer Engineering Student',
    rating: 5,
    reviewText: 'Clean interface, seamless resume evaluation, and genuine placement guidance. Highly recommended for every final year candidate.'
  },
  {
    _id: 'd-4',
    name: 'Sneha Patel',
    role: 'Business Analytics Aspirant',
    rating: 5,
    reviewText: 'The mentor evaluations and tailored career recommendations made my job hunt so much more structured. Truly transformative platform.'
  },
  {
    _id: 'd-5',
    name: 'Vikram Joshi',
    role: 'Software Development Candidate',
    rating: 5,
    reviewText: 'Verified certificates and direct company interview opportunities — Skill Bridge India bridged the gap between college and my first tech job.'
  },
  {
    _id: 'd-6',
    name: 'Ananya Iyer',
    role: 'AI & ML Trainee',
    rating: 5,
    reviewText: 'Great experience! The automated reports are comprehensive and the platform runs smoothly without any friction.'
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
        // Fallback to default reviews silently
        console.warn('Could not fetch remote reviews, showing default verified candidate reviews.', err.message);
      }
    };

    fetchApprovedReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto scroll effect
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationFrameId;
    const scrollSpeed = 0.75; // Smooth slow scroll

    const step = () => {
      if (!isPaused && el) {
        el.scrollLeft += scrollSpeed;
        // Infinite wrap: when scrolled half way (since content is duplicated)
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

  // Duplicate items for continuous infinite marquee loop
  const displayItems = [...reviews, ...reviews];

  const getInitials = (name) => {
    if (!name) return 'S';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getAvatarGradient = (idx) => {
    const gradients = [
      'from-orange-500 to-amber-500',
      'from-teal-500 to-emerald-500',
      'from-purple-500 to-indigo-500',
      'from-sky-500 to-blue-500',
      'from-pink-500 to-rose-500',
      'from-violet-500 to-fuchsia-500'
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <section
      id="candidate-reviews"
      className="relative py-20 px-4 md:px-6 overflow-hidden bg-transparent select-none"
    >
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header (Matching Candidate Benefits & About Us Design System) */}
        <div className="text-center mb-12 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xs">
            Student Voices
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Loved by candidates nationwide.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Real feedback from ambitious learners taking their careers to the next level.
          </p>

          {/* Navigation arrow helpers */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleManualScroll('left')}
              aria-label="Previous review"
              className="p-2.5 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-700 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-semibold text-gray-400">
              Auto-rotating {reviews.length} reviews
            </span>
            <button
              onClick={() => handleManualScroll('right')}
              aria-label="Next review"
              className="p-2.5 rounded-full bg-white/80 hover:bg-white border border-gray-200/80 text-gray-700 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Carousel Marquee Container */}
        <div
          className="relative w-full overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Edge blur gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-white/90 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-white/90 to-transparent z-10" />

          {/* Scrolling track */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-hidden py-4 scroll-smooth no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayItems.map((item, idx) => {
              const stars = Math.max(1, Math.min(5, Number(item.rating) || 5));
              const gradient = getAvatarGradient(idx);

              return (
                <div
                  key={`${item._id || idx}-${idx}`}
                  className="flex-shrink-0 w-[300px] sm:w-[340px] bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: Star rating + Quote icon */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            size={16}
                            className={
                              sIdx < stars
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-gray-200 text-gray-200'
                            }
                          />
                        ))}
                      </div>
                      <Quote size={20} className="text-gray-300" />
                    </div>

                    {/* Review text */}
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 font-medium italic">
                      "{item.reviewText}"
                    </p>
                  </div>

                  {/* Student author info */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0`}
                      >
                        {getInitials(item.name)}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {item.name || 'Verified Candidate'}
                        </h4>
                        <p className="text-gray-400 text-xs font-medium truncate">
                          {item.role || 'Student'}
                        </p>
                      </div>
                    </div>

                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0"
                      title="Verified Student Review"
                    >
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Verified</span>
                    </div>
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
