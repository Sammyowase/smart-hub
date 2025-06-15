import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({
        error: "No active session",
        hasSession: false
      })
    }

    // Get user data from database
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Get any active OTP records
    const activeOTPs = await prisma.oTPVerification.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        type: 'EMAIL_VERIFICATION',
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        attempts: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get recent OTP history
    const recentOTPs = await prisma.oTPVerification.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        type: 'EMAIL_VERIFICATION'
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        attempts: true,
        isUsed: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        user: session.user,
        hasSession: true
      },
      database: {
        user: dbUser,
        userExists: !!dbUser
      },
      verification: {
        sessionStatus: session.user.isEmailVerified,
        databaseStatus: dbUser?.isEmailVerified,
        emailVerifiedDate: dbUser?.emailVerified,
        statusMatch: session.user.isEmailVerified === dbUser?.isEmailVerified
      },
      otpRecords: {
        activeOTPs: activeOTPs.length,
        activeOTPDetails: activeOTPs,
        recentOTPHistory: recentOTPs
      },
      analysis: {
        shouldRedirectToVerification: session.user.isEmailVerified === false,
        isLegacyUser: dbUser?.isEmailVerified === null || dbUser?.isEmailVerified === undefined,
        hasCompletedVerification: dbUser?.isEmailVerified === true,
        needsVerification: dbUser?.isEmailVerified === false
      },
      recommendations: []
    }

    // Add recommendations based on analysis
    if (debugInfo.analysis.isLegacyUser) {
      debugInfo.recommendations.push("Legacy user - should be treated as verified")
    }
    
    if (debugInfo.analysis.needsVerification) {
      debugInfo.recommendations.push("User needs email verification")
    }
    
    if (debugInfo.analysis.hasCompletedVerification) {
      debugInfo.recommendations.push("User has completed verification - should access dashboard")
    }
    
    if (!debugInfo.verification.statusMatch) {
      debugInfo.recommendations.push("Session and database verification status don't match - session refresh needed")
    }

    if (activeOTPs.length > 0) {
      debugInfo.recommendations.push(`User has ${activeOTPs.length} active OTP(s) - verification in progress`)
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error("Debug user verification status error:", error)
    return NextResponse.json({
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
