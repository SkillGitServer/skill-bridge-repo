import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Ping cache-busted asset to verify true internet connectivity
      const res = await fetch('/favicon.svg?t=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store'
      });
      if (res.ok) {
        setIsOnline(true);
        setIsChecking(false);
        return true;
      }
    } catch {
      // Fetch failed, still offline
    }
    setIsOnline(false);
    setIsChecking(false);
    return false;
  };

  return { isOnline, checkConnection, isChecking };
}
