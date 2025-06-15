"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Clock,
  Play,
  Square,
  Timer,
  Calendar,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  type: "CLOCK_IN" | "CLOCK_OUT";
  timestamp: string;
}

interface AttendanceStatus {
  isClockedIn: boolean;
  todayHours: string;
  currentSessionStart?: string;
  lastRecord?: AttendanceRecord;
  weeklyHours: string;
  monthlyHours: string;
}

export const AttendanceWidget = () => {
  const { data: session } = useSession();
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null);
  const [sessionTime, setSessionTime] = useState("00:00:00");
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate session time if clocked in
  useEffect(() => {
    if (attendanceStatus?.isClockedIn && attendanceStatus.currentSessionStart) {
      const updateSessionTime = () => {
        const start = new Date(attendanceStatus.currentSessionStart!);
        const now = new Date();
        const diff = now.getTime() - start.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setSessionTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateSessionTime();
      intervalRef.current = setInterval(updateSessionTime, 1000);
    } else {
      setSessionTime("00:00:00");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [attendanceStatus?.isClockedIn, attendanceStatus?.currentSessionStart]);

  // Fetch attendance status
  useEffect(() => {
    if (session) {
      fetchAttendanceStatus();
    }
  }, [session]);

  const handleClockAction = async () => {
    if (!attendanceStatus) return;

    setIsLoading(true);
    try {
      const type = attendanceStatus.isClockedIn ? "CLOCK_OUT" : "CLOCK_IN";
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          location: {
            latitude: 0,
            longitude: 0,
            address: "Dashboard"
          }
        }),
      });

      if (response.ok) {
        // Refresh attendance status after successful clock action
        await fetchAttendanceStatus();
      } else {
        const errorData = await response.json();
        console.error("Clock action failed:", errorData.error);
      }
    } catch (error) {
      console.error("Failed to update attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch("/api/attendance/status");
      if (response.ok) {
        const data = await response.json();
        setAttendanceStatus({
          isClockedIn: data.isClockedIn,
          todayHours: data.todayHours,
          currentSessionStart: data.lastRecord?.type === "CLOCK_IN" ? data.lastRecord.timestamp : undefined,
          lastRecord: data.lastRecord,
          weeklyHours: data.todayHours, // Mock weekly hours
          monthlyHours: data.todayHours // Mock monthly hours
        });
      }
    } catch (error) {
      console.error("Failed to fetch attendance status:", error);
      // Set fallback data
      setAttendanceStatus({
        isClockedIn: false,
        todayHours: "0h 0m",
        weeklyHours: "0h 0m",
        monthlyHours: "0h 0m"
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!attendanceStatus) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-8 bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-lg">
            <Clock className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Today's Attendance</h3>
            <p className="text-sm text-gray-400">{formatDate(new Date())}</p>
          </div>
        </div>
        {!attendanceStatus.isClockedIn && (
          <div className="text-right">
            <div className="text-sm text-gray-400">Not clocked in</div>
          </div>
        )}
      </div>

      {/* Current Session */}
      {attendanceStatus.isClockedIn && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">Active Session</span>
            </div>
            <Timer className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-mono text-white">{sessionTime}</div>
          <div className="text-sm text-gray-400">
            Started at {attendanceStatus.currentSessionStart ?
              new Date(attendanceStatus.currentSessionStart).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }) : '--:--'
            }
          </div>
        </div>
      )}

      {/* Clock In/Out Button */}
      <button
        onClick={handleClockAction}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-medium transition-all duration-200 ${
          attendanceStatus.isClockedIn
            ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
            : "bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20"
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : attendanceStatus.isClockedIn ? (
          <Square className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        {isLoading ? 'Processing...' : attendanceStatus.isClockedIn ? 'Clock Out' : 'Clock In'}
      </button>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-teal-400" />
            <span className="text-xs text-gray-400">Today</span>
          </div>
          <div className="text-sm font-medium text-white">{attendanceStatus.todayHours}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-gray-400">Week</span>
          </div>
          <div className="text-sm font-medium text-white">{attendanceStatus.weeklyHours}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-gray-400">Month</span>
          </div>
          <div className="text-sm font-medium text-white">{attendanceStatus.monthlyHours}</div>
        </div>
      </div>

      {/* Last Activity */}
      {attendanceStatus.lastRecord && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Last {attendanceStatus.lastRecord.type === "CLOCK_IN" ? "Clock In" : "Clock Out"}
            </span>
            <span className="text-white">
              {new Date(attendanceStatus.lastRecord.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
