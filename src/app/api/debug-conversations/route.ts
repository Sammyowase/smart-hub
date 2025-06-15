import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// Helper function to validate MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function GET(request: NextRequest) {
  try {
    console.log("=== DEBUG CONVERSATIONS API ===");
    
    // Step 1: Check session
    const session = await getServerSession(authOptions);
    console.log("1. Session check:", {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      user: session?.user,
      userKeys: session?.user ? Object.keys(session.user) : []
    });

    if (!session?.user) {
      return NextResponse.json({
        error: "No session found",
        step: "session_check",
        details: "User not authenticated"
      }, { status: 401 });
    }

    // Step 2: Check user data
    const userId = session.user.id;
    const workspaceId = session.user.workspaceId;
    
    console.log("2. User data:", {
      userId,
      workspaceId,
      userIdValid: userId ? isValidObjectId(userId) : false,
      workspaceIdValid: workspaceId ? isValidObjectId(workspaceId) : false
    });

    if (!userId || !workspaceId) {
      return NextResponse.json({
        error: "Missing user ID or workspace ID",
        step: "user_data_check",
        details: { userId: !!userId, workspaceId: !!workspaceId }
      }, { status: 400 });
    }

    if (!isValidObjectId(userId) || !isValidObjectId(workspaceId)) {
      return NextResponse.json({
        error: "Invalid ObjectId format",
        step: "objectid_validation",
        details: { 
          userId, 
          workspaceId,
          userIdValid: isValidObjectId(userId),
          workspaceIdValid: isValidObjectId(workspaceId)
        }
      }, { status: 400 });
    }

    // Step 3: Test database connection
    try {
      await prisma.$connect();
      console.log("3. Database connection: SUCCESS");
    } catch (dbError) {
      console.error("3. Database connection: FAILED", dbError);
      return NextResponse.json({
        error: "Database connection failed",
        step: "database_connection",
        details: dbError
      }, { status: 500 });
    }

    // Step 4: Test user exists
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, workspaceId: true }
      });
      console.log("4. User lookup:", user);
    } catch (userError) {
      console.error("4. User lookup failed:", userError);
      return NextResponse.json({
        error: "User lookup failed",
        step: "user_lookup",
        details: userError
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({
        error: "User not found",
        step: "user_existence",
        details: { userId }
      }, { status: 404 });
    }

    // Step 5: Test workspace exists
    let workspace;
    try {
      workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true }
      });
      console.log("5. Workspace lookup:", workspace);
    } catch (workspaceError) {
      console.error("5. Workspace lookup failed:", workspaceError);
      return NextResponse.json({
        error: "Workspace lookup failed",
        step: "workspace_lookup",
        details: workspaceError
      }, { status: 500 });
    }

    if (!workspace) {
      return NextResponse.json({
        error: "Workspace not found",
        step: "workspace_existence",
        details: { workspaceId }
      }, { status: 404 });
    }

    // Step 6: Test conversation model
    let conversationCount;
    try {
      conversationCount = await prisma.conversation.count({
        where: { workspaceId }
      });
      console.log("6. Conversation count:", conversationCount);
    } catch (conversationError) {
      console.error("6. Conversation count failed:", conversationError);
      return NextResponse.json({
        error: "Conversation model test failed",
        step: "conversation_model",
        details: conversationError
      }, { status: 500 });
    }

    // Step 7: Test conversation participant model
    let participantCount;
    try {
      participantCount = await prisma.conversationParticipant.count();
      console.log("7. Participant count:", participantCount);
    } catch (participantError) {
      console.error("7. Participant count failed:", participantError);
      return NextResponse.json({
        error: "ConversationParticipant model test failed",
        step: "participant_model",
        details: participantError
      }, { status: 500 });
    }

    // Step 8: Test the actual conversation query
    let conversations;
    try {
      conversations = await prisma.conversation.findMany({
        where: {
          workspaceId: workspaceId,
          participants: {
            some: {
              userId: userId
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
          }
        }
      });
      console.log("8. Conversation query result:", conversations.length);
    } catch (queryError) {
      console.error("8. Conversation query failed:", queryError);
      return NextResponse.json({
        error: "Conversation query failed",
        step: "conversation_query",
        details: queryError
      }, { status: 500 });
    }

    // Step 9: Get other users in workspace
    let otherUsers;
    try {
      otherUsers = await prisma.user.findMany({
        where: {
          workspaceId: workspaceId,
          id: { not: userId }
        },
        select: { id: true, name: true, email: true },
        take: 5
      });
      console.log("9. Other users in workspace:", otherUsers.length);
    } catch (usersError) {
      console.error("9. Other users query failed:", usersError);
      return NextResponse.json({
        error: "Other users query failed",
        step: "other_users_query",
        details: usersError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        session: {
          userId,
          workspaceId,
          userEmail: user.email,
          userName: user.name
        },
        database: {
          connected: true,
          conversationCount,
          participantCount,
          otherUsersCount: otherUsers.length
        },
        conversations: {
          found: conversations.length,
          list: conversations.map(c => ({
            id: c.id,
            participantCount: c.participants.length,
            participants: c.participants.map(p => ({
              userId: p.userId,
              userName: p.user.name || p.user.email
            }))
          }))
        },
        recommendations: generateRecommendations({
          conversationCount,
          participantCount,
          otherUsersCount: otherUsers.length,
          userConversations: conversations.length
        })
      }
    });

  } catch (error: any) {
    console.error("DEBUG API - Unexpected error:", error);
    return NextResponse.json({
      error: "Unexpected error in debug API",
      step: "unexpected_error",
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}

function generateRecommendations(data: any) {
  const recommendations = [];

  if (data.otherUsersCount === 0) {
    recommendations.push("No other users in workspace - invite users to test conversations");
  }

  if (data.conversationCount === 0) {
    recommendations.push("No conversations exist - try creating one through the UI");
  }

  if (data.userConversations === 0 && data.otherUsersCount > 0) {
    recommendations.push("User has no conversations but other users exist - try starting a conversation");
  }

  if (recommendations.length === 0) {
    recommendations.push("All systems appear to be working correctly");
  }

  return recommendations;
}
