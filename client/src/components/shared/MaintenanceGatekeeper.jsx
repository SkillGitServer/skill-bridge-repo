import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import MaintenancePage from './MaintenancePage';
import GlobalLoader from './GlobalLoader';

function MaintenanceGatekeeper() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const checkSystemStatus = async () => {
      try {
        const response = await axios.get('/api/status', {
          signal: controller.signal
        });
        if (isMounted && response.data && response.data.isBlocked) {
          setIsBlocked(true);
          setBlockReason(response.data.blockReason);
        }
      } catch (error) {
        if (!isMounted || axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('aborted')) {
          return;
        }
        if (error.response && error.response.status === 503) {
          setIsBlocked(true);
          setBlockReason(error.response.data.blockReason || 'Site is temporarily unavailable.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSystemStatus();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (loading) {
    return <GlobalLoader />;
  }

  if (isBlocked) {
    return <MaintenancePage blockReason={blockReason} />;
  }

  return <Outlet />;
}

export default MaintenanceGatekeeper;
