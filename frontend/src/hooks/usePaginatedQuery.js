import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from './useAutoRefresh';

/**
 * Generic hook for paginated data fetching from backend endpoints
 * that return { data: [...], pagination: { page, limit, total, totalPages } }.
 *
 * @param {Function} fetchFn - Async function that accepts (page, limit) and returns { data, pagination }
 * @param {Object}   options
 * @param {boolean}  options.enabled     - Whether fetching is active
 * @param {number}   options.pageSize    - Items per page (default 25)
 * @param {number}   options.autoRefreshMs - Auto-refresh interval (0 = disabled)
 */
export function usePaginatedQuery(fetchFn, {
  enabled = true,
  pageSize = 25,
  autoRefreshMs = 0,
} = {}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (targetPage = page, showSpinner = false) => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const result = await fetchFn(targetPage, pageSize);
      setData(result.data || []);
      setPagination(result.pagination || { page: targetPage, limit: pageSize, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, enabled]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      fetchData(1, true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [fetchData]);

  const goToPage = useCallback((newPage) => {
    setPage(newPage);
    fetchData(newPage, true);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(page, false);
  }, [fetchData, page]);

  useAutoRefresh(() => refresh(), {
    enabled: enabled && autoRefreshMs > 0,
    intervalMs: autoRefreshMs,
  });

  return {
    data,
    page,
    pagination,
    loading,
    error,
    goToPage,
    refresh,
    setData,
  };
}
