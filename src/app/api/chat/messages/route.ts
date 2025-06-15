import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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
        createdAt: "asc"
      },
      skip: offset,
      take: limit
    })

    // Transform messages to match frontend interface
    const transformedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      authorId: message.authorId,
      authorName: message.author.name || message.author.email,
      timestamp: message.createdAt.toISOString(),
      isAI: message.author.email === "ai@smarthub.system",
      attachments: message.attachments ? JSON.parse(message.attachments) : []
    }))

    return NextResponse.json(transformedMessages)

  } catch (error) {
    console.error("Get messages error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    console.log("Chat API - Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      workspaceId: session?.user?.workspaceId
    })

    if (!session?.user?.id || !session?.user?.workspaceId) {
      console.error("Chat API - Unauthorized: Missing session or workspace")
      return NextResponse.json(
        { error: "Unauthorized - Please log in again" },
        { status: 401 }
      )
    }

    // Handle both JSON and FormData (for file uploads)
    let content: string;
    let attachments: File[] = [];

    const contentType = request.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
      // Handle FormData (with potential file attachments)
      const formData = await request.formData();
      content = formData.get("content") as string || "";

      const attachmentCount = parseInt(formData.get("attachmentCount") as string || "0");
      for (let i = 0; i < attachmentCount; i++) {
        const file = formData.get(`attachment_${i}`) as File;
        if (file) {
          attachments.push(file);
        }
      }
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json();
      content = body.content || "";
    }

    console.log("Chat API - Received content:", {
      content,
      length: content?.length,
      attachments: attachments.length
    });

    if (!content.trim() && attachments.length === 0) {
      console.error("Chat API - Empty content and no attachments");
      return NextResponse.json(
        { error: "Message content or attachments are required" },
        { status: 400 }
      );
    }

    console.log("Chat API - Creating message with data:", {
      content: content.trim(),
      authorId: session.user.id,
      workspaceId: session.user.workspaceId,
      attachmentCount: attachments.length
    })

    // CRITICAL FIX: Ensure user exists before creating message
    let author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        workspaceId: true
      }
    })

    // If user doesn't exist, create them from session data
    if (!author) {
      console.log("Chat API - User not found in database, creating from session:", {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        workspaceId: session.user.workspaceId
      })

      // Ensure workspace exists first
      let workspace = null
      if (session.user.workspaceId) {
        workspace = await prisma.workspace.findUnique({
          where: { id: session.user.workspaceId }
        })

        if (!workspace) {
          console.log("Chat API - Workspace not found, creating default workspace")
          workspace = await prisma.workspace.create({
            data: {
              id: session.user.workspaceId,
              name: "Default Workspace",
              description: "Auto-created workspace",
              createdById: session.user.id // We'll create this user next
            }
          })
        }
      }

      // Create the user
      author = await prisma.user.create({
        data: {
          id: session.user.id,
          email: session.user.email || `user-${session.user.id}@smarthub.local`,
          name: session.user.name || "Unknown User",
          role: session.user.role || "USER",
          workspaceId: session.user.workspaceId,
          isTemporaryPassword: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          workspaceId: true
        }
      })

      console.log("Chat API - User created successfully:", author)
    }

    // Verify workspace exists and user belongs to it
    if (author.workspaceId !== session.user.workspaceId) {
      console.error("Chat API - Workspace mismatch:", {
        userWorkspace: author.workspaceId,
        sessionWorkspace: session.user.workspaceId
      })
      return NextResponse.json(
        { error: "User workspace mismatch" },
        { status: 403 }
      )
    }

    // Process attachments (for now, just store metadata)
    const attachmentData = attachments.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      // In a real implementation, you'd upload to cloud storage and store the URL
      url: `#attachment-${file.name}` // Placeholder
    }));

    const message = await prisma.chatMessage.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        workspaceId: session.user.workspaceId,
        attachments: attachmentData.length > 0 ? JSON.stringify(attachmentData) : null
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

    console.log("Chat API - Message created successfully:", message.id)

    // Transform message to match frontend interface
    const transformedMessage = {
      id: message.id,
      content: message.content,
      authorId: message.authorId,
      authorName: message.author.name || message.author.email,
      timestamp: message.createdAt.toISOString(),
      isAI: false,
      attachments: message.attachments ? JSON.parse(message.attachments) : []
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
          conversationType: "group"
        });

        // Create AI response
        const aiResponse = await prisma.chatMessage.create({
          data: {
            content: aiResponseContent,
            authorId: aiUser.id,
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

  } catch (error: any) {
    console.error("Chat API - Create message error:", error)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      meta: error.meta
    })

    // Provide more specific error messages based on Prisma error codes
    let errorMessage = "Internal server error"
    let statusCode = 500

    if (error.code === 'P2002') {
      errorMessage = "Duplicate message detected"
      statusCode = 409
    } else if (error.code === 'P2025') {
      errorMessage = "Referenced record not found - user or workspace missing"
      statusCode = 404
    } else if (error.code === 'P2003') {
      errorMessage = "Foreign key constraint failed - invalid user or workspace reference"
      statusCode = 400
    } else if (error.message?.includes('author is required to return data')) {
      errorMessage = "User account not found in database - please re-authenticate"
      statusCode = 401
    } else if (error.message?.includes('Inconsistent query result')) {
      errorMessage = "Database relationship error - user data may be corrupted"
      statusCode = 500
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: error.code || 'UNKNOWN',
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          stack: error.stack
        } : undefined
      },
      { status: statusCode }
    )
  }
}


