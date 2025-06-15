"use client";

import { Clock, Calendar, TrendingUp, Target } from "lucide-react";

interface AttendanceRecord {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
}

interface AttendanceStatsProps {
  records: AttendanceRecord[];
}

export const AttendanceStats = ({ records }: AttendanceStatsProps) => {
  // Calculate stats
  const calculateStats = () => {
    const now = new Date();
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekRecords = records.filter(record => new Date(record.timestamp) >= thisWeek);
    const monthRecords = records.filter(record => new Date(record.timestamp) >= thisMonth);

    // Calculate total hours for the week
    let weeklyHours = 0;
    for (let i = 0; i < weekRecords.length; i += 2) {
      const clockIn = weekRecords[i];
      const clockOut = weekRecords[i + 1];
      if (clockIn && clockOut && clockIn.type === "CLOCK_IN" && clockOut.type === "CLOCK_OUT") {
        const diff = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
        weeklyHours += diff / (1000 * 60 * 60);
      }
    }

    // Calculate total hours for the month
    let monthlyHours = 0;
    for (let i = 0; i < monthRecords.length; i += 2) {
      const clockIn = monthRecords[i];
      const clockOut = monthRecords[i + 1];
      if (clockIn && clockOut && clockIn.type === "CLOCK_IN" && clockOut.type === "CLOCK_OUT") {
        const diff = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
        monthlyHours += diff / (1000 * 60 * 60);
      }
    }

    // Calculate days worked this month
    const daysWorked = new Set(
      monthRecords
        .filter(record => record.type === "CLOCK_IN")
        .map(record => new Date(record.timestamp).toDateString())
    ).size;

    return {
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      daysWorked,
      averageDaily: daysWorked > 0 ? Math.round((monthlyHours / daysWorked) * 10) / 10 : 0,
    };
  };

  const stats = calculateStats();

  const statCards = [
    {
      title: "This Week",
      value: `${stats.weeklyHours}h`,
      subtitle: "Hours worked",
      icon: Clock,
      color: "text-teal-400",
      bgColor: "bg-teal-400/10",
    },
    {
      title: "This Month",
      value: `${stats.monthlyHours}h`,
      subtitle: "Total hours",
      icon: Calendar,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      title: "Days Worked",
      value: stats.daysWorked.toString(),
      subtitle: "This month",
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-400/10",
    },
    {
      title: "Daily Average",
      value: `${stats.averageDaily}h`,
      subtitle: "Per day",
      icon: Target,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Statistics</h3>
      <div className="space-y-4">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                <p className="text-white text-xl font-bold mt-1">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress towards weekly goal */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm font-medium">Weekly Goal</span>
          <span className="text-gray-400 text-sm">{stats.weeklyHours}/40h</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-teal-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((stats.weeklyHours / 40) * 100, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {40 - stats.weeklyHours > 0 
            ? `${Math.round((40 - stats.weeklyHours) * 10) / 10}h remaining`
            : "Goal achieved!"
          }
        </p>
      </div>
    </div>
  );
};
