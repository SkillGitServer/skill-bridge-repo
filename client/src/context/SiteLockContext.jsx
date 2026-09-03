import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const SiteLockContext = createContext();

export const useSiteLock = () => useContext(SiteLockContext);

export const SiteLockProvider = ({ children }) => {
  const [isSiteBlocked, setIsSiteBlocked] = useState(() => {
    return localStorage.getItem('isSiteBlocked') === 'true';
  });

  const [isDevToolsBlocked, setIsDevToolsBlocked] = useState(() => {
    return localStorage.getItem('isDevToolsBlocked') !== 'false';
  });

  const [isKeyboardLockActive, setIsKeyboardLockActive] = useState(() => {
    return localStorage.getItem('isKeyboardLockActive') !== 'false';
  });

  const [isDevToolsDetected, setIsDevToolsDetected] = useState(false);

  // Fetch live global database lockdown settings from backend API
  const fetchLockdownStatus = async () => {
    try {
      const res = await axios.get('/api/system/settings');
      if (res.data) {
        if (typeof res.data.isSiteLocked === 'boolean') {
          console.log("Current Lockdown Status:", res.data.isSiteLocked);
          setIsSiteBlocked(res.data.isSiteLocked);
          localStorage.setItem('isSiteBlocked', res.data.isSiteLocked ? 'true' : 'false');
        }
        if (typeof res.data.isDevToolsBlocked === 'boolean') {
          setIsDevToolsBlocked(res.data.isDevToolsBlocked);
          localStorage.setItem('isDevToolsBlocked', res.data.isDevToolsBlocked ? 'true' : 'false');
        }
        if (typeof res.data.isKeyboardLockActive === 'boolean') {
          setIsKeyboardLockActive(res.data.isKeyboardLockActive);
          localStorage.setItem('isKeyboardLockActive', res.data.isKeyboardLockActive ? 'true' : 'false');
        }
      }
    } catch (err) {
      console.warn('Failed to sync system lockdown settings from API:', err.message);
    }
  };

  useEffect(() => {
    fetchLockdownStatus();
    // Poll every 4 seconds to enforce global lockdown across all connected devices
    const interval = setInterval(fetchLockdownStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleSiteLock = async (state) => {
    setIsSiteBlocked(state);
    localStorage.setItem('isSiteBlocked', state ? 'true' : 'false');
    window.dispatchEvent(new Event('sitelock-change'));

    try {
      const res = await axios.post('/api/system/toggle-lockdown', { isSiteLocked: state });
      if (res.data && typeof res.data.isSiteLocked === 'boolean') {
        setIsSiteBlocked(res.data.isSiteLocked);
        localStorage.setItem('isSiteBlocked', res.data.isSiteLocked ? 'true' : 'false');
      }
    } catch (err) {
      console.error('Failed to toggle global database lockdown state:', err);
    }
  };

  const toggleKeyboardLock = async (state) => {
    setIsKeyboardLockActive(state);
    localStorage.setItem('isKeyboardLockActive', state ? 'true' : 'false');
    window.dispatchEvent(new Event('keyboard-lock-change'));

    try {
      const res = await axios.post('/api/system/toggle-keyboard-lock', { isKeyboardLockActive: state });
      if (res.data && typeof res.data.isKeyboardLockActive === 'boolean') {
        setIsKeyboardLockActive(res.data.isKeyboardLockActive);
        localStorage.setItem('isKeyboardLockActive', res.data.isKeyboardLockActive ? 'true' : 'false');
      }
    } catch (err) {
      console.error('Failed to toggle global keyboard lock state:', err);
    }
  };

  const toggleDevToolsBlocker = async (state) => {
    setIsDevToolsBlocked(state);
    localStorage.setItem('isDevToolsBlocked', state ? 'true' : 'false');
    window.dispatchEvent(new Event('devtools-blocker-change'));

    try {
      const res = await axios.post('/api/system/toggle-devtools-lock', { isDevToolsBlocked: state });
      if (res.data && typeof res.data.isDevToolsBlocked === 'boolean') {
        setIsDevToolsBlocked(res.data.isDevToolsBlocked);
        localStorage.setItem('isDevToolsBlocked', res.data.isDevToolsBlocked ? 'true' : 'false');
      }
    } catch (err) {
      console.error('Failed to toggle global DevTools lock state:', err);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'isSiteBlocked') {
        setIsSiteBlocked(e.newValue === 'true');
      }
      if (e.key === 'isDevToolsBlocked') {
        setIsDevToolsBlocked(e.newValue !== 'false');
      }
      if (e.key === 'isKeyboardLockActive') {
        setIsKeyboardLockActive(e.newValue === 'true');
      }
    };
    
    const handleCustomChange = () => {
      setIsSiteBlocked(localStorage.getItem('isSiteBlocked') === 'true');
      setIsDevToolsBlocked(localStorage.getItem('isDevToolsBlocked') !== 'false');
      setIsKeyboardLockActive(localStorage.getItem('isKeyboardLockActive') === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sitelock-change', handleCustomChange);
    window.addEventListener('devtools-blocker-change', handleCustomChange);
    window.addEventListener('keyboard-lock-change', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sitelock-change', handleCustomChange);
      window.removeEventListener('devtools-blocker-change', handleCustomChange);
      window.removeEventListener('keyboard-lock-change', handleCustomChange);
    };
  }, []);

  // Global Keyboard Shortcut Enforcer logic when isKeyboardLockActive is enabled
  useEffect(() => {
    if (!isKeyboardLockActive) return;

    const handleKeyDown = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';

      // 1. EXPLICITLY ALLOW: Ctrl + Shift + R (Hard Refresh)
      if (e.ctrlKey && e.shiftKey && key === 'r') {
        return; // Do nothing, let it pass naturally
      }

      // 2. BLOCK: normal refresh (Ctrl + R) or F5
      if ((e.ctrlKey && key === 'r') || key === 'f5') {
        e.preventDefault();
      }

      // 3. BLOCK: Save (Ctrl + S) and Print (Ctrl + P)
      if (e.ctrlKey && (key === 's' || key === 'p')) {
        e.preventDefault();
      }

      // 4. BLOCK: F12 and Inspect (Ctrl + Shift + I / C / J)
      if (key === 'f12' || (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'c' || key === 'j'))) {
        e.preventDefault();
      }

      // 5. BLOCK: View Source (Ctrl + U)
      if (e.ctrlKey && key === 'u') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isKeyboardLockActive]);

  // Continuous DevTools Open Detector (Runs when isDevToolsBlocked is enabled)
  useEffect(() => {
    if (!isDevToolsBlocked) {
      setIsDevToolsDetected(false);
      return;
    }

    const checkDevTools = () => {
      if (window.self !== window.top) {
        setIsDevToolsDetected(false);
        return;
      }

      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      const start = performance.now();
      try {
        (function() { return false; })["constructor"]("debugger")();
      } catch (err) {}
      const end = performance.now();
      const isDebuggerActive = end - start > 100;

      if (widthThreshold || heightThreshold || isDebuggerActive) {
        setIsDevToolsDetected(true);
      } else {
        setIsDevToolsDetected(false);
      }
    };

    const interval = setInterval(checkDevTools, 600);
    window.addEventListener('resize', checkDevTools);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDevTools);
    };
  }, [isDevToolsBlocked]);

  const devPrefix = import.meta.env.VITE_DEV_ROUTE_PREFIX || 'secure-dev-portal-x97';

  return (
    <SiteLockContext.Provider value={{ 
      isSiteBlocked, 
      toggleSiteLock, 
      isDevToolsBlocked, 
      toggleDevToolsBlocker, 
      isDevToolsDetected,
      isKeyboardLockActive,
      toggleKeyboardLock
    }}>
      {children}
      {isDevToolsBlocked && isDevToolsDetected && !window.location.pathname.startsWith(`/${devPrefix}`) && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 text-4xl mb-5 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
            🔒
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Developer Tools Access Blocked
          </h2>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed font-semibold mb-6">
            Developer Mode and Element Inspection are currently locked by System Security. Close DevTools to resume browsing or turn off DevTools Blocker in Dev Control Panel.
          </p>
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 max-w-md text-left text-[11px] text-red-300 space-y-1.5 shadow-inner">
            <p className="font-extrabold uppercase tracking-wider text-red-400">Security Guidance:</p>
            <p>• Close browser Inspector / DevTools panel to restore normal viewing.</p>
            <p>• Turn off "DevTools Blocker" via the Dev Control Panel (`/dev/dashboard`).</p>
          </div>
        </div>
      )}
    </SiteLockContext.Provider>
  );
};
