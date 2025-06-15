import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can manage group members" },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const groupId = resolvedParams.id
    const userIdToRemove = resolvedParams.userId

    // Verify group exists and belongs to workspace
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        workspaceId: session.user.workspaceId
      },
      include: {
        members: {
          where: { role: "ADMIN" },
          select: { userId: true }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    // Check if member exists
    const memberToRemove = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: userIdToRemove
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!memberToRemove) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 404 }
      )
    }

    // Prevent removing the last admin
    const adminCount = group.members.length
    if (memberToRemove.role === "ADMIN" && adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin from the group" },
        { status: 400 }
      )
    }

    // Prevent group creator from being removed (unless they're transferring ownership)
    if (group.createdById === userIdToRemove) {
      return NextResponse.json(
        { error: "Group creator cannot be removed. Transfer ownership first." },
        { status: 400 }
      )
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: { id: memberToRemove.id }
    })

    // Fetch updated member count
    const updatedMemberCount = await prisma.groupMember.count({
      where: { groupId }
    })

    return NextResponse.json({
      success: true,
      message: `Removed ${memberToRemove.user.name || memberToRemove.user.email} from the group`,
      removedUser: memberToRemove.user,
      remainingMemberCount: updatedMemberCount
    })

  } catch (error) {
    console.error("Remove group member error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can manage group members" },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const groupId = resolvedParams.id
    const userIdToUpdate = resolvedParams.userId
    const body = await request.json()
    const { role } = body

    if (!role || !["ADMIN", "MODERATOR", "MEMBER"].includes(role)) {
      return NextResponse.json(
        { error: "Valid role is required (ADMIN, MODERATOR, or MEMBER)" },
        { status: 400 }
      )
    }

    // Verify group exists and belongs to workspace
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        workspaceId: session.user.workspaceId
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      )
    }

    // Check if member exists
    const memberToUpdate = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: userIdToUpdate
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!memberToUpdate) {
      return NextResponse.json(
        { error: "User is not a member of this group" },
        { status: 404 }
      )
    }

    // If demoting from admin, ensure there's at least one admin remaining
    if (memberToUpdate.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: "ADMIN"
        }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last admin. Promote another member first." },
          { status: 400 }
        )
      }
    }

    // Update member role
    const updatedMember = await prisma.groupMember.update({
      where: { id: memberToUpdate.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedMember.user.name || updatedMember.user.email}'s role to ${role}`,
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        joinedAt: updatedMember.joinedAt.toISOString(),
        user: updatedMember.user
      }
    })

  } catch (error) {
    console.error("Update group member role error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
