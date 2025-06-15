import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log(`Mark all notifications as read - User: ${session.user.id}`)

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    })

    const duration = Date.now() - startTime;
    console.log(`Mark all notifications as read - Completed in ${duration}ms, updated ${result.count} notifications`)

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
      updatedCount: result.count
    })

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Mark all notifications as read error (${duration}ms):`, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
