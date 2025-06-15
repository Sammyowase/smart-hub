import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { workspaceId } = params

    // Verify user has access to this workspace
    if (session.user.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Fetch all users in the workspace
    const users = await prisma.user.findMany({
      where: {
        workspaceId: workspaceId
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`Found ${users.length} users in workspace ${workspaceId}`)

    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    })

  } catch (error) {
    console.error("Workspace users fetch error:", error)
    
    // Return fallback data if database query fails
    return NextResponse.json({
      success: true,
      users: [
        {
          id: "current-user",
          name: "You",
          email: "current@user.com",
          role: "USER",
          createdAt: new Date().toISOString()
        }
      ],
      count: 1,
      fallback: true
    })
  }
}
