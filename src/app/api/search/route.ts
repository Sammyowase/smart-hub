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
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const workspaceId = session.user.workspaceId

    // Search across multiple entities in parallel
    const [tasks, notes, meetings, users, messages] = await Promise.all([
      // Search tasks
      prisma.task.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          assignee: { select: { name: true, email: true } },
          createdBy: { select: { name: true, email: true } }
        },
        take: Math.ceil(limit / 5)
      }),

      // Search notes
      prisma.note.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          createdBy: { select: { name: true, email: true } }
        },
        take: Math.ceil(limit / 5)
      }),

      // Search meetings
      prisma.meeting.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          createdBy: { select: { name: true, email: true } }
        },
        take: Math.ceil(limit / 5)
      }),

      // Search users (team members)
      prisma.user.findMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        take: Math.ceil(limit / 5)
      }),

      // Search chat messages
      prisma.chatMessage.findMany({
        where: {
          workspaceId,
          content: { contains: query, mode: 'insensitive' }
        },
        include: {
          author: { select: { name: true, email: true } }
        },
        take: Math.ceil(limit / 5)
      })
    ])

    // Transform results into unified format
    const results = [
      // Tasks
      ...tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || "No description",
        type: "task" as const,
        url: `/dashboard/tasks?task=${task.id}`,
        createdAt: task.createdAt.toISOString(),
        metadata: {
          status: task.status,
          priority: task.priority,
          assignee: task.assignee?.name || task.assignee?.email,
          author: task.createdBy.name || task.createdBy.email
        }
      })),

      // Notes
      ...notes.map(note => ({
        id: note.id,
        title: note.title,
        description: note.content.substring(0, 150) + (note.content.length > 150 ? "..." : ""),
        type: "note" as const,
        url: `/dashboard/notes?note=${note.id}`,
        createdAt: note.createdAt.toISOString(),
        metadata: {
          author: note.createdBy.name || note.createdBy.email
        }
      })),

      // Meetings
      ...meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description || "No description",
        type: "meeting" as const,
        url: `/dashboard/meetings?meeting=${meeting.id}`,
        createdAt: meeting.createdAt.toISOString(),
        metadata: {
          author: meeting.createdBy.name || meeting.createdBy.email
        }
      })),

      // Users
      ...users.map(user => ({
        id: user.id,
        title: user.name || user.email,
        description: `${user.role} • ${user.email}`,
        type: "user" as const,
        url: `/dashboard/team?user=${user.id}`,
        createdAt: user.createdAt.toISOString(),
        metadata: {
          author: user.name || user.email
        }
      })),

      // Messages
      ...messages.map(message => ({
        id: message.id,
        title: `Message from ${message.author.name || message.author.email}`,
        description: message.content.substring(0, 150) + (message.content.length > 150 ? "..." : ""),
        type: "message" as const,
        url: `/dashboard/chat?message=${message.id}`,
        createdAt: message.createdAt.toISOString(),
        metadata: {
          author: message.author.name || message.author.email
        }
      }))
    ]

    // Sort by relevance (exact title matches first, then by creation date)
    const sortedResults = results.sort((a, b) => {
      const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase())
      const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase())
      
      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(sortedResults.slice(0, limit))

  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
