import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const debugInfo = {
      session: {
        exists: !!session,
        userId: session?.user?.id,
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        workspaceId: session?.user?.workspaceId,
      },
      database: {
        connected: false,
        chatMessageModel: false,
        userModel: false,
        workspaceModel: false,
      },
      tests: {
        canCreateMessage: false,
        canFetchMessages: false,
        messageCount: 0,
      }
    }

    // Test database connection
    try {
      await prisma.$connect()
      debugInfo.database.connected = true
    } catch (error) {
      console.error("Database connection failed:", error)
    }

    // Test models
    try {
      await prisma.chatMessage.count()
      debugInfo.database.chatMessageModel = true
    } catch (error) {
      console.error("ChatMessage model test failed:", error)
    }

    try {
      await prisma.user.count()
      debugInfo.database.userModel = true
    } catch (error) {
      console.error("User model test failed:", error)
    }

    try {
      await prisma.workspace.count()
      debugInfo.database.workspaceModel = true
    } catch (error) {
      console.error("Workspace model test failed:", error)
    }

    // Test message operations if user is logged in
    if (session?.user?.id && session?.user?.workspaceId) {
      try {
        // Test fetching messages
        const messages = await prisma.chatMessage.findMany({
          where: {
            workspaceId: session.user.workspaceId
          },
          take: 5
        })
        debugInfo.tests.canFetchMessages = true
        debugInfo.tests.messageCount = messages.length
      } catch (error) {
        console.error("Fetch messages test failed:", error)
      }

      try {
        // Test creating a message (we'll delete it after)
        const testMessage = await prisma.chatMessage.create({
          data: {
            content: "DEBUG TEST MESSAGE - " + Date.now(),
            authorId: session.user.id,
            workspaceId: session.user.workspaceId
          }
        })
        
        debugInfo.tests.canCreateMessage = true
        
        // Clean up test message
        await prisma.chatMessage.delete({
          where: { id: testMessage.id }
        })
      } catch (error) {
        console.error("Create message test failed:", error)
      }
    }

    return NextResponse.json({
      status: "debug_complete",
      timestamp: new Date().toISOString(),
      ...debugInfo
    })

  } catch (error: any) {
    console.error("Debug chat error:", error)
    return NextResponse.json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { testMessage = "Debug test message from API" } = body

    // Create a test message
    const message = await prisma.chatMessage.create({
      data: {
        content: testMessage,
        authorId: session.user.id,
        workspaceId: session.user.workspaceId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: "Test message created successfully",
      data: {
        id: message.id,
        content: message.content,
        authorId: message.authorId,
        authorName: message.author.name || message.author.email,
        timestamp: message.createdAt.toISOString(),
        isAI: false
      }
    })

  } catch (error: any) {
    console.error("Debug chat POST error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code
    }, { status: 500 })
  }
}
