import { NextRequest, NextResponse } from "next/server"
import { createOTP } from "@/lib/otp"
import { sendOTPEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { email, type = 'EMAIL_VERIFICATION', name } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // For email verification, check if user exists and verification status
    if (type === 'EMAIL_VERIFICATION') {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, isEmailVerified: true, emailVerified: true }
      })

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      console.log(`OTP request for ${email} - isEmailVerified: ${user.isEmailVerified}, emailVerified: ${user.emailVerified}`);

      // Only block if explicitly verified (true), allow if null/undefined/false
      if (user.isEmailVerified === true) {
        console.log(`Blocking OTP request for ${email} - email already verified`);
        return NextResponse.json(
          {
            error: "Email is already verified. You can sign in directly.",
            isVerified: true,
            verifiedAt: user.emailVerified
          },
          { status: 400 }
        )
      }

      console.log(`Allowing OTP request for ${email} - verification needed`);
    }

    // Create OTP
    const otpResult = await createOTP(email, type)

    if (!otpResult.success || !otpResult.otp) {
      return NextResponse.json(
        { error: otpResult.error || "Failed to generate OTP" },
        { status: 400 }
      )
    }

    // Send OTP email
    const userName = name || email.split('@')[0]
    const emailResult = await sendOTPEmail(
      email,
      userName,
      otpResult.otp,
      type === 'EMAIL_VERIFICATION' ? 'verification' :
      type === 'PASSWORD_CHANGE' ? 'password-change' : 'account-recovery'
    )

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      )
    }

    console.log(`OTP sent successfully to ${email} (type: ${type})`)

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: 600 // 10 minutes in seconds
    })

  } catch (error) {
    console.error("Send OTP error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
