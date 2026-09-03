import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../utils/auth';
import admIcon from '../../assets/adm-icon.png';

export default function AdminRevoked() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-gray-900 to-red-950 font-sans text-gray-100 flex flex-col justify-between select-none">
      
      {/* ── Top Navigation Header ── */}
      <header className="w-full bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <img src={admIcon} alt="Admin Icon" className="h-8 w-8 object-contain" />
          <span className="text-lg font-black tracking-tight text-white">
            Skill Admin
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="12" />
          </svg>
          <span>Log Out</span>
        </button>
      </header>

      {/* ── Main Revoked Access View ── */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 md:p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* Glowing background blob */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
          
          {/* Icon Badge */}
          <div className="w-20 h-20 bg-red-500/15 border border-red-500/30 text-red-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner">
            🚫
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">Access Revoked</h1>
          
          <p className="text-xs text-gray-300 font-semibold mt-2.5 leading-relaxed">
            Your administrator access has been revoked. Please contact the Super Admin for assistance.
          </p>

          {/* Super Admin Contact Info Box */}
          <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-4 text-left space-y-2">
            <span className="text-[10px] font-black uppercase text-red-400 tracking-wider block">
              Super Admin Headquarters
            </span>
            <h4 className="text-sm font-black text-white">Skill Bridge Super Admin</h4>
            <div className="space-y-1 pt-1">
              <p className="text-xs font-mono font-medium text-gray-300 flex items-center gap-2">
                <span>✉️</span>
                <a href="mailto:system@skillbridge.in" className="hover:text-red-400 transition-colors">system@skillbridge.in</a>
              </p>
              <p className="text-xs font-mono font-medium text-gray-300 flex items-center gap-2">
                <span>📞</span>
                <a href="tel:+919876543210" className="hover:text-red-400 transition-colors">+91 98765 43210</a>
              </p>
            </div>
          </div>

          {/* Action Button Grid */}
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:+919876543210"
                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                title="Call Super Admin"
              >
                <span>📞 Call Admin</span>
              </a>

              <a
                href="mailto:system@skillbridge.in?subject=Admin%20Access%20Reactivation%20Request"
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                title="Mail Super Admin"
              >
                <span>✉️ Mail Admin</span>
              </a>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-gray-200 font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-300">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-gray-500 font-semibold tracking-wide border-t border-white/5">
        Skill Bridge India
      </footer>

    </div>
  );
}
