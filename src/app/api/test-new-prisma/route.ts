import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma, testPrismaConnection, getRawPrismaClient } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING NEW PRISMA CLIENT ===");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session?.user?.workspaceId) {
      return NextResponse.json({
        error: "Need valid session to test",
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        workspaceId: session?.user?.workspaceId
      }, { status: 401 });
    }

    const tests = [];

    // Test 1: Basic prisma object check
    console.log("1. Testing prisma object...");
    let basicTest;
    try {
      basicTest = {
        step: "basic_check",
        success: true,
        prismaExists: !!prisma,
        prismaType: typeof prisma,
        hasUserModel: !!prisma.user,
        hasConversationModel: !!prisma.conversation,
        hasGroupModel: !!prisma.group
      };
      console.log("✅ Basic prisma check successful");
    } catch (error) {
      basicTest = {
        step: "basic_check",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Basic prisma check failed:", error);
    }
    tests.push(basicTest);

    // Test 2: Connection test
    console.log("2. Testing connection...");
    let connectionTest;
    try {
      const connectionResult = await testPrismaConnection();
      connectionTest = {
        step: "connection_test",
        success: connectionResult,
        connected: connectionResult
      };
      console.log("✅ Connection test successful");
    } catch (error) {
      connectionTest = {
        step: "connection_test",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Connection test failed:", error);
    }
    tests.push(connectionTest);

    // Test 3: Simple query test
    console.log("3. Testing simple query...");
    let queryTest;
    try {
      const userCount = await prisma.user.count();
      queryTest = {
        step: "simple_query",
        success: true,
        userCount,
        queryWorked: true
      };
      console.log("✅ Simple query successful");
    } catch (error) {
      queryTest = {
        step: "simple_query",
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      console.error("❌ Simple query failed:", error);
    }
    tests.push(queryTest);

    // Test 4: Conversation findFirst (the failing operation)
    console.log("4. Testing conversation.findFirst...");
    let conversationTest;
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          workspaceId: session.user.workspaceId
        }
      });
      conversationTest = {
        step: "conversation_findFirst",
        success: true,
        result: conversation,
        hasResult: !!conversation
      };
      console.log("✅ conversation.findFirst successful");
    } catch (error) {
      conversationTest = {
        step: "conversation_findFirst",
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      console.error("❌ conversation.findFirst failed:", error);
    }
    tests.push(conversationTest);

    // Test 5: Group findMany (the other failing operation)
    console.log("5. Testing group.findMany...");
    let groupTest;
    try {
      const groups = await prisma.group.findMany({
        where: {
          workspaceId: session.user.workspaceId
        },
        take: 5
      });
      groupTest = {
        step: "group_findMany",
        success: true,
        result: groups,
        count: Array.isArray(groups) ? groups.length : 0
      };
      console.log("✅ group.findMany successful");
    } catch (error) {
      groupTest = {
        step: "group_findMany",
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack
      };
      console.error("❌ group.findMany failed:", error);
    }
    tests.push(groupTest);

    // Test 6: Raw client test
    console.log("6. Testing raw client...");
    let rawClientTest;
    try {
      const rawClient = getRawPrismaClient();
      const rawUserCount = await rawClient.user.count();
      rawClientTest = {
        step: "raw_client",
        success: true,
        userCount: rawUserCount,
        clientType: typeof rawClient
      };
      console.log("✅ Raw client test successful");
    } catch (error) {
      rawClientTest = {
        step: "raw_client",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Raw client test failed:", error);
    }
    tests.push(rawClientTest);

    return NextResponse.json({
      status: "new_prisma_test_complete",
      timestamp: new Date().toISOString(),
      session: {
        userId: session.user.id,
        workspaceId: session.user.workspaceId
      },
      tests,
      summary: {
        allTestsPassed: tests.every(test => test.success),
        passedTests: tests.filter(test => test.success).length,
        totalTests: tests.length,
        failedTests: tests.filter(test => !test.success),
        recommendations: generateRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ New Prisma test error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(tests: any[]) {
  const recommendations = [];
  
  const basicTest = tests.find(t => t.step === "basic_check");
  const connectionTest = tests.find(t => t.step === "connection_test");
  const queryTest = tests.find(t => t.step === "simple_query");
  const conversationTest = tests.find(t => t.step === "conversation_findFirst");
  const groupTest = tests.find(t => t.step === "group_findMany");

  if (!basicTest?.success) {
    recommendations.push("CRITICAL: Basic Prisma object check failed - check @/lib/prisma.ts");
  }

  if (!connectionTest?.success) {
    recommendations.push("CRITICAL: Database connection failed - check DATABASE_URL");
  }

  if (!queryTest?.success) {
    recommendations.push("CRITICAL: Simple queries failing - check Prisma client generation");
  }

  if (queryTest?.success && !conversationTest?.success) {
    recommendations.push("conversation.findFirst specifically failing - check Conversation model");
  }

  if (queryTest?.success && !groupTest?.success) {
    recommendations.push("group.findMany specifically failing - check Group model");
  }

  if (tests.every(test => test.success)) {
    recommendations.push("✅ All tests passed! The new Prisma client is working correctly");
  }

  return recommendations;
}
