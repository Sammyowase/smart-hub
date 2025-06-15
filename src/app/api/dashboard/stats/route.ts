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

    const workspaceId = session.user.workspaceId

    // Get date ranges
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Parallel queries for better performance
    const [
      totalTasks,
      completedTasks,
      totalNotes,
      totalMeetings,
      todayMeetings,
      weeklyTasks,
      monthlyNotes,
      recentTasks,
      recentNotes,
      recentMeetings
    ] = await Promise.all([
      // Total tasks
      prisma.task.count({
        where: { workspaceId }
      }),
      
      // Completed tasks
      prisma.task.count({
        where: { 
          workspaceId,
          status: "DONE"
        }
      }),
      
      // Total notes
      prisma.note.count({
        where: { workspaceId }
      }),
      
      // Total meetings
      prisma.meeting.count({
        where: { workspaceId }
      }),
      
      // Today's meetings
      prisma.meeting.count({
        where: {
          workspaceId,
          startTime: {
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Weekly tasks completed
      prisma.task.count({
        where: {
          workspaceId,
          status: "DONE",
          updatedAt: {
            gte: startOfWeek
          }
        }
      }),
      
      // Monthly notes created
      prisma.note.count({
        where: {
          workspaceId,
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      
      // Recent tasks
      prisma.task.findMany({
        where: { workspaceId },
        include: {
          assignee: {
            select: { name: true, email: true }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      
      // Recent notes
      prisma.note.findMany({
        where: { workspaceId },
        include: {
          createdBy: {
            select: { name: true, email: true }
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
      }),
      
      // Recent meetings
      prisma.meeting.findMany({
        where: { workspaceId },
        include: {
          createdBy: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ])

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Transform recent activity
    const recentActivity = [
      ...recentTasks.map(task => ({
        id: task.id,
        type: 'task',
        title: task.title,
        description: `Task ${task.status.toLowerCase().replace('_', ' ')}`,
        timestamp: task.updatedAt.toISOString(),
        user: task.assignee?.name || task.assignee?.email || 'Unassigned'
      })),
      ...recentNotes.map(note => ({
        id: note.id,
        type: 'note',
        title: note.title,
        description: 'Note created',
        timestamp: note.updatedAt.toISOString(),
        user: note.createdBy.name || note.createdBy.email
      })),
      ...recentMeetings.map(meeting => ({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        description: 'Meeting scheduled',
        timestamp: meeting.createdAt.toISOString(),
        user: meeting.createdBy.name || meeting.createdBy.email
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)

    const stats = {
      overview: {
        totalTasks,
        completedTasks,
        completionRate,
        totalNotes,
        totalMeetings,
        todayMeetings
      },
      trends: {
        weeklyTasksCompleted: weeklyTasks,
        monthlyNotesCreated: monthlyNotes
      },
      recentActivity
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error("Get dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
