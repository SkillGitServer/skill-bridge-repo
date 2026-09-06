import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Safely decodes a JWT token payload client-side without verifying signature.
 * (Signature verification is strictly enforced server-side for all API requests).
 */
export const decodeToken = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
};

/**
 * Helper to determine current portal context: 'spark' | 'vault' | 'supss'
 */
export const getPortalContext = (portalOrPath) => {
  if (['spark', 'vault', 'supss'].includes(portalOrPath)) {
    return portalOrPath;
  }
  const path = (portalOrPath || (typeof window !== 'undefined' && window.location ? window.location.pathname : '')) || '';
  if (
    path.startsWith('/sudo-control-panel') ||
    path.startsWith('/super-admin')
  ) {
    return 'supss';
  }
  if (path.startsWith('/admin')) {
    return 'vault';
  }
  return 'spark';
};

/**
 * Isolated Auth Token Retrieval Helper.
 * Ensures portals read their own unique token key, falling back safely.
 */
export const getAuthToken = (portalOrPath) => {
  try {
    const portal = getPortalContext(portalOrPath);

    if (portal === 'supss') {
      const token = sessionStorage.getItem('supss_token') || localStorage.getItem('supss_token');
      if (token) {
        const decoded = decodeToken(token);
        if (decoded && (decoded.role === 'superadmin' || decoded.role === 'super_admin')) {
          return token;
        }
      }
      const legacyToken = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (legacyToken) {
        const decoded = decodeToken(legacyToken);
        if (decoded && (decoded.role === 'superadmin' || decoded.role === 'super_admin')) {
          return legacyToken;
        }
      }
      return null;
    }

    if (portal === 'vault') {
      const token = localStorage.getItem('vault_token') || sessionStorage.getItem('vault_token');
      if (token) {
        const decoded = decodeToken(token);
        if (decoded && decoded.role === 'admin') {
          return token;
        }
      }
      const legacyToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (legacyToken) {
        const decoded = decodeToken(legacyToken);
        if (decoded && decoded.role === 'admin') {
          return legacyToken;
        }
      }
      return null;
    }

    // Default: SPARK (Student Portal)
    const token = localStorage.getItem('spark_token') || sessionStorage.getItem('spark_token');
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.role === 'student') {
        return token;
      }
    }
    const legacyToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (legacyToken) {
      const decoded = decodeToken(legacyToken);
      if (decoded && decoded.role === 'student') {
        return legacyToken;
      }
    }
    return null;
  } catch (e) {
    console.warn('getAuthToken error:', e);
    return null;
  }
};

/**
 * Isolated Auth Role Retrieval Helper.
 */
export const getAuthRole = (portalOrPath) => {
  const token = getAuthToken(portalOrPath);
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded ? decoded.role : null;
};

/**
 * Centered logout handler with custom confirmation screen modal for Super Admin and Admin.
 * Revokes session via backend API and thoroughly wipes portal-specific auth keys.
 */
export const logoutUser = async (role, navigate, skipConfirm = false) => {
  // Trigger custom Confirmation Screen-Centered Modal before logging out for Super Admin & Admin
  if ((role === 'superadmin' || role === 'admin') && !skipConfirm) {
    const isSuper = role === 'superadmin';
    const containerId = isSuper ? 'supss-logout-modal-container' : 'admin-logout-modal-container';
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) return;

    const modalContainer = document.createElement('div');
    modalContainer.id = containerId;
    document.body.appendChild(modalContainer);

    const root = createRoot(modalContainer);

    const closeModal = () => {
      try {
        root.unmount();
      } catch (e) {}
      if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
      }
    };

    const handleConfirm = () => {
      closeModal();
      logoutUser(role, navigate, true);
    };

    const modalTitle = isSuper ? 'Confirm Log Out' : 'Confirm Sign Out';
    const modalMessage = isSuper
      ? 'Are you sure you want to end your Super Admin session? You will need to authenticate again to access the platform control panel.'
      : 'Are you sure you want to end your Admin session? You will need to authenticate again to access your mentor dashboard.';

    root.render(
      React.createElement(
        'div',
        {
          className: 'fixed inset-0 z-[999999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in font-sans pointer-events-auto',
          onClick: (e) => {
            if (e.target === e.currentTarget) closeModal();
          }
        },
        React.createElement(
          'div',
          {
            className: 'bg-[#111111] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-left relative space-y-5 border-t-2 border-t-red-500 font-sans animate-scale-in'
          },
          React.createElement(
            'div',
            { className: 'flex justify-between items-start' },
            React.createElement(
              'div',
              { className: 'w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-2xl shadow-inner' },
              '🛡️'
            ),
            React.createElement(
              'button',
              {
                onClick: closeModal,
                className: 'w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer'
              },
              '✕'
            )
          ),
          React.createElement(
            'div',
            {},
            React.createElement(
              'h3',
              { className: 'text-xl font-black text-white tracking-tight flex items-center gap-2' },
              modalTitle,
              React.createElement('span', { className: 'w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse' })
            ),
            React.createElement(
              'p',
              { className: 'text-xs text-gray-400 mt-2 leading-relaxed font-medium' },
              modalMessage
            )
          ),
          React.createElement(
            'div',
            { className: 'flex items-center justify-end gap-3 pt-3 border-t border-gray-800/60' },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: closeModal,
                className: 'px-5 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-extrabold transition-all cursor-pointer min-h-[40px]'
              },
              'Cancel'
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleConfirm,
                className: 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer min-h-[40px] flex items-center gap-1.5'
              },
              React.createElement('span', null, 'Log Out'),
              React.createElement('span', { className: 'text-xs' }, '→')
            )
          )
        )
      )
    );
    return;
  }

  try {
    const portal = role === 'superadmin' ? 'supss' : role === 'admin' ? 'vault' : 'spark';
    const token = getAuthToken(portal);
    if (token) {
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('API logout failed, clearing local session anyway.', err);
  } finally {
    if (role === 'superadmin') {
      sessionStorage.removeItem('supss_token');
      sessionStorage.removeItem('supss_role');
      sessionStorage.removeItem('supss_email');
      sessionStorage.removeItem('supss_name');
      localStorage.removeItem('supss_token');
      localStorage.removeItem('supss_role');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_role');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_role');

      toast.success('Logged out successfully.');
      if (navigate) navigate('/sudo-control-panel', { replace: true });
    } else if (role === 'admin') {
      localStorage.removeItem('vault_token');
      localStorage.removeItem('vault_role');
      localStorage.removeItem('vault_email');
      localStorage.removeItem('vault_name');
      sessionStorage.removeItem('vault_token');
      sessionStorage.removeItem('vault_role');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_role');

      toast.success('Logged out successfully.');
      if (navigate) navigate('/admin/auth?access=admin_launch_2026', { replace: true });
    } else {
      clearAllAuthTokensAndState();
      toast.success('Logged out successfully.');
      if (navigate) navigate('/register', { replace: true });
    }
  }
};

/**
 * Aggressively clears all portal tokens and stored user session state across localStorage and sessionStorage.
 */
export const clearAllAuthTokensAndState = () => {
  try {
    sessionStorage.clear();
    
    // Clear all localStorage auth keys
    const keysToRemove = [
      'auth_token', 'auth_role', 'auth_email', 'auth_name',
      'spark_token', 'spark_role', 'spark_email', 'spark_name',
      'vault_token', 'vault_role', 'vault_email', 'vault_name',
      'supss_token', 'supss_role', 'supss_email', 'supss_name',
      'student_email', 'student_name', 'student_profile_photo',
      'student_resume_filename', 'student_resume_timestamp',
      'admin_email', 'admin_name', 'admin_status',
      'pending_admin_email', 'pending_admin_name',
      'superadmin_email', 'pwa_app_context',
      'supss_dashboard_stats_cache'
    ];
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch (e) {}
    });
  } catch (e) {
    console.warn('Error clearing auth state:', e);
  }
};
