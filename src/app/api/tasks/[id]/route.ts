import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Shared update logic for both PUT and PATCH
async function updateTask(
  request: NextRequest,
  params: { id: string }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session?.user?.workspaceId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { title, description, status, priority, assigneeId, dueDate } = body

  // Validate status if provided
  if (status && !['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    )
  }

  // Verify task belongs to user's workspace
  const existingTask = await prisma.task.findFirst({
    where: {
      id: params.id,
      workspaceId: session.user.workspaceId
    }
  })

  if (!existingTask) {
    return NextResponse.json(
      { error: "Task not found or access denied" },
      { status: 404 }
    )
  }

  try {
    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        updatedAt: new Date()
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

    console.log(`Task ${params.id} updated successfully by user ${session.user.id}`)
    return NextResponse.json(updatedTask)

  } catch (prismaError) {
    console.error("Prisma update error:", prismaError)
    return NextResponse.json(
      { error: "Database update failed" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    return await updateTask(request, resolvedParams)
  } catch (error) {
    console.error("PUT task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    return await updateTask(request, resolvedParams)
  } catch (error) {
    console.error("PATCH task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const resolvedParams = await params

    // Verify task belongs to user's workspace
    const existingTask = await prisma.task.findFirst({
      where: {
        id: resolvedParams.id,
        workspaceId: session.user.workspaceId
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    await prisma.task.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: "Task deleted successfully" })

  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
