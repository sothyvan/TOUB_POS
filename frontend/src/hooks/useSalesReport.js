import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAutoRefresh } from './useAutoRefresh';

export function useSalesReport({
  range = 'today',
  startDate = '',
  endDate = '',
  stallId = '',
  cashierId = '',
  includeTrends = false,
  ledgerPage = 1,
  ledgerLimit = 25,
} = {}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await api.reports.getSales({
        range,
        start_date: range === 'custom' ? startDate : '',
        end_date: range === 'custom' ? endDate : '',
        stall_id: stallId,
        cashier_id: cashierId,
        include_trends: includeTrends,
        page: ledgerPage,
        limit: ledgerLimit,
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
  }, [range, startDate, endDate, stallId, cashierId, includeTrends, ledgerPage, ledgerLimit]);

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
