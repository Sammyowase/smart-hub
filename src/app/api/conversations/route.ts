import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Helper function to validate MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    console.log("GET /api/conversations - Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      workspaceId: session?.user?.workspaceId,
      fullSession: session
    });

    if (!session?.user?.id || !session?.user?.workspaceId) {
      console.error("GET /api/conversations - Unauthorized: Missing session or workspace", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        workspaceId: session?.user?.workspaceId
      });
      return NextResponse.json(
        { error: "Unauthorized - Missing session or workspace" },
        { status: 401 }
      )
    }

    // Validate ObjectId format for MongoDB
    if (!isValidObjectId(session.user.id)) {
      console.error("GET /api/conversations - Invalid user ID format:", session.user.id);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      )
    }

    if (!isValidObjectId(session.user.workspaceId)) {
      console.error("GET /api/conversations - Invalid workspace ID format:", session.user.workspaceId);
      return NextResponse.json(
        { error: "Invalid workspace ID format" },
        { status: 400 }
      )
    }

    console.log("GET /api/conversations - Fetching conversations for user:", session.user.id);

    // Test database connection first
    try {
      await prisma.$connect();
      console.log("GET /api/conversations - Database connection successful");
    } catch (dbError) {
      console.error("GET /api/conversations - Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get all conversations where the user is a participant
    let conversations;
    try {
      conversations = await prisma.conversation.findMany({
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
            take: 1,
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
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
      });

      console.log(`GET /api/conversations - Query successful: Found ${conversations.length} conversations`);
    } catch (queryError: any) {
      console.error("GET /api/conversations - Query failed:", queryError);
      return NextResponse.json(
        {
          error: "Failed to query conversations",
          details: process.env.NODE_ENV === 'development' ? queryError.message : undefined
        },
        { status: 500 }
      )
    }

    // Transform conversations for frontend
    const transformedConversations = conversations.map(conversation => {
      // Get the other participant (not the current user)
      const otherParticipant = conversation.participants.find(
        p => p.userId !== session.user.id
      )

      const lastMessage = conversation.messages[0]

      return {
        id: conversation.id,
        otherUser: otherParticipant ? {
          id: otherParticipant.user.id,
          name: otherParticipant.user.name,
          email: otherParticipant.user.email
        } : null,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          authorId: lastMessage.authorId,
          authorName: lastMessage.author.name || lastMessage.author.email,
          createdAt: lastMessage.createdAt.toISOString(),
          isFromCurrentUser: lastMessage.authorId === session.user.id
        } : null,
        messageCount: conversation._count.messages,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString()
      }
    })

    const duration = Date.now() - startTime;
    console.log(`GET /api/conversations - Success: Found ${transformedConversations.length} conversations in ${duration}ms`);

    return NextResponse.json(transformedConversations)

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`GET /api/conversations - Error (${duration}ms):`, error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: "Failed to fetch conversations",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions)

    console.log("POST /api/conversations - Session check:", {
      hasSession: !!session,
      userId: session?.user?.id,
      workspaceId: session?.user?.workspaceId,
      fullSession: session
    });

    if (!session?.user?.id || !session?.user?.workspaceId) {
      console.error("POST /api/conversations - Unauthorized: Missing session or workspace", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        workspaceId: session?.user?.workspaceId
      });
      return NextResponse.json(
        { error: "Unauthorized - Missing session or workspace" },
        { status: 401 }
      )
    }

    // Validate ObjectId format for MongoDB
    if (!isValidObjectId(session.user.id)) {
      console.error("POST /api/conversations - Invalid user ID format:", session.user.id);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      )
    }

    if (!isValidObjectId(session.user.workspaceId)) {
      console.error("POST /api/conversations - Invalid workspace ID format:", session.user.workspaceId);
      return NextResponse.json(
        { error: "Invalid workspace ID format" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { userId } = body

    console.log("POST /api/conversations - Request data:", { userId, currentUserId: session.user.id });

    if (!userId) {
      console.error("POST /api/conversations - Missing userId");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    if (!isValidObjectId(userId)) {
      console.error("POST /api/conversations - Invalid userId format:", userId);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      )
    }

    if (userId === session.user.id) {
      console.error("POST /api/conversations - User trying to start conversation with themselves");
      return NextResponse.json(
        { error: "Cannot start conversation with yourself" },
        { status: 400 }
      )
    }

    // Verify the other user exists and is in the same workspace
    console.log("POST /api/conversations - Verifying other user exists");
    const otherUser = await prisma.user.findFirst({
      where: {
        id: userId,
        workspaceId: session.user.workspaceId
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    if (!otherUser) {
      console.error("POST /api/conversations - Other user not found:", { userId, workspaceId: session.user.workspaceId });
      return NextResponse.json(
        { error: "User not found or not in the same workspace" },
        { status: 404 }
      )
    }

    console.log("POST /api/conversations - Other user found:", otherUser);

    // Check if conversation already exists between these users
    // We need to find a conversation where BOTH users are participants
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        workspaceId: session.user.workspaceId,
        AND: [
          {
            participants: {
              some: {
                userId: session.user.id
              }
            }
          },
          {
            participants: {
              some: {
                userId: userId
              }
            }
          }
        ]
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
        }
      }
    })

    if (existingConversation && existingConversation.participants.length === 2) {
      // Return existing conversation
      console.log("POST /api/conversations - Found existing conversation:", existingConversation.id);
      const otherParticipant = existingConversation.participants.find(
        p => p.userId !== session.user.id
      )

      return NextResponse.json({
        id: existingConversation.id,
        otherUser: otherParticipant ? {
          id: otherParticipant.user.id,
          name: otherParticipant.user.name,
          email: otherParticipant.user.email
        } : null,
        lastMessage: null,
        messageCount: 0,
        createdAt: existingConversation.createdAt.toISOString(),
        updatedAt: existingConversation.updatedAt.toISOString(),
        isExisting: true
      })
    }

    // Create new conversation
    console.log("POST /api/conversations - Creating new conversation");
    const result = await prisma.$transaction(async (tx) => {
      // Create conversation
      const conversation = await tx.conversation.create({
        data: {
          workspaceId: session.user.workspaceId
        }
      })

      console.log("POST /api/conversations - Created conversation:", conversation.id);

      // Add participants
      await tx.conversationParticipant.createMany({
        data: [
          {
            conversationId: conversation.id,
            userId: session.user.id
          },
          {
            conversationId: conversation.id,
            userId: userId
          }
        ]
      })

      console.log("POST /api/conversations - Added participants to conversation");

      return conversation
    })

    const duration = Date.now() - startTime;
    console.log(`POST /api/conversations - Success: Created conversation ${result.id} in ${duration}ms`);

    return NextResponse.json({
      id: result.id,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email
      },
      lastMessage: null,
      messageCount: 0,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      isExisting: false
    })

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`POST /api/conversations - Error (${duration}ms):`, error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
