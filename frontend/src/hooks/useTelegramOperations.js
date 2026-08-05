import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { subscribeToManagementUpdates } from '../services/socketClient';
import { useAutoRefresh } from './useAutoRefresh';

export function useTelegramOperations() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await api.operations.getTelegram();
      setSnapshot(data);
      setError('');
      return data;
    } catch (refreshError) {
      setError(refreshError.message || 'Unable to load Telegram delivery health.');
      return null;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refresh(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [refresh]);

  useEffect(() => {
    let refreshTimerId = null;
    const unsubscribe = subscribeToManagementUpdates(({ eventName }) => {
      if (!['kitchen_ticket_updated', 'order_updated'].includes(eventName)) return;
      window.clearTimeout(refreshTimerId);
      refreshTimerId = window.setTimeout(() => {
        void refresh(false);
      }, 250);
    });
    return () => {
      window.clearTimeout(refreshTimerId);
      unsubscribe();
    };
  }, [refresh]);

  useAutoRefresh(() => refresh(false), { intervalMs: 30000 });

  return { snapshot, loading, error, refresh };
}
