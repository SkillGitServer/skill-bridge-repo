import React from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import admIcon from '../../assets/adm-icon.png';
import supIcon from '../../assets/sup-icon.png';

function GlobalLoader({ title, logo: customLogo }) {
  let location;
  try {
    location = useLocation();
  } catch (e) {
    location = { pathname: '/' };
  }

  let activeLogo = logo;
  let activeTitle = 'Skill Bridge India';
  let ringColors = 'border-t-orange-500 border-r-amber-500';
  let innerRingColors = 'border-b-amber-400 border-l-yellow-400';
  let dotColors = ['bg-orange-500', 'bg-amber-500', 'bg-yellow-500'];

  const pathname = location?.pathname || '';

  if (pathname.startsWith('/admin')) {
    activeLogo = admIcon;
    activeTitle = 'Skill Admin';
    ringColors = 'border-t-blue-500 border-r-sky-500';
    innerRingColors = 'border-b-sky-400 border-l-indigo-400';
    dotColors = ['bg-blue-500', 'bg-sky-500', 'bg-indigo-500'];
  } else if (
    pathname.startsWith('/sudo-control-panel') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/super_admin')
  ) {
    activeLogo = supIcon;
    activeTitle = 'Skill Sups';
    ringColors = 'border-t-purple-500 border-r-fuchsia-500';
    innerRingColors = 'border-b-fuchsia-400 border-l-pink-400';
    dotColors = ['bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'];
  }

  if (title) activeTitle = title;
  if (customLogo) activeLogo = customLogo;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-500 select-none"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {/* Premium Glassmorphic Container */}
      <div 
        className="relative flex flex-col items-center justify-center p-10 md:p-12 rounded-[2.5rem]"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        {/* Animated Center Logo Core */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer glowing rings */}
          <div 
            className={`absolute -inset-4 rounded-full border-4 border-transparent ${ringColors} animate-spin`} 
            style={{ animationDuration: '1.8s' }}
          ></div>
          <div 
            className={`absolute -inset-2 rounded-full border-4 border-transparent ${innerRingColors} animate-spin`} 
            style={{ animationDuration: '2.8s', animationDirection: 'reverse' }}
          ></div>
          
          {/* Logo container with soft pulse */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white p-2.5 flex items-center justify-center shadow-lg animate-pulse">
            <img src={activeLogo} alt={activeTitle} className="w-full h-full object-contain" />
          </div>
        </div>
        
        {/* Text Area */}
        <div className="flex flex-col items-center">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-2">
            {activeTitle}
          </h2>
          {/* Loading dots */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${dotColors[0]} animate-bounce`} style={{ animationDelay: '0ms' }}></span>
            <span className={`w-2 h-2 rounded-full ${dotColors[1]} animate-bounce`} style={{ animationDelay: '150ms' }}></span>
            <span className={`w-2 h-2 rounded-full ${dotColors[2]} animate-bounce`} style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalLoader;
