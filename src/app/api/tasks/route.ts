import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { sendTaskAssignmentEmail } from "@/lib/email"
import { createTaskAssignmentNotification } from "@/lib/notifications"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: session.user.workspaceId
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(tasks)

  } catch (error) {
    console.error("Get tasks error:", error)
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
    const { title, description, priority = "MEDIUM", assigneeId, dueDate } = body

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: session.user.id,
        workspaceId: session.user.workspaceId,
        status: "TODO"
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Send email notification and create in-app notification if task is assigned to someone
    if (assigneeId && task.assignee) {
      try {
        // Send email notification
        await sendTaskAssignmentEmail(
          task.assignee.email,
          task.assignee.name || task.assignee.email,
          task.createdBy.name || task.createdBy.email,
          task.title,
          task.description || "No description provided",
          task.id,
          task.dueDate?.toISOString()
        )
      } catch (emailError) {
        console.error("Failed to send task assignment email:", emailError)
        // Continue even if email fails
      }

      try {
        // Create in-app notification
        await createTaskAssignmentNotification(
          assigneeId,
          task.createdBy.name || task.createdBy.email,
          task.title,
          task.id
        )
      } catch (notificationError) {
        console.error("Failed to create task assignment notification:", notificationError)
        // Continue even if notification fails
      }
    }

    return NextResponse.json(task)

  } catch (error) {
    console.error("Create task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
