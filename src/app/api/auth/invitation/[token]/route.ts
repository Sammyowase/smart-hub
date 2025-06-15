import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      )
    }

    // Find invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            name: true
          }
        },
        invitedBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      )
    }

    // Check if invitation is expired
    const isExpired = new Date() > invitation.expiresAt

    // Check if invitation is already accepted
    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    // Update invitation status if expired
    if (isExpired && invitation.status === "PENDING") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" }
      })
    }

    const invitationData = {
      id: invitation.id,
      email: invitation.email,
      workspaceName: invitation.workspace.name,
      inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
      expiresAt: invitation.expiresAt.toISOString(),
      isValid: !isExpired && invitation.status === "PENDING",
      isExpired,
      status: isExpired ? "EXPIRED" : invitation.status
    }

    console.log(`Invitation validation for token ${token}:`, {
      email: invitation.email,
      isExpired,
      status: invitation.status,
      workspace: invitation.workspace.name
    })

    return NextResponse.json(invitationData)

  } catch (error) {
    console.error("Invitation validation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
