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
      conversationModel: { success: false, duration: 0, count: 0 },
      conversationParticipantModel: { success: false, duration: 0, count: 0 },
      userModel: { success: false, duration: 0, count: 0 },
      workspaceUsers: { success: false, duration: 0, users: [] },
      conversationQuery: { success: false, duration: 0, conversations: [] },
      createTestConversation: { success: false, duration: 0 },
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

    // Test 2: Conversation model
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

    // Test 3: ConversationParticipant model
    startTime = Date.now()
    try {
      const count = await prisma.conversationParticipant.count()
      tests.conversationParticipantModel = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      tests.conversationParticipantModel = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 4: User model
    startTime = Date.now()
    try {
      const count = await prisma.user.count({
        where: { workspaceId: session.user.workspaceId }
      })
      tests.userModel = {
        success: true,
        duration: Date.now() - startTime,
        count
      }
    } catch (error) {
      tests.userModel = {
        success: false,
        duration: Date.now() - startTime,
        count: 0
      }
    }

    // Test 5: Workspace users
    startTime = Date.now()
    try {
      const users = await prisma.user.findMany({
        where: { 
          workspaceId: session.user.workspaceId,
          id: { not: session.user.id }
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        take: 5
      })
      tests.workspaceUsers = {
        success: true,
        duration: Date.now() - startTime,
        users
      }
    } catch (error) {
      tests.workspaceUsers = {
        success: false,
        duration: Date.now() - startTime,
        users: []
      }
    }

    // Test 6: Conversation query (same as API)
    startTime = Date.now()
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          workspaceId: session.user.workspaceId,
          participants: {
            some: {
              userId: session.user.id
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      })

      tests.conversationQuery = {
        success: true,
        duration: Date.now() - startTime,
        conversations: conversations.map(c => ({
          id: c.id,
          participantCount: c.participants.length,
          messageCount: c._count.messages,
          participants: c.participants.map(p => ({
            userId: p.userId,
            userName: p.user.name || p.user.email
          }))
        }))
      }
    } catch (error) {
      tests.conversationQuery = {
        success: false,
        duration: Date.now() - startTime,
        conversations: []
      }
    }

    // Test 7: Create test conversation (if there are other users)
    let testConversationId: string | null = null
    if (tests.workspaceUsers.users.length > 0) {
      const otherUser = tests.workspaceUsers.users[0]
      startTime = Date.now()
      
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Create conversation
          const conversation = await tx.conversation.create({
            data: {
              workspaceId: session.user.workspaceId
            }
          })

          // Add participants
          await tx.conversationParticipant.createMany({
            data: [
              {
                conversationId: conversation.id,
                userId: session.user.id
              },
              {
                conversationId: conversation.id,
                userId: otherUser.id
              }
            ]
          })

          return conversation
        })

        testConversationId = result.id
        tests.createTestConversation = {
          success: true,
          duration: Date.now() - startTime
        }
      } catch (error) {
        tests.createTestConversation = {
          success: false,
          duration: Date.now() - startTime
        }
      }
    }

    // Test 8: Cleanup
    if (testConversationId) {
      startTime = Date.now()
      try {
        // Delete participants first
        await prisma.conversationParticipant.deleteMany({
          where: { conversationId: testConversationId }
        })
        
        // Delete the conversation
        await prisma.conversation.delete({
          where: { id: testConversationId }
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
      status: "conversation_system_test_complete",
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
    console.error("Conversation system test error:", error)
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

  if (!tests.conversationModel.success) {
    recommendations.push("Conversation model not working - run 'npx prisma generate' and 'npx prisma db push'")
  }

  if (!tests.conversationParticipantModel.success) {
    recommendations.push("ConversationParticipant model not working - check database schema")
  }

  if (!tests.userModel.success) {
    recommendations.push("User model not working - check database schema")
  }

  if (tests.workspaceUsers.users.length === 0) {
    recommendations.push("No other users in workspace - invite users to test conversations")
  }

  if (!tests.conversationQuery.success) {
    recommendations.push("Conversation query failed - check the API query logic")
  }

  if (tests.workspaceUsers.users.length > 0 && !tests.createTestConversation.success) {
    recommendations.push("Conversation creation failed - check transaction logic and constraints")
  }

  if (recommendations.length === 0) {
    recommendations.push("All conversation system tests passed! The system is ready for use.")
  }

  return recommendations
}
