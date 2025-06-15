import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tests = {
      databaseConnection: { success: false, duration: 0 },
      groupModel: { success: false, duration: 0, count: 0 },
      groupMemberModel: { success: false, duration: 0, count: 0 },
      conversationModel: { success: false, duration: 0, count: 0 },
      userPermissions: { success: false, isAdmin: false },
      createTestGroup: { success: false, duration: 0 },
      cleanup: { success: false, duration: 0 }
    }

    // Test 1: Database connection
    let startTime = Date.now()
    try {
      await prisma.$connect()
      tests.databaseConnection = {
        success: true,
        duration: Date.now() - startTime
      }
    } catch (error) {
      tests.databaseConnection = {
        success: false,
        duration: Date.now() - startTime
      }
    }

    // Test 2: Group model
    startTime = Date.now()
    try {
      const count = await prisma.group.count({
        where: { workspaceId: session.user.workspaceId }
      })
      tests.groupModel = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      tests.groupModel = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 3: GroupMember model
    startTime = Date.now()
    try {
      const count = await prisma.groupMember.count()
      tests.groupMemberModel = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      tests.groupMemberModel = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 4: Conversation model
    startTime = Date.now()
    try {
      const count = await prisma.conversation.count({
        where: { workspaceId: session.user.workspaceId }
      })
      tests.conversationModel = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      tests.conversationModel = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 5: User permissions
    tests.userPermissions = {
      success: true,
      isAdmin: session.user.role === "ADMIN"
    }

    // Test 6: Create test group (only if admin)
    let testGroupId: string | null = null
    if (session.user.role === "ADMIN") {
      startTime = Date.now()
      try {
        const testGroup = await prisma.group.create({
          data: {
            name: "Test Group " + Date.now(),
            description: "This is a test group for system verification",
            createdById: session.user.id,
            workspaceId: session.user.workspaceId,
            isPrivate: false
          }
        })

        // Add creator as admin member
        await prisma.groupMember.create({
          data: {
            groupId: testGroup.id,
            userId: session.user.id,
            role: "ADMIN"
          }
        })

        testGroupId = testGroup.id
        tests.createTestGroup = {
          success: true,
          duration: Date.now() - startTime
        }
      } catch (error) {
        tests.createTestGroup = {
          success: false,
          duration: Date.now() - startTime
        }
      }
    }

    // Test 7: Cleanup
    if (testGroupId) {
      startTime = Date.now()
      try {
        // Delete group members first
        await prisma.groupMember.deleteMany({
          where: { groupId: testGroupId }
        })
        
        // Delete the group
        await prisma.group.delete({
          where: { id: testGroupId }
        })

        tests.cleanup = {
          success: true,
          duration: Date.now() - startTime
        }
      } catch (error) {
        tests.cleanup = {
          success: false,
          duration: Date.now() - startTime
        }
      }
    }

    const totalDuration = Object.values(tests).reduce(
      (sum, test) => sum + (test.duration || 0), 0
    )

    return NextResponse.json({
      status: "group_system_test_complete",
      timestamp: new Date().toISOString(),
      totalDuration,
      tests,
      summary: {
        allPassed: Object.values(tests).every(test => test.success),
        passedCount: Object.values(tests).filter(test => test.success).length,
        totalTests: Object.keys(tests).length
      },
      recommendations: generateRecommendations(tests)
    })

  } catch (error: any) {
    console.error("Group system test error:", error)
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

function generateRecommendations(tests: any) {
  const recommendations = []

  if (!tests.databaseConnection.success) {
    recommendations.push("Database connection failed - check connection settings")
  }

  if (!tests.groupModel.success) {
    recommendations.push("Group model not working - run 'npx prisma generate' and 'npx prisma db push'")
  }

  if (!tests.groupMemberModel.success) {
    recommendations.push("GroupMember model not working - check database schema")
  }

  if (!tests.conversationModel.success) {
    recommendations.push("Conversation model not working - check database schema")
  }

  if (!tests.userPermissions.isAdmin) {
    recommendations.push("User is not admin - some group features will be limited")
  }

  if (tests.userPermissions.isAdmin && !tests.createTestGroup.success) {
    recommendations.push("Group creation failed - check API permissions and database constraints")
  }

  if (recommendations.length === 0) {
    recommendations.push("All group system tests passed! The system is ready for use.")
  }

  return recommendations
}
