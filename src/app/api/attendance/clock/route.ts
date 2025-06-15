import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

// In-memory storage for demo purposes (in production, use database)
const attendanceData = new Map<string, {
  records: AttendanceRecord[];
  currentSession?: {
    startTime: string;
    id: string;
  };
}>();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (!action || !["CLOCK_IN", "CLOCK_OUT"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be CLOCK_IN or CLOCK_OUT" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const now = new Date().toISOString();
    const recordId = `${userId}-${Date.now()}`;

    // Get or initialize user attendance data
    if (!attendanceData.has(userId)) {
      attendanceData.set(userId, { records: [] });
    }

    const userData = attendanceData.get(userId)!;

    if (action === "CLOCK_IN") {
      // Check if already clocked in
      if (userData.currentSession) {
        return NextResponse.json(
          { error: "Already clocked in" },
          { status: 400 }
        );
      }

      // Create clock in record
      const clockInRecord: AttendanceRecord = {
        id: recordId,
        type: "CLOCK_IN",
        timestamp: now
      };

      userData.records.push(clockInRecord);
      userData.currentSession = {
        startTime: now,
        id: recordId
      };

      console.log(`User ${userId} clocked in at ${now}`);

    } else if (action === "CLOCK_OUT") {
      // Check if clocked in
      if (!userData.currentSession) {
        return NextResponse.json(
          { error: "Not currently clocked in" },
          { status: 400 }
        );
      }

      // Create clock out record
      const clockOutRecord: AttendanceRecord = {
        id: recordId,
        type: "CLOCK_OUT",
        timestamp: now
      };

      userData.records.push(clockOutRecord);
      userData.currentSession = undefined;

      console.log(`User ${userId} clocked out at ${now}`);
    }

    // Calculate today's hours
    const today = new Date().toDateString();
    const todayRecords = userData.records.filter(record => 
      new Date(record.timestamp).toDateString() === today
    );

    let todayHours = 0;
    let currentSessionStart: string | undefined;

    // Calculate completed sessions for today
    for (let i = 0; i < todayRecords.length; i += 2) {
      const clockIn = todayRecords[i];
      const clockOut = todayRecords[i + 1];

      if (clockIn?.type === "CLOCK_IN") {
        if (clockOut?.type === "CLOCK_OUT") {
          // Completed session
          const sessionDuration = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
          todayHours += sessionDuration;
        } else if (!clockOut && userData.currentSession) {
          // Current active session
          currentSessionStart = clockIn.timestamp;
          const currentDuration = new Date().getTime() - new Date(clockIn.timestamp).getTime();
          todayHours += currentDuration;
        }
      }
    }

    // Convert to hours and format
    const todayHoursFormatted = (todayHours / (1000 * 60 * 60)).toFixed(1) + "h";

    // Mock weekly and monthly hours (in production, calculate from database)
    const weeklyHours = ((todayHours / (1000 * 60 * 60)) * 5).toFixed(1) + "h";
    const monthlyHours = ((todayHours / (1000 * 60 * 60)) * 20).toFixed(1) + "h";

    // Get last record
    const lastRecord = userData.records[userData.records.length - 1];

    // Build response
    const attendanceStatus: AttendanceStatus = {
      isClockedIn: !!userData.currentSession,
      todayHours: todayHoursFormatted,
      currentSessionStart: currentSessionStart,
      lastRecord: lastRecord,
      weeklyHours: weeklyHours,
      monthlyHours: monthlyHours
    };

    return NextResponse.json(attendanceStatus);

  } catch (error) {
    console.error("Attendance clock error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch current attendance status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get user attendance data
    const userData = attendanceData.get(userId);
    
    if (!userData) {
      // Return default status for new users
      return NextResponse.json({
        isClockedIn: false,
        todayHours: "0.0h",
        weeklyHours: "0.0h",
        monthlyHours: "0.0h"
      });
    }

    // Calculate current status (similar logic as POST)
    const today = new Date().toDateString();
    const todayRecords = userData.records.filter(record => 
      new Date(record.timestamp).toDateString() === today
    );

    let todayHours = 0;
    let currentSessionStart: string | undefined;

    for (let i = 0; i < todayRecords.length; i += 2) {
      const clockIn = todayRecords[i];
      const clockOut = todayRecords[i + 1];

      if (clockIn?.type === "CLOCK_IN") {
        if (clockOut?.type === "CLOCK_OUT") {
          const sessionDuration = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
          todayHours += sessionDuration;
        } else if (!clockOut && userData.currentSession) {
          currentSessionStart = clockIn.timestamp;
          const currentDuration = new Date().getTime() - new Date(clockIn.timestamp).getTime();
          todayHours += currentDuration;
        }
      }
    }

    const todayHoursFormatted = (todayHours / (1000 * 60 * 60)).toFixed(1) + "h";
    const weeklyHours = ((todayHours / (1000 * 60 * 60)) * 5).toFixed(1) + "h";
    const monthlyHours = ((todayHours / (1000 * 60 * 60)) * 20).toFixed(1) + "h";

    const lastRecord = userData.records[userData.records.length - 1];

    const attendanceStatus: AttendanceStatus = {
      isClockedIn: !!userData.currentSession,
      todayHours: todayHoursFormatted,
      currentSessionStart: currentSessionStart,
      lastRecord: lastRecord,
      weeklyHours: weeklyHours,
      monthlyHours: monthlyHours
    };

    return NextResponse.json(attendanceStatus);

  } catch (error) {
    console.error("Attendance status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
