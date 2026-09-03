import React from 'react';

/**
 * Global Ambient Background — renders fixed, animated, heavily-blurred
 * colour blobs behind ALL routes. Must sit at z-[-1] so it never blocks
 * clicks on any page.
 */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-50/90 pointer-events-none">
      <div className="absolute -top-[10%] -left-[10%] w-[42rem] h-[42rem] rounded-full bg-blue-500/45 blur-[95px] animate-pulse"></div>
      <div className="absolute top-[18%] -right-[10%] w-[38rem] h-[38rem] rounded-full bg-purple-500/45 blur-[95px] animate-pulse" style={{ animationDuration: '4s' }}></div>
      <div className="absolute -bottom-[10%] left-[10%] w-[48rem] h-[48rem] rounded-full bg-pink-500/45 blur-[95px] animate-pulse" style={{ animationDuration: '5s' }}></div>
      <div className="absolute top-[45%] right-[5%] w-[40rem] h-[40rem] rounded-full bg-emerald-500/45 blur-[95px] animate-pulse" style={{ animationDuration: '6s' }}></div>
      <div className="absolute top-[12%] left-[32%] w-[32rem] h-[32rem] rounded-full bg-amber-400/40 blur-[90px] animate-pulse" style={{ animationDuration: '7s' }}></div>
    </div>
  );
}

export default AmbientBackground;
