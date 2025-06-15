"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  Clock,
  Target,
  Users,
  CheckSquare,
  FileText,
  MessageSquare
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    totalNotes: number;
    totalMeetings: number;
    activeUsers: number;
    totalMessages: number;
  };
  trends: {
    tasksThisWeek: number;
    tasksLastWeek: number;
    notesThisWeek: number;
    notesLastWeek: number;
    meetingsThisWeek: number;
    meetingsLastWeek: number;
  };
  productivity: {
    dailyTaskCompletion: Array<{ date: string; completed: number; created: number }>;
    weeklyActivity: Array<{ week: string; tasks: number; notes: number; meetings: number }>;
    userActivity: Array<{ userId: string; userName: string; tasksCompleted: number; notesCreated: number }>;
  };
  taskAnalytics: {
    byStatus: Array<{ status: string; count: number; color: string }>;
    byPriority: Array<{ priority: string; count: number; color: string }>;
    averageCompletionTime: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: true };
    const percentage = ((current - previous) / previous) * 100;
    return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load analytics data</p>
      </div>
    );
  }

  const taskTrend = calculateTrend(data.trends.tasksThisWeek, data.trends.tasksLastWeek);
  const notesTrend = calculateTrend(data.trends.notesThisWeek, data.trends.notesLastWeek);
  const meetingsTrend = calculateTrend(data.trends.meetingsThisWeek, data.trends.meetingsLastWeek);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400">Insights into your team's productivity and performance</p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tasks</p>
              <p className="text-white text-xl font-bold">{data.overview.totalTasks}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-teal-400" />
          </div>
          <div className="flex items-center gap-1 mt-2">
            {taskTrend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${taskTrend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {taskTrend.percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completed</p>
              <p className="text-white text-xl font-bold">{data.overview.completedTasks}</p>
            </div>
            <Target className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-400">
              {Math.round((data.overview.completedTasks / data.overview.totalTasks) * 100)}% completion rate
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Notes</p>
              <p className="text-white text-xl font-bold">{data.overview.totalNotes}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <div className="flex items-center gap-1 mt-2">
            {notesTrend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${notesTrend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {notesTrend.percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Meetings</p>
              <p className="text-white text-xl font-bold">{data.overview.totalMeetings}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex items-center gap-1 mt-2">
            {meetingsTrend.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${meetingsTrend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {meetingsTrend.percentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-white text-xl font-bold">{data.overview.activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-400">Team members</span>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Messages</p>
              <p className="text-white text-xl font-bold">{data.overview.totalMessages}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-orange-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-400">Total sent</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChart className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-white">Task Status Distribution</h2>
          </div>
          <div className="space-y-3">
            {data.taskAnalytics.byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-300 capitalize">{item.status.toLowerCase().replace('_', ' ')}</span>
                </div>
                <span className="text-white font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Task Priority Distribution</h2>
          </div>
          <div className="space-y-3">
            {data.taskAnalytics.byPriority.map((item) => (
              <div key={item.priority} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-300 capitalize">{item.priority.toLowerCase()}</span>
                </div>
                <span className="text-white font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Team Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium py-3">Team Member</th>
                <th className="text-left text-gray-400 font-medium py-3">Tasks Completed</th>
                <th className="text-left text-gray-400 font-medium py-3">Notes Created</th>
                <th className="text-left text-gray-400 font-medium py-3">Productivity Score</th>
              </tr>
            </thead>
            <tbody>
              {data.productivity.userActivity.map((user) => {
                const score = Math.round((user.tasksCompleted * 2 + user.notesCreated) / 3);
                return (
                  <tr key={user.userId} className="border-b border-gray-700/50">
                    <td className="py-3 text-white">{user.userName}</td>
                    <td className="py-3 text-gray-300">{user.tasksCompleted}</td>
                    <td className="py-3 text-gray-300">{user.notesCreated}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-400 rounded-full"
                            style={{ width: `${Math.min(score, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-sm">{score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Key Metrics</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Average Task Completion Time</p>
            <p className="text-white text-2xl font-bold">{data.taskAnalytics.averageCompletionTime}h</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Tasks This Week</p>
            <p className="text-white text-2xl font-bold">{data.trends.tasksThisWeek}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Notes This Week</p>
            <p className="text-white text-2xl font-bold">{data.trends.notesThisWeek}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
