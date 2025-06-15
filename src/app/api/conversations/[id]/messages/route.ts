import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Await params before accessing properties (Next.js 15 requirement)
    const resolvedParams = await params
    const conversationId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const before = searchParams.get('before') // For pagination

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId: session.user.workspaceId,
        participants: {
          some: {
            userId: session.user.id
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      )
    }

    // Build where clause for pagination
    const whereClause: any = {
      conversationId: conversationId
    }

    if (before) {
      whereClause.createdAt = {
        lt: new Date(before)
      }
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
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
      take: limit
    })

    // Transform messages for frontend
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      authorId: message.authorId,
      authorName: message.author.name || message.author.email,
      timestamp: message.createdAt.toISOString(),
      isAI: message.author.email === "ai@smarthub.system",
      attachments: message.attachments,
      reactions: message.reactions
    })).reverse() // Reverse to show oldest first

    return NextResponse.json(transformedMessages)

  } catch (error) {
    console.error("Get conversation messages error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Await params before accessing properties (Next.js 15 requirement)
    const resolvedParams = await params
    const conversationId = resolvedParams.id
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId: session.user.workspaceId,
        participants: {
          some: {
            userId: session.user.id
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      )
    }

    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        workspaceId: session.user.workspaceId,
        conversationId: conversationId
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

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    const transformedMessage = {
      id: message.id,
      content: message.content,
      authorId: message.authorId,
      authorName: message.author.name || message.author.email,
      timestamp: message.createdAt.toISOString(),
      isAI: false
    }

    // Check if message mentions AI and generate response
    if (content.toLowerCase().includes("@ai")) {
      try {
        // Find or create AI user for this workspace
        let aiUser = await prisma.user.findFirst({
          where: {
            email: "ai@smarthub.system",
            workspaceId: session.user.workspaceId
          }
        })

        if (!aiUser) {
          // Create AI user if it doesn't exist
          aiUser = await prisma.user.create({
            data: {
              email: "ai@smarthub.system",
              name: "AI Assistant",
              role: "USER",
              workspaceId: session.user.workspaceId
            }
          })
        }

        // Generate AI response using the AI service
        const aiResponseContent = await aiService.generateResponse(content, {
          userId: session.user.id,
          workspaceId: session.user.workspaceId,
          conversationType: "direct",
          conversationId: conversationId
        });

        // Create AI response
        const aiResponse = await prisma.chatMessage.create({
          data: {
            content: aiResponseContent,
            authorId: aiUser.id,
            workspaceId: session.user.workspaceId,
            conversationId: conversationId
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

        const transformedAIResponse = {
          id: aiResponse.id,
          content: aiResponse.content,
          authorId: aiResponse.authorId,
          authorName: "AI Assistant",
          timestamp: aiResponse.createdAt.toISOString(),
          isAI: true
        }

        return NextResponse.json({
          userMessage: transformedMessage,
          aiResponse: transformedAIResponse
        })
      } catch (aiError) {
        console.error("Error creating AI response:", aiError)
        // Return just the user message if AI response fails
        return NextResponse.json({ userMessage: transformedMessage })
      }
    }

    return NextResponse.json({ userMessage: transformedMessage })

  } catch (error) {
    console.error("Create conversation message error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


