"use client";

import { useState } from "react";
import { Clock, MapPin, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface AttendanceHistoryProps {
  records: AttendanceRecord[];
}

export const AttendanceHistory = ({ records }: AttendanceHistoryProps) => {
  const [filterPeriod, setFilterPeriod] = useState("week");

  // Filter records based on selected period
  const getFilteredRecords = () => {
    const now = new Date();
    let startDate: Date;

    switch (filterPeriod) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    return records
      .filter(record => new Date(record.timestamp) >= startDate)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const filteredRecords = getFilteredRecords();

  // Group records by date
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const date = new Date(record.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, AttendanceRecord[]>);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    if (dateString === today) return "Today";
    if (dateString === yesterday) return "Yesterday";
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDayHours = (dayRecords: AttendanceRecord[]) => {
    let totalMinutes = 0;
    for (let i = 0; i < dayRecords.length; i += 2) {
      const clockIn = dayRecords[i + 1]; // Records are sorted newest first
      const clockOut = dayRecords[i];
      if (clockIn && clockOut && clockIn.type === "CLOCK_IN" && clockOut.type === "CLOCK_OUT") {
        const diff = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
        totalMinutes += diff / (1000 * 60);
      }
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Attendance History</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Records */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        {Object.keys(groupedRecords).length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p>No attendance records found for the selected period</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {Object.entries(groupedRecords).map(([date, dayRecords]) => (
              <div key={date} className="p-4">
                {/* Date Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">{formatDate(date)}</span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    Total: {calculateDayHours(dayRecords)}
                  </span>
                </div>

                {/* Records for the day */}
                <div className="space-y-2">
                  {dayRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          record.type === "CLOCK_IN" 
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        )}>
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {record.type === "CLOCK_IN" ? "Clock In" : "Clock Out"}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {formatTime(record.timestamp)}
                          </p>
                        </div>
                      </div>
                      {record.location && (
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <MapPin className="w-3 h-3" />
                          <span>{record.location.address || "Location recorded"}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
