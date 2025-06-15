import { NextRequest, NextResponse } from "next/server"
import { verifyOTPCode } from "@/lib/otp"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, otp, type = 'EMAIL_VERIFICATION' } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      )
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "OTP must be 6 digits" },
        { status: 400 }
      )
    }

    // Verify OTP
    const verificationResult = await verifyOTPCode(email, otp, type)

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: verificationResult.error || "Invalid OTP" },
        { status: 400 }
      )
    }

    // For email verification, get updated user data
    if (type === 'EMAIL_VERIFICATION') {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          isEmailVerified: true,
          emailVerified: true
        }
      })

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      console.log(`Email verification completed for ${email}`)

      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
          emailVerified: user.emailVerified
        }
      })
    }

    // For password change verification
    if (type === 'PASSWORD_CHANGE') {
      console.log(`Password change OTP verified for ${email}`)

      return NextResponse.json({
        success: true,
        message: "Password change verification completed",
        canChangePassword: true
      })
    }

    // Generic success response (for backward compatibility)
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully"
    })

  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
