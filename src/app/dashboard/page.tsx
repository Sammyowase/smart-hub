"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FileText,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Target
} from "lucide-react";
import {
  LazyAICommandsWidget,
  LazyAttendanceWidget,
  LazyDailyTipsWidget,
  preloadCriticalComponents
} from "@/components/common/LazyComponents";
import { useDataCache } from "@/hooks/useDataCache";
import { useRenderPerformance } from "@/hooks/usePerformanceMonitor";


interface DashboardStats {
  overview: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalNotes: number;
    totalMeetings: number;
    todayMeetings: number;
  };
  trends: {
    weeklyTasksCompleted: number;
    monthlyNotesCreated: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Performance monitoring
  useRenderPerformance('DashboardPage');

  // Use cached data for dashboard stats
  const {
    data: stats,
    isLoading,
    error: statsError
  } = useDataCache(
    'dashboard-stats',
    async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    { ttl: 2 * 60 * 1000 } // 2 minutes cache
  );

  // Preload critical components on mount
  useEffect(() => {
    preloadCriticalComponents();
  }, []);





  const statsData = stats ? [
    {
      name: "Total Tasks",
      value: stats.overview.totalTasks.toString(),
      change: `${stats.overview.completionRate}% completion rate`,
      icon: CheckSquare,
      color: "text-teal-400",
      bgColor: "bg-teal-400/10",
    },
    {
      name: "Completed Tasks",
      value: stats.overview.completedTasks.toString(),
      change: `${stats.trends.weeklyTasksCompleted} this week`,
      icon: Target,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      name: "Notes Created",
      value: stats.overview.totalNotes.toString(),
      change: `${stats.trends.monthlyNotesCreated} this month`,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      name: "Meetings Today",
      value: stats.overview.todayMeetings.toString(),
      change: `${stats.overview.totalMeetings} total`,
      icon: Calendar,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ] : [];

  const recentActivities = stats ? stats.recentActivity.map((activity: any) => ({
    id: activity.id,
    type: activity.type,
    title: activity.title,
    time: formatTimeAgo(activity.timestamp),
    icon: getActivityIcon(activity.type),
    color: getActivityColor(activity.type),
  })) : [];

  function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'task': return CheckSquare;
      case 'note': return FileText;
      case 'meeting': return Calendar;
      default: return MessageSquare;
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case 'task': return 'text-green-400';
      case 'note': return 'text-blue-400';
      case 'meeting': return 'text-purple-400';
      default: return 'text-yellow-400';
    }
  }



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-400/10 to-purple-400/10 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-gray-400">
              Here's what's happening in your workspace today.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-teal-400">
            <Target className="w-6 h-6" />
            <span className="font-medium">Stay focused!</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{stat.name}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className={`p-2 rounded-lg bg-gray-700`}>
                  <activity.icon className={`w-4 h-4 ${activity.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{activity.title}</p>
                  <p className="text-gray-400 text-xs">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
          {/* Enhanced Attendance Widget */}
          <LazyAttendanceWidget />

          {/* AI Commands Widget */}
          <LazyAICommandsWidget />

          {/* Daily Tips Widget */}
          <LazyDailyTipsWidget />

          {/* Quick Actions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/tasks')}
                className="w-full flex items-center gap-3 p-3 bg-teal-400/10 border border-teal-400/20 rounded-lg text-teal-400 hover:bg-teal-400/20 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Create Task</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/notes')}
                className="w-full flex items-center gap-3 p-3 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">New Note</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/chat')}
                className="w-full flex items-center gap-3 p-3 bg-green-400/10 border border-green-400/20 rounded-lg text-green-400 hover:bg-green-400/20 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Open Chat</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/meetings')}
                className="w-full flex items-center gap-3 p-3 bg-purple-400/10 border border-purple-400/20 rounded-lg text-purple-400 hover:bg-purple-400/20 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Schedule Meeting</span>
              </button>
            </div>
          </div>



        </div>
      </div>
    </div>
  );
}
