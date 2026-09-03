import React, { useState, useEffect, useRef } from 'react';

/**
 * PullToRefreshWrapper - Premium 60fps Pull-to-Refresh Component
 * Features smooth spring physics, circular progress ring, and zero listener churn.
 */
function PullToRefreshWrapper({
  children,
  onRefresh,
  disabled = false,
  pullThreshold = 70
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const isTouchActiveRef = useRef(false);
  const rafIdRef = useRef(null);

  // Keep ref updated to avoid listener re-binding churn
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e) => {
      // ONLY trigger if window is scrolled at absolute top
      if (window.scrollY > 0 || (document.documentElement && document.documentElement.scrollTop > 0)) {
        return;
      }

      if (e.touches && e.touches.length === 1 && !isRefreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        isTouchActiveRef.current = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isTouchActiveRef.current || isRefreshingRef.current) return;

      if (window.scrollY > 0) {
        isTouchActiveRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY > 0) {
        // Smooth logarithmic rubber-band resistance curve
        const damped = Math.min(100, Math.pow(deltaY, 0.82) * 2.2);
        pullDistanceRef.current = damped;

        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setPullDistance(damped);
          setIsPulling(true);
        });
      } else {
        pullDistanceRef.current = 0;
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => {
          setPullDistance(0);
          setIsPulling(false);
        });
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouchActiveRef.current) return;
      isTouchActiveRef.current = false;
      setIsPulling(false);

      const currentDist = pullDistanceRef.current;

      if (currentDist >= pullThreshold && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPullDistance(50); // Lock nicely at top position for spinner

        try {
          if (typeof onRefresh === 'function') {
            await onRefresh();
          } else {
            window.location.reload();
            return;
          }
        } catch (err) {
          console.error('Pull-to-refresh execution error:', err);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            pullDistanceRef.current = 0;
          }, 600);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [disabled, pullThreshold, onRefresh]);

  const progressRatio = Math.min(1, pullDistance / pullThreshold);
  const isPastThreshold = pullDistance >= pullThreshold;
  const showIndicator = pullDistance > 4 || isRefreshing;
  const strokeDashoffset = 56.54 - 56.54 * progressRatio; // Circle circumference 2 * pi * 9 = 56.54

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden">
      {/* ── Modern Floating Glassmorphic Pull Indicator ── */}
      {showIndicator && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-none transition-all ease-out"
          style={{
            top: `${Math.min(65, Math.max(16, pullDistance - 15))}px`,
            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 25),
            transform: `translateX(-50%) scale(${isRefreshing ? 1 : Math.min(1, 0.75 + progressRatio * 0.25)})`,
            transition: isPulling ? 'none' : 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] rounded-full px-4 py-2 flex items-center gap-3">
            {isRefreshing ? (
              // Sleek Dual Ring Spinner
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
              </div>
            ) : (
              // Circular Dynamic Progress Ring
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-white/20"
                    fill="none"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-indigo-400 transition-all duration-75"
                    fill="none"
                    strokeDasharray="56.54"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="absolute text-[10px] text-white transition-transform duration-200"
                  style={{
                    transform: `rotate(${isPastThreshold ? 180 : 0}deg)`
                  }}
                >
                  ↓
                </span>
              </div>
            )}

            <span className="text-[11px] font-black tracking-wide text-slate-100 whitespace-nowrap">
              {isRefreshing
                ? 'Updating Data...'
                : isPastThreshold
                ? 'Release to Refresh'
                : 'Pull Down to Refresh'}
            </span>
          </div>
        </div>
      )}

      {/* ── Page Content Container (Static - Page Layout Stays Fixed) ── */}
      <div>
        {children}
      </div>
    </div>
  );
}

export default PullToRefreshWrapper;
