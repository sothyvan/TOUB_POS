import { useEffect, useRef } from 'react';

/**
 * Runs a refresh callback when the browser becomes active again and on a quiet
 * interval. The callback is stored in a ref so callers can pass stable or
 * changing functions without re-registering browser listeners every render.
 */
export function useAutoRefresh(onRefresh, {
  enabled = true,
  intervalMs = 30000,
  refreshOnFocus = true,
  refreshOnVisible = true,
} = {}) {
  const refreshRef = useRef(onRefresh);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    async function runRefresh() {
      if (isRefreshingRef.current || document.hidden) {
        return;
      }

      isRefreshingRef.current = true;
      try {
        await refreshRef.current?.();
      } finally {
        isRefreshingRef.current = false;
      }
    }

    const intervalId = intervalMs > 0
      ? window.setInterval(runRefresh, intervalMs)
      : null;

    function handleFocus() {
      if (refreshOnFocus) {
        void runRefresh();
      }
    }

    function handleVisibilityChange() {
      if (refreshOnVisible && document.visibilityState === 'visible') {
        void runRefresh();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, refreshOnFocus, refreshOnVisible]);
}
