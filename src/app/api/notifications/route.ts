import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Cap at 50
    const unreadOnly = searchParams.get('unread') === 'true'

    // Add performance logging
    console.log(`Notifications API - User: ${session.user.id}, Limit: ${limit}, UnreadOnly: ${unreadOnly}`)

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly ? { isRead: false } : {})
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        actionUrl: true,
        isRead: true,
        createdAt: true,
        // Don't select updatedAt and userId to reduce payload size
      }
    })

    const duration = Date.now() - startTime;
    console.log(`Notifications API - Completed in ${duration}ms, returned ${notifications.length} notifications`)

    // Add cache headers to reduce unnecessary requests
    const response = NextResponse.json(notifications)
    response.headers.set('Cache-Control', 'private, max-age=30') // Cache for 30 seconds

    return response

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Get notifications error (${duration}ms):`, error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, message, type, actionUrl } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || "INFO",
        actionUrl,
        userId: session.user.id
      }
    })

    return NextResponse.json(notification)

  } catch (error) {
    console.error("Create notification error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
