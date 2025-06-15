import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("=== REPRODUCING PRISMA ERROR ===");
    
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

    // Test 1: Import and check prisma
    console.log("1. Testing prisma import...");
    let prismaImportResult;
    try {
      const { prisma } = await import("@/lib/prisma");
      prismaImportResult = {
        step: "import",
        success: true,
        prismaExists: !!prisma,
        prismaType: typeof prisma,
        prismaConstructor: prisma?.constructor?.name
      };
      console.log("✅ Prisma import successful");
    } catch (error) {
      prismaImportResult = {
        step: "import",
        success: false,
        error: (error as Error).message
      };
      console.error("❌ Prisma import failed:", error);
    }
    tests.push(prismaImportResult);

    // Test 2: Try the exact failing operation from conversations API
    if (prismaImportResult.success) {
      console.log("2. Testing conversation.findFirst (line 282 error)...");
      let findFirstResult;
      try {
        const { prisma } = await import("@/lib/prisma");
        
        // This is the exact code from line 282 that's failing
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
                    userId: "507f1f77bcf86cd799439011" // dummy ObjectId
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
        });

        findFirstResult = {
          step: "conversation.findFirst",
          success: true,
          result: existingConversation,
          resultType: typeof existingConversation
        };
        console.log("✅ conversation.findFirst successful");
      } catch (error) {
        findFirstResult = {
          step: "conversation.findFirst",
          success: false,
          error: (error as Error).message,
          stack: (error as Error).stack
        };
        console.error("❌ conversation.findFirst failed:", error);
      }
      tests.push(findFirstResult);
    }

    // Test 3: Try the exact failing operation from groups API
    if (prismaImportResult.success) {
      console.log("3. Testing group.findMany (line 21 error)...");
      let findManyResult;
      try {
        const { prisma } = await import("@/lib/prisma");
        
        // This is the exact code from line 21 that's failing
        const groups = await prisma.group.findMany({
          where: {
            workspaceId: session.user.workspaceId,
            OR: [
              { isPrivate: false }
            ]
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            members: {
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
            _count: {
              select: {
                members: true,
                messages: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        findManyResult = {
          step: "group.findMany",
          success: true,
          result: groups,
          resultType: typeof groups,
          resultLength: Array.isArray(groups) ? groups.length : 'not array'
        };
        console.log("✅ group.findMany successful");
      } catch (error) {
        findManyResult = {
          step: "group.findMany",
          success: false,
          error: (error as Error).message,
          stack: (error as Error).stack
        };
        console.error("❌ group.findMany failed:", error);
      }
      tests.push(findManyResult);
    }

    // Test 4: Check specific model availability
    if (prismaImportResult.success) {
      console.log("4. Testing model availability...");
      let modelResult;
      try {
        const { prisma } = await import("@/lib/prisma");
        
        const modelChecks = {
          conversation: {
            exists: !!prisma.conversation,
            hasFindFirst: !!prisma.conversation?.findFirst,
            hasFindMany: !!prisma.conversation?.findMany,
            type: typeof prisma.conversation
          },
          group: {
            exists: !!prisma.group,
            hasFindFirst: !!prisma.group?.findFirst,
            hasFindMany: !!prisma.group?.findMany,
            type: typeof prisma.group
          },
          user: {
            exists: !!prisma.user,
            hasFindFirst: !!prisma.user?.findFirst,
            hasFindMany: !!prisma.user?.findMany,
            type: typeof prisma.user
          }
        };

        modelResult = {
          step: "model_availability",
          success: true,
          models: modelChecks
        };
        console.log("✅ Model availability check successful");
      } catch (error) {
        modelResult = {
          step: "model_availability",
          success: false,
          error: (error as Error).message
        };
        console.error("❌ Model availability check failed:", error);
      }
      tests.push(modelResult);
    }

    return NextResponse.json({
      status: "reproduction_test_complete",
      timestamp: new Date().toISOString(),
      session: {
        userId: session.user.id,
        workspaceId: session.user.workspaceId
      },
      tests,
      summary: {
        allTestsPassed: tests.every(test => test.success),
        failedTests: tests.filter(test => !test.success),
        recommendations: generateRecommendations(tests)
      }
    });

  } catch (error) {
    console.error("❌ Reproduction test error:", error);
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
  
  const importTest = tests.find(t => t.step === "import");
  const conversationTest = tests.find(t => t.step === "conversation.findFirst");
  const groupTest = tests.find(t => t.step === "group.findMany");
  const modelTest = tests.find(t => t.step === "model_availability");

  if (!importTest?.success) {
    recommendations.push("Fix Prisma import in @/lib/prisma.ts");
  }

  if (importTest?.success && !conversationTest?.success) {
    recommendations.push("conversation.findFirst is failing - check Conversation model generation");
  }

  if (importTest?.success && !groupTest?.success) {
    recommendations.push("group.findMany is failing - check Group model generation");
  }

  if (modelTest?.success && modelTest.models) {
    const missingModels = Object.entries(modelTest.models)
      .filter(([_, model]: [string, any]) => !model.exists || !model.hasFindFirst)
      .map(([name, _]) => name);
    
    if (missingModels.length > 0) {
      recommendations.push(`Missing or incomplete models: ${missingModels.join(', ')}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("All tests passed - the issue might be intermittent or environment-specific");
  }

  return recommendations;
}
