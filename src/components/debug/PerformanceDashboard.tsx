"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Clock,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  X
} from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceDashboard = ({ isOpen, onClose }: PerformanceDashboardProps) => {
  const { metrics, getPerformanceInsights, resetMetrics } = usePerformanceMonitor();
  const [insights, setInsights] = useState<any[]>([]);

  // Memoize insights calculation to prevent infinite loops
  const memoizedInsights = useMemo(() => {
    if (!isOpen) return [];
    return getPerformanceInsights();
  }, [isOpen, metrics.pageLoadTime, metrics.apiResponseTime, metrics.cacheHitRate, metrics.memoryUsage, getPerformanceInsights]);

  // Update insights only when memoized value changes
  useEffect(() => {
    setInsights(memoizedInsights);
  }, [memoizedInsights]);

  if (!isOpen) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-yellow-500/20 bg-yellow-500/10';
      case 'success': return 'border-green-500/20 bg-green-500/10';
      case 'info': return 'border-blue-500/20 bg-blue-500/10';
      default: return 'border-gray-500/20 bg-gray-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-teal-400" />
            <h2 className="text-xl font-semibold text-white">Performance Dashboard</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetMetrics}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Page Load Time */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Page Load</span>
                </div>
                {metrics.pageLoadTime > 3000 ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {formatTime(metrics.pageLoadTime)}
              </div>
              <div className="text-xs text-gray-500">
                {metrics.pageLoadTime > 3000 ? 'Slow' : metrics.pageLoadTime > 1000 ? 'Good' : 'Fast'}
              </div>
            </div>

            {/* Component Render Time */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-300">Render Time</span>
                </div>
                {metrics.componentRenderTime > 100 ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {formatTime(metrics.componentRenderTime)}
              </div>
              <div className="text-xs text-gray-500">
                {metrics.componentRenderTime > 100 ? 'Slow' : 'Fast'}
              </div>
            </div>

            {/* API Response Time */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-gray-300">API Response</span>
                </div>
                {metrics.apiResponseTime > 1000 ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {metrics.apiResponseTime > 0 ? formatTime(metrics.apiResponseTime) : 'N/A'}
              </div>
              <div className="text-xs text-gray-500">
                {metrics.apiResponseTime > 1000 ? 'Slow' : metrics.apiResponseTime > 0 ? 'Good' : 'No data'}
              </div>
            </div>

            {/* Cache Hit Rate */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-gray-300">Cache Hit Rate</span>
                </div>
                {metrics.cacheHitRate > 70 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {metrics.cacheHitRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {metrics.cacheHitRate > 70 ? 'Excellent' : metrics.cacheHitRate > 50 ? 'Good' : 'Poor'}
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-gray-300">Memory Usage</span>
                </div>
                {metrics.memoryUsage > 100 ? (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white">
                {metrics.memoryUsage.toFixed(1)}MB
              </div>
              <div className="text-xs text-gray-500">
                {metrics.memoryUsage > 100 ? 'High' : metrics.memoryUsage > 50 ? 'Normal' : 'Low'}
              </div>
            </div>

            {/* Network Requests */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-medium text-gray-300">Network Requests</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {metrics.networkRequests}
              </div>
              <div className="text-xs text-gray-500">
                Total resources loaded
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Insights</h3>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white">{insight.message}</span>
                        <span className="text-sm font-mono text-gray-300">{insight.value}</span>
                      </div>
                      <p className="text-sm text-gray-400">{insight.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Optimization Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Loading Performance</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Use lazy loading for non-critical components</li>
                  <li>• Implement proper caching strategies</li>
                  <li>• Optimize images and assets</li>
                  <li>• Minimize bundle size with code splitting</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Runtime Performance</h4>
                <ul className="text-gray-400 space-y-1">
                  <li>• Use React.memo for expensive components</li>
                  <li>• Implement virtual scrolling for large lists</li>
                  <li>• Debounce user inputs and API calls</li>
                  <li>• Monitor memory usage and clean up effects</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
