import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("=== COMPREHENSIVE PRISMA CLIENT TEST ===");

    // Test 1: Import check
    console.log("1. Testing Prisma import...");
    let prismaImportTest;
    try {
      const { prisma } = await import("@/lib/prisma");
      prismaImportTest = {
        success: true,
        prismaExists: !!prisma,
        prismaType: typeof prisma,
        prismaConstructor: prisma?.constructor?.name,
        prismaKeys: prisma ? Object.keys(prisma).filter(key => !key.startsWith('_')).slice(0, 15) : []
      };
      console.log("✅ Prisma import successful:", prismaImportTest);
    } catch (importError: any) {
      prismaImportTest = {
        success: false,
        error: importError.message,
        stack: importError.stack
      };
      console.error("❌ Prisma import failed:", importError);
    }

    // Test 2: Check specific models that are failing
    console.log("2. Testing specific models...");
    let modelTest = { success: false, models: {}, errors: {} };

    if (prismaImportTest.success) {
      try {
        const { prisma } = await import("@/lib/prisma");

        const modelsToTest = ['user', 'conversation', 'conversationParticipant', 'group', 'workspace'];

        for (const modelName of modelsToTest) {
          try {
            const model = (prisma as any)[modelName];
            if (model && typeof model.findFirst === 'function') {
              modelTest.models[modelName] = {
                exists: true,
                hasFindFirst: true,
                hasFindMany: typeof model.findMany === 'function',
                hasCount: typeof model.count === 'function'
              };
              console.log(`✅ Model ${modelName}: OK`);
            } else {
              modelTest.models[modelName] = {
                exists: !!model,
                hasFindFirst: false,
                error: "Model exists but missing findFirst method"
              };
              console.log(`❌ Model ${modelName}: Missing methods`);
            }
          } catch (modelError: any) {
            modelTest.errors[modelName] = modelError.message;
            console.log(`❌ Model ${modelName}: Error - ${modelError.message}`);
          }
        }

        modelTest.success = Object.keys(modelTest.errors).length === 0;
      } catch (testError: any) {
        modelTest = {
          success: false,
          error: testError.message,
          models: {},
          errors: { general: testError.message }
        };
        console.error("❌ Model testing failed:", testError);
      }
    }

    // Test 3: Database connection
    console.log("3. Testing database connection...");
    let connectionTest = { success: false };

    if (prismaImportTest.success) {
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.$connect();
        console.log("✅ Database connection successful");

        // Test a simple query
        const userCount = await prisma.user.count();
        console.log(`✅ User count query successful: ${userCount} users`);

        connectionTest = {
          success: true,
          userCount,
          connectionWorking: true
        };

        await prisma.$disconnect();
      } catch (connError: any) {
        connectionTest = {
          success: false,
          error: connError.message,
          code: connError.code
        };
        console.error("❌ Database connection failed:", connError);
      }
    }

    // Test 4: Environment check
    console.log("4. Testing environment...");
    const envTest = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      databaseUrlValid: process.env.DATABASE_URL?.startsWith('mongodb') || false
    };
    console.log("Environment check:", envTest);

    return NextResponse.json({
      status: "prisma_test_complete",
      timestamp: new Date().toISOString(),
      tests: {
        import: prismaImportTest,
        models: modelTest,
        connection: connectionTest,
        environment: envTest
      },
      summary: {
        overallSuccess: prismaImportTest.success && modelTest.success && connectionTest.success,
        criticalIssues: getCriticalIssues(prismaImportTest, modelTest, connectionTest, envTest)
      }
    });

  } catch (error: any) {
    console.error("❌ Prisma test API error:", error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

function getCriticalIssues(importTest: any, modelTest: any, connectionTest: any, envTest: any) {
  const issues = [];

  if (!importTest.success) {
    issues.push("CRITICAL: Prisma import failed - check @/lib/prisma file");
  }

  if (!envTest.hasDatabaseUrl) {
    issues.push("CRITICAL: DATABASE_URL environment variable missing");
  }

  if (!envTest.databaseUrlValid) {
    issues.push("CRITICAL: DATABASE_URL does not appear to be a valid MongoDB URL");
  }

  if (!modelTest.success) {
    issues.push("CRITICAL: Prisma models not working - run 'npx prisma generate'");
  }

  if (!connectionTest.success && importTest.success) {
    issues.push("CRITICAL: Database connection failed - check DATABASE_URL and network");
  }

  if (issues.length === 0) {
    issues.push("✅ All tests passed - Prisma client is working correctly");
  }

  return issues;
}
