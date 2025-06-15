import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== VERIFYING PRISMA MODELS ===");
    
    // Test 1: Direct import and check
    console.log("1. Testing direct Prisma import...");
    const { prisma, getRawPrismaClient } = await import("@/lib/prisma");
    
    console.log("2. Checking prisma object...");
    console.log("prisma exists:", !!prisma);
    console.log("prisma type:", typeof prisma);
    
    // Test 3: Check specific models
    console.log("3. Checking specific models...");
    const modelChecks = {
      user: {
        exists: !!prisma.user,
        type: typeof prisma.user,
        hasFindMany: typeof prisma.user?.findMany === 'function',
        hasFindFirst: typeof prisma.user?.findFirst === 'function'
      },
      conversation: {
        exists: !!prisma.conversation,
        type: typeof prisma.conversation,
        hasFindMany: typeof prisma.conversation?.findMany === 'function',
        hasFindFirst: typeof prisma.conversation?.findFirst === 'function'
      },
      group: {
        exists: !!prisma.group,
        type: typeof prisma.group,
        hasFindMany: typeof prisma.group?.findMany === 'function',
        hasFindFirst: typeof prisma.group?.findFirst === 'function'
      }
    };
    
    console.log("Model checks:", modelChecks);
    
    // Test 4: Try to get raw client
    console.log("4. Testing raw client...");
    const rawClient = getRawPrismaClient();
    console.log("Raw client exists:", !!rawClient);
    console.log("Raw client type:", typeof rawClient);
    
    const rawModelChecks = {
      user: {
        exists: !!rawClient.user,
        type: typeof rawClient.user
      },
      conversation: {
        exists: !!rawClient.conversation,
        type: typeof rawClient.conversation
      },
      group: {
        exists: !!rawClient.group,
        type: typeof rawClient.group
      }
    };
    
    console.log("Raw model checks:", rawModelChecks);
    
    // Test 5: Try to access properties directly
    console.log("5. Testing direct property access...");
    let directAccessTest;
    try {
      // This should trigger the proxy
      const userModel = prisma.user;
      const conversationModel = prisma.conversation;
      const groupModel = prisma.group;
      
      directAccessTest = {
        success: true,
        user: !!userModel,
        conversation: !!conversationModel,
        group: !!groupModel,
        userType: typeof userModel,
        conversationType: typeof conversationModel,
        groupType: typeof groupModel
      };
    } catch (error) {
      directAccessTest = {
        success: false,
        error: (error as Error).message
      };
    }
    
    console.log("Direct access test:", directAccessTest);
    
    return NextResponse.json({
      status: "model_verification_complete",
      timestamp: new Date().toISOString(),
      tests: {
        modelChecks,
        rawModelChecks,
        directAccessTest
      },
      summary: {
        allModelsExist: modelChecks.user.exists && modelChecks.conversation.exists && modelChecks.group.exists,
        allMethodsExist: modelChecks.user.hasFindMany && modelChecks.conversation.hasFindFirst && modelChecks.group.hasFindMany,
        recommendations: generateRecommendations(modelChecks, rawModelChecks, directAccessTest)
      }
    });

  } catch (error) {
    console.error("❌ Model verification error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(modelChecks: any, rawModelChecks: any, directAccessTest: any) {
  const recommendations = [];

  if (!modelChecks.user.exists) {
    recommendations.push("User model not accessible - check Prisma client generation");
  }

  if (!modelChecks.conversation.exists) {
    recommendations.push("Conversation model not accessible - check schema and generation");
  }

  if (!modelChecks.group.exists) {
    recommendations.push("Group model not accessible - check schema and generation");
  }

  if (rawModelChecks.conversation.exists && !modelChecks.conversation.exists) {
    recommendations.push("Conversation model exists in raw client but not in proxy - check proxy implementation");
  }

  if (rawModelChecks.group.exists && !modelChecks.group.exists) {
    recommendations.push("Group model exists in raw client but not in proxy - check proxy implementation");
  }

  if (!directAccessTest.success) {
    recommendations.push("Direct property access failed - check proxy implementation");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ All models are accessible and working correctly");
  }

  return recommendations;
}
