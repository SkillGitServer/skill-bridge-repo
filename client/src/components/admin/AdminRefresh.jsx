import React, { useState } from 'react';
import GlobalLoader from '../shared/GlobalLoader';
import admIcon from '../../assets/adm-icon.png';

/**
 * useAdminRefresh - custom hook for Admin pages to trigger data re-fetching
 * with our official glassmorphic loading screen overlay instead of browser white-screen reload.
 * 
 * @param {Function} fetchFn - Async or sync data fetching function for current page
 */
export function useAdminRefresh(fetchFn) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      if (typeof fetchFn === 'function') {
        await fetchFn();
      }
    } catch (err) {
      console.error('Admin data refresh error:', err);
    } finally {
      // Ensure smooth visual feedback for at least 500ms
      const elapsedTime = Date.now() - startTime;
      const minDuration = 500;
      if (elapsedTime < minDuration) {
        await new Promise((resolve) => setTimeout(resolve, minDuration - elapsedTime));
      }

      // Hard browser reload to fetch latest assets & git pushes
      window.location.reload();
    }
  };

  const RefreshOverlay = isRefreshing ? (
    <GlobalLoader title="Skill Admin" logo={admIcon} />
  ) : null;

  const RefreshButton = (
    <button
      onClick={handleRefresh}
      title="Refresh Data"
      aria-label="Refresh Data"
      disabled={isRefreshing}
      className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>
  );

  return {
    handleRefresh,
    isRefreshing,
    RefreshOverlay,
    RefreshButton,
  };
}
