import React from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import logo from '../../assets/logo.png';

function Navbar() {
  return (
    <nav className="absolute top-0 left-0 w-full px-4 sm:px-6 py-6 flex justify-between items-center z-50 select-none">
      {/* Decorative Yellow Blob (Always visible in top-left) */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400 opacity-85 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] animate-float-slow -z-10"></div>

      {/* Left Side (Login - Mobile/Tablet Only) */}
      <div className="relative group flex-shrink-0 lg:hidden">
        <Link to="/login" className="bg-white text-black font-bold px-4 sm:px-6 py-2 rounded-full shadow-md border border-gray-100 hover:shadow-lg transition-all text-sm sm:text-base whitespace-nowrap">
          Login
        </Link>
      </div>

      {/* Center (Logo - Centered on mobile, Left-aligned on PC) */}
      <div className="flex-grow text-center mx-2 lg:flex-grow-0 lg:text-left lg:mx-0">
        <Link to="/" className="inline-flex items-center gap-3 group" title="Skill Bridge India">
          <img src={logo} alt="Skill Bridge India Logo" className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain transition-transform group-hover:scale-105" />
          <span className="hidden lg:inline-block font-black tracking-tight text-black text-2xl lg:text-3xl xl:text-4xl whitespace-nowrap">
            Skill Bridge <span className="text-amber-500">India</span>
          </span>
        </Link>
      </div>

      {/* Right Side (Sign up - Mobile/Tablet Only) */}
      <div className="flex-shrink-0 lg:hidden">
        <Link to="/register" className="bg-gray-900 text-white font-bold px-4 sm:px-6 py-2 rounded-full hover:bg-black transition-all shadow-md text-sm sm:text-base whitespace-nowrap">
          Sign up
        </Link>
      </div>

      {/* Desktop Navigation (Login & Sign up side-by-side - PC Only) */}
      <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
        <LanguageSwitcher />
        <Link to="/login" className="bg-white text-black font-bold px-6 py-2 rounded-full shadow-md border border-gray-100 hover:shadow-lg transition-all text-base whitespace-nowrap">
          Login
        </Link>
        <Link to="/register" className="bg-gray-900 text-white font-bold px-6 py-2 rounded-full hover:bg-black transition-all shadow-md text-base whitespace-nowrap">
          Sign up
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
