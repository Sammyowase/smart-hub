import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const groupId = params.id
    const body = await request.json()
    const { userIds, role = "MEMBER" } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
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

    // Validate user IDs
    const validUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        workspaceId: session.user.workspaceId
      },
      select: { id: true, name: true, email: true }
    })

    if (validUsers.length !== userIds.length) {
      return NextResponse.json(
        { error: "Some user IDs are invalid" },
        { status: 400 }
      )
    }

    // Check for existing memberships
    const existingMemberships = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: userIds }
      },
      select: { userId: true }
    })

    const existingUserIds = existingMemberships.map(m => m.userId)
    const newUserIds = userIds.filter((id: string) => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { error: "All specified users are already members of this group" },
        { status: 409 }
      )
    }

    // Add new members
    const newMembers = await prisma.groupMember.createMany({
      data: newUserIds.map((userId: string) => ({
        groupId,
        userId,
        role
      }))
    })

    // Fetch updated group members
    const updatedMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        joinedAt: "asc"
      }
    })

    const transformedMembers = updatedMembers.map(member => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: member.user
    }))

    return NextResponse.json({
      success: true,
      message: `Added ${newMembers.count} new members to the group`,
      members: transformedMembers,
      addedCount: newMembers.count,
      skippedCount: existingUserIds.length
    })

  } catch (error) {
    console.error("Add group members error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const groupId = params.id

    // Verify group exists and user has access
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        workspaceId: session.user.workspaceId,
        OR: [
          { isPrivate: false },
          {
            members: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: "Group not found or access denied" },
        { status: 404 }
      )
    }

    // Fetch group members
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { role: "asc" }, // Admins first
        { joinedAt: "asc" }
      ]
    })

    const transformedMembers = members.map(member => ({
      id: member.id,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      user: member.user
    }))

    return NextResponse.json(transformedMembers)

  } catch (error) {
    console.error("Get group members error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
