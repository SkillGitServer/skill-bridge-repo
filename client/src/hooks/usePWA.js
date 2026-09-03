/**
 * Skill Bridge India - PWA Portal Architecture & Acronym Reference:
 * - S.P.A.R.K.  : Student Professional Assessment & Readiness Kit (Student App)
 * - V.A.U.L.T.  : Validated Access & User Logic Terminal (Admin App)
 * - S.U.P.S.S.  : Super User Portal & System Security (Super Admin App)
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const usePWA = () => {
  const location = useLocation();
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    // 1. Force update pwa_app_context based on current route or URL param
    const params = new URLSearchParams(location.search);
    const pwaParam = params.get('pwa');

    let currentContext = null;
    if (pwaParam && ['student', 'admin', 'superadmin'].includes(pwaParam)) {
      currentContext = pwaParam;
    } else if (location.pathname.startsWith('/admin')) {
      currentContext = 'admin';
    } else if (
      location.pathname.startsWith('/sudo-control-panel') ||
      location.pathname.startsWith('/super-admin') ||
      location.pathname.startsWith('/super_admin') ||
      location.pathname.startsWith('/supss')
    ) {
      currentContext = 'superadmin';
    } else if (location.pathname.startsWith('/student')) {
      currentContext = 'student';
    }

    if (currentContext) {
      sessionStorage.setItem('pwa_app_context', currentContext);
    }

    // 2. Select manifest and icon based on current route (null for landing page)
    let manifestName = null;
    let iconPath = '/logo.png';

    if (location.pathname.startsWith('/admin')) {
      manifestName = 'manifest-admin.json';
      iconPath = '/adm-icon.png';
    } else if (
      location.pathname.startsWith('/sudo-control-panel') ||
      location.pathname.startsWith('/super-admin') ||
      location.pathname.startsWith('/super_admin') ||
      location.pathname.startsWith('/supss')
    ) {
      manifestName = 'manifest-superadmin.json';
      iconPath = '/sup-icon.png';
    } else if (
      location.pathname.startsWith('/student') ||
      location.pathname.startsWith('/register') ||
      location.pathname.startsWith('/login') ||
      location.pathname.startsWith('/dashboard')
    ) {
      manifestName = 'manifest-student.json';
      iconPath = '/stu-icon.png';
    }

    // Update or remove manifest link dynamically
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestName) {
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = '/' + manifestName;
    } else {
      // Landing page or general website pages — remove manifest link!
      if (manifestLink && manifestLink.parentNode) {
        manifestLink.parentNode.removeChild(manifestLink);
      }
    }

    // Update favicon & touch icon links dynamically
    const iconSelectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]', 'link[rel="apple-touch-icon"]'];
    iconSelectors.forEach(selector => {
      let iconLink = document.querySelector(selector);
      if (iconLink) {
        iconLink.href = iconPath;
      }
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const triggerInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      if (outcome === 'accepted') {
        setInstallPromptEvent(null);
      }
    }
  };

  return { installPromptEvent, triggerInstall };
};
