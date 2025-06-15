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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: any = {
      userId: session.user.id,
      workspaceId: session.user.workspaceId
    }

    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: {
        timestamp: "desc"
      }
    })

    return NextResponse.json(attendanceRecords)

  } catch (error) {
    console.error("Get attendance error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, location, notes } = body

    if (!type || !["CLOCK_IN", "CLOCK_OUT"].includes(type)) {
      return NextResponse.json(
        { error: "Valid type (CLOCK_IN or CLOCK_OUT) is required" },
        { status: 400 }
      )
    }

    // Check for existing clock-in without clock-out
    if (type === "CLOCK_IN") {
      const lastRecord = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: session.user.workspaceId
        },
        orderBy: {
          timestamp: "desc"
        }
      })

      if (lastRecord && lastRecord.type === "CLOCK_IN") {
        return NextResponse.json(
          { error: "You are already clocked in. Please clock out first." },
          { status: 400 }
        )
      }
    }

    // Check for clock-out without clock-in
    if (type === "CLOCK_OUT") {
      const lastRecord = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: session.user.workspaceId
        },
        orderBy: {
          timestamp: "desc"
        }
      })

      if (!lastRecord || lastRecord.type === "CLOCK_OUT") {
        return NextResponse.json(
          { error: "You must clock in before clocking out." },
          { status: 400 }
        )
      }
    }

    const attendanceRecord = await prisma.attendance.create({
      data: {
        type,
        timestamp: new Date(),
        location: location ? JSON.stringify(location) : null,
        notes,
        userId: session.user.id,
        workspaceId: session.user.workspaceId
      }
    })

    return NextResponse.json(attendanceRecord)

  } catch (error) {
    console.error("Create attendance error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
