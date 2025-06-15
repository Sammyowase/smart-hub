import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { sendEmailVerificationOTP } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workspaceName,
      workspaceDescription,
      adminName,
      adminEmail,
      adminPassword,
    } = body

    // Validation
    if (!workspaceName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    // Create workspace and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          description: workspaceDescription,
          createdBy: {
            create: {
              name: adminName,
              email: adminEmail,
              password: hashedPassword,
              role: "ADMIN",
              isEmailVerified: false,
            }
          }
        },
        include: {
          createdBy: true
        }
      })

      // Update the user with the workspace ID
      const updatedUser = await tx.user.update({
        where: { id: workspace.createdBy.id },
        data: { workspaceId: workspace.id }
      })

      return { workspace, user: updatedUser }
    })

    // Send email verification OTP
    try {
      await sendEmailVerificationOTP(adminEmail, adminName);
      console.log(`Email verification OTP sent to ${adminEmail}`);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails, but log it
    }

    return NextResponse.json({
      message: "Workspace created successfully",
      workspaceId: result.workspace.id,
      userId: result.user.id,
      emailVerificationRequired: true,
      email: adminEmail
    })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
