import { useState, useEffect, useCallback } from 'react';
import { apiCache } from '@/lib/api-cache';

interface UseOptimizedFetchOptions<T> {
  fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>;
  cacheKey?: string;
  cacheTTL?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  staleWhileRevalidate?: boolean; // Show cached data immediately, fetch fresh in background
}

export function useOptimizedFetch<T = any>({
  fetchFn,
  cacheKey,
  cacheTTL = 30000,
  enabled = true,
  onSuccess,
  onError,
  staleWhileRevalidate = true,
}: UseOptimizedFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (useCache: boolean = true) => {
    if (!enabled) return;

    try {
      // If stale-while-revalidate and we have cached data, show it immediately
      if (staleWhileRevalidate && cacheKey) {
        const cached = apiCache.get(cacheKey, {});
        if (cached && cached.success && cached.data) {
          setData(cached.data);
          setIsStale(true);
          setLoading(false);
        }
      }

      // Fetch fresh data
      if (!staleWhileRevalidate || !data) {
        setLoading(true);
      }

      const result = await fetchFn();

      if (result.success && result.data !== undefined) {
        setData(result.data);
        setIsStale(false);
        setError(null);
        onSuccess?.(result.data);
      } else {
        setError(result.error || 'Failed to fetch data');
        onError?.(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled, staleWhileRevalidate, cacheKey, data, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      apiCache.invalidate(cacheKey);
    }
    fetchData(false);
  }, [fetchData, cacheKey]);

  return {
    data,
    loading,
    error,
    isStale,
    refetch,
  };
}

