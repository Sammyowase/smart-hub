import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== FINAL PRISMA TEST ===");
    
    // Test 1: Import the enhanced Prisma client
    console.log("1. Importing enhanced Prisma client...");
    const { prisma, getRawPrismaClient } = await import("@/lib/prisma");
    
    // Test 2: Check if models exist
    console.log("2. Checking model existence...");
    const modelChecks = {
      user: {
        exists: !!prisma.user,
        hasFindMany: typeof prisma.user?.findMany === 'function',
        hasFindFirst: typeof prisma.user?.findFirst === 'function'
      },
      conversation: {
        exists: !!prisma.conversation,
        hasFindMany: typeof prisma.conversation?.findMany === 'function',
        hasFindFirst: typeof prisma.conversation?.findFirst === 'function'
      },
      group: {
        exists: !!prisma.group,
        hasFindMany: typeof prisma.group?.findMany === 'function',
        hasFindFirst: typeof prisma.group?.findFirst === 'function'
      }
    };
    
    console.log("Model checks:", modelChecks);
    
    // Test 3: Try the raw client
    console.log("3. Testing raw client...");
    const rawClient = getRawPrismaClient();
    const rawModelChecks = {
      user: {
        exists: !!rawClient.user,
        hasFindMany: typeof rawClient.user?.findMany === 'function'
      },
      conversation: {
        exists: !!rawClient.conversation,
        hasFindMany: typeof rawClient.conversation?.findMany === 'function'
      },
      group: {
        exists: !!rawClient.group,
        hasFindMany: typeof rawClient.group?.findMany === 'function'
      }
    };
    
    console.log("Raw model checks:", rawModelChecks);
    
    // Test 4: Try actual operations (without authentication for now)
    console.log("4. Testing basic operations...");
    let operationTests = {
      userCount: null,
      conversationCount: null,
      groupCount: null,
      errors: []
    };
    
    try {
      operationTests.userCount = await prisma.user.count();
      console.log("✅ User count successful:", operationTests.userCount);
    } catch (error) {
      operationTests.errors.push(`User count failed: ${(error as Error).message}`);
      console.error("❌ User count failed:", error);
    }
    
    try {
      operationTests.conversationCount = await prisma.conversation.count();
      console.log("✅ Conversation count successful:", operationTests.conversationCount);
    } catch (error) {
      operationTests.errors.push(`Conversation count failed: ${(error as Error).message}`);
      console.error("❌ Conversation count failed:", error);
    }
    
    try {
      operationTests.groupCount = await prisma.group.count();
      console.log("✅ Group count successful:", operationTests.groupCount);
    } catch (error) {
      operationTests.errors.push(`Group count failed: ${(error as Error).message}`);
      console.error("❌ Group count failed:", error);
    }
    
    return NextResponse.json({
      status: "final_test_complete",
      timestamp: new Date().toISOString(),
      tests: {
        modelChecks,
        rawModelChecks,
        operationTests
      },
      summary: {
        allModelsExist: modelChecks.user.exists && modelChecks.conversation.exists && modelChecks.group.exists,
        allMethodsExist: modelChecks.user.hasFindFirst && modelChecks.conversation.hasFindFirst && modelChecks.group.hasFindMany,
        operationsWorking: operationTests.errors.length === 0,
        recommendations: generateFinalRecommendations(modelChecks, rawModelChecks, operationTests)
      }
    });

  } catch (error) {
    console.error("❌ Final test error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateFinalRecommendations(modelChecks: any, rawModelChecks: any, operationTests: any) {
  const recommendations = [];

  if (!modelChecks.conversation.exists && rawModelChecks.conversation.exists) {
    recommendations.push("RESTART REQUIRED: Conversation model exists in raw client but not in proxy - restart development server");
  }

  if (!modelChecks.group.exists && rawModelChecks.group.exists) {
    recommendations.push("RESTART REQUIRED: Group model exists in raw client but not in proxy - restart development server");
  }

  if (modelChecks.conversation.exists && !modelChecks.conversation.hasFindFirst) {
    recommendations.push("Conversation model missing findFirst method - check Prisma generation");
  }

  if (modelChecks.group.exists && !modelChecks.group.hasFindMany) {
    recommendations.push("Group model missing findMany method - check Prisma generation");
  }

  if (operationTests.errors.length > 0) {
    recommendations.push("Database operations failing - check DATABASE_URL and connection");
    operationTests.errors.forEach((error: string) => {
      recommendations.push(`  - ${error}`);
    });
  }

  if (modelChecks.conversation.exists && modelChecks.group.exists && operationTests.errors.length === 0) {
    recommendations.push("✅ ALL TESTS PASSED! Prisma client is working correctly");
    recommendations.push("✅ Original failing endpoints should now work");
    recommendations.push("✅ Ready to test conversation and group functionality");
  }

  return recommendations;
}
