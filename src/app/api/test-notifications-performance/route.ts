import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const performanceTests = {
      databaseConnection: { success: false, duration: 0 },
      notificationCount: { success: false, duration: 0, count: 0 },
      fetchNotifications: { success: false, duration: 0, count: 0 },
      createTestNotification: { success: false, duration: 0 },
      markAsRead: { success: false, duration: 0 },
      cleanup: { success: false, duration: 0 }
    }

    // Test 1: Database connection
    let startTime = Date.now()
    try {
      await prisma.$connect()
      performanceTests.databaseConnection = {
        success: true,
        duration: Date.now() - startTime
      }
    } catch (error) {
      performanceTests.databaseConnection = {
        success: false,
        duration: Date.now() - startTime
      }
    }

    // Test 2: Count existing notifications
    startTime = Date.now()
    try {
      const count = await prisma.notification.count({
        where: { userId: session.user.id }
      })
      performanceTests.notificationCount = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      performanceTests.notificationCount = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 3: Fetch notifications (simulating the main API call)
    startTime = Date.now()
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          actionUrl: true,
          isRead: true,
          createdAt: true,
        }
      })
      performanceTests.fetchNotifications = {
        success: true,
        duration: Date.now() - startTime,
        count: notifications.length
      }
    } catch (error) {
      performanceTests.fetchNotifications = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 4: Create a test notification
    let testNotificationId: string | null = null
    startTime = Date.now()
    try {
      const testNotification = await prisma.notification.create({
        data: {
          title: "Performance Test Notification",
          message: "This is a test notification created for performance testing",
          type: "INFO",
          userId: session.user.id
        }
      })
      testNotificationId = testNotification.id
      performanceTests.createTestNotification = {
        success: true,
        duration: Date.now() - startTime
      }
    } catch (error) {
      performanceTests.createTestNotification = {
        success: false,
        duration: Date.now() - startTime
      }
    }

    // Test 5: Mark notification as read
    if (testNotificationId) {
      startTime = Date.now()
      try {
        await prisma.notification.updateMany({
          where: {
            id: testNotificationId,
            userId: session.user.id,
            isRead: false
          },
          data: {
            isRead: true,
            updatedAt: new Date()
          }
        })
        performanceTests.markAsRead = {
          success: true,
          duration: Date.now() - startTime
        }
      } catch (error) {
        performanceTests.markAsRead = {
          success: false,
          duration: Date.now() - startTime
        }
      }
    }

    // Test 6: Cleanup - Delete test notification
    if (testNotificationId) {
      startTime = Date.now()
      try {
        await prisma.notification.delete({
          where: { id: testNotificationId }
        })
        performanceTests.cleanup = {
          success: true,
          duration: Date.now() - startTime
        }
      } catch (error) {
        performanceTests.cleanup = {
          success: false,
          duration: Date.now() - startTime
        }
      }
    }

    // Calculate total duration
    const totalDuration = Object.values(performanceTests).reduce(
      (sum, test) => sum + test.duration, 0
    )

    return NextResponse.json({
      status: "performance_test_complete",
      timestamp: new Date().toISOString(),
      totalDuration,
      tests: performanceTests,
      recommendations: generateRecommendations(performanceTests)
    })

  } catch (error: any) {
    console.error("Performance test error:", error)
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

function generateRecommendations(tests: any) {
  const recommendations = []

  if (tests.fetchNotifications.duration > 1000) {
    recommendations.push("Consider adding database indexes on userId and createdAt columns")
  }

  if (tests.createTestNotification.duration > 500) {
    recommendations.push("Notification creation is slow - check database performance")
  }

  if (tests.markAsRead.duration > 300) {
    recommendations.push("Mark as read operation is slow - consider optimizing the update query")
  }

  if (tests.notificationCount.count > 1000) {
    recommendations.push("Consider implementing pagination or archiving old notifications")
  }

  if (recommendations.length === 0) {
    recommendations.push("Performance looks good! All operations completed within acceptable timeframes.")
  }

  return recommendations
}
