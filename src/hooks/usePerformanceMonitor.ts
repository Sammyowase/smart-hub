"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  componentRenderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkRequests: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  type: 'navigation' | 'resource' | 'measure' | 'mark';
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    componentRenderTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    networkRequests: 0
  });

  const renderStartTime = useRef<number>(Date.now());
  const apiCallTimes = useRef<number[]>([]);
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);

  // Measure component render time
  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, componentRenderTime: renderTime }));
  }, []);

  // Monitor page performance
  useEffect(() => {
    const measurePagePerformance = () => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const pageLoadTime = navigation.loadEventEnd - navigation.navigationStart;
          setMetrics(prev => ({ ...prev, pageLoadTime }));
        }

        // Monitor resource loading
        const resources = performance.getEntriesByType('resource');
        setMetrics(prev => ({ ...prev, networkRequests: resources.length }));

        // Monitor memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          setMetrics(prev => ({
            ...prev,
            memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
          }));
        }
      }
    };

    // Initial measurement
    measurePagePerformance();

    // Periodic updates
    const interval = setInterval(measurePagePerformance, 5000);

    return () => clearInterval(interval);
  }, []);

  // Track API response times
  const trackApiCall = (startTime: number, endTime: number) => {
    const duration = endTime - startTime;
    apiCallTimes.current.push(duration);

    const avgResponseTime = apiCallTimes.current.reduce((a, b) => a + b, 0) / apiCallTimes.current.length;
    setMetrics(prev => ({ ...prev, apiResponseTime: avgResponseTime }));
  };

  // Track cache performance
  const trackCacheHit = () => {
    cacheHits.current++;
    updateCacheHitRate();
  };

  const trackCacheMiss = () => {
    cacheMisses.current++;
    updateCacheHitRate();
  };

  const updateCacheHitRate = () => {
    const total = cacheHits.current + cacheMisses.current;
    const hitRate = total > 0 ? (cacheHits.current / total) * 100 : 0;
    setMetrics(prev => ({ ...prev, cacheHitRate: hitRate }));
  };

  // Performance mark utilities
  const mark = (name: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(name);
    }
  };

  const measure = (name: string, startMark: string, endMark?: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name, 'measure');
        return measures[measures.length - 1]?.duration || 0;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return 0;
      }
    }
    return 0;
  };

  // Get performance insights - memoized to prevent infinite re-renders
  const getPerformanceInsights = useCallback(() => {
    const insights = [];

    if (metrics.pageLoadTime > 3000) {
      insights.push({
        type: 'warning',
        message: 'Page load time is slow (>3s)',
        value: `${(metrics.pageLoadTime / 1000).toFixed(2)}s`,
        suggestion: 'Consider implementing more aggressive caching or code splitting'
      });
    }

    if (metrics.apiResponseTime > 1000) {
      insights.push({
        type: 'warning',
        message: 'API response time is slow (>1s)',
        value: `${metrics.apiResponseTime.toFixed(0)}ms`,
        suggestion: 'Optimize API endpoints or implement request caching'
      });
    }

    if (metrics.cacheHitRate < 50) {
      insights.push({
        type: 'info',
        message: 'Cache hit rate could be improved',
        value: `${metrics.cacheHitRate.toFixed(1)}%`,
        suggestion: 'Review caching strategy and TTL settings'
      });
    }

    if (metrics.memoryUsage > 100) {
      insights.push({
        type: 'warning',
        message: 'High memory usage detected',
        value: `${metrics.memoryUsage.toFixed(1)}MB`,
        suggestion: 'Check for memory leaks or optimize component rendering'
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'success',
        message: 'Performance looks good!',
        value: '✅',
        suggestion: 'Keep monitoring for any degradation'
      });
    }

    return insights;
  }, [metrics.pageLoadTime, metrics.apiResponseTime, metrics.cacheHitRate, metrics.memoryUsage]);

  // Reset metrics
  const resetMetrics = () => {
    apiCallTimes.current = [];
    cacheHits.current = 0;
    cacheMisses.current = 0;
    renderStartTime.current = Date.now();
    setMetrics({
      pageLoadTime: 0,
      componentRenderTime: 0,
      apiResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      networkRequests: 0
    });
  };

  return {
    metrics,
    trackApiCall,
    trackCacheHit,
    trackCacheMiss,
    mark,
    measure,
    getPerformanceInsights,
    resetMetrics
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { mark, measure } = usePerformanceMonitor();
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const startMark = `${componentName}-render-start-${renderCount.current}`;
    const endMark = `${componentName}-render-end-${renderCount.current}`;

    mark(startMark);

    return () => {
      mark(endMark);
      const duration = measure(`${componentName}-render-${renderCount.current}`, startMark, endMark);

      if (duration > 100) {
        console.warn(`Slow render detected for ${componentName}: ${duration.toFixed(2)}ms`);
      }
    };
  });

  return { renderCount: renderCount.current };
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const { trackApiCall } = usePerformanceMonitor();

  const measureApiCall = async <T>(
    apiCall: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    const startTime = Date.now();

    try {
      const result = await apiCall();
      const endTime = Date.now();
      trackApiCall(startTime, endTime);

      if (operationName) {
        console.log(`API call ${operationName} completed in ${endTime - startTime}ms`);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      trackApiCall(startTime, endTime);
      throw error;
    }
  };

  return { measureApiCall };
}
