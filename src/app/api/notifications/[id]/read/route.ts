import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      )
    }

    console.log(`Mark notification as read - User: ${session.user.id}, Notification: ${notificationId}`)

    // Use updateMany to combine verification and update in one operation
    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: session.user.id,
        isRead: false // Only update if it's currently unread
      },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    })

    const duration = Date.now() - startTime;

    if (result.count === 0) {
      console.log(`Mark notification as read - No notification found or already read (${duration}ms)`)
      return NextResponse.json(
        { error: "Notification not found or already read" },
        { status: 404 }
      )
    }

    console.log(`Mark notification as read - Completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: "Notification marked as read"
    })

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Mark notification as read error (${duration}ms):`, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
