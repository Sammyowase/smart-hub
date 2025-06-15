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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        // Add settings fields when they're added to the schema
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      name,
      timezone,
      language,
      emailNotifications,
      pushNotifications,
      meetingReminders,
      taskDeadlines,
      chatMentions,
      theme,
      compactMode,
      profileVisibility,
      activityStatus,
      readReceipts,
    } = body

    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        // Note: Additional settings fields would need to be added to the User model
        // For now, we'll just update the basic fields that exist
      },
      select: {
        id: true,
        name: true,
        email: true,
      }
    })

    return NextResponse.json({
      message: "Settings updated successfully",
      user: updatedUser
    })

  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
