import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { socketManager } from "@/lib/socket"

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
    const includePrivate = searchParams.get('includePrivate') === 'true'

    // Get groups where user is a member or all public groups
    const groups = await prisma.group.findMany({
      where: {
        workspaceId: session.user.workspaceId,
        OR: [
          { isPrivate: false },
          ...(includePrivate ? [
            {
              members: {
                some: {
                  userId: session.user.id
                }
              }
            }
          ] : [])
        ]
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Transform groups to match frontend interface
    const transformedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isPrivate: group.isPrivate,
      createdBy: group.createdBy,
      memberCount: group._count.members,
      messageCount: group._count.messages,
      members: group.members.map(member => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        user: member.user
      })),
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString()
    }))

    return NextResponse.json(transformedGroups)

  } catch (error) {
    console.error("Get groups error:", error)
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

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can create groups" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, isPrivate = false, memberIds = [] } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      )
    }

    // Check if group name already exists in workspace
    const existingGroup = await prisma.group.findFirst({
      where: {
        name: name.trim(),
        workspaceId: session.user.workspaceId
      }
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      )
    }

    // Validate member IDs if provided
    if (memberIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          workspaceId: session.user.workspaceId
        },
        select: { id: true }
      })

      if (validUsers.length !== memberIds.length) {
        return NextResponse.json(
          { error: "Some user IDs are invalid" },
          { status: 400 }
        )
      }
    }

    // Create group with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.group.create({
        data: {
          name: name.trim(),
          description: description?.trim(),
          isPrivate,
          createdById: session.user.id,
          workspaceId: session.user.workspaceId
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Add creator as admin member
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: session.user.id,
          role: "ADMIN"
        }
      })

      // Add other members if specified
      if (memberIds.length > 0) {
        await tx.groupMember.createMany({
          data: memberIds.map((userId: string) => ({
            groupId: group.id,
            userId,
            role: "MEMBER"
          }))
        })
      }

      return group
    })

    // Fetch complete group data
    const completeGroup = await prisma.group.findUnique({
      where: { id: result.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    })

    if (!completeGroup) {
      throw new Error("Failed to fetch created group")
    }

    // Transform group to match frontend interface
    const transformedGroup = {
      id: completeGroup.id,
      name: completeGroup.name,
      description: completeGroup.description,
      isPrivate: completeGroup.isPrivate,
      createdBy: completeGroup.createdBy,
      memberCount: completeGroup._count.members,
      messageCount: completeGroup._count.messages,
      members: completeGroup.members.map(member => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        user: member.user
      })),
      createdAt: completeGroup.createdAt.toISOString(),
      updatedAt: completeGroup.updatedAt.toISOString()
    }

    // Broadcast group creation to all users in the workspace
    socketManager.broadcastGroupCreated(session.user.workspaceId, transformedGroup);

    return NextResponse.json(transformedGroup)

  } catch (error) {
    console.error("Create group error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
