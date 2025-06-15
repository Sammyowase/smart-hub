import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json()

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "Token, name, and password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Find invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
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
    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" }
      })

      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      )
    }

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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user account and update invitation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: invitation.email,
          password: hashedPassword,
          role: "USER",
          workspaceId: invitation.workspaceId,
          isEmailVerified: true, // Pre-verified through invitation
          emailVerified: new Date(),
          isTemporaryPassword: false
        }
      })

      // Update invitation status
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" }
      })

      return { user, invitation }
    })

    console.log(`Invitation accepted successfully:`, {
      email: invitation.email,
      workspace: invitation.workspace.name,
      userId: result.user.id
    })

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        workspaceId: result.user.workspaceId,
        isEmailVerified: result.user.isEmailVerified
      },
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name
      }
    })

  } catch (error) {
    console.error("Accept invitation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
