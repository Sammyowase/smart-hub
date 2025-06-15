import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

// In-memory store for OTPs (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number }>()

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      )
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store OTP
    otpStore.set(email, { otp, expiresAt })

    // Send email with OTP
    try {
      await sendPasswordResetEmail(email, user.name || email, otp)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      // Continue even if email fails - user can still use OTP if they have it
    }

    // For development, log the OTP
    console.log(`Password reset OTP for ${email}: ${otp}`)

    return NextResponse.json({
      message: "Verification code sent to your email",
      // Remove this in production
      otp: process.env.NODE_ENV === "development" ? otp : undefined
    })

  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
