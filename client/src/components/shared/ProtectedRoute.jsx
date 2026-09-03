import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken, decodeToken } from '../../utils/auth';

const ProtectedRoute = ({ allowedRoles }) => {
  const location = useLocation();

  // Determine portal strictly from location.pathname
  const portal = location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/super_admin') || location.pathname.startsWith('/sudo-control-panel')
    ? 'supss'
    : location.pathname.startsWith('/admin')
    ? 'vault'
    : 'spark';

  const token = getAuthToken(portal);
  const decoded = token ? decodeToken(token) : null;
  const userRole = decoded ? decoded.role : null;

  useEffect(() => {
    if (token) {
      // Proactively verify session with backend
      axios.get('/api/auth/verify-session', {
        headers: { Authorization: `Bearer ${token}` }
      }).catch((err) => {
        console.warn('Session verification check responded:', err.message);
      });

      if (userRole === 'student') {
        const email = localStorage.getItem('spark_email') || localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '';
        if (email) {
          axios.get(`/api/trial/status/${email}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => {
            if (!res.data.isUnlocked) {
              const expiresAt = new Date(res.data.trialExpiresAt).getTime();
              if (expiresAt <= Date.now()) {
                if (location.pathname !== '/student/dashboard' && location.pathname !== '/student_dashboard') {
                  window.location.href = '/student/dashboard';
                }
              }
            }
          }).catch(err => {
            console.warn('Trial status check failed:', err.message);
          });
        }
      }
    }
  }, [location.pathname, token, userRole]);

  const isDevAllowed = sessionStorage.getItem('dev_allowed') === 'true' || localStorage.getItem('admin_stealth_allowed') === 'true';

  if (!token || !decoded) {
    // Allow dev portal access to landing editor & passkeys manager if dev flag active
    if (isDevAllowed && (
      location.pathname.startsWith('/super-admin/landing-editor') ||
      location.pathname.startsWith('/super_admin/landing-editor') ||
      location.pathname.startsWith('/super-admin/passkeys') ||
      location.pathname.startsWith('/super_admin/passkeys')
    )) {
      return <Outlet />;
    }

    // No valid token for this portal — SILENTLY and INSTANTLY redirect to portal login page
    if (location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/super_admin')) {
      return <Navigate to="/sudo-control-panel" state={{ from: location }} replace />;
    }
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/auth?access=admin_launch_2026" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict RBAC Role Check for active token
  const isSuperAdminRole = userRole === 'superadmin' || userRole === 'super_admin';
  const isAdminRole = userRole === 'admin';
  const isStudentRole = userRole === 'student';

  const isAllowed = allowedRoles?.some(r => {
    if (r === 'superadmin' || r === 'super_admin') return isSuperAdminRole;
    if (r === 'admin') return isAdminRole;
    if (r === 'student') return isStudentRole;
    return r === userRole;
  });

  if (allowedRoles && !isAllowed) {
    // Authenticated with wrong role for this portal route — SILENTLY redirect to login
    if (location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/super_admin')) {
      return <Navigate to="/sudo-control-panel" replace />;
    }
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/auth?access=admin_launch_2026" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Redirect revoked admin attempting to access admin dashboard routes to /admin/revoked
  if (userRole === 'admin' && localStorage.getItem('admin_status') === 'revoked' && location.pathname !== '/admin/revoked') {
    return <Navigate to="/admin/revoked?access=admin_launch_2026" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
