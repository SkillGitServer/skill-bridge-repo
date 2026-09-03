/**
 * Install Banner Component
 * Acronym Definitions:
 * - S.P.A.R.K.  : Student Professional Assessment & Readiness Kit
 * - V.A.U.L.T.  : Validated Access & User Logic Terminal
 * - S.U.P.S.S.  : Super User Portal & System Security
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

function InstallBanner({ installPromptEvent, triggerInstall }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();

  // Hide banner if running in standalone mode (already installed & running as app)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone ||
    document.referrer.startsWith('android-app://');

  if (!installPromptEvent || isDismissed || isStandalone) return null;

  let title = 'Install Spark';
  let subtitle = 'Get instant access to your learning dashboard & exams.';
  let icon = '/stu-icon.png';

  if (location.pathname.startsWith('/admin')) {
    title = 'Install Vault';
    subtitle = 'Get instant access to Admin Dashboard & Management Tools.';
    icon = '/adm-icon.png';
  } else if (location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/sudo-control-panel')) {
    title = 'Install Supss';
    subtitle = 'Get instant access to the Sudo Control Panel & Approvals.';
    icon = '/sup-icon.png';
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2.5rem)] max-w-md bg-white border border-gray-100 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle select-none">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <img src={icon} alt={title} className="w-11 h-11 rounded-2xl object-cover border border-gray-100 shadow-sm shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          onClick={triggerInstall}
          className="flex-1 sm:flex-none bg-[#111111] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default InstallBanner;

