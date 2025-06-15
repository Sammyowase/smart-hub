"use client";

import { useState, useEffect } from "react";
import { Clock, MapPin, Calendar, TrendingUp, Play, Square } from "lucide-react";
import { AttendanceStats } from "@/components/attendance/AttendanceStats";
import { AttendanceHistory } from "@/components/attendance/AttendanceHistory";

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

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayHours, setTodayHours] = useState("0h 0m");
  const [dataLoading, setDataLoading] = useState(true);
  const [currentSessionTime, setCurrentSessionTime] = useState("0h 0m");
  const [clockInTime, setClockInTime] = useState<Date | null>(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation(position),
        (error) => console.error("Error getting location:", error)
      );
    }

    fetchAttendanceData();
  }, []);

  // Timer effect for current session
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60));
        const hours = Math.floor(diffInMinutes / 60);
        const minutes = diffInMinutes % 60;
        setCurrentSessionTime(`${hours}h ${minutes}m`);
      }, 1000); // Update every second
    } else {
      setCurrentSessionTime("0h 0m");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockedIn, clockInTime]);

  const fetchAttendanceData = async () => {
    try {
      // Fetch attendance status
      const statusResponse = await fetch("/api/attendance/status");
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setIsClockedIn(statusData.isClockedIn);
        setTodayHours(statusData.todayHours);

        // If clocked in, set the clock in time for timer
        if (statusData.isClockedIn && statusData.lastRecord) {
          setClockInTime(new Date(statusData.lastRecord.timestamp));
        } else {
          setClockInTime(null);
        }
      }

      // Fetch attendance records
      const recordsResponse = await fetch("/api/attendance");
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setAttendanceRecords(recordsData.map((record: any) => ({
          ...record,
          location: record.location ? JSON.parse(record.location) : null
        })));
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleClockAction = async () => {
    if (!currentLocation) {
      alert("Location access is required for attendance tracking");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isClockedIn ? "CLOCK_OUT" : "CLOCK_IN",
          location: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            address: "Current Location" // You would reverse geocode this
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record attendance");
      }

      // Refresh data and update timer state
      await fetchAttendanceData();
    } catch (error: any) {
      console.error("Error recording attendance:", error);
      alert(error.message || "Failed to record attendance. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-gray-400">Track your work hours and location</p>
      </div>

      {/* Clock In/Out Section */}
      <div className="bg-gradient-to-r from-teal-400/10 to-blue-400/10 border border-gray-700 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {isClockedIn ? "Currently Clocked In" : "Ready to Clock In"}
            </h2>
            <div className="flex items-center gap-4 text-gray-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Today: {todayHours}</span>
              </div>
              {isClockedIn && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Current session: {currentSessionTime}</span>
                </div>
              )}
              {currentLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Location detected</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleClockAction}
            disabled={isLoading || !currentLocation}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-colors flex items-center gap-3 ${
              isClockedIn
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-teal-400 hover:bg-teal-300 text-slate-900"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isClockedIn ? (
              <Square className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            {isLoading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
          </button>
        </div>
      </div>

      {/* Stats and History */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-400"></div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AttendanceStats records={attendanceRecords} />
          </div>
          <div className="lg:col-span-2">
            <AttendanceHistory records={attendanceRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
