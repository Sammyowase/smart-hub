import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Test all the systems we just fixed
    const tests = {
      prismaConnection: false,
      notificationModel: false,
      attendanceModel: false,
      meetingModel: false,
      userModel: false
    }

    try {
      // Test basic Prisma connection
      await prisma.user.count()
      tests.prismaConnection = true
    } catch (error) {
      console.error("Prisma connection test failed:", error)
    }

    try {
      // Test notification model
      await prisma.notification.count()
      tests.notificationModel = true
    } catch (error) {
      console.error("Notification model test failed:", error)
    }

    try {
      // Test attendance model
      await prisma.attendance.count()
      tests.attendanceModel = true
    } catch (error) {
      console.error("Attendance model test failed:", error)
    }

    try {
      // Test meeting model
      await prisma.meeting.count()
      tests.meetingModel = true
    } catch (error) {
      console.error("Meeting model test failed:", error)
    }

    try {
      // Test user model
      await prisma.user.count()
      tests.userModel = true
    } catch (error) {
      console.error("User model test failed:", error)
    }

    return NextResponse.json({
      status: "success",
      message: "System health check completed",
      tests,
      allPassed: Object.values(tests).every(test => test === true),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Test fixes error:", error)
    return NextResponse.json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
