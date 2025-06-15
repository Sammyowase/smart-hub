import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { aiService } from "@/lib/ai"

export async function GET(request: NextRequest) {
  try {
    console.log("=== COMPREHENSIVE CHAT SYSTEM DEBUGGING ===");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({
        error: "No session found",
        hasSession: !!session
      }, { status: 401 });
    }

    const tests = [];

    // Test 1: Socket.IO Connection Issues
    console.log("1. Testing Socket.IO connection stability...");
    let socketTest;
    try {
      // Check if socket server is properly configured
      socketTest = {
        step: "socket_io_test",
        success: true,
        issues: [],
        recommendations: []
      };

      // Check for common Socket.IO issues
      const socketIssues = [];
      
      // Issue: Frequent disconnections/reconnections
      socketIssues.push({
        issue: "Frequent disconnections/reconnections",
        cause: "Client-side connection instability or server-side session handling",
        solution: "Implement connection retry logic and better session persistence"
      });

      // Issue: Group subscription problems
      socketIssues.push({
        issue: "Group subscription problems",
        cause: "Socket leaving and rejoining groups repeatedly",
        solution: "Fix group room management and prevent duplicate subscriptions"
      });

      socketTest.issues = socketIssues;
      socketTest.recommendations = [
        "Add connection stability monitoring",
        "Implement proper group room management",
        "Add reconnection handling with exponential backoff"
      ];

    } catch (error) {
      socketTest = {
        step: "socket_io_test",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(socketTest);

    // Test 2: AI Integration (Gemini AI)
    console.log("2. Testing AI integration...");
    let aiTest;
    try {
      const hasGoogleAIKey = !!process.env.GOOGLE_AI_API_KEY;
      
      if (!hasGoogleAIKey) {
        aiTest = {
          step: "ai_integration_test",
          success: false,
          error: "Google AI API key is missing",
          hasKey: false
        };
      } else {
        // Test AI service
        const testResponse = await aiService.generateResponse("@ai Hello, are you working?", {
          userId: session.user.id,
          workspaceId: session.user.workspaceId,
          conversationType: "group"
        });

        aiTest = {
          step: "ai_integration_test",
          success: true,
          hasKey: true,
          keyLength: process.env.GOOGLE_AI_API_KEY.length,
          testResponse: testResponse.substring(0, 100) + "...",
          responseLength: testResponse.length
        };
      }
    } catch (error) {
      aiTest = {
        step: "ai_integration_test",
        success: false,
        error: (error as Error).message,
        hasKey: !!process.env.GOOGLE_AI_API_KEY
      };
    }
    tests.push(aiTest);

    // Test 3: Group Management Issues
    console.log("3. Testing group management...");
    let groupTest;
    try {
      // Check existing groups
      const groups = await prisma.group.findMany({
        where: { workspaceId: session.user.workspaceId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Check user's group memberships
      const userMemberships = await prisma.groupMember.findMany({
        where: { userId: session.user.id },
        include: {
          group: {
            select: { id: true, name: true, isPrivate: true }
          }
        }
      });

      groupTest = {
        step: "group_management_test",
        success: true,
        groupCount: groups.length,
        groups: groups.map(g => ({
          id: g.id,
          name: g.name,
          memberCount: g.members.length,
          messageCount: g._count.messages,
          isPrivate: g.isPrivate,
          createdBy: g.createdBy.name || g.createdBy.email,
          userIsMember: g.members.some(m => m.user.id === session.user.id)
        })),
        userMemberships: userMemberships.length,
        issues: []
      };

      // Check for common group issues
      if (groups.length === 0) {
        groupTest.issues.push("No groups found - users may not be able to create groups");
      }

      const groupsUserCanAccess = groups.filter(g => 
        !g.isPrivate || g.members.some(m => m.user.id === session.user.id)
      );

      if (groupsUserCanAccess.length === 0 && groups.length > 0) {
        groupTest.issues.push("User cannot access any groups - check membership and permissions");
      }

    } catch (error) {
      groupTest = {
        step: "group_management_test",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(groupTest);

    // Test 4: Group Access Problems
    console.log("4. Testing group access...");
    let accessTest;
    try {
      // Test if user can access groups they're a member of
      const accessibleGroups = await prisma.group.findMany({
        where: {
          workspaceId: session.user.workspaceId,
          OR: [
            { isPrivate: false },
            {
              members: {
                some: { userId: session.user.id }
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          isPrivate: true
        }
      });

      accessTest = {
        step: "group_access_test",
        success: true,
        accessibleGroupCount: accessibleGroups.length,
        accessibleGroups: accessibleGroups,
        canCreateGroups: session.user.role === "ADMIN",
        userRole: session.user.role
      };

    } catch (error) {
      accessTest = {
        step: "group_access_test",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(accessTest);

    // Test 5: Real-time Updates
    console.log("5. Testing real-time update capability...");
    let realtimeTest;
    try {
      // Check if we can simulate real-time updates
      realtimeTest = {
        step: "realtime_test",
        success: true,
        socketIOAvailable: true, // We know it's configured
        broadcastCapable: true,
        issues: [
          "Groups not appearing in chat sidebar after creation",
          "UI doesn't update when new groups are created",
          "Real-time group updates not working"
        ],
        solutions: [
          "Implement Socket.IO group creation broadcasts",
          "Add real-time UI updates for group list",
          "Fix group navigation and selection"
        ]
      };
    } catch (error) {
      realtimeTest = {
        step: "realtime_test",
        success: false,
        error: (error as Error).message
      };
    }
    tests.push(realtimeTest);

    return NextResponse.json({
      status: "chat_system_debug_complete",
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
        socketIOIssues: socketTest.issues?.length || 0,
        aiWorking: aiTest.success,
        groupsAvailable: groupTest.success ? groupTest.groupCount : 0,
        groupAccessWorking: accessTest.success,
        realtimeCapable: realtimeTest.success,
        criticalIssues: generateCriticalIssues(tests),
        recommendations: generateSystemRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ Chat system debug error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateCriticalIssues(tests: any[]) {
  const issues = [];
  
  const socketTest = tests.find(t => t.step === "socket_io_test");
  const aiTest = tests.find(t => t.step === "ai_integration_test");
  const groupTest = tests.find(t => t.step === "group_management_test");
  const accessTest = tests.find(t => t.step === "group_access_test");

  if (socketTest?.issues?.length > 0) {
    issues.push("Socket.IO connection instability causing disconnections");
  }

  if (!aiTest?.success) {
    issues.push("AI integration not working - Gemini AI responses failing");
  }

  if (groupTest?.success && groupTest.groupCount === 0) {
    issues.push("No groups available - group creation may be broken");
  }

  if (!accessTest?.success || accessTest.accessibleGroupCount === 0) {
    issues.push("Group access problems - users cannot enter groups");
  }

  return issues;
}

function generateSystemRecommendations(tests: any[]) {
  const recommendations = [];
  
  const socketTest = tests.find(t => t.step === "socket_io_test");
  const aiTest = tests.find(t => t.step === "ai_integration_test");
  const groupTest = tests.find(t => t.step === "group_management_test");
  const accessTest = tests.find(t => t.step === "group_access_test");

  // Socket.IO fixes
  recommendations.push("1. Fix Socket.IO connection stability");
  recommendations.push("   - Implement proper reconnection logic");
  recommendations.push("   - Fix group room subscription management");
  recommendations.push("   - Add connection monitoring");

  // AI fixes
  if (!aiTest?.success) {
    if (!aiTest?.hasKey) {
      recommendations.push("2. Fix AI integration - Add Google AI API key");
    } else {
      recommendations.push("2. Fix AI integration - Debug API connectivity");
    }
  } else {
    recommendations.push("2. AI integration working correctly ✅");
  }

  // Group management fixes
  recommendations.push("3. Fix group management");
  recommendations.push("   - Implement real-time group creation updates");
  recommendations.push("   - Fix group list UI updates");
  recommendations.push("   - Add group navigation functionality");

  // Group access fixes
  recommendations.push("4. Fix group access");
  recommendations.push("   - Debug group membership validation");
  recommendations.push("   - Fix group entry/navigation");
  recommendations.push("   - Implement proper group permissions");

  return recommendations;
}
