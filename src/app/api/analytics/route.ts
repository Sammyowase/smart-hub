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
    const range = searchParams.get('range') || '7d'
    
    const workspaceId = session.user.workspaceId

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date

    switch (range) {
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      default: // 7d
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    }

    // Parallel queries for better performance
    const [
      totalTasks,
      completedTasks,
      totalNotes,
      totalMeetings,
      activeUsers,
      totalMessages,
      currentPeriodTasks,
      previousPeriodTasks,
      currentPeriodNotes,
      previousPeriodNotes,
      currentPeriodMeetings,
      previousPeriodMeetings,
      tasksByStatus,
      tasksByPriority,
      userActivity
    ] = await Promise.all([
      // Overview stats
      prisma.task.count({ where: { workspaceId } }),
      prisma.task.count({ where: { workspaceId, status: "DONE" } }),
      prisma.note.count({ where: { workspaceId } }),
      prisma.meeting.count({ where: { workspaceId } }),
      prisma.user.count({ where: { workspaceId } }),
      prisma.chatMessage.count({ where: { workspaceId } }),

      // Trend data - current period
      prisma.task.count({
        where: {
          workspaceId,
          createdAt: { gte: startDate }
        }
      }),
      
      // Trend data - previous period
      prisma.task.count({
        where: {
          workspaceId,
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Notes trends
      prisma.note.count({
        where: {
          workspaceId,
          createdAt: { gte: startDate }
        }
      }),
      
      prisma.note.count({
        where: {
          workspaceId,
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Meetings trends
      prisma.meeting.count({
        where: {
          workspaceId,
          createdAt: { gte: startDate }
        }
      }),
      
      prisma.meeting.count({
        where: {
          workspaceId,
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Task analytics
      prisma.task.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: { status: true }
      }),

      prisma.task.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: { priority: true }
      }),

      // User activity
      prisma.user.findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          email: true,
          assignedTasks: {
            where: {
              status: "DONE",
              updatedAt: { gte: startDate }
            },
            select: { id: true }
          },
          notes: {
            where: {
              createdAt: { gte: startDate }
            },
            select: { id: true }
          }
        }
      })
    ])

    // Calculate average completion time (mock data for now)
    const averageCompletionTime = 24 // hours

    // Transform task status data
    const statusColors = {
      TODO: "#6b7280",
      IN_PROGRESS: "#f59e0b",
      REVIEW: "#8b5cf6",
      DONE: "#10b981"
    }

    const statusData = tasksByStatus.map(item => ({
      status: item.status,
      count: item._count.status,
      color: statusColors[item.status as keyof typeof statusColors] || "#6b7280"
    }))

    // Transform priority data
    const priorityColors = {
      LOW: "#10b981",
      MEDIUM: "#f59e0b",
      HIGH: "#f97316",
      URGENT: "#ef4444"
    }

    const priorityData = tasksByPriority.map(item => ({
      priority: item.priority,
      count: item._count.priority,
      color: priorityColors[item.priority as keyof typeof priorityColors] || "#6b7280"
    }))

    // Transform user activity data
    const userActivityData = userActivity.map(user => ({
      userId: user.id,
      userName: user.name || user.email,
      tasksCompleted: user.assignedTasks.length,
      notesCreated: user.notes.length
    }))

    const analytics = {
      overview: {
        totalTasks,
        completedTasks,
        totalNotes,
        totalMeetings,
        activeUsers,
        totalMessages
      },
      trends: {
        tasksThisWeek: currentPeriodTasks,
        tasksLastWeek: previousPeriodTasks,
        notesThisWeek: currentPeriodNotes,
        notesLastWeek: previousPeriodNotes,
        meetingsThisWeek: currentPeriodMeetings,
        meetingsLastWeek: previousPeriodMeetings
      },
      productivity: {
        dailyTaskCompletion: [], // Would need more complex query for daily data
        weeklyActivity: [], // Would need more complex query for weekly data
        userActivity: userActivityData
      },
      taskAnalytics: {
        byStatus: statusData,
        byPriority: priorityData,
        averageCompletionTime
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
