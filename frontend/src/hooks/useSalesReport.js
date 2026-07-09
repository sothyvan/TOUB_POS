import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAutoRefresh } from './useAutoRefresh';

export function useSalesReport({ range = 'today', stallId = '', cashierId = '' } = {}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await api.reports.getSales({
        range,
        stall_id: stallId,
        cashier_id: cashierId,
      });
      setReport(data);
      setError('');
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load sales report.');
      return null;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [range, stallId, cashierId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void fetchReport(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [fetchReport]);

  useAutoRefresh(() => fetchReport(false), {
    intervalMs: 30000,
  });

  return {
    report,
    loading,
    error,
    refetch: fetchReport,
  };
}
