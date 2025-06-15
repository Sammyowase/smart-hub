import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the last attendance record
    const lastRecord = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: session.user.workspaceId
      },
      orderBy: {
        timestamp: "desc"
      }
    })

    const isClockedIn = lastRecord?.type === "CLOCK_IN"

    // Calculate today's hours
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const todayRecords = await prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        workspaceId: session.user.workspaceId,
        timestamp: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      orderBy: {
        timestamp: "asc"
      }
    })

    // Calculate total hours worked today
    let totalMinutes = 0
    for (let i = 0; i < todayRecords.length; i += 2) {
      const clockIn = todayRecords[i]
      const clockOut = todayRecords[i + 1]
      
      if (clockIn && clockIn.type === "CLOCK_IN") {
        if (clockOut && clockOut.type === "CLOCK_OUT") {
          // Complete session
          const diff = clockOut.timestamp.getTime() - clockIn.timestamp.getTime()
          totalMinutes += diff / (1000 * 60)
        } else if (isClockedIn && i === todayRecords.length - 1) {
          // Currently clocked in
          const diff = new Date().getTime() - clockIn.timestamp.getTime()
          totalMinutes += diff / (1000 * 60)
        }
      }
    }

    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor(totalMinutes % 60)

    return NextResponse.json({
      isClockedIn,
      lastRecord: lastRecord ? {
        id: lastRecord.id,
        type: lastRecord.type,
        timestamp: lastRecord.timestamp.toISOString(),
        location: lastRecord.location ? JSON.parse(lastRecord.location) : null
      } : null,
      todayHours: `${hours}h ${minutes}m`,
      totalMinutesToday: Math.round(totalMinutes)
    })

  } catch (error) {
    console.error("Get attendance status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
