"use client";

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Clock, 
  Target,
  Calendar,
  FileText,
  Activity,
  Loader2
} from 'lucide-react';
import { useDataCache } from '@/hooks/useDataCache';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    totalUsers: number;
    totalNotes: number;
    totalMeetings: number;
    completionRate: number;
  };
  trends: {
    tasksThisWeek: number;
    tasksLastWeek: number;
    notesThisWeek: number;
    meetingsThisWeek: number;
  };
  productivity: {
    averageTaskCompletionTime: number;
    mostProductiveDay: string;
    tasksByPriority: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      URGENT: number;
    };
    tasksByStatus: {
      TODO: number;
      IN_PROGRESS: number;
      REVIEW: number;
      DONE: number;
    };
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard = ({ className = '' }: AnalyticsDashboardProps) => {
  const { isMobile } = useMobileDetection();
  
  const { 
    data: analytics, 
    isLoading, 
    error 
  } = useDataCache<AnalyticsData>(
    'analytics-data',
    async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    { ttl: 5 * 60 * 1000 } // 5 minutes cache
  );

  if (isLoading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-xl p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          <span className="ml-3 text-gray-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-xl p-8 ${className}`}>
        <div className="text-center text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load analytics data</p>
          <p className="text-sm mt-2">Please try again later</p>
        </div>
      </div>
    );
  }

  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return { change: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { change: Math.abs(change), isPositive: change >= 0 };
  };

  const tasksTrend = getChangeIndicator(analytics.trends.tasksThisWeek, analytics.trends.tasksLastWeek);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-400/10 rounded-lg">
          <BarChart3 className="w-6 h-6 text-teal-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400 text-sm">Insights into your workspace productivity</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckSquare className="w-5 h-5 text-green-400" />
            <span className="text-xs text-gray-500">Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.overview.completedTasks}</div>
          <div className="text-xs text-gray-400">of {analytics.overview.totalTasks} total</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-teal-400" />
            <span className="text-xs text-gray-500">Completion</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.overview.completionRate}%</div>
          <div className="text-xs text-gray-400">completion rate</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-gray-500">Users</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.overview.totalUsers}</div>
          <div className="text-xs text-gray-400">active users</div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-gray-500">Notes</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.overview.totalNotes}</div>
          <div className="text-xs text-gray-400">created</div>
        </div>
      </div>

      {/* Trends */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Trends</h3>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-gray-400 text-sm">Tasks This Week</p>
              <p className="text-2xl font-bold text-white">{analytics.trends.tasksThisWeek}</p>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className={`w-4 h-4 ${tasksTrend.isPositive ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-sm ${tasksTrend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {tasksTrend.change.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-gray-400 text-sm">Notes This Week</p>
              <p className="text-2xl font-bold text-white">{analytics.trends.notesThisWeek}</p>
            </div>
            <FileText className="w-6 h-6 text-purple-400" />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-gray-400 text-sm">Meetings This Week</p>
              <p className="text-2xl font-bold text-white">{analytics.trends.meetingsThisWeek}</p>
            </div>
            <Calendar className="w-6 h-6 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Task Distribution */}
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* Tasks by Priority */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            {Object.entries(analytics.productivity.tasksByPriority).map(([priority, count]) => {
              const total = Object.values(analytics.productivity.tasksByPriority).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colors = {
                URGENT: 'bg-red-400',
                HIGH: 'bg-yellow-400',
                MEDIUM: 'bg-blue-400',
                LOW: 'bg-gray-400'
              };

              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors[priority as keyof typeof colors]}`}></div>
                    <span className="text-gray-300 text-sm">{priority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[priority as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-white text-sm font-medium w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks by Status */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            {Object.entries(analytics.productivity.tasksByStatus).map(([status, count]) => {
              const total = Object.values(analytics.productivity.tasksByStatus).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colors = {
                TODO: 'bg-gray-400',
                IN_PROGRESS: 'bg-blue-400',
                REVIEW: 'bg-yellow-400',
                DONE: 'bg-green-400'
              };

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${colors[status as keyof typeof colors]}`}></div>
                    <span className="text-gray-300 text-sm">{status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[status as keyof typeof colors]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-white text-sm font-medium w-8">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Productivity Insights */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Productivity Insights</h3>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
            <Clock className="w-8 h-8 text-teal-400" />
            <div>
              <p className="text-gray-400 text-sm">Avg. Completion Time</p>
              <p className="text-white font-semibold">{analytics.productivity.averageTaskCompletionTime} hours</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-900/50 rounded-lg">
            <Activity className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Most Productive Day</p>
              <p className="text-white font-semibold">{analytics.productivity.mostProductiveDay}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
