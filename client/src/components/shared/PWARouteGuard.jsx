import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function decodeRoleFromToken() {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded.role || null;
  } catch {
    return null;
  }
}

function PWARouteGuard({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone ||
    document.referrer.includes('android-app://')
  );

  const queryParams = new URLSearchParams(location.search);
  const pwaParam = queryParams.get('pwa');

  let appContext = null;
  if (pwaParam && ['student', 'admin', 'superadmin'].includes(pwaParam)) {
    appContext = pwaParam;
    sessionStorage.setItem('pwa_app_context', pwaParam);
  }

  if (location.pathname.startsWith('/admin')) {
    appContext = 'admin';
    sessionStorage.setItem('pwa_app_context', 'admin');
  } else if (
    location.pathname.startsWith('/sudo-control-panel') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/super_admin') ||
    location.pathname.startsWith('/supss')
  ) {
    appContext = 'superadmin';
    sessionStorage.setItem('pwa_app_context', 'superadmin');
  } else if (location.pathname.startsWith('/student')) {
    appContext = 'student';
    sessionStorage.setItem('pwa_app_context', 'student');
  } else if (!appContext) {
    appContext = sessionStorage.getItem('pwa_app_context') || 'student';
  }

  const userRole = decodeRoleFromToken();

  // Handle root '/' launch inside standalone app windows or browser & dynamic Manifest switching
  useEffect(() => {
    const path = location.pathname;
    let manifestUrl = null;
    let iconUrl = '/logo.png';

    if (path.startsWith('/admin')) {
      manifestUrl = '/manifest-admin.json';
      iconUrl = '/adm-icon.png';
    } else if (
      path.startsWith('/sudo-control-panel') ||
      path.startsWith('/super-admin') ||
      path.startsWith('/super_admin') ||
      path.startsWith('/supss')
    ) {
      manifestUrl = '/manifest-superadmin.json';
      iconUrl = '/sup-icon.png';
    } else if (
      path.startsWith('/student') ||
      path.startsWith('/register') ||
      path.startsWith('/login') ||
      path.startsWith('/dashboard')
    ) {
      manifestUrl = '/manifest-student.json';
      iconUrl = '/stu-icon.png';
    }

    // Attach or remove PWA manifest tag
    let manifestLink = document.getElementById('pwa-manifest-link');
    if (manifestUrl) {
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.id = 'pwa-manifest-link';
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = manifestUrl;
    } else {
      // Landing page or general website pages — remove manifest link!
      if (manifestLink && manifestLink.parentNode) {
        manifestLink.parentNode.removeChild(manifestLink);
      }
    }

    // Update favicon & apple-touch icons
    let favLink = document.getElementById('pwa-favicon-link');
    if (favLink) favLink.href = iconUrl;
    let touchLink = document.getElementById('pwa-apple-touch-link');
    if (touchLink) touchLink.href = iconUrl;

    if (path === '/') {
      if (isStandalone) {
        if (appContext === 'admin') {
          if (userRole === 'admin') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/admin/auth?access=admin_launch_2026', { replace: true });
          }
        } else if (appContext === 'superadmin') {
          if (userRole === 'superadmin') {
            navigate('/super-admin/dashboard', { replace: true });
          } else {
            navigate('/sudo-control-panel', { replace: true });
          }
        } else {
          // Spark Student App
          if (userRole === 'student') {
            navigate('/student/dashboard', { replace: true });
          } else {
            navigate('/register', { replace: true });
          }
        }
      }
    }
  }, [location.pathname, isStandalone, appContext, userRole, navigate]);

  return children;
}

export default PWARouteGuard;
