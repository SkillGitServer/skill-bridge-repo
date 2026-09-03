import React from 'react';
import { Lock } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

function SiteBlockedOverlay() {
  useDocumentTitle('System Under Maintenance | Skill Bridge India');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-900/95 backdrop-blur-xl fixed inset-0 z-[9999] p-6 text-white overflow-hidden">
      
      {/* Decorative Dark Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/30 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-900/20 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>
      
      {/* Content Card */}
      <div className="relative z-10 w-full max-w-lg bg-black/40 backdrop-blur-2xl border border-white/10 p-12 rounded-3xl text-center shadow-2xl flex flex-col items-center">
        
        {/* Pulsing Lock Icon */}
        <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-8 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <Lock className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-white">
          System Under Maintenance
        </h1>
        
        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
          Our platform is temporarily unavailable as we perform critical system upgrades. We apologize for any inconvenience.
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-4"></div>
        
        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mt-4">
          Skill Bridge India • Core Systems
        </p>
      </div>
    </div>
  );
}

export default SiteBlockedOverlay;
