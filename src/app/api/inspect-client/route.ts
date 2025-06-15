import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== INSPECTING PRISMA CLIENT STRUCTURE ===");
    
    // Test 1: Direct PrismaClient import
    console.log("1. Importing PrismaClient directly...");
    const { PrismaClient } = await import("@prisma/client");
    const directClient = new PrismaClient();
    
    // Get all properties of the client
    const clientKeys = Object.getOwnPropertyNames(directClient);
    const clientProtoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(directClient));
    
    console.log("Direct client keys:", clientKeys);
    console.log("Direct client prototype keys:", clientProtoKeys);
    
    // Check for specific models
    const modelChecks = {
      user: {
        exists: 'user' in directClient,
        type: typeof (directClient as any).user,
        isFunction: typeof (directClient as any).user === 'function',
        hasProperties: (directClient as any).user ? Object.keys((directClient as any).user) : []
      },
      conversation: {
        exists: 'conversation' in directClient,
        type: typeof (directClient as any).conversation,
        isFunction: typeof (directClient as any).conversation === 'function',
        hasProperties: (directClient as any).conversation ? Object.keys((directClient as any).conversation) : []
      },
      group: {
        exists: 'group' in directClient,
        type: typeof (directClient as any).group,
        isFunction: typeof (directClient as any).group === 'function',
        hasProperties: (directClient as any).group ? Object.keys((directClient as any).group) : []
      }
    };
    
    console.log("Model checks:", modelChecks);
    
    // Test 2: Check our prisma lib
    console.log("2. Testing our prisma lib...");
    const { prisma, getRawPrismaClient } = await import("@/lib/prisma");
    
    const rawClient = getRawPrismaClient();
    const rawClientKeys = Object.getOwnPropertyNames(rawClient);
    const rawClientProtoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(rawClient));
    
    console.log("Raw client keys:", rawClientKeys);
    console.log("Raw client prototype keys:", rawClientProtoKeys);
    
    // Test 3: Check if models exist in raw client
    const rawModelChecks = {
      user: {
        exists: 'user' in rawClient,
        type: typeof (rawClient as any).user,
        hasProperties: (rawClient as any).user ? Object.keys((rawClient as any).user).slice(0, 5) : []
      },
      conversation: {
        exists: 'conversation' in rawClient,
        type: typeof (rawClient as any).conversation,
        hasProperties: (rawClient as any).conversation ? Object.keys((rawClient as any).conversation).slice(0, 5) : []
      },
      group: {
        exists: 'group' in rawClient,
        type: typeof (rawClient as any).group,
        hasProperties: (rawClient as any).group ? Object.keys((rawClient as any).group).slice(0, 5) : []
      }
    };
    
    console.log("Raw model checks:", rawModelChecks);
    
    // Test 4: Check proxy behavior
    console.log("3. Testing proxy behavior...");
    let proxyTest;
    try {
      // Test accessing user (should work)
      const userAccess = prisma.user;
      console.log("User access successful:", !!userAccess);
      
      // Test accessing conversation (might fail)
      const conversationAccess = prisma.conversation;
      console.log("Conversation access successful:", !!conversationAccess);
      
      // Test accessing group (might fail)
      const groupAccess = prisma.group;
      console.log("Group access successful:", !!groupAccess);
      
      proxyTest = {
        success: true,
        userAccess: !!userAccess,
        conversationAccess: !!conversationAccess,
        groupAccess: !!groupAccess
      };
    } catch (error) {
      proxyTest = {
        success: false,
        error: (error as Error).message
      };
    }
    
    // Clean up
    await directClient.$disconnect();
    
    return NextResponse.json({
      status: "client_inspection_complete",
      timestamp: new Date().toISOString(),
      directClient: {
        keys: clientKeys,
        prototypeKeys: clientProtoKeys,
        modelChecks
      },
      rawClient: {
        keys: rawClientKeys,
        prototypeKeys: rawClientProtoKeys,
        modelChecks: rawModelChecks
      },
      proxyTest,
      summary: {
        directClientHasModels: modelChecks.user.exists && modelChecks.conversation.exists && modelChecks.group.exists,
        rawClientHasModels: rawModelChecks.user.exists && rawModelChecks.conversation.exists && rawModelChecks.group.exists,
        proxyWorking: proxyTest.success,
        recommendations: generateRecommendations(modelChecks, rawModelChecks, proxyTest)
      }
    });

  } catch (error) {
    console.error("❌ Client inspection error:", error);
    return NextResponse.json({
      status: "error",
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function generateRecommendations(directChecks: any, rawChecks: any, proxyTest: any) {
  const recommendations = [];

  if (!directChecks.conversation.exists) {
    recommendations.push("CRITICAL: Conversation model not found in direct PrismaClient - check schema generation");
  }

  if (!directChecks.group.exists) {
    recommendations.push("CRITICAL: Group model not found in direct PrismaClient - check schema generation");
  }

  if (directChecks.conversation.exists && !rawChecks.conversation.exists) {
    recommendations.push("Conversation model exists in direct client but not raw client - initialization issue");
  }

  if (directChecks.group.exists && !rawChecks.group.exists) {
    recommendations.push("Group model exists in direct client but not raw client - initialization issue");
  }

  if (!proxyTest.success) {
    recommendations.push("Proxy access failed - check proxy implementation");
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ All models found and accessible");
  }

  return recommendations;
}
