import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({
        error: "No active session"
      }, { status: 401 })
    }

    const { action } = await request.json()

    console.log(`Fix user verification request for ${session.user.email}, action: ${action}`)

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        emailVerified: true
      }
    })

    if (!currentUser) {
      return NextResponse.json({
        error: "User not found in database"
      }, { status: 404 })
    }

    let result = {
      timestamp: new Date().toISOString(),
      user: session.user.email,
      action: action,
      before: {
        isEmailVerified: currentUser.isEmailVerified,
        emailVerified: currentUser.emailVerified
      },
      after: {},
      success: false
    }

    switch (action) {
      case "mark_verified":
        // Force mark user as verified
        const updatedUser = await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            isEmailVerified: true,
            emailVerified: currentUser.emailVerified || new Date()
          }
        })

        result.after = {
          isEmailVerified: updatedUser.isEmailVerified,
          emailVerified: updatedUser.emailVerified
        }
        result.success = true
        console.log(`Marked user ${session.user.email} as verified`)
        break

      case "mark_unverified":
        // Force mark user as unverified (for testing)
        const unverifiedUser = await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            isEmailVerified: false,
            emailVerified: null
          }
        })

        result.after = {
          isEmailVerified: unverifiedUser.isEmailVerified,
          emailVerified: unverifiedUser.emailVerified
        }
        result.success = true
        console.log(`Marked user ${session.user.email} as unverified`)
        break

      case "clear_verification":
        // Set to null (legacy user state)
        const clearedUser = await prisma.user.update({
          where: { id: currentUser.id },
          data: {
            isEmailVerified: null,
            emailVerified: null
          }
        })

        result.after = {
          isEmailVerified: clearedUser.isEmailVerified,
          emailVerified: clearedUser.emailVerified
        }
        result.success = true
        console.log(`Cleared verification status for ${session.user.email}`)
        break

      default:
        return NextResponse.json({
          error: "Invalid action. Use: mark_verified, mark_unverified, or clear_verification"
        }, { status: 400 })
    }

    // Also clean up any active OTPs for this user
    if (action === "mark_verified") {
      await prisma.oTPVerification.updateMany({
        where: {
          email: session.user.email.toLowerCase(),
          type: 'EMAIL_VERIFICATION',
          isUsed: false
        },
        data: {
          isUsed: true
        }
      })
      console.log(`Cleaned up active OTPs for ${session.user.email}`)
    }

    return NextResponse.json({
      ...result,
      message: `Successfully ${action.replace('_', ' ')} for user ${session.user.email}`,
      nextSteps: action === "mark_verified" ? [
        "1. Sign out and sign in again to refresh session",
        "2. Navigate to /dashboard",
        "3. Should not be redirected to verification page"
      ] : [
        "1. Navigate to /auth/verify-email",
        "2. Should see verification page",
        "3. Complete OTP verification process"
      ]
    })

  } catch (error) {
    console.error("Fix user verification error:", error)
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
