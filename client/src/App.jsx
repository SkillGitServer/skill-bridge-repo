import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import MaintenanceGatekeeper from './components/shared/MaintenanceGatekeeper';
import ErrorBoundary from './components/shared/ErrorBoundary';
import StealthRoute from './components/shared/StealthRoute';
import ProtectedRoute from './components/shared/ProtectedRoute';
import SiteBlockedOverlay from './components/shared/SiteBlockedOverlay';
import GlobalLoader from './components/shared/GlobalLoader';
import { SiteLockProvider, useSiteLock, isDevControlPanelRoute } from './context/SiteLockContext';
import ScrollToTop from './components/shared/ScrollToTop';
import { usePWA } from './hooks/usePWA';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import OfflinePage from './components/shared/OfflinePage';
import PWARouteGuard from './components/shared/PWARouteGuard';
import InstallBanner from './components/shared/InstallBanner';
import AmbientBackground from './components/shared/AmbientBackground';
import './index.css';
import axios from 'axios';
import { getAuthToken, clearAllAuthTokensAndState } from './utils/auth';

// ── Standard Synchronous Page Route Imports ──
import DevDashboard from './pages/dev/DevDashboard';
import LandingPage from './pages/LandingPage';
import Login from './components/student/Login';
import AdminAuth from './components/admin/AdminAuth';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminWaiting from './pages/admin/AdminWaiting';
import AdminExamGenerator from './pages/admin/AdminExamGenerator';
import AdminProfile from './pages/admin/AdminProfile';
import AdminStudentList from './pages/admin/AdminStudentList';
import AdminExamList from './pages/admin/AdminExamList';
import AdminReports from './pages/admin/AdminReports';
import AdminReviews from './pages/admin/AdminReviews';
import AdminResumeReview from './pages/admin/AdminResumeReview';
import AdminRevoked from './pages/admin/AdminRevoked';
import SuperAdminAuth from './components/super-admin/SuperAdminAuth';
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import SuperAdminApprovals from './pages/super-admin/SuperAdminApprovals';
import SuperAdminInstitutes from './pages/super-admin/SuperAdminInstitutes';
import SuperAdminCandidates from './pages/super-admin/SuperAdminCandidates';
import SuperAdminLandingEditor from './pages/super-admin/SuperAdminLandingEditor';
import SuperAdminAIChatLogs from './pages/super-admin/SuperAdminAIChatLogs';
import SuperAdminPublishedExams from './pages/super-admin/SuperAdminPublishedExams';
import SuperAdminRevenue from './pages/super-admin/SuperAdminRevenue';
import SuperAdminJobs from './pages/super-admin/SuperAdminJobs';
import SuperAdminPasskeys from './pages/super-admin/SuperAdminPasskeys';
import SuperAdminReviews from './pages/super-admin/SuperAdminReviews';
import AdminJobs from './pages/admin/AdminJobs';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentResults from './pages/student/StudentResults';
import StudentExam from './pages/student/StudentExam';
import StudentLeaderboard from './pages/student/StudentLeaderboard';
import ResumeReview from './pages/student/ResumeReview';
import JobBoard from './pages/student/JobBoard';
import StudentUpgradeForm from './components/student/StudentUpgradeForm';

import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import RegistrationSuccess from './components/student/RegistrationSuccess';
import SessionConflict from './pages/SessionConflict';
import DeviceManagement from './pages/super-admin/DeviceManagement';
import ApkDownloadPage from './pages/ApkDownloadPage';

// Global request interceptor: automatically attaches JWT token based on active portal context safely
axios.interceptors.request.use(
  (config) => {
    try {
      let token = null;
      const url = config.url || '';
      let pathname = '';
      if (typeof window !== 'undefined' && window.location && window.location.pathname) {
        pathname = window.location.pathname;
      }

      if (url.includes('/api/super-admin/') || pathname.startsWith('/super-admin') || pathname.startsWith('/sudo-control-panel')) {
        token = getAuthToken('supss');
      } else if (url.includes('/api/admin/') || pathname.startsWith('/admin')) {
        token = getAuthToken('vault');
      } else if (url.includes('/api/student/') || pathname.startsWith('/student')) {
        token = getAuthToken('spark');
      } else {
        token = getAuthToken();
      }

      if (token) {
        if (!config.headers.Authorization || config.headers.Authorization === 'Bearer null' || config.headers.Authorization === 'Bearer undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.warn('Axios request interceptor token attachment warning:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor to handle deleted users / 401 & 404 auth failures
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || '';

      // Skip intercepting non-auth submission & resource lookup routes so errors are handled by components
      const isExcludedRoute =
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/register') ||
        url.includes('/api/auth/verify-otp') ||
        url.includes('/api/auth/force-login') ||
        url.includes('/api/auth/google') ||
        url.includes('/api/payment/fee-by-code') ||
        url.includes('/api/payment/config');

      if (!isExcludedRoute) {
        const errorMsg = (error.response.data?.error || error.response.data?.message || '').toLowerCase();

        // 403 Forbidden with ADMIN_REVOKED code -> redirect to Revoked Access screen without logging out
        if (status === 403 && (error.response?.data?.code === 'ADMIN_REVOKED' || errorMsg.includes('admin access has been revoked'))) {
          localStorage.setItem('admin_status', 'revoked');
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/revoked') {
            window.location.href = '/admin/revoked?access=admin_launch_2026';
          }
          return Promise.reject(error);
        }
        
        // Match 401 Unauthorized OR 404 User Account Not Found / Deleted
        const isStaleTokenOrDeletedUser =
          status === 401 ||
          (status === 404 && (
            errorMsg.includes('user no longer exists') ||
            errorMsg.includes('user account not found') ||
            errorMsg.includes('student account not found') ||
            errorMsg.includes('account deleted') ||
            (url.includes('/api/student/profile') && errorMsg.includes('student not found')) ||
            (url.includes('/api/admin/profile') && errorMsg.includes('admin not found'))
          ));

        if (isStaleTokenOrDeletedUser) {
          // 1. Immediately wipe ALL tokens & session state from localStorage and sessionStorage
          clearAllAuthTokensAndState();

          if (errorMsg.includes('another device') || errorMsg.includes('session expired')) {
            toast.error('Session expired. You logged in on another device.');
          } else {
            toast.error('Session expired or user account no longer exists. Please log in again.');
          }
          
          // 2. Redirect to portal-specific login screen cleanly
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          if (
            currentPath.startsWith('/super-admin') ||
            currentPath.startsWith('/super_admin') ||
            currentPath.startsWith('/sudo-control-panel') ||
            currentPath.startsWith('/supss')
          ) {
            if (currentPath !== '/sudo-control-panel') {
              window.location.replace('/sudo-control-panel');
            }
          } else if (currentPath.startsWith('/admin')) {
            if (!currentPath.startsWith('/admin/auth')) {
              window.location.replace('/admin/auth?access=admin_launch_2026');
            }
          } else if (currentPath.startsWith('/student')) {
            if (currentPath !== '/register' && currentPath !== '/login') {
              window.location.replace('/register');
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

const DEV_ROUTE_PREFIX = import.meta.env.VITE_DEV_ROUTE_PREFIX || 'secure-dev-portal-x97';
const DEV_ACCESS_KEY = import.meta.env.VITE_DEV_ACCESS_KEY || 'sh_dev_secret_99824_key';

// Separated so it can use useLocation (must be inside BrowserRouter)
function AppRoutes() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const { installPromptEvent, triggerInstall } = usePWA();
  const { isOnline, checkConnection, isChecking } = useNetworkStatus();

  const { isSiteBlocked } = useSiteLock();

  const showInstallBanner =
    location.pathname !== '/' &&
    !location.pathname.startsWith('/dev-override');

  if (!isOnline) {
    return <OfflinePage onRetry={checkConnection} isChecking={isChecking} />;
  }

  return (
    <PWARouteGuard>
      <>
      {/* Global Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2000,
          className: '',
          style: {
            borderRadius: '100px',
            background: '#333',
            color: '#fff',
            padding: '16px 24px',
            fontWeight: 'bold',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
          success: {
            duration: 2000,
            style: { background: '#10B981', color: 'white' },
            iconTheme: { primary: 'white', secondary: '#10B981' },
          },
          error: {
            duration: 2000,
            style: { background: '#EF4444', color: 'white' },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t} style={{
            ...t.style,
            animation: t.visible ? 'custom-enter 0.2s ease-out' : 'custom-exit 0.2s ease-in forwards',
          }}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button 
                    onClick={() => toast.dismiss(t.id)} 
                    className="ml-3 hover:opacity-75 focus:outline-none flex items-center justify-center p-1.5 rounded-full bg-black/20 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>

      {/* Route-change Global Loader */}
      {isLoading && <GlobalLoader />}

      <ScrollToTop />
      
      {isSiteBlocked && !location.pathname.startsWith(`/${DEV_ROUTE_PREFIX}`) && !location.pathname.startsWith('/dev') ? (
        <SiteBlockedOverlay />
      ) : (
        <ErrorBoundary>
          <Routes>
              {/* Stealth-protected Dev Route - Excluded from Maintenance Gatekeeper */}
              <Route element={<StealthRoute secretCode={DEV_ACCESS_KEY} />}>
                <Route path={`/${DEV_ROUTE_PREFIX}/dashboard`} element={<DevDashboard />} />
                <Route path="/dev/dashboard" element={<DevDashboard />} />
                <Route path="/dev-dashboard" element={<DevDashboard />} />
              </Route>

            {/* Hidden Super Admin route — no stealth key, no public links, no navbar entry */}
            {/* Access: /sudo-control-panel (never linked anywhere in the UI) */}
            <Route path="/sudo-control-panel" element={<SuperAdminAuth />} />
            
            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/super_admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/approvals" element={<SuperAdminApprovals />} />
              <Route path="/super_admin/approvals" element={<SuperAdminApprovals />} />
              <Route path="/super-admin/institutes" element={<SuperAdminInstitutes />} />
              <Route path="/super_admin/institutes" element={<SuperAdminInstitutes />} />
              <Route path="/super-admin/candidates" element={<SuperAdminCandidates />} />
              <Route path="/super_admin/candidates" element={<SuperAdminCandidates />} />
              <Route path="/super-admin/landing-editor" element={<SuperAdminLandingEditor />} />
              <Route path="/super_admin/landing-editor" element={<SuperAdminLandingEditor />} />
              <Route path="/super-admin/ai-chat-logs" element={<SuperAdminAIChatLogs />} />
              <Route path="/super_admin/ai-chat-logs" element={<SuperAdminAIChatLogs />} />
              <Route path="/super-admin/published-exams" element={<SuperAdminPublishedExams />} />
              <Route path="/super_admin/published-exams" element={<SuperAdminPublishedExams />} />
              <Route path="/super-admin/revenue" element={<SuperAdminRevenue />} />
              <Route path="/super_admin/revenue" element={<SuperAdminRevenue />} />
              <Route path="/super-admin/jobs" element={<SuperAdminJobs />} />
              <Route path="/super_admin/jobs" element={<SuperAdminJobs />} />
              <Route path="/super-admin/passkeys" element={<SuperAdminPasskeys />} />
              <Route path="/super_admin/passkeys" element={<SuperAdminPasskeys />} />
              <Route path="/super-admin/devices" element={<DeviceManagement />} />
              <Route path="/super_admin/devices" element={<DeviceManagement />} />
              <Route path="/super-admin/reviews" element={<SuperAdminReviews />} />
              <Route path="/super_admin/reviews" element={<SuperAdminReviews />} />
            </Route>

            {/* Maintenance Gatekeeper protecting all other routes */}
            <Route element={<MaintenanceGatekeeper />}>
              <Route path="/" element={<LandingPage />} />
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student_dashboard" element={<StudentDashboard />} />
                <Route path="/student/profile" element={<StudentProfile />} />
                <Route path="/student/results" element={<StudentResults />} />
                <Route path="/student/exam" element={<StudentExam />} />
                <Route path="/student/exam/:category" element={<StudentExam />} />
                <Route path="/student/leaderboard" element={<StudentLeaderboard />} />
                <Route path="/student/resume" element={<ResumeReview />} />
                <Route path="/student/jobs" element={<JobBoard />} />
                <Route path="/student/complete-profile" element={<StudentUpgradeForm onBack={() => window.location.href = '/student/dashboard'} showBack={true} />} />
                <Route path="/student/upgrade" element={<StudentUpgradeForm onBack={() => window.location.href = '/student/dashboard'} showBack={true} />} />
              </Route>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Login />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/download" element={<ApkDownloadPage />} />
              <Route path="/download/:appId" element={<ApkDownloadPage />} />

              {/* Session conflict resolution — no auth required */}
              <Route path="/session-conflict" element={<SessionConflict />} />

              {/* Stealth-protected Admin Routes — require ?access=admin_launch_2026 */}
              <Route element={<StealthRoute secretCode="admin_launch_2026" />}>
                <Route path="/admin/auth" element={<AdminAuth />} />
                <Route path="/admin/waiting" element={<AdminWaiting />} />
                <Route path="/admin/revoked" element={<AdminRevoked />} />
                <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/exam-generator" element={<AdminExamGenerator />} />
                  <Route path="/admin/profile" element={<AdminProfile />} />
                  <Route path="/admin/students" element={<AdminStudentList />} />
                  <Route path="/admin/exams" element={<AdminExamList />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/reviews" element={<AdminReviews />} />
                  <Route path="/admin/resume-review" element={<AdminResumeReview />} />
                  <Route path="/admin/jobs" element={<AdminJobs />} />
                </Route>
              </Route>
            </Route>
            {/* 404 Catch-All Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      )}

      {showInstallBanner && (
        <InstallBanner
          installPromptEvent={installPromptEvent}
          triggerInstall={triggerInstall}
        />
      )}
    </>
    </PWARouteGuard>
  );
}

function AppContent() {
  const { isDevToolsBlocked } = useSiteLock();

  // Always block Ctrl+S / Cmd+S (Save Page As) across the app (excluded on Dev Control Panel)
  useEffect(() => {
    const handleSavePrevent = (e) => {
      if (typeof window !== 'undefined' && isDevControlPanelRoute(window.location.pathname)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleSavePrevent, { capture: true });
    return () => window.removeEventListener('keydown', handleSavePrevent, { capture: true });
  }, []);

  useEffect(() => {
    if (!isDevToolsBlocked) return;

    // Strict exclusion: Dev Control Panel Bypass
    if (typeof window !== 'undefined' && isDevControlPanelRoute(window.location.pathname)) return;

    // Disable Right Click
    const handleContextMenu = (e) => {
      if (typeof window !== 'undefined' && isDevControlPanelRoute(window.location.pathname)) return;
      e.preventDefault();
    };
    
    // Disable specific keyboard shortcuts
    const handleKeyDown = (e) => {
      if (typeof window !== 'undefined' && isDevControlPanelRoute(window.location.pathname)) return;

      // Prevent F12
      if (e.key === 'F12') e.preventDefault();
      
      // Prevent Ctrl+Shift+J (Console), Ctrl+U / Cmd+U (View Source) — (Ctrl+Shift+I is enabled)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
      }
      
      // Prevent Ctrl+C / Cmd+C (Copy), Ctrl+S / Cmd+S (Save), Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'C' || e.key === 'c' || e.key === 'S' || e.key === 's' || e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
      }

      // Prevent PrintScreen key
      if (e.key === 'PrintScreen') {
         e.preventDefault();
         navigator.clipboard.writeText(''); // Attempt to clear clipboard
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDevToolsBlocked]);

  // Disable native browser pull-to-refresh on mobile devices when at top of page
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      const pathname = window.location.pathname || '';
      // Allow native browser pull-to-refresh reload on Landing Page and public website pages
      const isPublicWebsite =
        pathname === '/' ||
        pathname === '/about' ||
        pathname === '/contact' ||
        pathname === '/privacy' ||
        pathname === '/terms';

      if (isPublicWebsite) return;

      if (e.touches && e.touches.length === 1) {
        const touchY = e.touches[0].clientY;
        const touchDiff = touchY - touchStartY;
        const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        
        // If at top of page and pulling downwards inside PWA portals, block native browser pull-to-refresh overlay
        if (scrollTop <= 0 && touchDiff > 0) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <AppRoutes />
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-transparent text-gray-900 w-full relative">
        <AmbientBackground />
        <SiteLockProvider>
          <AppContent />
        </SiteLockProvider>
      </div>
    </BrowserRouter>
  );
}

export default App;
