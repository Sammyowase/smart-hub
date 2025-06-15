import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Test creating a simple message
    const testMessage = await prisma.chatMessage.create({
      data: {
        content: "Test message from API - " + new Date().toISOString(),
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
      testMessage: {
        id: testMessage.id,
        content: testMessage.content,
        authorId: testMessage.authorId,
        authorName: testMessage.author.name || testMessage.author.email,
        timestamp: testMessage.createdAt.toISOString(),
        isAI: false
      }
    })

  } catch (error: any) {
    console.error("Test chat error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        message: error.message
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Test fetching messages
    const messages = await prisma.chatMessage.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        authorName: msg.author.name || msg.author.email,
        timestamp: msg.createdAt.toISOString()
      }))
    })

  } catch (error: any) {
    console.error("Test chat fetch error:", error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
