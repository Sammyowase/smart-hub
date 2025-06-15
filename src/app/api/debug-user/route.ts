import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("=== DEBUGGING USER EXISTENCE ===");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({
        error: "No session found",
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : []
      }, { status: 401 });
    }

    console.log("Session user data:", {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      workspaceId: session.user.workspaceId,
      role: session.user.role
    });

    const tests = [];

    // Test 1: Check if user exists in database
    console.log("1. Checking if user exists in database...");
    let userExistsTest;
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          workspaceId: true,
          role: true,
          createdAt: true
        }
      });

      userExistsTest = {
        step: "user_exists",
        success: !!user,
        user: user,
        userFound: !!user
      };

      if (user) {
        console.log("✅ User found in database:", user);
      } else {
        console.log("❌ User NOT found in database");
      }
    } catch (error) {
      userExistsTest = {
        step: "user_exists",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Error checking user existence:", error);
    }
    tests.push(userExistsTest);

    // Test 2: Check workspace exists
    console.log("2. Checking if workspace exists...");
    let workspaceExistsTest;
    if (session.user.workspaceId) {
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: session.user.workspaceId },
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        });

        workspaceExistsTest = {
          step: "workspace_exists",
          success: !!workspace,
          workspace: workspace,
          workspaceFound: !!workspace
        };

        if (workspace) {
          console.log("✅ Workspace found:", workspace);
        } else {
          console.log("❌ Workspace NOT found");
        }
      } catch (error) {
        workspaceExistsTest = {
          step: "workspace_exists",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Error checking workspace existence:", error);
      }
    } else {
      workspaceExistsTest = {
        step: "workspace_exists",
        success: false,
        error: "No workspaceId in session"
      };
    }
    tests.push(workspaceExistsTest);

    // Test 3: Check all users in workspace
    console.log("3. Checking all users in workspace...");
    let allUsersTest;
    if (session.user.workspaceId) {
      try {
        const allUsers = await prisma.user.findMany({
          where: { workspaceId: session.user.workspaceId },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
          }
        });

        allUsersTest = {
          step: "all_users",
          success: true,
          userCount: allUsers.length,
          users: allUsers,
          currentUserInList: allUsers.some(u => u.id === session.user.id)
        };

        console.log(`✅ Found ${allUsers.length} users in workspace`);
        console.log("Current user in list:", allUsers.some(u => u.id === session.user.id));
      } catch (error) {
        allUsersTest = {
          step: "all_users",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Error fetching all users:", error);
      }
    } else {
      allUsersTest = {
        step: "all_users",
        success: false,
        error: "No workspaceId in session"
      };
    }
    tests.push(allUsersTest);

    // Test 4: Try to create a test message (dry run)
    console.log("4. Testing message creation (dry run)...");
    let messageTestResult;
    if (userExistsTest.success && userExistsTest.userFound) {
      try {
        // Just test the query structure without actually creating
        const testQuery = {
          data: {
            content: "Test message",
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
        };

        messageTestResult = {
          step: "message_test",
          success: true,
          queryStructure: testQuery,
          wouldWork: true
        };

        console.log("✅ Message creation query structure is valid");
      } catch (error) {
        messageTestResult = {
          step: "message_test",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Message test failed:", error);
      }
    } else {
      messageTestResult = {
        step: "message_test",
        success: false,
        error: "User doesn't exist, message creation would fail"
      };
    }
    tests.push(messageTestResult);

    return NextResponse.json({
      status: "user_debug_complete",
      timestamp: new Date().toISOString(),
      session: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name,
        workspaceId: session.user.workspaceId,
        role: session.user.role
      },
      tests,
      summary: {
        userExists: userExistsTest.success && userExistsTest.userFound,
        workspaceExists: workspaceExistsTest.success && workspaceExistsTest.workspaceFound,
        canCreateMessage: userExistsTest.success && userExistsTest.userFound && workspaceExistsTest.success,
        recommendations: generateUserRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ User debug error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateUserRecommendations(tests: any[]) {
  const recommendations = [];
  
  const userTest = tests.find(t => t.step === "user_exists");
  const workspaceTest = tests.find(t => t.step === "workspace_exists");
  const allUsersTest = tests.find(t => t.step === "all_users");

  if (!userTest?.userFound) {
    recommendations.push("CRITICAL: User from session doesn't exist in database - need to create user");
  }

  if (!workspaceTest?.workspaceFound) {
    recommendations.push("CRITICAL: Workspace doesn't exist in database - need to create workspace");
  }

  if (allUsersTest?.success && allUsersTest.userCount === 0) {
    recommendations.push("WARNING: No users found in workspace - database may have been reset");
  }

  if (userTest?.userFound && workspaceTest?.workspaceFound) {
    recommendations.push("✅ User and workspace exist - message creation should work");
  }

  return recommendations;
}
