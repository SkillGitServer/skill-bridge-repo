/**
 * Install Banner Component
 * Acronym Definitions:
 * - S.P.A.R.K.  : Student Professional Assessment & Readiness Kit
 * - V.A.U.L.T.  : Validated Access & User Logic Terminal
 * - S.U.P.S.S.  : Super User Portal & System Security
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DISMISSAL_STORAGE_KEY = 'install_app_banner_dismissed';

/**
 * Helper to determine whether the app is running in an installed PWA or TWA context.
 */
function isRunningStandaloneOrTWA() {
  if (typeof window === 'undefined') return false;

  // 1. Standard web display-mode media queries
  const isDisplayStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;

  // 2. iOS Safari standalone mode
  const isIOSStandalone = Boolean(window.navigator.standalone);

  // 3. Android TWA referrer detection
  const isTWAReferrer =
    typeof document !== 'undefined' &&
    document.referrer &&
    (document.referrer.startsWith('android-app://') || document.referrer.includes('android-app://'));

  // 4. Session or query override detection
  const isSessionTWA =
    typeof sessionStorage !== 'undefined' &&
    sessionStorage.getItem('is_twa_standalone') === 'true';

  const isQueryStandalone =
    new URLSearchParams(window.location.search).get('mode') === 'standalone' ||
    new URLSearchParams(window.location.search).get('twa') === 'true';

  const result = isDisplayStandalone || isIOSStandalone || isTWAReferrer || isSessionTWA || isQueryStandalone;

  if (result && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('is_twa_standalone', 'true');
    } catch {}
  }

  return result;
}

function InstallBanner() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persistent dismissal flag in localStorage
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSAL_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Track standalone / TWA mode dynamically
  const [isStandalone, setIsStandalone] = useState(isRunningStandaloneOrTWA);

  useEffect(() => {
    if (isRunningStandaloneOrTWA()) {
      setIsStandalone(true);
      return;
    }

    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleDisplayModeChange);
      return () => mediaQueryList.removeEventListener('change', handleDisplayModeChange);
    } else if (mediaQueryList.addListener) {
      mediaQueryList.addListener(handleDisplayModeChange);
      return () => mediaQueryList.removeListener(handleDisplayModeChange);
    }
  }, []);

  // Strictly hide if running inside installed standalone PWA/TWA, dismissed, or on APK download pages
  if (isDismissed || isStandalone || location.pathname.startsWith('/download')) {
    return null;
  }

  let title = 'Install Spark';
  let subtitle = 'Get instant access to your learning dashboard & exams.';
  let icon = '/stu-icon.png';
  let targetDownloadRoute = '/download/spark';

  if (location.pathname.startsWith('/admin')) {
    title = 'Install Vault';
    subtitle = 'Get instant access to Admin Dashboard & Management Tools.';
    icon = '/adm-icon.png';
    targetDownloadRoute = '/download/vault';
  } else if (
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/sudo-control-panel') ||
    location.pathname.startsWith('/super_admin') ||
    location.pathname.startsWith('/supss')
  ) {
    title = 'Install Supss';
    subtitle = 'Get instant access to the Sudo Control Panel & Approvals.';
    icon = '/sup-icon.png';
    targetDownloadRoute = '/download/supss';
  }

  const handleInstallClick = () => {
    // Navigate directly to the Official Android Packages app distribution page
    navigate(targetDownloadRoute);
  };

  const handleDismissClick = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSAL_STORAGE_KEY, 'true');
    } catch {}
  };

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
          onClick={handleInstallClick}
          className="flex-1 sm:flex-none bg-[#111111] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Install
        </button>
        <button
          onClick={handleDismissClick}
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

