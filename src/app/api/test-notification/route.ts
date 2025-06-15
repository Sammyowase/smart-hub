import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Create a test notification
    const notification = await prisma.notification.create({
      data: {
        title: "Test Notification",
        message: "This is a test notification to verify the system is working!",
        type: "INFO",
        actionUrl: "/dashboard",
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: "Test notification created successfully",
      notification
    })

  } catch (error) {
    console.error("Test notification error:", error)
    return NextResponse.json(
      { error: "Failed to create test notification", details: error.message },
      { status: 500 }
    )
  }
}
