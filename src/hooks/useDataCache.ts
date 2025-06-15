"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  retryOnError?: boolean; // Retry failed requests
  maxRetries?: number; // Maximum number of retries
}

interface UseDataCacheResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  isStale: boolean;
}

// Global cache store
const globalCache = new Map<string, CacheEntry<any>>();

// Cache cleanup interval (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    if (now > entry.expiry) {
      globalCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseDataCacheResult<T> {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCachedData = useCallback((): CacheEntry<T> | null => {
    const cached = globalCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.expiry) {
      globalCache.delete(key);
      return null;
    }

    return cached as CacheEntry<T>;
  }, [key]);

  const setCachedData = useCallback((newData: T) => {
    const now = Date.now();
    globalCache.set(key, {
      data: newData,
      timestamp: now,
      expiry: now + ttl
    });
  }, [key, ttl]);

  const fetchData = useCallback(async (useCache: boolean = true): Promise<void> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    if (useCache) {
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setError(null);

        // Check if data is stale (older than half the TTL)
        const isDataStale = Date.now() - cached.timestamp > ttl / 2;
        setIsStale(isDataStale);

        // If stale and staleWhileRevalidate is enabled, fetch fresh data in background
        if (isDataStale && staleWhileRevalidate) {
          fetchData(false); // Fetch without using cache
        }
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const result = await fetcher();

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result);
      setCachedData(result);
      setIsStale(false);
      retryCountRef.current = 0; // Reset retry count on success

    } catch (err) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');

      // Retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.warn(`Request failed, retrying (${retryCountRef.current}/${maxRetries}):`, error.message);

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCountRef.current - 1) * 1000;
        setTimeout(() => fetchData(false), delay);
        return;
      }

      setError(error);
      console.error('Data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, getCachedData, setCachedData, ttl, staleWhileRevalidate, retryOnError, maxRetries]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchData(false); // Force fresh fetch
  }, [fetchData]);

  const invalidate = useCallback((): void => {
    globalCache.delete(key);
    setIsStale(true);
  }, [key]);

  // Initial data fetch
  useEffect(() => {
    fetchData();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidate,
    isStale
  };
}

// Utility functions for cache management
export const cacheUtils = {
  // Clear all cache entries
  clearAll: () => {
    globalCache.clear();
  },

  // Clear specific cache entry
  clear: (key: string) => {
    globalCache.delete(key);
  },

  // Get cache size
  size: () => globalCache.size,

  // Get all cache keys
  keys: () => Array.from(globalCache.keys()),

  // Preload data into cache
  preload: async <T>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000) => {
    try {
      const data = await fetcher();
      const now = Date.now();
      globalCache.set(key, {
        data,
        timestamp: now,
        expiry: now + ttl
      });
    } catch (error) {
      console.warn('Failed to preload cache for key:', key, error);
    }
  }
};

// Hook for managing multiple cache entries
export function useMultipleDataCache<T extends Record<string, any>>(
  entries: Array<{
    key: string;
    fetcher: () => Promise<T[keyof T]>;
    options?: CacheOptions;
  }>
) {
  // Call hooks at the top level, not in callbacks
  const results = [];
  for (let i = 0; i < entries.length; i++) {
    const { key, fetcher, options } = entries[i];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results.push(useDataCache(key, fetcher, options));
  }

  return {
    data: entries.reduce((acc, { key }, index) => {
      acc[key] = results[index].data;
      return acc;
    }, {} as Record<string, any>),
    isLoading: results.some(result => result.isLoading),
    errors: results.map(result => result.error).filter(Boolean),
    refetchAll: () => Promise.all(results.map(result => result.refetch())),
    invalidateAll: () => results.forEach(result => result.invalidate())
  };
}
