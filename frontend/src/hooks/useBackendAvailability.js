import { useCallback, useEffect, useRef, useState } from 'react';
import { checkApiHealth } from '../services/apiClient';

const HEALTH_CHECK_INTERVAL_MS = 5000;

function getInitialStatus() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'unavailable';
  }
  return 'checking';
}

export function useBackendAvailability() {
  const [status, setStatus] = useState(getInitialStatus);
  const mountedRef = useRef(false);
  const requestRef = useRef(null);

  const updateStatus = useCallback((nextStatus) => {
    if (mountedRef.current) {
      setStatus(nextStatus);
    }
  }, []);

  const checkNow = useCallback(async ({ showChecking = false } = {}) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      updateStatus('unavailable');
      return false;
    }

    if (requestRef.current) {
      return requestRef.current;
    }

    if (showChecking) {
      updateStatus('checking');
    }

    const request = checkApiHealth()
      .then((isAvailable) => {
        updateStatus(isAvailable ? 'available' : 'unavailable');
        return isAvailable;
      })
      .finally(() => {
        if (requestRef.current === request) {
          requestRef.current = null;
        }
      });

    requestRef.current = request;
    return request;
  }, [updateStatus]);

  const markUnavailable = useCallback(() => {
    updateStatus('unavailable');
  }, [updateStatus]);

  useEffect(() => {
    mountedRef.current = true;
    void checkNow({ showChecking: true });

    const handleOffline = () => updateStatus('unavailable');
    const handleOnline = () => {
      void checkNow({ showChecking: true });
    };
    const handleFocus = () => {
      void checkNow();
    };
    const intervalId = window.setInterval(() => {
      void checkNow();
    }, HEALTH_CHECK_INTERVAL_MS);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkNow, updateStatus]);

  return {
    isBackendAvailable: status === 'available',
    isCheckingBackend: status === 'checking',
    checkBackendNow: checkNow,
    markBackendUnavailable: markUnavailable,
  };
}
