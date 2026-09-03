import React from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';

function StealthRoute({ secretCode }) {
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('access');

  const expectedKeys = [secretCode];
  if (import.meta.env.VITE_DEV_ACCESS_KEY) {
    expectedKeys.push(import.meta.env.VITE_DEV_ACCESS_KEY);
  }

  if (accessCode && expectedKeys.includes(accessCode)) {
    sessionStorage.setItem('dev_allowed', 'true');
    localStorage.setItem(`stealth_allowed_${secretCode}`, 'true');
    localStorage.setItem('admin_stealth_allowed', 'true');
    return <Outlet />;
  }

  if (sessionStorage.getItem('dev_allowed') === 'true') {
    return <Outlet />;
  }

  if (
    localStorage.getItem(`stealth_allowed_${secretCode}`) === 'true' ||
    localStorage.getItem('admin_stealth_allowed') === 'true' ||
    localStorage.getItem('auth_role') === 'admin' ||
    localStorage.getItem('auth_role') === 'superadmin'
  ) {
    return <Outlet />;
  }

  return <Navigate to="/" replace />;
}

export default StealthRoute;
