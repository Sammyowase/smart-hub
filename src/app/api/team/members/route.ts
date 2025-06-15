import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    console.log("GET /api/team/members - Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      workspaceId: session?.user?.workspaceId
    });

    if (!session?.user?.id || !session?.user?.workspaceId) {
      console.error("GET /api/team/members - Unauthorized: Missing session or workspace");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const members = await prisma.user.findMany({
      where: {
        workspaceId: session.user.workspaceId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // Calculate task stats
        assignedTasks: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    })

    // Transform data to include calculated fields
    const transformedMembers = members.map(member => ({
      id: member.id,
      name: member.name || "Unknown",
      email: member.email,
      role: member.role,
      isOnline: Math.random() > 0.5, // Mock online status
      lastActive: "2 hours ago", // Mock last active
      joinedAt: member.createdAt.toISOString(),
      tasksCount: member.assignedTasks.length,
      completedTasks: member.assignedTasks.filter(task => task.status === "DONE").length,
    }))

    const duration = Date.now() - startTime;
    console.log(`GET /api/team/members - Success: Found ${transformedMembers.length} members in ${duration}ms`);

    return NextResponse.json(transformedMembers)

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`GET /api/team/members - Error (${duration}ms):`, error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: "Failed to fetch team members",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
