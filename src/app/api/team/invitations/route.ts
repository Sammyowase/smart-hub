import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    if (!session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 400 }
      )
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId: session.user.workspaceId
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const transformedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      invitedAt: invitation.createdAt.toISOString(),
      expiresAt: invitation.expiresAt.toISOString(),
      invitedBy: invitation.invitedBy.name || invitation.invitedBy.email,
      token: invitation.token
    }))

    return NextResponse.json(transformedInvitations)

  } catch (error) {
    console.error("Get invitations error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
