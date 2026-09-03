import React from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Home } from 'lucide-react';

function NotFound() {
  useDocumentTitle('404 Not Found | Skill Bridge India');

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 relative z-10">
      <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-10 text-center max-w-md mx-auto w-full transition-all duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.1)]">
        <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-6 drop-shadow-sm">
          404
        </h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4 tracking-tight">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-600 mb-8 font-medium">
          Oops! It looks like you've wandered off our site. Let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-800 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg hover:shadow-xl w-full"
        >
          <Home className="w-5 h-5" />
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
